-- 252_sprint_LH_DAILY_REGISTER_APPROVAL_01.sql
-- PROPOSAL — NOT APPLIED. Requires 249 + 251 (250 optional). Apply after PO approval.
--
-- Daily labour register, work timestamps and CRM approval.
--
-- Approval scope (decision): ONE register per contractor per business date
--   (labour_daily_registers, UNIQUE (contractor_id, work_date)). Several operators may add work
--   to the same contractor's day; wages, payments and month closing are all per contractor, so a
--   per-operator approval would split one day's wage sheet into conflicting approvals.
--   work_date is the business date chosen on the phone (IST calendar); it is never converted.
--
-- Rules
--   * A register exists for every contractor-day with work (created by trigger, status Pending;
--     existing days are back-filled as Pending — nothing is ever approved automatically).
--   * Only a CRM approver may decide: public.is_admin() (the existing verified CRM admin check)
--     AND not an active member of that contractor (no one approves their own contractor's day).
--   * A decision applies to the exact revision the approver reviewed (p_revision); any change
--     to the day's entries, bag lines or labourer shares bumps the revision.
--   * Changing an Approved or Rejected day moves it back to Pending ("Reopened") — this is also
--     the correction/resubmission path after a rejection. Every transition is logged.
--   * Rejection requires a reason.
--   * Entry timestamps: recorded_at (first save on the phone) never changes once set;
--     work_completed_at is entered by the operator. created_at/updated_at stay server times.
--   * Corrections keep history: every UPDATE/DELETE of a work entry stores the old row.
--
-- Access: registers, events and history are read-only for members (lh_can_read) and CRM admins.
-- No client may write them directly; anon nothing. CRM labour details stay read-only for admins.
-- Rollback: 252_rollback_sprint_LH_DAILY_REGISTER_APPROVAL_01.sql

BEGIN;

DO $$
BEGIN
    IF to_regprocedure('public.lh_can_read(uuid)') IS NULL OR to_regprocedure('public.lh_can_enter(uuid)') IS NULL
       OR to_regprocedure('public.lh_member_role(uuid)') IS NULL OR to_regprocedure('public.is_admin()') IS NULL THEN
        RAISE EXCEPTION '252 requires proposals 249 and 251 (lh_can_read, lh_can_enter, lh_member_role) and public.is_admin()';
    END IF;
END $$;

-- ── 1. Work timestamps ─────────────────────────────────────────────────────
ALTER TABLE public.daily_work_entries
    ADD COLUMN IF NOT EXISTS recorded_at       timestamptz,
    ADD COLUMN IF NOT EXISTS work_completed_at timestamptz;

CREATE OR REPLACE FUNCTION public.lh_keep_recorded_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF OLD.recorded_at IS NOT NULL THEN
        NEW.recorded_at := OLD.recorded_at;          -- the original recording time never changes
    END IF;
    RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_keep_recorded_at() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lh_06_keep_recorded_at ON public.daily_work_entries;
CREATE TRIGGER lh_06_keep_recorded_at BEFORE UPDATE ON public.daily_work_entries
    FOR EACH ROW EXECUTE FUNCTION public.lh_keep_recorded_at();

-- ── 2. Correction history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lh_work_entry_history (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    work_entry_id uuid NOT NULL,                 -- no FK: history outlives a deleted entry
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date     date NOT NULL,
    action        varchar(10) NOT NULL CHECK (action IN ('UPDATE', 'DELETE')),
    old_row       jsonb NOT NULL,
    new_row       jsonb,
    actor         uuid,
    at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lh_entry_history_entry ON public.lh_work_entry_history(work_entry_id, at);
CREATE INDEX IF NOT EXISTS idx_lh_entry_history_day   ON public.lh_work_entry_history(contractor_id, work_date);

CREATE OR REPLACE FUNCTION public.lh_log_entry_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.lh_work_entry_history (work_entry_id, contractor_id, work_date, action, old_row, new_row, actor)
        VALUES (OLD.id, OLD.contractor_id, OLD.work_date, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
        RETURN NEW;
    END IF;
    INSERT INTO public.lh_work_entry_history (work_entry_id, contractor_id, work_date, action, old_row, actor)
    VALUES (OLD.id, OLD.contractor_id, OLD.work_date, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_log_entry_history() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS lh_95_history ON public.daily_work_entries;
CREATE TRIGGER lh_95_history AFTER UPDATE OR DELETE ON public.daily_work_entries
    FOR EACH ROW EXECUTE FUNCTION public.lh_log_entry_history();

-- ── 3. Daily registers + events ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.labour_daily_registers (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id    uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date        date NOT NULL,
    status           varchar(10) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    revision         int NOT NULL DEFAULT 1,
    rejection_reason text,
    decided_by       uuid,
    decided_at       timestamptz,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_daily_register UNIQUE (contractor_id, work_date),
    CONSTRAINT daily_register_decision CHECK (
        (status = 'Pending'  AND decided_by IS NULL AND decided_at IS NULL AND rejection_reason IS NULL) OR
        (status = 'Approved' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND rejection_reason IS NULL) OR
        (status = 'Rejected' AND decided_by IS NOT NULL AND decided_at IS NOT NULL AND length(btrim(rejection_reason)) > 0))
);
CREATE INDEX IF NOT EXISTS idx_daily_registers_status ON public.labour_daily_registers(status, work_date);

CREATE TABLE IF NOT EXISTS public.labour_daily_register_events (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    register_id   uuid NOT NULL REFERENCES public.labour_daily_registers(id) ON DELETE RESTRICT,
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date     date NOT NULL,
    action        varchar(10) NOT NULL CHECK (action IN ('Created', 'Approved', 'Rejected', 'Reopened')),
    from_status   varchar(10),
    to_status     varchar(10) NOT NULL,
    revision      int NOT NULL,
    reason        text,
    actor         uuid,
    at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_daily_register_events ON public.labour_daily_register_events(register_id, at);

-- A change to the day's work: create the register (Pending) or bump its revision; a decided day
-- goes back to Pending. SECURITY DEFINER: operators never get write grants on registers.
CREATE OR REPLACE FUNCTION public.lh_register_changed(p_contractor uuid, p_date date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.labour_daily_registers%ROWTYPE;
BEGIN
    IF p_contractor IS NULL OR p_date IS NULL THEN RETURN; END IF;
    INSERT INTO public.labour_daily_registers (contractor_id, work_date) VALUES (p_contractor, p_date)
    ON CONFLICT (contractor_id, work_date) DO NOTHING
    RETURNING * INTO r;
    IF FOUND THEN
        INSERT INTO public.labour_daily_register_events (register_id, contractor_id, work_date, action, to_status, revision, actor)
        VALUES (r.id, p_contractor, p_date, 'Created', 'Pending', r.revision, auth.uid());
        RETURN;
    END IF;
    SELECT * INTO r FROM public.labour_daily_registers WHERE contractor_id = p_contractor AND work_date = p_date FOR UPDATE;
    UPDATE public.labour_daily_registers
       SET revision = revision + 1, status = 'Pending', decided_by = NULL, decided_at = NULL,
           rejection_reason = NULL, updated_at = now()
     WHERE id = r.id;
    IF r.status <> 'Pending' THEN
        INSERT INTO public.labour_daily_register_events (register_id, contractor_id, work_date, action, from_status, to_status, revision, actor)
        VALUES (r.id, p_contractor, p_date, 'Reopened', r.status, 'Pending', r.revision + 1, auth.uid());
    END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_register_changed(uuid, date) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.lh_entry_register_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN PERFORM public.lh_register_changed(OLD.contractor_id, OLD.work_date); END IF;
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.work_date IS DISTINCT FROM OLD.work_date) THEN
        PERFORM public.lh_register_changed(NEW.contractor_id, NEW.work_date);
    END IF;
    RETURN NULL;
END;
$$;
-- Bag lines / labourer shares: the day of their parent entry (gone during a cascade delete,
-- which the entry's own trigger already reports).
CREATE OR REPLACE FUNCTION public.lh_child_register_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_entry uuid; v_contractor uuid; v_date date;
BEGIN
    v_entry := CASE WHEN TG_OP = 'DELETE' THEN OLD.work_entry_id ELSE NEW.work_entry_id END;
    SELECT contractor_id, work_date INTO v_contractor, v_date FROM public.daily_work_entries WHERE id = v_entry;
    IF FOUND THEN PERFORM public.lh_register_changed(v_contractor, v_date); END IF;
    RETURN NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_entry_register_trigger(), public.lh_child_register_trigger() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS lh_96_register ON public.daily_work_entries;
CREATE TRIGGER lh_96_register AFTER INSERT OR UPDATE OR DELETE ON public.daily_work_entries
    FOR EACH ROW EXECUTE FUNCTION public.lh_entry_register_trigger();
DROP TRIGGER IF EXISTS lh_96_register ON public.labour_work_allocations;
CREATE TRIGGER lh_96_register AFTER INSERT OR UPDATE OR DELETE ON public.labour_work_allocations
    FOR EACH ROW EXECUTE FUNCTION public.lh_child_register_trigger();
DROP TRIGGER IF EXISTS lh_96_register ON public.daily_work_details;
CREATE TRIGGER lh_96_register AFTER INSERT OR UPDATE OR DELETE ON public.daily_work_details
    FOR EACH ROW EXECUTE FUNCTION public.lh_child_register_trigger();

-- Back-fill: every existing contractor-day with work gets a Pending register (never Approved).
INSERT INTO public.labour_daily_registers (contractor_id, work_date)
SELECT DISTINCT contractor_id, work_date FROM public.daily_work_entries
ON CONFLICT (contractor_id, work_date) DO NOTHING;
INSERT INTO public.labour_daily_register_events (register_id, contractor_id, work_date, action, to_status, revision, reason)
SELECT r.id, r.contractor_id, r.work_date, 'Created', 'Pending', r.revision, 'Existing work, registered by migration 252'
  FROM public.labour_daily_registers r
 WHERE NOT EXISTS (SELECT 1 FROM public.labour_daily_register_events e WHERE e.register_id = r.id);

-- ── 4. Decision (CRM approver only) ────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_decide_daily_register(
    p_contractor uuid, p_date date, p_decision varchar, p_revision int, p_reason text DEFAULT NULL
) RETURNS public.labour_daily_registers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.labour_daily_registers%ROWTYPE; v_reason text := NULLIF(btrim(p_reason), '');
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Only a Shubh Labh CRM approver can approve or reject a daily register' USING ERRCODE = '42501';
    END IF;
    IF public.lh_member_role(p_contractor) IS NOT NULL THEN
        RAISE EXCEPTION 'Approvers cannot decide registers of a contractor they are a member of' USING ERRCODE = '42501';
    END IF;
    IF p_decision NOT IN ('Approved', 'Rejected') THEN
        RAISE EXCEPTION 'Decision must be Approved or Rejected' USING ERRCODE = '23514';
    END IF;
    IF p_decision = 'Rejected' AND (v_reason IS NULL OR length(v_reason) > 1000) THEN
        RAISE EXCEPTION 'A rejection needs a reason (1–1000 characters)' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO r FROM public.labour_daily_registers WHERE contractor_id = p_contractor AND work_date = p_date FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No daily register for this contractor and date' USING ERRCODE = 'P0002';
    END IF;
    IF r.status <> 'Pending' THEN
        RAISE EXCEPTION 'This register is already %', r.status USING ERRCODE = '23514';
    END IF;
    IF r.revision <> p_revision THEN
        RAISE EXCEPTION 'The register changed while you were reviewing it (revision % → %). Reload and review again.', p_revision, r.revision USING ERRCODE = '40001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.daily_work_entries WHERE contractor_id = p_contractor AND work_date = p_date) THEN
        RAISE EXCEPTION 'The register has no work entries' USING ERRCODE = '23514';
    END IF;
    UPDATE public.labour_daily_registers
       SET status = p_decision, decided_by = auth.uid(), decided_at = now(),
           rejection_reason = CASE WHEN p_decision = 'Rejected' THEN v_reason END, updated_at = now()
     WHERE id = r.id
     RETURNING * INTO r;
    INSERT INTO public.labour_daily_register_events (register_id, contractor_id, work_date, action, from_status, to_status, revision, reason, actor)
    VALUES (r.id, p_contractor, p_date, p_decision, 'Pending', p_decision, r.revision, v_reason, auth.uid());
    RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) TO authenticated;

-- ── 5. CRM list view (security_invoker: the reader's RLS applies) ──────────
CREATE OR REPLACE VIEW public.v_lh_daily_registers WITH (security_invoker = true) AS
SELECT r.id, r.contractor_id, c.name AS contractor_name, r.work_date, r.status, r.revision,
       r.rejection_reason, r.decided_by, r.decided_at, r.created_at, r.updated_at,
       (SELECT count(*) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS entry_count,
       (SELECT COALESCE(sum(e.calculated_labour_amount), 0) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date) AS total_amount,
       (SELECT count(DISTINCT a.labourer_id) FROM public.labour_work_allocations a JOIN public.daily_work_entries e ON e.id = a.work_entry_id
         WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS labourer_count
  FROM public.labour_daily_registers r
  JOIN public.contractors c ON c.id = r.contractor_id;

-- ── 6. Access ──────────────────────────────────────────────────────────────
ALTER TABLE public.labour_daily_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labour_daily_register_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lh_work_entry_history ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t text; p text;
BEGIN
    FOREACH t IN ARRAY ARRAY['labour_daily_registers','labour_daily_register_events','lh_work_entry_history'] LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', p, t);
        END LOOP;
        EXECUTE format('CREATE POLICY lh_read ON public.%I FOR SELECT TO authenticated USING (public.lh_can_read(contractor_id))', t);
    END LOOP;
END $$;
REVOKE ALL ON public.labour_daily_registers, public.labour_daily_register_events, public.lh_work_entry_history,
              public.v_lh_daily_registers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.labour_daily_registers, public.labour_daily_register_events, public.lh_work_entry_history,
                public.v_lh_daily_registers TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
