-- ============================================================================
-- PROPOSED MIGRATION: 242_sprint_FA_ATTENDANCE_01.sql
-- SPRINT: FA-ATTENDANCE-01 — Field Assist Attendance & Leave
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- This file intentionally lives in supabase/proposals/ (not supabase/migrations/)
-- so it cannot be picked up by `supabase db push` before approval.
-- Rollback: supabase/proposals/242_rollback_sprint_FA_ATTENDANCE_01.sql
--
-- PURPOSE:
-- 1. staff_attendance      — one authoritative attendance record per staff per
--                            business day (Asia/Kolkata).
-- 2. staff_leave_requests  — leave applications with a Pending → Approved /
--                            Rejected workflow reviewed by an Admin (never self).
--
-- CLIENT CONTRACT (Field Assist, via the existing SyncService queue):
--   Check-in : UPSERT staff_attendance ON CONFLICT (staff_id, business_date)
--              { id, staff_id, business_date, check_in_at, status:'CHECKED_IN' }
--   Check-out: UPSERT staff_attendance ON CONFLICT (staff_id, business_date)
--              { id, staff_id, business_date, check_in_at, check_out_at,
--                status:'CHECKED_OUT' }
--   Leave    : INSERT staff_leave_requests { id (client UUID), staff_id,
--              leave_type, start_date, end_date, reason }
--   The triggers below make every retry and out-of-order delivery idempotent:
--   the first check-in and the first check-out always win.
--
-- SAFETY: Additive only. No existing table, policy or row is modified.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1. staff_attendance
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_attendance (
    id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id                     UUID NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    business_date                DATE NOT NULL,
    check_in_at                  TIMESTAMPTZ NOT NULL,
    check_out_at                 TIMESTAMPTZ,
    status                       TEXT NOT NULL DEFAULT 'CHECKED_IN',
    check_in_server_received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out_server_received_at TIMESTAMPTZ,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT staff_attendance_status_check
        CHECK (status IN ('CHECKED_IN', 'CHECKED_OUT')),
    CONSTRAINT staff_attendance_checkout_after_checkin
        CHECK (check_out_at IS NULL OR check_out_at > check_in_at),
    CONSTRAINT staff_attendance_status_consistency
        CHECK ((status = 'CHECKED_OUT') = (check_out_at IS NOT NULL)),
    -- Duplicate-check-in prevention: one record per staff per business day.
    CONSTRAINT staff_attendance_staff_date_key UNIQUE (staff_id, business_date)
);

COMMENT ON TABLE public.staff_attendance IS
  'FA-ATTENDANCE-01: one attendance record per staff per Asia/Kolkata business day. Distinct from staff_tracking_sessions (field sessions) and crm_visits.';
COMMENT ON COLUMN public.staff_attendance.check_in_at IS
  'Device-captured check-in time (may be queued offline). Server receipt time is check_in_server_received_at.';

CREATE INDEX IF NOT EXISTS idx_staff_attendance_staff_date
    ON public.staff_attendance (staff_id, business_date DESC);


-- ────────────────────────────────────────────────────────────────────────────
-- 2. staff_leave_requests
-- Leave types are a PROPOSAL (no leave policy exists in the codebase).
-- No balances and no auto-approval are implemented.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.staff_leave_requests (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),  -- client UUID = idempotency key
    staff_id     UUID NOT NULL REFERENCES public.app_users(id) ON DELETE RESTRICT,
    leave_type   TEXT NOT NULL,
    start_date   DATE NOT NULL,
    end_date     DATE NOT NULL,
    reason       TEXT NOT NULL,
    status       TEXT NOT NULL DEFAULT 'Pending',
    reviewed_by  UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    reviewed_at  TIMESTAMPTZ,
    review_note  TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT staff_leave_type_check
        CHECK (leave_type IN ('CASUAL', 'SICK', 'OTHER')),
    CONSTRAINT staff_leave_status_check
        CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    CONSTRAINT staff_leave_date_order
        CHECK (end_date >= start_date),
    CONSTRAINT staff_leave_max_span
        CHECK (end_date - start_date <= 30),
    CONSTRAINT staff_leave_reason_length
        CHECK (char_length(btrim(reason)) BETWEEN 5 AND 500),
    -- Self-approval prevention (enforced in data, not only in UI or RLS).
    CONSTRAINT staff_leave_no_self_review
        CHECK (reviewed_by IS NULL OR reviewed_by <> staff_id),
    -- One-directional so ON DELETE SET NULL of a reviewer cannot violate it.
    CONSTRAINT staff_leave_review_consistency
        CHECK (status <> 'Pending' OR (reviewed_by IS NULL AND reviewed_at IS NULL))
);

CREATE INDEX IF NOT EXISTS idx_staff_leave_staff_dates
    ON public.staff_leave_requests (staff_id, start_date DESC);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. Attendance integrity trigger (idempotency + server-side validation)
-- Validation failures use ERRCODE 23514 so the Field Assist SyncService treats
-- them as permanent (FAILED, visible to staff) instead of retrying silently.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_attendance_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Business date is always derived server-side from the check-in instant.
        -- (BEFORE triggers run before ON CONFLICT arbitration, so this value is
        -- what (staff_id, business_date) conflict detection uses.)
        NEW.business_date := (NEW.check_in_at AT TIME ZONE 'Asia/Kolkata')::date;
        NEW.check_in_server_received_at := now();
        NEW.created_at := now();

        -- FA-ATTENDANCE-02 review fix: BEFORE INSERT also fires for upserts that
        -- will take the ON CONFLICT DO UPDATE path (e.g. check-out). If the day's
        -- record already exists, skip insert-only validation; the UPDATE branch
        -- below governs the conflict path.
        IF EXISTS (
            SELECT 1 FROM public.staff_attendance a
            WHERE a.staff_id = NEW.staff_id AND a.business_date = NEW.business_date
        ) THEN
            NEW.updated_at := now();
            RETURN NEW;
        END IF;

        -- Offline window: accept device time up to 72h old, max 5 min in future.
        IF NEW.check_in_at > now() + interval '5 minutes'
           OR NEW.check_in_at < now() - interval '72 hours' THEN
            RAISE EXCEPTION 'Check-in time is outside the accepted window'
                USING ERRCODE = '23514';
        END IF;

        -- No check-in on a date covered by an APPROVED leave.
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
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Immutable identity and check-in: the first check-in always wins.
        NEW.id := OLD.id;
        NEW.staff_id := OLD.staff_id;
        NEW.business_date := OLD.business_date;
        NEW.check_in_at := OLD.check_in_at;
        NEW.check_in_server_received_at := OLD.check_in_server_received_at;
        NEW.created_at := OLD.created_at;

        IF OLD.check_out_at IS NOT NULL THEN
            -- Duplicate check-out: keep the first, ignore later attempts (idempotent).
            NEW.check_out_at := OLD.check_out_at;
            NEW.check_out_server_received_at := OLD.check_out_server_received_at;
        ELSIF NEW.check_out_at IS NOT NULL THEN
            IF NEW.check_out_at > now() + interval '5 minutes' THEN
                RAISE EXCEPTION 'Check-out time is in the future'
                    USING ERRCODE = '23514';
            END IF;
            NEW.check_out_server_received_at := now();
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


-- ────────────────────────────────────────────────────────────────────────────
-- 4. Leave integrity trigger
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fa_leave_enforce()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- New requests always start Pending and unreviewed, whatever the client sent.
        NEW.status := 'Pending';
        NEW.reviewed_by := NULL;
        NEW.reviewed_at := NULL;
        NEW.review_note := NULL;
        NEW.created_at := now();

        -- Serialize this employee's leave inserts so concurrent overlapping
        -- requests cannot both pass the overlap check.
        PERFORM pg_advisory_xact_lock(hashtextextended('fa_leave:' || NEW.staff_id::text, 0));

        IF EXISTS (
            SELECT 1 FROM public.staff_leave_requests l
            WHERE l.staff_id = NEW.staff_id
              AND l.id <> NEW.id
              AND l.status IN ('Pending', 'Approved')
              AND daterange(l.start_date, l.end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
        ) THEN
            RAISE EXCEPTION 'Overlaps an existing pending or approved leave request'
                USING ERRCODE = '23514';
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Review may only change status / reviewer fields; the request itself is immutable.
        NEW.id := OLD.id;
        NEW.staff_id := OLD.staff_id;
        NEW.leave_type := OLD.leave_type;
        NEW.start_date := OLD.start_date;
        NEW.end_date := OLD.end_date;
        NEW.reason := OLD.reason;
        NEW.created_at := OLD.created_at;

        IF OLD.status <> 'Pending' THEN
            RAISE EXCEPTION 'Leave request has already been reviewed'
                USING ERRCODE = '23514';
        END IF;
        IF NEW.status <> 'Pending' THEN
            NEW.reviewed_by := auth.uid();
            NEW.reviewed_at := now();
        END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fa_leave_enforce ON public.staff_leave_requests;
CREATE TRIGGER trg_fa_leave_enforce
    BEFORE INSERT OR UPDATE ON public.staff_leave_requests
    FOR EACH ROW EXECUTE FUNCTION public.fa_leave_enforce();


-- ────────────────────────────────────────────────────────────────────────────
-- 5. Row Level Security
-- is_active_user() excludes Buyers (migration 224); is_admin() = active Admin.
-- No DELETE policies: attendance and leave history are append/review only.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;

-- Idempotent re-run (repo convention, cf. migration 240).
DROP POLICY IF EXISTS "Staff can view own attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff can check in for themselves" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff can check out own attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.staff_attendance;
DROP POLICY IF EXISTS "Staff can view own leave requests" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Staff can apply for own leave" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Admins can view all leave requests" ON public.staff_leave_requests;
DROP POLICY IF EXISTS "Admins can review others leave requests" ON public.staff_leave_requests;

-- Attendance: staff own rows only
CREATE POLICY "Staff can view own attendance"
    ON public.staff_attendance FOR SELECT TO authenticated
    USING (staff_id = auth.uid() AND public.is_active_user());

CREATE POLICY "Staff can check in for themselves"
    ON public.staff_attendance FOR INSERT TO authenticated
    WITH CHECK (staff_id = auth.uid() AND public.is_active_user());

CREATE POLICY "Staff can check out own attendance"
    ON public.staff_attendance FOR UPDATE TO authenticated
    USING (staff_id = auth.uid() AND public.is_active_user())
    WITH CHECK (staff_id = auth.uid() AND public.is_active_user());

-- Attendance: admins read all (corrections are out of scope for this sprint)
CREATE POLICY "Admins can view all attendance"
    ON public.staff_attendance FOR SELECT TO authenticated
    USING (public.is_admin());

-- Leave: staff own rows only, insert as Pending
CREATE POLICY "Staff can view own leave requests"
    ON public.staff_leave_requests FOR SELECT TO authenticated
    USING (staff_id = auth.uid() AND public.is_active_user());

CREATE POLICY "Staff can apply for own leave"
    ON public.staff_leave_requests FOR INSERT TO authenticated
    WITH CHECK (
        staff_id = auth.uid()
        AND public.is_active_user()
        AND status = 'Pending'
        AND reviewed_by IS NULL
    );

-- Leave: admins review others' requests only (never their own)
CREATE POLICY "Admins can view all leave requests"
    ON public.staff_leave_requests FOR SELECT TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can review others leave requests"
    ON public.staff_leave_requests FOR UPDATE TO authenticated
    USING (public.is_admin() AND staff_id <> auth.uid())
    WITH CHECK (public.is_admin() AND staff_id <> auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.staff_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.staff_leave_requests TO authenticated;
REVOKE ALL ON public.staff_attendance FROM anon;
REVOKE ALL ON public.staff_leave_requests FROM anon;
-- Supabase default privileges grant ALL (incl. TRUNCATE, which bypasses RLS) to authenticated.
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.staff_attendance FROM authenticated;
REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.staff_leave_requests FROM authenticated;

NOTIFY pgrst, 'reload schema';
