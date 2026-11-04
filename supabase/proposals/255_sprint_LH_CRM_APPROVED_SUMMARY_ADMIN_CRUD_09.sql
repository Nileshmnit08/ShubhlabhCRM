-- 255_sprint_LH_CRM_APPROVED_SUMMARY_ADMIN_CRUD_09.sql
-- PROPOSAL — NOT APPLIED. Requires 249 + 250 + 251 + 252 + 253. Apply after PO approval.
--
-- 1. Approved-only figures, decided IN THE DATABASE.
--    Approval is per contractor-day (labour_daily_registers, 252). An entry counts only when its
--    day's register status is 'Approved'; no register / Pending / Rejected / anything else = not
--    approved. Views (security_invoker, so the reader's RLS applies):
--      v_lh_entries_with_status   every entry + its day's approval_status (for display)
--      v_lh_approved_entries      approved entries only (totals, bags, wages)
--      v_lh_approved_work_lines   approved labourer shares only (labourer totals)
-- 2. CRM admin entry management — ONLY through two SECURITY DEFINER functions that check
--    is_admin() themselves (table grants/RLS for admins stay read-only):
--      lh_admin_save_work_entry(...)   add or edit; amount recomputed by the server from the
--                                      rate period × quantity; an edit keeps the entry's own rate
--                                      snapshot unless the rate period is editable and a rate is
--                                      given; same id, same contractor; equal labourer split.
--      lh_admin_delete_work_entry(id, reason)
--                                      refused for a closed (settled) month; reason required.
--    Neither ever sets an approval status: every change goes through the 252 triggers, so the
--    day becomes Pending ("Reopened" if it was decided) and needs a CRM decision.
-- 3. Decision function (lh_decide_daily_register) = 253 rules. The four-eyes check that was
--    here ("the admin who changed a day cannot decide it") was REMOVED by PO decision on
--    2026-11-04 (see 256): any CRM admin may approve/reject any register; contractor members
--    still cannot decide their own contractor's registers.
-- 4. Audit: entry_source ('app' | 'crm_admin') on entries; created_by / updated_by (251);
--    every update/delete keeps old + new rows with actor in lh_work_entry_history (252), now
--    with the admin's reason.
-- No existing data is changed. No grant to anon. Payments are per labourer (no entry link), so
-- the protected-record rule is the closed-month settlement lock (250).
-- Rollback: 255_rollback_sprint_LH_CRM_APPROVED_SUMMARY_ADMIN_CRUD_09.sql

BEGIN;

DO $$
BEGIN
    -- lh_day_snapshot is checked too: 253's ROLLBACK keeps the snapshot table but drops it.
    IF to_regclass('public.labour_daily_register_snapshots') IS NULL OR to_regprocedure('public.lh_day_snapshot(uuid, date)') IS NULL
       OR to_regprocedure('public.lh_month_closed(uuid, date)') IS NULL
       OR to_regprocedure('public.lh_register_changed(uuid, date)') IS NULL THEN
        RAISE EXCEPTION '255 requires proposals 250, 252 and 253 (253 must be applied, not rolled back)';
    END IF;
END $$;

-- ── Audit columns ───────────────────────────────────────────────────────────
ALTER TABLE public.daily_work_entries ADD COLUMN IF NOT EXISTS entry_source varchar(20) NOT NULL DEFAULT 'app';
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_work_entries_entry_source_check') THEN
        ALTER TABLE public.daily_work_entries ADD CONSTRAINT daily_work_entries_entry_source_check CHECK (entry_source IN ('app', 'crm_admin'));
    END IF;
END $$;
ALTER TABLE public.lh_work_entry_history ADD COLUMN IF NOT EXISTS reason text;

-- History now records the reason an admin gave (set for the transaction by the admin function).
CREATE OR REPLACE FUNCTION public.lh_log_entry_history()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_reason text := NULLIF(current_setting('lh.change_reason', true), '');
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO public.lh_work_entry_history (work_entry_id, contractor_id, work_date, action, old_row, new_row, actor, reason)
        VALUES (OLD.id, OLD.contractor_id, OLD.work_date, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid(), v_reason);
        RETURN NEW;
    END IF;
    INSERT INTO public.lh_work_entry_history (work_entry_id, contractor_id, work_date, action, old_row, actor, reason)
    VALUES (OLD.id, OLD.contractor_id, OLD.work_date, 'DELETE', to_jsonb(OLD), auth.uid(), v_reason);
    RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.lh_log_entry_history() FROM PUBLIC, anon, authenticated;

-- ── 1. Approved-only views ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_lh_entries_with_status WITH (security_invoker = true) AS
SELECT e.id, e.contractor_id, e.work_date, e.work_type, e.rate_snapshot, e.rate_unit_snapshot,
       e.total_weight_kg, e.total_bags, e.total_batches, e.calculated_labour_amount, e.notes,
       e.recorded_at, e.work_completed_at, e.created_at, e.updated_at, e.created_by, e.updated_by, e.entry_source,
       COALESCE(r.status, 'Pending') AS approval_status, r.revision AS register_revision, r.id AS register_id
  FROM public.daily_work_entries e
  LEFT JOIN public.labour_daily_registers r ON r.contractor_id = e.contractor_id AND r.work_date = e.work_date;

CREATE OR REPLACE VIEW public.v_lh_approved_entries WITH (security_invoker = true) AS
SELECT e.*
  FROM public.daily_work_entries e
  JOIN public.labour_daily_registers r ON r.contractor_id = e.contractor_id AND r.work_date = e.work_date
 WHERE r.status = 'Approved';

CREATE OR REPLACE VIEW public.v_lh_approved_work_lines WITH (security_invoker = true) AS
SELECT w.*
  FROM public.v_labour_work_lines w
  JOIN public.labour_daily_registers r ON r.contractor_id = w.contractor_id AND r.work_date = w.work_date
 WHERE r.status = 'Approved';

-- ── 2. Admin save ───────────────────────────────────────────────────────────
-- p_bag_lines: optional [{ "bag_weight_kg": 50, "bag_count": 100 }, …] for 'Per 100 kg' work;
-- when given, weight and bags are their totals.
CREATE OR REPLACE FUNCTION public.lh_admin_save_work_entry(
    p_id uuid, p_contractor uuid, p_work_date date, p_work_type varchar, p_unit varchar,
    p_labourer_ids uuid[], p_total_weight_kg numeric DEFAULT 0, p_total_bags int DEFAULT 0,
    p_total_batches int DEFAULT 0, p_notes text DEFAULT NULL, p_rate numeric DEFAULT NULL,
    p_bag_lines jsonb DEFAULT NULL, p_reason text DEFAULT NULL
) RETURNS public.daily_work_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_old    public.daily_work_entries%ROWTYPE;
    v_rate   public.labour_rates%ROWTYPE;
    v_snap   numeric;
    v_weight numeric := COALESCE(p_total_weight_kg, 0);
    v_bags   int := COALESCE(p_total_bags, 0);
    v_amount numeric;
    v_ids    uuid[];
    v_n      int;
    v_share  numeric;
    v_sum    numeric := 0;
    v_row    public.daily_work_entries%ROWTYPE;
    i        int;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Only a Shubh Labh CRM admin can add or edit labour entries here' USING ERRCODE = '42501';
    END IF;
    IF p_id IS NULL THEN RAISE EXCEPTION 'Entry id is required (the client generates it once, so a retry never duplicates)' USING ERRCODE = '22023'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.contractors c WHERE c.id = p_contractor AND c.is_active) THEN
        RAISE EXCEPTION 'Contractor not found or archived' USING ERRCODE = 'P0002';
    END IF;
    IF p_work_date IS NULL OR p_work_date > (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
        RAISE EXCEPTION 'Work date is required and cannot be in the future (IST)' USING ERRCODE = '23514';
    END IF;
    IF NULLIF(btrim(p_work_type), '') IS NULL THEN RAISE EXCEPTION 'Work type is required' USING ERRCODE = '23514'; END IF;
    IF p_unit NOT IN ('Per 100 kg', 'Per bag', 'Per batch', 'Fixed amount') THEN
        RAISE EXCEPTION 'Unknown unit "%"', p_unit USING ERRCODE = '23514';
    END IF;
    SELECT * INTO v_old FROM public.daily_work_entries WHERE id = p_id FOR UPDATE;
    IF FOUND AND v_old.contractor_id <> p_contractor THEN
        RAISE EXCEPTION 'An entry cannot be moved to another contractor' USING ERRCODE = '23514';
    END IF;
    IF v_weight < 0 OR v_bags < 0 OR COALESCE(p_total_batches, 0) < 0 OR (p_rate IS NOT NULL AND p_rate < 0) THEN
        RAISE EXCEPTION 'Quantities and rate cannot be negative' USING ERRCODE = '23514';
    END IF;
    SELECT array_agg(DISTINCT x) INTO v_ids FROM unnest(p_labourer_ids) x WHERE x IS NOT NULL;
    v_n := COALESCE(array_length(v_ids, 1), 0);
    IF v_n = 0 THEN RAISE EXCEPTION 'Select at least one labourer' USING ERRCODE = '23514'; END IF;
    IF (SELECT count(*) FROM public.labourers l WHERE l.id = ANY (v_ids) AND l.contractor_id = p_contractor) <> v_n THEN
        RAISE EXCEPTION 'Every labourer must belong to this contractor' USING ERRCODE = '23514';
    END IF;
    IF p_bag_lines IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_bag_lines) b
                    WHERE COALESCE((b->>'bag_weight_kg')::numeric, 0) <= 0 OR COALESCE((b->>'bag_count')::int, 0) <= 0) THEN
            RAISE EXCEPTION 'Each bag line needs a positive weight and count' USING ERRCODE = '23514';
        END IF;
        SELECT COALESCE(sum((b->>'bag_weight_kg')::numeric * (b->>'bag_count')::int), 0), COALESCE(sum((b->>'bag_count')::int), 0)
          INTO v_weight, v_bags FROM jsonb_array_elements(p_bag_lines) b;
    END IF;

    -- Rate period valid on the work date (rates are never created or changed here).
    SELECT * INTO v_rate FROM public.labour_rates r
     WHERE r.contractor_id = p_contractor AND r.work_type = p_work_type AND r.rate_unit = p_unit
       AND p_work_date >= r.effective_from AND (r.effective_until IS NULL OR p_work_date <= r.effective_until)
     ORDER BY r.effective_from DESC LIMIT 1;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No rate period for "%" (%) on % for this contractor', p_work_type, p_unit, p_work_date USING ERRCODE = '23514';
    END IF;
    -- Historical rates are kept: an edit in the same rate period keeps the entry's own snapshot.
    v_snap := CASE
        WHEN v_rate.is_editable_rate AND p_rate IS NOT NULL THEN p_rate
        WHEN v_old.id IS NOT NULL AND v_old.rate_id = v_rate.id THEN v_old.rate_snapshot
        ELSE v_rate.rate END;
    IF NOT v_rate.is_editable_rate AND p_rate IS NOT NULL AND p_rate <> v_snap THEN
        RAISE EXCEPTION 'The rate for "%" is fixed at ₹% on %; it cannot be changed per entry', p_work_type, v_rate.rate, p_work_date USING ERRCODE = '23514';
    END IF;
    v_amount := public.fn_calculate_work_amount(v_snap, p_unit, v_weight, v_bags, COALESCE(p_total_batches, 0));

    PERFORM set_config('lh.change_reason', COALESCE(NULLIF(btrim(p_reason), ''), CASE WHEN v_old.id IS NULL THEN 'CRM admin added' ELSE 'CRM admin edited' END), true);
    IF v_old.id IS NOT NULL THEN
        DELETE FROM public.labour_work_allocations WHERE work_entry_id = p_id;   -- lets the amount go down
        UPDATE public.daily_work_entries
           SET work_date = p_work_date, work_type = p_work_type, rate_id = v_rate.id, rate_snapshot = v_snap,
               rate_unit_snapshot = p_unit,
               quantity = CASE p_unit WHEN 'Per 100 kg' THEN v_weight WHEN 'Per bag' THEN v_bags WHEN 'Per batch' THEN COALESCE(p_total_batches, 0) ELSE 0 END,
               total_weight_kg = v_weight, total_bags = v_bags, total_batches = COALESCE(p_total_batches, 0),
               calculated_labour_amount = v_amount, notes = p_notes
         WHERE id = p_id RETURNING * INTO v_row;
    ELSE
        INSERT INTO public.daily_work_entries (id, contractor_id, work_date, work_type, rate_id, rate_snapshot, rate_unit_snapshot,
               quantity, total_weight_kg, total_bags, total_batches, calculated_labour_amount, notes, recorded_at, entry_source)
        VALUES (p_id, p_contractor, p_work_date, p_work_type, v_rate.id, v_snap, p_unit,
               CASE p_unit WHEN 'Per 100 kg' THEN v_weight WHEN 'Per bag' THEN v_bags WHEN 'Per batch' THEN COALESCE(p_total_batches, 0) ELSE 0 END,
               v_weight, v_bags, COALESCE(p_total_batches, 0), v_amount, p_notes, now(), 'crm_admin')
        RETURNING * INTO v_row;
    END IF;

    DELETE FROM public.daily_work_details WHERE work_entry_id = p_id;
    IF p_bag_lines IS NOT NULL THEN
        INSERT INTO public.daily_work_details (work_entry_id, contractor_id, bag_weight_kg, bag_count)
        SELECT p_id, p_contractor, (b->>'bag_weight_kg')::numeric, (b->>'bag_count')::int FROM jsonb_array_elements(p_bag_lines) b;
    END IF;
    -- Equal split, the last labourer takes the paisa remainder (same rule as the app).
    FOR i IN 1..v_n LOOP
        v_share := CASE WHEN i < v_n THEN floor(v_amount * 100 / v_n) / 100 ELSE round(v_amount - v_sum, 2) END;
        v_sum := v_sum + v_share;
        INSERT INTO public.labour_work_allocations (work_entry_id, contractor_id, labourer_id, allocated_amount, allocation_method)
        VALUES (p_id, p_contractor, v_ids[i], v_share, 'Equal');
    END LOOP;
    PERFORM set_config('lh.change_reason', '', true);
    RETURN v_row;
END;
$$;

-- ── 2b. Admin delete ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_admin_delete_work_entry(p_id uuid, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old public.daily_work_entries%ROWTYPE;
BEGIN
    IF NOT COALESCE(public.is_admin(), false) THEN
        RAISE EXCEPTION 'Only a Shubh Labh CRM admin can delete labour entries here' USING ERRCODE = '42501';
    END IF;
    IF NULLIF(btrim(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'A reason is required to delete a labour entry' USING ERRCODE = '23514';
    END IF;
    SELECT * INTO v_old FROM public.daily_work_entries WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Labour entry not found' USING ERRCODE = 'P0002'; END IF;
    IF public.lh_month_closed(v_old.contractor_id, v_old.work_date) THEN
        RAISE EXCEPTION 'This entry is in % which is closed and settled; it is protected. Use a settlement correction instead.',
            to_char(v_old.work_date, 'YYYY-MM') USING ERRCODE = '23514';
    END IF;
    PERFORM set_config('lh.change_reason', btrim(p_reason), true);
    DELETE FROM public.daily_work_entries WHERE id = p_id;   -- history keeps the full old row + actor + reason
    PERFORM set_config('lh.change_reason', '', true);
END;
$$;

-- ── 3. Decision (253 rules; four-eyes check removed by PO decision, see 256) ────
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

-- ── Grants ──────────────────────────────────────────────────────────────────
REVOKE ALL ON public.v_lh_entries_with_status, public.v_lh_approved_entries, public.v_lh_approved_work_lines FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.v_lh_entries_with_status, public.v_lh_approved_entries, public.v_lh_approved_work_lines TO authenticated;
REVOKE ALL ON FUNCTION public.lh_admin_save_work_entry(uuid, uuid, date, varchar, varchar, uuid[], numeric, int, int, text, numeric, jsonb, text),
                       public.lh_admin_delete_work_entry(uuid, text),
                       public.lh_decide_daily_register(uuid, date, varchar, int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_admin_save_work_entry(uuid, uuid, date, varchar, varchar, uuid[], numeric, int, int, text, numeric, jsonb, text),
                          public.lh_admin_delete_work_entry(uuid, text),
                          public.lh_decide_daily_register(uuid, date, varchar, int, text) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
