-- ============================================================================
-- PROPOSED MIGRATION: 243_sprint_FA_ATTENDANCE_LOCATION_01.sql
-- SPRINT: FA-ATTENDANCE-LOCATION-01 — check-in / check-out location fields
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Lives in supabase/proposals/ so `supabase db push` cannot pick it up.
-- Rollback: supabase/proposals/243_rollback_sprint_FA_ATTENDANCE_LOCATION_01.sql
--
-- VERIFICATION STATUS (2026-10-24):
--   VERIFIED (owner-supplied information_schema.columns export):
--     staff_attendance has exactly the 10 proposal-242 columns, same types,
--     nullability and defaults; NO location columns. staff_leave_requests and
--     app_users exist with the expected columns.
--   INFERRED (Field Assist device evidence): an app upsert ON CONFLICT
--     (staff_id, business_date) succeeded for both check-in and check-out, so a
--     matching unique key exists and staff can INSERT/UPDATE/SELECT own rows.
--   NOT VERIFIED: trigger fa_attendance_enforce body, constraints, policies, grants.
--
-- PRECONDITIONS (run the focused read-only query below and compare first):
--   1. UNIQUE (staff_id, business_date) exists on public.staff_attendance.
--   2. public.fa_attendance_enforce() matches proposal 242 INCLUDING the
--      FA-ATTENDANCE-02 "skip insert-only validation when the row exists" block.
--      This file REPLACES that function; if the live body differs, merge first.
--   3. Policies: staff own-row SELECT/INSERT/UPDATE via is_active_user();
--      admin SELECT via is_admin(); no anon grants.
--   4. Location capture has been approved, with staff notice/consent in place.
--
-- Focused read-only verification query (Supabase SQL Editor; metadata only):
--   SELECT 'constraint' AS kind, conname AS name, pg_get_constraintdef(oid) AS definition
--     FROM pg_constraint WHERE conrelid = 'public.staff_attendance'::regclass
--   UNION ALL
--   SELECT 'trigger', tgname, pg_get_triggerdef(oid)
--     FROM pg_trigger WHERE tgrelid = 'public.staff_attendance'::regclass AND NOT tgisinternal
--   UNION ALL
--   SELECT 'function', p.proname, pg_get_functiondef(p.oid)
--     FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
--     WHERE t.tgrelid = 'public.staff_attendance'::regclass AND NOT t.tgisinternal
--   UNION ALL
--   SELECT 'policy', policyname, cmd || ' roles=' || array_to_string(roles, ',')
--          || ' using=' || COALESCE(qual, '') || ' check=' || COALESCE(with_check, '')
--     FROM pg_policies WHERE schemaname = 'public' AND tablename = 'staff_attendance'
--   UNION ALL
--   SELECT 'grant', grantee, string_agg(privilege_type, ',')
--     FROM information_schema.role_table_grants
--     WHERE table_schema = 'public' AND table_name = 'staff_attendance'
--     GROUP BY grantee;
--
-- DESIGN DECISION FOR THE OWNER (coordinate visibility):
--   With row-based RLS, an employee can read the location values on their OWN
--   rows through the API (the app never displays them); nobody can read another
--   employee's. If employees must not read even their own coordinates, store
--   locations in a separate admin-readable table instead (staff INSERT own,
--   SELECT admin-only). That changes the app's write path; not implemented here.
--
-- WHAT IT DOES:
--   - Adds 5 nullable columns per event to staff_attendance (no backfill:
--     existing rows stay NULL = "location not recorded").
--   - Constraints: valid ranges; coordinates both-or-none; coordinates present
--     exactly when status is CAPTURED or LOW_ACCURACY.
--   - Trigger: first check-in location and first check-out location win,
--     consistent with the existing first-check-in / first-check-out rules.
--   - RLS/grants UNCHANGED: staff read/write only their own rows; admins read all.
--     Staff can see their own location values; nobody else's.
--
-- CLIENT CONTRACT (mobileFieldStaff/src/utils/attendanceLocation.js):
--   <prefix>_latitude, <prefix>_longitude  double precision (WGS84 degrees)
--   <prefix>_accuracy_m                    real (metres, horizontal)
--   <prefix>_location_at                   timestamptz (fix time; attempt time on failure)
--   <prefix>_location_status               text (see CHECK below)
--   prefix ∈ {check_in, check_out}
-- ============================================================================

ALTER TABLE public.staff_attendance
    ADD COLUMN IF NOT EXISTS check_in_latitude          double precision,
    ADD COLUMN IF NOT EXISTS check_in_longitude         double precision,
    ADD COLUMN IF NOT EXISTS check_in_accuracy_m        real,
    ADD COLUMN IF NOT EXISTS check_in_location_at       timestamptz,
    ADD COLUMN IF NOT EXISTS check_in_location_status   text,
    ADD COLUMN IF NOT EXISTS check_out_latitude         double precision,
    ADD COLUMN IF NOT EXISTS check_out_longitude        double precision,
    ADD COLUMN IF NOT EXISTS check_out_accuracy_m       real,
    ADD COLUMN IF NOT EXISTS check_out_location_at      timestamptz,
    ADD COLUMN IF NOT EXISTS check_out_location_status  text;

COMMENT ON COLUMN public.staff_attendance.check_in_location_status IS
  'FA-ATTENDANCE-LOCATION-01: one-shot fix at check-in. NULL = not recorded (legacy/older app). Coordinates only for CAPTURED / LOW_ACCURACY.';
COMMENT ON COLUMN public.staff_attendance.check_out_location_status IS
  'FA-ATTENDANCE-LOCATION-01: one-shot fix at check-out. NULL = not recorded (legacy/older app). Coordinates only for CAPTURED / LOW_ACCURACY.';

-- Idempotent constraint creation
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_in_location_valid;
ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_check_out_location_valid;

ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_in_location_valid CHECK (
    (check_in_location_status IS NULL OR check_in_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_in_latitude IS NULL) = (check_in_longitude IS NULL))
    AND (check_in_latitude  IS NULL OR (check_in_latitude  BETWEEN -90  AND 90))
    AND (check_in_longitude IS NULL OR (check_in_longitude BETWEEN -180 AND 180))
    AND (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0)
    AND ((check_in_latitude IS NOT NULL) = (COALESCE(check_in_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
    AND (check_in_accuracy_m IS NULL OR check_in_latitude IS NOT NULL)
);

ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_check_out_location_valid CHECK (
    (check_out_location_status IS NULL OR check_out_location_status IN
        ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
    AND ((check_out_latitude IS NULL) = (check_out_longitude IS NULL))
    AND (check_out_latitude  IS NULL OR (check_out_latitude  BETWEEN -90  AND 90))
    AND (check_out_longitude IS NULL OR (check_out_longitude BETWEEN -180 AND 180))
    AND (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0)
    AND ((check_out_latitude IS NOT NULL) = (COALESCE(check_out_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
    AND (check_out_accuracy_m IS NULL OR check_out_latitude IS NOT NULL)
    -- A check-out location only makes sense on a checked-out record.
    AND (check_out_location_status IS NULL OR check_out_at IS NOT NULL)
);


-- ────────────────────────────────────────────────────────────────────────────
-- Trigger: proposal 242 body (incl. FA-ATTENDANCE-02 fix) + location first-wins
-- ────────────────────────────────────────────────────────────────────────────
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

        -- FA-ATTENDANCE-02: upserts that will take the ON CONFLICT path skip insert-only validation.
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
            -- No check-out location without a check-out.
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

        -- FA-ATTENDANCE-LOCATION-01: the first recorded check-in location wins.
        IF OLD.check_in_location_status IS NOT NULL THEN
            NEW.check_in_latitude := OLD.check_in_latitude;
            NEW.check_in_longitude := OLD.check_in_longitude;
            NEW.check_in_accuracy_m := OLD.check_in_accuracy_m;
            NEW.check_in_location_at := OLD.check_in_location_at;
            NEW.check_in_location_status := OLD.check_in_location_status;
        END IF;

        IF OLD.check_out_at IS NOT NULL THEN
            -- Duplicate check-out: keep the first time AND its location (idempotent).
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

-- Trigger binding is unchanged (trg_fa_attendance_enforce, BEFORE INSERT OR UPDATE);
-- recreated defensively in case it is missing.
DROP TRIGGER IF EXISTS trg_fa_attendance_enforce ON public.staff_attendance;
CREATE TRIGGER trg_fa_attendance_enforce
    BEFORE INSERT OR UPDATE ON public.staff_attendance
    FOR EACH ROW EXECUTE FUNCTION public.fa_attendance_enforce();

-- No RLS or grant changes: existing policies are row-based and cover the new columns.

NOTIFY pgrst, 'reload schema';
