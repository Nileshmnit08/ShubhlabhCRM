-- 253_sprint_LH_WORK_EDIT_APPROVAL_07.sql
-- PROPOSAL — NOT APPLIED. Requires 249 + 251 + 252. Apply after PO approval.
--
-- Edits of current/past work with CRM re-approval: keep the reviewed versions.
--
-- Design (compatible with the live sync, which edits an entry in place under its stable id):
--   * Every CRM decision (Approved / Rejected) stores an immutable SNAPSHOT of the whole day as
--     it was reviewed: each entry with its quantities, rate, amount, notes, times, creator/editor
--     and labourer shares. The last Approved snapshot is "the approved version".
--   * An edit after a decision updates the entry (same id, contractor, creator, recorded_at),
--     records editor + time (251 updated_by/updated_at, 252 history row) and moves the day back
--     to Pending (252 "Reopened"). It never shows as Approved until the CRM approves again.
--   * The CRM compares the current day with the last Approved snapshot (original vs revised),
--     and the list shows "edited after approval" and the approved total next to the pending one.
--   * A rejected revision is kept in its own snapshot with the reason; the approved snapshot
--     before it is untouched.
--   * Existing decided days are back-filled: a day that is Approved/Rejected now cannot have
--     changed since its decision (any change reopens it), so its current entries ARE the
--     reviewed version.
-- Access: snapshots are read-only to members (lh_can_read) and CRM admins; no client writes.
-- Rollback: 253_rollback_sprint_LH_WORK_EDIT_APPROVAL_07.sql

BEGIN;

DO $$
BEGIN
    IF to_regclass('public.labour_daily_registers') IS NULL OR to_regprocedure('public.lh_decide_daily_register(uuid, date, varchar, integer, text)') IS NULL THEN
        RAISE EXCEPTION '253 requires proposal 252 (labour_daily_registers, lh_decide_daily_register)';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.labour_daily_register_snapshots (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    register_id   uuid NOT NULL REFERENCES public.labour_daily_registers(id) ON DELETE RESTRICT,
    contractor_id uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    work_date     date NOT NULL,
    revision      int NOT NULL,
    decision      varchar(10) NOT NULL CHECK (decision IN ('Approved', 'Rejected')),
    reason        text,
    decided_by    uuid,
    decided_at    timestamptz NOT NULL DEFAULT now(),
    entry_count   int NOT NULL,
    total_amount  numeric(14, 2) NOT NULL,
    entries       jsonb NOT NULL,
    backfilled    boolean NOT NULL DEFAULT false,
    CONSTRAINT uq_register_snapshot UNIQUE (register_id, revision, decision)
);
CREATE INDEX IF NOT EXISTS idx_register_snapshots ON public.labour_daily_register_snapshots(register_id, decided_at);

-- The day exactly as stored now (entries + shares), for a snapshot.
CREATE OR REPLACE FUNCTION public.lh_day_snapshot(p_contractor uuid, p_date date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', e.id, 'work_type', e.work_type, 'rate_snapshot', e.rate_snapshot, 'rate_unit_snapshot', e.rate_unit_snapshot,
        'total_weight_kg', e.total_weight_kg, 'total_bags', e.total_bags, 'total_batches', e.total_batches,
        'calculated_labour_amount', e.calculated_labour_amount, 'notes', e.notes,
        'recorded_at', e.recorded_at, 'work_completed_at', e.work_completed_at,
        'created_by', e.created_by, 'updated_by', e.updated_by, 'updated_at', e.updated_at,
        'shares', COALESCE((SELECT jsonb_agg(jsonb_build_object('labourer_id', a.labourer_id, 'labourer_name', l.name, 'allocated_amount', a.allocated_amount) ORDER BY l.name)
                              FROM public.labour_work_allocations a JOIN public.labourers l ON l.id = a.labourer_id
                             WHERE a.work_entry_id = e.id), '[]'::jsonb)
    ) ORDER BY COALESCE(e.work_completed_at, e.recorded_at, e.created_at), e.id), '[]'::jsonb)
      FROM public.daily_work_entries e
     WHERE e.contractor_id = p_contractor AND e.work_date = p_date;
$$;
REVOKE ALL ON FUNCTION public.lh_day_snapshot(uuid, date) FROM PUBLIC, anon, authenticated;

-- Same rules as 252, plus the snapshot of what was decided (same transaction as the decision).
CREATE OR REPLACE FUNCTION public.lh_decide_daily_register(
    p_contractor uuid, p_date date, p_decision varchar, p_revision int, p_reason text DEFAULT NULL
) RETURNS public.labour_daily_registers LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE r public.labour_daily_registers%ROWTYPE; v_reason text := NULLIF(btrim(p_reason), ''); v_snap jsonb;
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
    v_snap := public.lh_day_snapshot(p_contractor, p_date);
    INSERT INTO public.labour_daily_register_snapshots (register_id, contractor_id, work_date, revision, decision, reason, decided_by, decided_at, entry_count, total_amount, entries)
    VALUES (r.id, p_contractor, p_date, r.revision, p_decision, v_reason, auth.uid(), r.decided_at, jsonb_array_length(v_snap),
            (SELECT COALESCE(sum((x->>'calculated_labour_amount')::numeric), 0) FROM jsonb_array_elements(v_snap) x), v_snap);
    RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) TO authenticated;

-- Back-fill decided days (unchanged since their decision, see header).
INSERT INTO public.labour_daily_register_snapshots (register_id, contractor_id, work_date, revision, decision, reason, decided_by, decided_at, entry_count, total_amount, entries, backfilled)
SELECT r.id, r.contractor_id, r.work_date, r.revision, r.status, r.rejection_reason, r.decided_by, r.decided_at,
       jsonb_array_length(s.snap), (SELECT COALESCE(sum((x->>'calculated_labour_amount')::numeric), 0) FROM jsonb_array_elements(s.snap) x), s.snap, true
  FROM public.labour_daily_registers r
  CROSS JOIN LATERAL (SELECT public.lh_day_snapshot(r.contractor_id, r.work_date) AS snap) s
 WHERE r.status IN ('Approved', 'Rejected')
ON CONFLICT (register_id, revision, decision) DO NOTHING;

-- CRM list: last approved version next to the current one.
CREATE OR REPLACE VIEW public.v_lh_daily_registers WITH (security_invoker = true) AS
SELECT r.id, r.contractor_id, c.name AS contractor_name, r.work_date, r.status, r.revision,
       r.rejection_reason, r.decided_by, r.decided_at, r.created_at, r.updated_at,
       (SELECT count(*) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS entry_count,
       (SELECT COALESCE(sum(e.calculated_labour_amount), 0) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date) AS total_amount,
       (SELECT count(DISTINCT a.labourer_id) FROM public.labour_work_allocations a JOIN public.daily_work_entries e ON e.id = a.work_entry_id
         WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS labourer_count,
       la.revision      AS last_approved_revision,
       la.decided_at    AS last_approved_at,
       la.total_amount  AS last_approved_total,
       (r.status = 'Pending' AND la.id IS NOT NULL) AS edited_after_approval
  FROM public.labour_daily_registers r
  JOIN public.contractors c ON c.id = r.contractor_id
  LEFT JOIN LATERAL (SELECT s.id, s.revision, s.decided_at, s.total_amount FROM public.labour_daily_register_snapshots s
                      WHERE s.register_id = r.id AND s.decision = 'Approved' ORDER BY s.decided_at DESC, s.id DESC LIMIT 1) la ON true;

ALTER TABLE public.labour_daily_register_snapshots ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE p text;
BEGIN
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'labour_daily_register_snapshots' LOOP
        EXECUTE format('DROP POLICY %I ON public.labour_daily_register_snapshots', p);
    END LOOP;
END $$;
CREATE POLICY lh_read ON public.labour_daily_register_snapshots FOR SELECT TO authenticated USING (public.lh_can_read(contractor_id));
REVOKE ALL ON public.labour_daily_register_snapshots, public.v_lh_daily_registers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.labour_daily_register_snapshots, public.v_lh_daily_registers TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
