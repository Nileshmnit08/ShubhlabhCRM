-- 255_rollback_sprint_LH_CRM_APPROVED_SUMMARY_ADMIN_CRUD_09.sql
-- PROPOSAL — NOT APPLIED. Removes admin entry management and the approved-only views, and
-- restores the 253 decision function (without the four-eyes rule). Entries created or edited by
-- admins are KEPT, as are entry_source and the history reasons (no data is removed).

BEGIN;

DROP FUNCTION IF EXISTS public.lh_admin_save_work_entry(uuid, uuid, date, varchar, varchar, uuid[], numeric, int, int, text, numeric, jsonb, text);
DROP FUNCTION IF EXISTS public.lh_admin_delete_work_entry(uuid, text);
DROP VIEW IF EXISTS public.v_lh_approved_work_lines;
DROP VIEW IF EXISTS public.v_lh_approved_entries;
DROP VIEW IF EXISTS public.v_lh_entries_with_status;

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
    IF p_decision NOT IN ('Approved', 'Rejected') THEN RAISE EXCEPTION 'Decision must be Approved or Rejected' USING ERRCODE = '23514'; END IF;
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
    v_snap := public.lh_day_snapshot(p_contractor, p_date);
    INSERT INTO public.labour_daily_register_snapshots (register_id, contractor_id, work_date, revision, decision, reason, decided_by, decided_at, entry_count, total_amount, entries)
    VALUES (r.id, p_contractor, p_date, r.revision, p_decision, v_reason, auth.uid(), r.decided_at, jsonb_array_length(v_snap),
            (SELECT COALESCE(sum((x->>'calculated_labour_amount')::numeric), 0) FROM jsonb_array_elements(v_snap) x), v_snap);
    RETURN r;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_decide_daily_register(uuid, date, varchar, int, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
