-- 253_rollback_sprint_LH_WORK_EDIT_APPROVAL_07.sql
-- PROPOSAL — NOT APPLIED. Restores the 252 decision function and CRM view.
-- The snapshot table and its rows are KEPT (closed to clients) so no reviewed version is lost.

BEGIN;

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
    IF NOT FOUND THEN RAISE EXCEPTION 'No daily register for this contractor and date' USING ERRCODE = 'P0002'; END IF;
    IF r.status <> 'Pending' THEN RAISE EXCEPTION 'This register is already %', r.status USING ERRCODE = '23514'; END IF;
    IF r.revision <> p_revision THEN
        RAISE EXCEPTION 'The register changed while you were reviewing it (revision % → %). Reload and review again.', p_revision, r.revision USING ERRCODE = '40001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.daily_work_entries WHERE contractor_id = p_contractor AND work_date = p_date) THEN
        RAISE EXCEPTION 'The register has no work entries' USING ERRCODE = '23514';
    END IF;
    UPDATE public.labour_daily_registers
       SET status = p_decision, decided_by = auth.uid(), decided_at = now(),
           rejection_reason = CASE WHEN p_decision = 'Rejected' THEN v_reason END, updated_at = now()
     WHERE id = r.id RETURNING * INTO r;
    INSERT INTO public.labour_daily_register_events (register_id, contractor_id, work_date, action, from_status, to_status, revision, reason, actor)
    VALUES (r.id, p_contractor, p_date, p_decision, 'Pending', p_decision, r.revision, v_reason, auth.uid());
    RETURN r;
END;
$$;

DROP VIEW IF EXISTS public.v_lh_daily_registers;
CREATE VIEW public.v_lh_daily_registers WITH (security_invoker = true) AS
SELECT r.id, r.contractor_id, c.name AS contractor_name, r.work_date, r.status, r.revision,
       r.rejection_reason, r.decided_by, r.decided_at, r.created_at, r.updated_at,
       (SELECT count(*) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS entry_count,
       (SELECT COALESCE(sum(e.calculated_labour_amount), 0) FROM public.daily_work_entries e WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date) AS total_amount,
       (SELECT count(DISTINCT a.labourer_id) FROM public.labour_work_allocations a JOIN public.daily_work_entries e ON e.id = a.work_entry_id
         WHERE e.contractor_id = r.contractor_id AND e.work_date = r.work_date)::int AS labourer_count
  FROM public.labour_daily_registers r
  JOIN public.contractors c ON c.id = r.contractor_id;
REVOKE ALL ON public.v_lh_daily_registers FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_lh_daily_registers TO authenticated;

DROP FUNCTION IF EXISTS public.lh_day_snapshot(uuid, date);
REVOKE ALL ON public.labour_daily_register_snapshots FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
