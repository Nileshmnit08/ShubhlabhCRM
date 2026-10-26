-- ============================================================================
-- PROPOSED MIGRATION: 245_sprint_FA_ATTENDANCE_MULTISESSION_01.sql
-- SPRINT: FA-ATTENDANCE-MULTISESSION-PROPOSAL-01 — multiple attendance sessions per day
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Lives in supabase/proposals/ so `supabase db push` cannot pick it up.
-- Rollback: supabase/proposals/245_rollback_sprint_FA_ATTENDANCE_MULTISESSION_01.sql
-- Design:   mobileFieldStaff/docs/FA-ATTENDANCE-MULTISESSION-PROPOSAL-01.md
--
-- PROBLEM:
--   staff_attendance holds ONE row per (staff_id, business_date) and
--   fa_attendance_enforce() freezes the first check-out. An employee who checks
--   out by mistake cannot resume work without destroying history.
--
-- DESIGN SUMMARY:
--   1. New table staff_attendance_sessions: one row per check-in/check-out pair,
--      with per-session timestamps and location evidence. Rows are never deleted;
--      a session's check-in and first check-out are immutable once written.
--   2. staff_attendance stays as the per-day COMPATIBILITY SUMMARY:
--        check_in_at / check-in location  = first session (unchanged rule)
--        check_out_at / check-out location = last closed session, NULL while a
--                                            session is open
--        status                           = CHECKED_IN while a session is open
--        session_count, worked_seconds    = new derived columns
--      Reports keep reading staff_attendance only (no double counting).
--   3. Writes go through SECURITY DEFINER RPCs (fa_attendance_check_in /
--      fa_attendance_check_out). Employees get NO direct INSERT/UPDATE on
--      sessions, and cannot read session coordinates (column grants).
--   4. Older APKs keep writing staff_attendance directly; an AFTER trigger mirrors
--      those writes into sessions so both views stay consistent.
--
-- PRECONDITIONS (verify first; none of these were verified live by this sprint):
--   P1. Proposals 242 and 243 are applied: staff_attendance has the 243 location
--       columns and fa_attendance_enforce() matches the 243 body exactly.
--       ASSUMPTION — 243 was reported applied in an earlier sprint; re-verify.
--   P2. public.is_active_user() and public.is_admin() exist as used by 242.
--   P3. Proposal 244 applied or not: either works. If 244 is applied, the GRANT
--       in section 7 makes the two new summary columns readable.
--   P4. The role that runs this file owns staff_attendance (so SECURITY DEFINER
--       functions bypass RLS) and is not 'authenticated'/'anon'. ASSUMPTION.
--   P5. No staff_attendance row violates the new consistency rules (query below).
--
-- Read-only preflight (Supabase SQL Editor):
--   SELECT pg_get_functiondef('public.fa_attendance_enforce()'::regprocedure);
--   SELECT tableowner FROM pg_tables WHERE schemaname='public' AND tablename='staff_attendance';
--   SELECT count(*) FROM public.staff_attendance;                       -- backfill size
--   SELECT count(*) FROM public.staff_attendance WHERE check_out_at IS NULL
--     AND business_date < (now() AT TIME ZONE 'Asia/Kolkata')::date;     -- stale open days
-- ============================================================================

BEGIN;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Daily summary: derived columns
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_attendance
    ADD COLUMN IF NOT EXISTS session_count  smallint,
    ADD COLUMN IF NOT EXISTS worked_seconds integer;

ALTER TABLE public.staff_attendance DROP CONSTRAINT IF EXISTS staff_attendance_summary_valid;
ALTER TABLE public.staff_attendance ADD CONSTRAINT staff_attendance_summary_valid CHECK (
    (session_count IS NULL OR session_count >= 0)
    AND (worked_seconds IS NULL OR worked_seconds >= 0)
);

COMMENT ON COLUMN public.staff_attendance.session_count IS
  'FA-ATTENDANCE-MULTISESSION-01: number of sessions this day (derived from staff_attendance_sessions; server-maintained).';
COMMENT ON COLUMN public.staff_attendance.worked_seconds IS
  'FA-ATTENDANCE-MULTISESSION-01: sum of closed session durations (excludes breaks between sessions). check_out_at - check_in_at is the span and includes breaks.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Sessions table
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_attendance_sessions (
    -- Client-generated at the check-in tap and reused on every retry: the idempotency key.
    id                           uuid PRIMARY KEY,
    attendance_id                uuid NOT NULL REFERENCES public.staff_attendance(id) ON DELETE RESTRICT,
    staff_id                     uuid NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    business_date                date NOT NULL,
    session_no                   smallint NOT NULL,
    source                       text NOT NULL DEFAULT 'APP',
    check_in_at                  timestamptz NOT NULL,
    check_out_at                 timestamptz,
    status                       text NOT NULL DEFAULT 'CHECKED_IN',
    check_in_server_received_at  timestamptz NOT NULL DEFAULT now(),
    check_out_server_received_at timestamptz,
    check_in_latitude            double precision,
    check_in_longitude           double precision,
    check_in_accuracy_m          real,
    check_in_location_at         timestamptz,
    check_in_location_status     text,
    check_out_latitude           double precision,
    check_out_longitude          double precision,
    check_out_accuracy_m         real,
    check_out_location_at        timestamptz,
    check_out_location_status    text,
    created_at                   timestamptz NOT NULL DEFAULT now(),
    updated_at                   timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT sas_source_check CHECK (source IN ('APP', 'LEGACY_APP', 'BACKFILL')),
    CONSTRAINT sas_status_check CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT')),
    CONSTRAINT sas_status_consistency CHECK ((status = 'CHECKED_OUT') = (check_out_at IS NOT NULL)),
    CONSTRAINT sas_checkout_after_checkin CHECK (check_out_at IS NULL OR check_out_at > check_in_at),
    CONSTRAINT sas_session_no_range CHECK (session_no BETWEEN 1 AND 50),
    CONSTRAINT sas_day_session_key UNIQUE (attendance_id, session_no),
    CONSTRAINT sas_check_in_location_valid CHECK (
        (check_in_location_status IS NULL OR check_in_location_status IN
            ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
        AND ((check_in_latitude IS NULL) = (check_in_longitude IS NULL))
        AND (check_in_latitude  IS NULL OR (check_in_latitude  BETWEEN -90  AND 90))
        AND (check_in_longitude IS NULL OR (check_in_longitude BETWEEN -180 AND 180))
        AND (check_in_accuracy_m IS NULL OR check_in_accuracy_m >= 0)
        AND ((check_in_latitude IS NOT NULL) = (COALESCE(check_in_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
        AND (check_in_accuracy_m IS NULL OR check_in_latitude IS NOT NULL)
    ),
    CONSTRAINT sas_check_out_location_valid CHECK (
        (check_out_location_status IS NULL OR check_out_location_status IN
            ('CAPTURED','LOW_ACCURACY','PERMISSION_DENIED','PERMISSION_BLOCKED','SERVICES_DISABLED','TIMEOUT','STALE','UNAVAILABLE'))
        AND ((check_out_latitude IS NULL) = (check_out_longitude IS NULL))
        AND (check_out_latitude  IS NULL OR (check_out_latitude  BETWEEN -90  AND 90))
        AND (check_out_longitude IS NULL OR (check_out_longitude BETWEEN -180 AND 180))
        AND (check_out_accuracy_m IS NULL OR check_out_accuracy_m >= 0)
        AND ((check_out_latitude IS NOT NULL) = (COALESCE(check_out_location_status, '') IN ('CAPTURED','LOW_ACCURACY')))
        AND (check_out_accuracy_m IS NULL OR check_out_latitude IS NOT NULL)
        AND (check_out_location_status IS NULL OR check_out_at IS NOT NULL)
    )
);

-- At most one open session per employee per business day (race-proof backstop).
CREATE UNIQUE INDEX IF NOT EXISTS uq_sas_one_open_per_day
    ON public.staff_attendance_sessions (staff_id, business_date)
    WHERE check_out_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sas_staff_date
    ON public.staff_attendance_sessions (staff_id, business_date DESC);
CREATE INDEX IF NOT EXISTS idx_sas_date
    ON public.staff_attendance_sessions (business_date DESC);

COMMENT ON TABLE public.staff_attendance_sessions IS
  'FA-ATTENDANCE-MULTISESSION-01: one row per check-in/check-out pair. Written only by fa_attendance_check_in/out RPCs and the legacy mirror trigger. Never deleted.';

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Trusted-sync detection
--    The summary may be rewritten only by server functions. They set a
--    transaction-local flag; the flag is honoured only when the effective role
--    is not an API role (inside SECURITY DEFINER, current_user is the owner).
--    PostgREST does not expose pg_catalog.set_config, and even if an API role
--    set the flag, the current_user test rejects it.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_sync_active()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
    SELECT COALESCE(current_setting('fa.attendance_session_sync', true), '') = 'on'
       AND current_user NOT IN ('authenticated', 'anon');
$$;
-- authenticated keeps EXECUTE: fa_attendance_enforce() is SECURITY INVOKER and calls
-- this during employees' direct (legacy APK) writes. It only returns a boolean.
REVOKE ALL ON FUNCTION public.fa_attendance_sync_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fa_attendance_sync_active() TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 4. staff_attendance BEFORE trigger: 243 body + trusted summary path
--    Differences from 243 are marked [245].
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sync boolean := public.fa_attendance_sync_active();   -- [245]
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.business_date := (NEW.check_in_at AT TIME ZONE 'Asia/Kolkata')::date;
        NEW.check_in_server_received_at := now();
        NEW.created_at := now();
        -- [245] Derived columns are server-maintained only.
        IF NOT v_sync THEN
            NEW.session_count := NULL;
            NEW.worked_seconds := NULL;
        END IF;

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

        IF v_sync THEN
            -- [245] Trusted summary recompute: check-out fields mirror the sessions
            -- (last closed session, or NULL while a session is open). The session
            -- rows keep every original check-out, so no evidence is lost.
            IF NEW.check_out_at IS NULL THEN
                NEW.check_out_server_received_at := NULL;
                NEW.check_out_latitude := NULL;
                NEW.check_out_longitude := NULL;
                NEW.check_out_accuracy_m := NULL;
                NEW.check_out_location_at := NULL;
                NEW.check_out_location_status := NULL;
            END IF;
        ELSE
            -- [245] Employees cannot write the derived columns.
            NEW.session_count := OLD.session_count;
            NEW.worked_seconds := OLD.worked_seconds;

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

-- Sessions: keep updated_at honest and the immutable fields immutable even for
-- definer code paths (defence in depth; employees cannot UPDATE at all).
CREATE OR REPLACE FUNCTION public.fa_attendance_session_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        NEW.id := OLD.id;
        NEW.attendance_id := OLD.attendance_id;
        NEW.staff_id := OLD.staff_id;
        NEW.business_date := OLD.business_date;
        NEW.session_no := OLD.session_no;
        NEW.source := OLD.source;
        NEW.check_in_at := OLD.check_in_at;
        NEW.check_in_server_received_at := OLD.check_in_server_received_at;
        NEW.check_in_latitude := OLD.check_in_latitude;
        NEW.check_in_longitude := OLD.check_in_longitude;
        NEW.check_in_accuracy_m := OLD.check_in_accuracy_m;
        NEW.check_in_location_at := OLD.check_in_location_at;
        NEW.check_in_location_status := OLD.check_in_location_status;
        NEW.created_at := OLD.created_at;
        IF OLD.check_out_at IS NOT NULL THEN
            -- First check-out wins, with its location.
            NEW.check_out_at := OLD.check_out_at;
            NEW.check_out_server_received_at := OLD.check_out_server_received_at;
            NEW.check_out_latitude := OLD.check_out_latitude;
            NEW.check_out_longitude := OLD.check_out_longitude;
            NEW.check_out_accuracy_m := OLD.check_out_accuracy_m;
            NEW.check_out_location_at := OLD.check_out_location_at;
            NEW.check_out_location_status := OLD.check_out_location_status;
        END IF;
        NEW.status := CASE WHEN NEW.check_out_at IS NULL THEN 'CHECKED_IN' ELSE 'CHECKED_OUT' END;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_attendance_session_enforce ON public.staff_attendance_sessions;
CREATE TRIGGER trg_fa_attendance_session_enforce
    BEFORE INSERT OR UPDATE ON public.staff_attendance_sessions
    FOR EACH ROW EXECUTE FUNCTION public.fa_attendance_session_enforce();

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Internal helpers (not callable by API roles)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_lock_day(p_staff uuid, p_date date)
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
    -- Serialises every session write for one employee-day (check-in, check-out, legacy mirror).
    SELECT pg_advisory_xact_lock(hashtextextended('fa_attendance:' || p_staff::text || ':' || p_date::text, 0));
$$;
REVOKE ALL ON FUNCTION public.fa_attendance_lock_day(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fa_attendance_recompute_day(p_attendance_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_open   integer;
    v_count  integer;
    v_worked integer;
    v_last   public.staff_attendance_sessions%ROWTYPE;
BEGIN
    SELECT count(*) FILTER (WHERE check_out_at IS NULL),
           count(*),
           COALESCE(SUM(EXTRACT(EPOCH FROM (check_out_at - check_in_at)))
                    FILTER (WHERE check_out_at IS NOT NULL), 0)::integer
      INTO v_open, v_count, v_worked
      FROM public.staff_attendance_sessions
     WHERE attendance_id = p_attendance_id;

    SELECT * INTO v_last
      FROM public.staff_attendance_sessions
     WHERE attendance_id = p_attendance_id AND check_out_at IS NOT NULL
     ORDER BY check_out_at DESC
     LIMIT 1;

    PERFORM set_config('fa.attendance_session_sync', 'on', true);
    UPDATE public.staff_attendance a SET
        check_out_at                 = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_at END,
        check_out_server_received_at = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_server_received_at END,
        check_out_latitude           = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_latitude END,
        check_out_longitude          = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_longitude END,
        check_out_accuracy_m         = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_accuracy_m END,
        check_out_location_at        = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_location_at END,
        check_out_location_status    = CASE WHEN v_open > 0 THEN NULL ELSE v_last.check_out_location_status END,
        session_count                = v_count,
        worked_seconds               = v_worked
     WHERE a.id = p_attendance_id;
    PERFORM set_config('fa.attendance_session_sync', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.fa_attendance_recompute_day(uuid) FROM PUBLIC, anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Employee RPCs
--    Errors: 42501 not authorised; 23514 rule violation (permanent — the
--    SyncService marks the op FAILED); P0002 session not found (retryable:
--    the check-in may still be in flight).
--    Both return jsonb: { session_id, attendance_id, business_date, session_no,
--                         status, duplicate }
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_check_in(
    p_session_id      uuid,
    p_check_in_at     timestamptz,
    p_latitude        double precision DEFAULT NULL,
    p_longitude       double precision DEFAULT NULL,
    p_accuracy_m      real DEFAULT NULL,
    p_location_at     timestamptz DEFAULT NULL,
    p_location_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid        uuid := auth.uid();
    v_date       date;
    v_session    public.staff_attendance_sessions%ROWTYPE;
    v_att_id     uuid;
    v_last_out   timestamptz;
    v_count      integer;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
    END IF;
    IF p_session_id IS NULL OR p_check_in_at IS NULL THEN
        RAISE EXCEPTION 'Session id and check-in time are required' USING ERRCODE = '23514';
    END IF;

    v_date := (p_check_in_at AT TIME ZONE 'Asia/Kolkata')::date;
    PERFORM public.fa_attendance_lock_day(v_uid, v_date);

    -- Idempotent replay: the same session id always returns the same session.
    SELECT * INTO v_session FROM public.staff_attendance_sessions WHERE id = p_session_id;
    IF FOUND THEN
        IF v_session.staff_id <> v_uid THEN
            RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
        END IF;
        RETURN jsonb_build_object('session_id', v_session.id, 'attendance_id', v_session.attendance_id,
            'business_date', v_session.business_date, 'session_no', v_session.session_no,
            'status', v_session.status, 'duplicate', true);
    END IF;

    IF p_check_in_at > now() + interval '5 minutes' OR p_check_in_at < now() - interval '72 hours' THEN
        RAISE EXCEPTION 'Check-in time is outside the accepted window' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.staff_leave_requests l
         WHERE l.staff_id = v_uid AND l.status = 'Approved'
           AND v_date BETWEEN l.start_date AND l.end_date
    ) THEN
        RAISE EXCEPTION 'Approved leave exists for this date' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (
        SELECT 1 FROM public.staff_attendance_sessions
         WHERE staff_id = v_uid AND business_date = v_date AND check_out_at IS NULL
    ) THEN
        RAISE EXCEPTION 'OPEN_SESSION_EXISTS: check out of the current session first' USING ERRCODE = '23514';
    END IF;

    SELECT max(check_out_at), count(*) INTO v_last_out, v_count
      FROM public.staff_attendance_sessions
     WHERE staff_id = v_uid AND business_date = v_date;
    IF v_last_out IS NOT NULL AND p_check_in_at < v_last_out THEN
        RAISE EXCEPTION 'SESSION_OVERLAP: check-in is earlier than the previous check-out' USING ERRCODE = '23514';
    END IF;
    IF v_count >= 10 THEN
        RAISE EXCEPTION 'SESSION_LIMIT: at most 10 sessions per day' USING ERRCODE = '23514';
    END IF;

    SELECT id INTO v_att_id FROM public.staff_attendance WHERE staff_id = v_uid AND business_date = v_date;
    IF v_att_id IS NULL THEN
        -- First session of the day creates the summary row (BEFORE INSERT trigger validates).
        PERFORM set_config('fa.attendance_session_sync', 'on', true);
        INSERT INTO public.staff_attendance (
            id, staff_id, business_date, check_in_at, status,
            check_in_latitude, check_in_longitude, check_in_accuracy_m,
            check_in_location_at, check_in_location_status)
        VALUES (
            gen_random_uuid(), v_uid, v_date, p_check_in_at, 'CHECKED_IN',
            p_latitude, p_longitude, p_accuracy_m, p_location_at, p_location_status)
        RETURNING id INTO v_att_id;
        PERFORM set_config('fa.attendance_session_sync', 'off', true);
    END IF;

    INSERT INTO public.staff_attendance_sessions (
        id, attendance_id, staff_id, business_date, session_no, source, check_in_at, status,
        check_in_server_received_at,
        check_in_latitude, check_in_longitude, check_in_accuracy_m,
        check_in_location_at, check_in_location_status)
    VALUES (
        p_session_id, v_att_id, v_uid, v_date, v_count + 1, 'APP', p_check_in_at, 'CHECKED_IN',
        now(),
        p_latitude, p_longitude, p_accuracy_m, p_location_at, p_location_status)
    RETURNING * INTO v_session;

    PERFORM public.fa_attendance_recompute_day(v_att_id);

    RETURN jsonb_build_object('session_id', v_session.id, 'attendance_id', v_att_id,
        'business_date', v_date, 'session_no', v_session.session_no,
        'status', v_session.status, 'duplicate', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.fa_attendance_check_out(
    p_session_id      uuid,
    p_check_out_at    timestamptz,
    p_latitude        double precision DEFAULT NULL,
    p_longitude       double precision DEFAULT NULL,
    p_accuracy_m      real DEFAULT NULL,
    p_location_at     timestamptz DEFAULT NULL,
    p_location_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid     uuid := auth.uid();
    v_session public.staff_attendance_sessions%ROWTYPE;
BEGIN
    IF v_uid IS NULL OR NOT public.is_active_user() THEN
        RAISE EXCEPTION 'Not authorised' USING ERRCODE = '42501';
    END IF;
    IF p_session_id IS NULL OR p_check_out_at IS NULL THEN
        RAISE EXCEPTION 'Session id and check-out time are required' USING ERRCODE = '23514';
    END IF;

    SELECT * INTO v_session FROM public.staff_attendance_sessions
     WHERE id = p_session_id AND staff_id = v_uid;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = 'P0002';
    END IF;

    PERFORM public.fa_attendance_lock_day(v_uid, v_session.business_date);
    SELECT * INTO v_session FROM public.staff_attendance_sessions WHERE id = p_session_id FOR UPDATE;

    -- Idempotent replay / duplicate tap: the first check-out wins.
    IF v_session.check_out_at IS NOT NULL THEN
        RETURN jsonb_build_object('session_id', v_session.id, 'attendance_id', v_session.attendance_id,
            'business_date', v_session.business_date, 'session_no', v_session.session_no,
            'status', v_session.status, 'duplicate', true);
    END IF;

    IF p_check_out_at > now() + interval '5 minutes' THEN
        RAISE EXCEPTION 'Check-out time is in the future' USING ERRCODE = '23514';
    END IF;
    IF p_check_out_at <= v_session.check_in_at THEN
        RAISE EXCEPTION 'Check-out time must be after check-in time' USING ERRCODE = '23514';
    END IF;

    UPDATE public.staff_attendance_sessions SET
        check_out_at = p_check_out_at,
        check_out_server_received_at = now(),
        check_out_latitude = p_latitude,
        check_out_longitude = p_longitude,
        check_out_accuracy_m = p_accuracy_m,
        check_out_location_at = p_location_at,
        check_out_location_status = p_location_status
     WHERE id = p_session_id
    RETURNING * INTO v_session;

    PERFORM public.fa_attendance_recompute_day(v_session.attendance_id);

    RETURN jsonb_build_object('session_id', v_session.id, 'attendance_id', v_session.attendance_id,
        'business_date', v_session.business_date, 'session_no', v_session.session_no,
        'status', v_session.status, 'duplicate', false);
END;
$$;

REVOKE ALL ON FUNCTION public.fa_attendance_check_in(uuid, timestamptz, double precision, double precision, real, timestamptz, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.fa_attendance_check_out(uuid, timestamptz, double precision, double precision, real, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.fa_attendance_check_in(uuid, timestamptz, double precision, double precision, real, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fa_attendance_check_out(uuid, timestamptz, double precision, double precision, real, timestamptz, text) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Admin-only session coordinates (mirrors 244's admin_attendance_locations)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_attendance_session_locations(
    p_from date,
    p_to date,
    p_staff uuid DEFAULT NULL
)
RETURNS TABLE (
    session_id uuid,
    attendance_id uuid,
    staff_id uuid,
    business_date date,
    session_no smallint,
    check_in_latitude double precision,
    check_in_longitude double precision,
    check_in_accuracy_m real,
    check_in_location_at timestamptz,
    check_in_location_status text,
    check_out_latitude double precision,
    check_out_longitude double precision,
    check_out_accuracy_m real,
    check_out_location_at timestamptz,
    check_out_location_status text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Not authorised to read attendance locations' USING ERRCODE = '42501';
    END IF;
    IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 92 THEN
        RAISE EXCEPTION 'Date range must be 0-92 days' USING ERRCODE = '22023';
    END IF;
    RETURN QUERY
        SELECT s.id, s.attendance_id, s.staff_id, s.business_date, s.session_no,
               s.check_in_latitude, s.check_in_longitude, s.check_in_accuracy_m,
               s.check_in_location_at, s.check_in_location_status,
               s.check_out_latitude, s.check_out_longitude, s.check_out_accuracy_m,
               s.check_out_location_at, s.check_out_location_status
          FROM public.staff_attendance_sessions s
         WHERE s.business_date BETWEEN p_from AND p_to
           AND (p_staff IS NULL OR s.staff_id = p_staff);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_attendance_session_locations(date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_attendance_session_locations(date, date, uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 8. Access control on sessions
--    Employees: SELECT own rows, non-coordinate columns only. No INSERT/UPDATE/
--    DELETE (writes go through the RPCs). Admins: SELECT all rows, same columns;
--    coordinates via admin_attendance_session_locations() only.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_attendance_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view own attendance sessions" ON public.staff_attendance_sessions;
DROP POLICY IF EXISTS "Admins can view all attendance sessions" ON public.staff_attendance_sessions;
CREATE POLICY "Staff can view own attendance sessions"
    ON public.staff_attendance_sessions FOR SELECT TO authenticated
    USING (staff_id = auth.uid() AND public.is_active_user());
CREATE POLICY "Admins can view all attendance sessions"
    ON public.staff_attendance_sessions FOR SELECT TO authenticated
    USING (public.is_admin());

REVOKE ALL ON public.staff_attendance_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT (
    id, attendance_id, staff_id, business_date, session_no, source,
    check_in_at, check_out_at, status,
    check_in_server_received_at, check_out_server_received_at,
    check_in_accuracy_m, check_in_location_at, check_in_location_status,
    check_out_accuracy_m, check_out_location_at, check_out_location_status,
    created_at, updated_at
) ON public.staff_attendance_sessions TO authenticated;

-- New summary columns readable when 244's column-level grants are in force
-- (harmless while the table-level SELECT grant still exists).
GRANT SELECT (session_count, worked_seconds) ON public.staff_attendance TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 9. Backfill: one BACKFILL session per existing day (history preserved as-is)
-- ────────────────────────────────────────────────────────────────────────────
INSERT INTO public.staff_attendance_sessions (
    id, attendance_id, staff_id, business_date, session_no, source,
    check_in_at, check_out_at, status,
    check_in_server_received_at, check_out_server_received_at,
    check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_location_at, check_in_location_status,
    check_out_latitude, check_out_longitude, check_out_accuracy_m, check_out_location_at, check_out_location_status)
SELECT
    gen_random_uuid(), a.id, a.staff_id, a.business_date, 1, 'BACKFILL',
    a.check_in_at, a.check_out_at, a.status,
    a.check_in_server_received_at, a.check_out_server_received_at,
    a.check_in_latitude, a.check_in_longitude, a.check_in_accuracy_m, a.check_in_location_at, a.check_in_location_status,
    a.check_out_latitude, a.check_out_longitude, a.check_out_accuracy_m, a.check_out_location_at, a.check_out_location_status
FROM public.staff_attendance a
WHERE NOT EXISTS (SELECT 1 FROM public.staff_attendance_sessions s WHERE s.attendance_id = a.id);

-- Derived columns only; check_out_* stay exactly as they are for backfilled days.
SELECT set_config('fa.attendance_session_sync', 'on', true);
UPDATE public.staff_attendance a SET
    session_count = 1,
    worked_seconds = CASE WHEN a.check_out_at IS NULL THEN 0
                          ELSE EXTRACT(EPOCH FROM (a.check_out_at - a.check_in_at))::integer END
WHERE a.session_count IS NULL;
SELECT set_config('fa.attendance_session_sync', 'off', true);

-- ────────────────────────────────────────────────────────────────────────────
-- 10. Legacy mirror: older APKs keep upserting staff_attendance directly.
--     Mirror those writes into sessions so both stay consistent:
--       - day with no session        → create a LEGACY_APP session
--       - check-out with open session → close the open session
--     Skipped for the RPC/recompute path (trusted flag).
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_mirror_legacy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_open_id uuid;
BEGIN
    IF COALESCE(current_setting('fa.attendance_session_sync', true), '') = 'on' THEN
        RETURN NULL;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.check_out_at IS NOT DISTINCT FROM NEW.check_out_at THEN
        RETURN NULL;
    END IF;

    PERFORM public.fa_attendance_lock_day(NEW.staff_id, NEW.business_date);

    IF NOT EXISTS (SELECT 1 FROM public.staff_attendance_sessions WHERE attendance_id = NEW.id) THEN
        INSERT INTO public.staff_attendance_sessions (
            id, attendance_id, staff_id, business_date, session_no, source,
            check_in_at, check_out_at, status,
            check_in_server_received_at, check_out_server_received_at,
            check_in_latitude, check_in_longitude, check_in_accuracy_m, check_in_location_at, check_in_location_status,
            check_out_latitude, check_out_longitude, check_out_accuracy_m, check_out_location_at, check_out_location_status)
        VALUES (
            gen_random_uuid(), NEW.id, NEW.staff_id, NEW.business_date, 1, 'LEGACY_APP',
            NEW.check_in_at, NEW.check_out_at, NEW.status,
            NEW.check_in_server_received_at, NEW.check_out_server_received_at,
            NEW.check_in_latitude, NEW.check_in_longitude, NEW.check_in_accuracy_m, NEW.check_in_location_at, NEW.check_in_location_status,
            NEW.check_out_latitude, NEW.check_out_longitude, NEW.check_out_accuracy_m, NEW.check_out_location_at, NEW.check_out_location_status);
    ELSIF NEW.check_out_at IS NOT NULL THEN
        SELECT id INTO v_open_id FROM public.staff_attendance_sessions
         WHERE attendance_id = NEW.id AND check_out_at IS NULL
           AND check_in_at < NEW.check_out_at
         ORDER BY session_no DESC LIMIT 1;
        IF v_open_id IS NOT NULL THEN
            UPDATE public.staff_attendance_sessions SET
                check_out_at = NEW.check_out_at,
                check_out_server_received_at = NEW.check_out_server_received_at,
                check_out_latitude = NEW.check_out_latitude,
                check_out_longitude = NEW.check_out_longitude,
                check_out_accuracy_m = NEW.check_out_accuracy_m,
                check_out_location_at = NEW.check_out_location_at,
                check_out_location_status = NEW.check_out_location_status
             WHERE id = v_open_id;
        END IF;
    END IF;

    PERFORM public.fa_attendance_recompute_day(NEW.id);
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.fa_attendance_mirror_legacy() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_fa_attendance_mirror_legacy ON public.staff_attendance;
CREATE TRIGGER trg_fa_attendance_mirror_legacy
    AFTER INSERT OR UPDATE ON public.staff_attendance
    FOR EACH ROW EXECUTE FUNCTION public.fa_attendance_mirror_legacy();

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- Post-apply verification (staging first; run as an employee and as an admin):
--   employee: rpc fa_attendance_check_in(<uuid A>, now())        → duplicate=false, session_no=1
--   employee: same call again                                    → duplicate=true, same session
--   employee: rpc fa_attendance_check_out(<uuid A>, now())       → status CHECKED_OUT
--   employee: rpc fa_attendance_check_in(<uuid B>, now())        → session_no=2; summary check_out_at NULL
--   employee: select check_in_latitude from staff_attendance_sessions → 42501
--   employee: insert into staff_attendance_sessions ...          → 42501
--   employee: rpc admin_attendance_session_locations(...)        → 42501
--   admin:    rpc admin_attendance_session_locations(from, to)   → coordinates per session
--   consistency (expect 0 rows):
--     SELECT a.id FROM staff_attendance a
--       LEFT JOIN LATERAL (SELECT count(*) c FROM staff_attendance_sessions s WHERE s.attendance_id = a.id) x ON true
--      WHERE a.session_count IS DISTINCT FROM x.c;
-- ────────────────────────────────────────────────────────────────────────────
