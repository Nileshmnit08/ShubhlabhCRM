-- ============================================================================
-- ROLLBACK for 245_sprint_FA_ATTENDANCE_MULTISESSION_01.sql
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
--
-- Returns staff_attendance to the proposal-243 behaviour (one row per day,
-- first check-out frozen). Session history is NOT deleted: the table is renamed
-- to staff_attendance_sessions_archive_245 and closed to API roles.
--
-- ROLLBACK LIMITATIONS (read before running):
--   L1. Days with more than one session keep the SUMMARY values written by 245:
--       check_out_at / check-out location = the LAST session's check-out, not the
--       first. The first check-out of those days survives only in the archive.
--   L2. Days with a session open at rollback time have check_out_at = NULL even
--       if an earlier session was closed. The employee's app will show "Working"
--       and allow one check-out, which then freezes under the 243 rule.
--   L3. worked_seconds and session_count are dropped. Reports fall back to
--       check_out_at - check_in_at, which for multi-session days INCLUDES breaks.
--       Recompute from the archive if needed (query at the end).
--   L4. APKs that use the session RPCs must fall back to the legacy upsert path.
--       The multi-session APK does this automatically when the probe of
--       staff_attendance_sessions fails (planned client behaviour; see design doc).
--       Ops still queued for the RPCs fail with "function does not exist"
--       (PGRST202) and are marked FAILED; employees must re-tap.
--   L5. admin_attendance_session_locations() is removed; session coordinates stay
--       in the archive table, readable only by the database owner.
-- ============================================================================

BEGIN;

-- 1. Stop mirroring and drop the RPCs first so no new session writes arrive.
DROP TRIGGER IF EXISTS trg_fa_attendance_mirror_legacy ON public.staff_attendance;
DROP FUNCTION IF EXISTS public.fa_attendance_mirror_legacy();
DROP FUNCTION IF EXISTS public.fa_attendance_check_in(uuid, timestamptz, double precision, double precision, real, timestamptz, text);
DROP FUNCTION IF EXISTS public.fa_attendance_check_out(uuid, timestamptz, double precision, double precision, real, timestamptz, text);
DROP FUNCTION IF EXISTS public.admin_attendance_session_locations(date, date, uuid);

-- 2. Restore the exact 243 trigger function (no reference to the sync helper).
CREATE OR REPLACE FUNCTION public.fa_attendance_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.business_date := (NEW.check_in_at AT TIME ZONE 'Asia/Kolkata')::date;
        NEW.check_in_server_received_at := now();
        NEW.created_at := now();

        IF EXISTS (
            SELECT 1 FROM public.staff_attendance a
            WHERE a.staff_id = NEW.staff_id AND a.business_date = NEW.business_date
        ) THEN
            NEW.updated_at := now();
            RETURN NEW;
        END IF;

        IF NEW.check_in_at > now() + interval '5 minutes'
           OR NEW.check_in_at < now() - interval '72 hours' THEN
            RAISE EXCEPTION 'Check-in time is outside the accepted window'
                USING ERRCODE = '23514';
        END IF;

        IF EXISTS (
            SELECT 1 FROM public.staff_leave_requests l
            WHERE l.staff_id = NEW.staff_id
              AND l.status = 'Approved'
              AND NEW.business_date BETWEEN l.start_date AND l.end_date
        ) THEN
            RAISE EXCEPTION 'Approved leave exists for this date'
                USING ERRCODE = '23514';
        END IF;

        IF NEW.check_out_at IS NOT NULL THEN
            NEW.check_out_server_received_at := now();
            NEW.status := 'CHECKED_OUT';
        ELSE
            NEW.status := 'CHECKED_IN';
            NEW.check_out_latitude := NULL;
            NEW.check_out_longitude := NULL;
            NEW.check_out_accuracy_m := NULL;
            NEW.check_out_location_at := NULL;
            NEW.check_out_location_status := NULL;
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        NEW.id := OLD.id;
        NEW.staff_id := OLD.staff_id;
        NEW.business_date := OLD.business_date;
        NEW.check_in_at := OLD.check_in_at;
        NEW.check_in_server_received_at := OLD.check_in_server_received_at;
        NEW.created_at := OLD.created_at;

        IF OLD.check_in_location_status IS NOT NULL THEN
            NEW.check_in_latitude := OLD.check_in_latitude;
            NEW.check_in_longitude := OLD.check_in_longitude;
            NEW.check_in_accuracy_m := OLD.check_in_accuracy_m;
            NEW.check_in_location_at := OLD.check_in_location_at;
            NEW.check_in_location_status := OLD.check_in_location_status;
        END IF;

        IF OLD.check_out_at IS NOT NULL THEN
            NEW.check_out_at := OLD.check_out_at;
            NEW.check_out_server_received_at := OLD.check_out_server_received_at;
            NEW.check_out_latitude := OLD.check_out_latitude;
            NEW.check_out_longitude := OLD.check_out_longitude;
            NEW.check_out_accuracy_m := OLD.check_out_accuracy_m;
            NEW.check_out_location_at := OLD.check_out_location_at;
            NEW.check_out_location_status := OLD.check_out_location_status;
        ELSIF NEW.check_out_at IS NOT NULL THEN
            IF NEW.check_out_at > now() + interval '5 minutes' THEN
                RAISE EXCEPTION 'Check-out time is in the future'
                    USING ERRCODE = '23514';
            END IF;
            NEW.check_out_server_received_at := now();
        ELSE
            NEW.check_out_latitude := NULL;
            NEW.check_out_longitude := NULL;
            NEW.check_out_accuracy_m := NULL;
            NEW.check_out_location_at := NULL;
            NEW.check_out_location_status := NULL;
        END IF;

        NEW.status := CASE WHEN NEW.check_out_at IS NULL THEN 'CHECKED_IN' ELSE 'CHECKED_OUT' END;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_attendance_enforce ON public.staff_attendance;
CREATE TRIGGER trg_fa_attendance_enforce
    BEFORE INSERT OR UPDATE ON public.staff_attendance
    FOR EACH ROW EXECUTE FUNCTION public.fa_attendance_enforce();

-- 3. Internal helpers.
DROP FUNCTION IF EXISTS public.fa_attendance_recompute_day(uuid);
DROP FUNCTION IF EXISTS public.fa_attendance_lock_day(uuid, date);
DROP FUNCTION IF EXISTS public.fa_attendance_sync_active();

-- 4. Archive (do not drop) the session history.
DROP TRIGGER IF EXISTS trg_fa_attendance_session_enforce ON public.staff_attendance_sessions;
DROP FUNCTION IF EXISTS public.fa_attendance_session_enforce();
DROP POLICY IF EXISTS "Staff can view own attendance sessions" ON public.staff_attendance_sessions;
DROP POLICY IF EXISTS "Admins can view all attendance sessions" ON public.staff_attendance_sessions;
REVOKE ALL ON public.staff_attendance_sessions FROM PUBLIC, anon, authenticated;
ALTER TABLE IF EXISTS public.staff_attendance_sessions RENAME TO staff_attendance_sessions_archive_245;
COMMENT ON TABLE public.staff_attendance_sessions_archive_245 IS
  'Archived by 245 rollback. Multi-session attendance history incl. coordinates. Owner-only; no API access.';

-- 5. Summary columns (values recoverable from the archive, see below).
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_summary_valid;
ALTER TABLE public.staff_attendance DROP COLUMN IF EXISTS session_count;
ALTER TABLE public.staff_attendance DROP COLUMN IF EXISTS worked_seconds;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- Worked time per day from the archive (read-only, owner session):
--   SELECT attendance_id, count(*) AS sessions,
--          SUM(EXTRACT(EPOCH FROM (check_out_at - check_in_at)))::int AS worked_seconds,
--          min(check_out_at) AS first_check_out
--     FROM public.staff_attendance_sessions_archive_245
--    GROUP BY attendance_id;
--
-- Permanent removal (only after the archive is exported and the owner agrees):
--   DROP TABLE public.staff_attendance_sessions_archive_245;
