-- ============================================================================
-- PROPOSED MIGRATION: 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- SPRINT: LH-MIGRATION-REVISION-01 — monthly settlement & closing (revised 248)
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Depends on: 249_sprint_LH_FOUNDATION_SECURE_01.sql
-- Supersedes: 248_sprint_LH_SETTLEMENT_01.sql (do not apply 248).
-- Rollback:   250_rollback_sprint_LH_SETTLEMENT_SECURE_01.sql (archives; run BEFORE 249's rollback).
--
-- WHAT CHANGED FROM 248
--   Access      248 matched contractor_id = auth.uid(), which never matches a contractor. Now the
--               same model as 249: members read, CRM admins read-only, anon nothing. Settlement
--               tables have NO direct write grants — every change goes through a function.
--   Server-side Month closing computes every figure from 249's data (allocated earnings, payments,
--   figures     allocated deductions, pro-rata weight, work-date days) instead of trusting the app.
--               Opening balance = the labourer's closing balance from the latest earlier closed month.
--   Closed lock Once a month is Closed, work entries/details/allocations, payments, expenses and
--               expense allocations dated in that month cannot be inserted, changed or deleted.
--   Corrections The only change allowed to a closed month is lh_correct_settlement_item: Owner only,
--               reason required, logged with previous/corrected values and the user id, and only
--               on the latest closed month (so later openings never go stale silently).
--   Audit ids   closed_by / corrected_by are auth user ids, not free text.
--   Formats     year_month must be YYYY-MM.
--   Carry-forward fn_carry_forward_monthly_settlement is replaced by computed opening balances.
-- ============================================================================

BEGIN;

-- Dependency guard: 249 must be applied first (it provides the access helpers and validated tables).
DO $$
BEGIN
    IF to_regprocedure('public.lh_can_read(uuid)') IS NULL OR to_regprocedure('public.lh_can_write(uuid)') IS NULL
       OR to_regclass('public.contractor_members') IS NULL THEN
        RAISE EXCEPTION '250 requires 249_sprint_LH_FOUNDATION_SECURE_01.sql to be applied first. Nothing was changed.';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.labour_monthly_settlements (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id         uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    year_month            varchar(7) NOT NULL CHECK (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
    status                varchar(50) NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Reviewed', 'Partially Settled', 'Settled', 'Closed')),
    total_labourers       int NOT NULL DEFAULT 0,
    total_working_days    int NOT NULL DEFAULT 0,
    total_weight_kg       numeric(12, 2) NOT NULL DEFAULT 0,
    total_earned          numeric(12, 2) NOT NULL DEFAULT 0,
    total_paid            numeric(12, 2) NOT NULL DEFAULT 0,
    total_deductions      numeric(12, 2) NOT NULL DEFAULT 0,
    contractor_expenses   numeric(12, 2) NOT NULL DEFAULT 0,
    opening_balance_total numeric(12, 2) NOT NULL DEFAULT 0,
    closing_balance_total numeric(12, 2) NOT NULL DEFAULT 0,
    closed_at             timestamptz,
    closed_by             uuid,
    notes                 text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_contractor_settlement_month UNIQUE (contractor_id, year_month),
    CONSTRAINT settlement_closed_fields CHECK ((status = 'Closed') = (closed_at IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.labour_monthly_settlement_items (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_id        uuid NOT NULL REFERENCES public.labour_monthly_settlements(id) ON DELETE RESTRICT,
    contractor_id        uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    labourer_id          uuid NOT NULL REFERENCES public.labourers(id) ON DELETE RESTRICT,
    year_month           varchar(7) NOT NULL,
    working_days         int NOT NULL DEFAULT 0,
    total_weight_kg      numeric(12, 2) NOT NULL DEFAULT 0,
    opening_balance      numeric(12, 2) NOT NULL DEFAULT 0,
    current_earnings     numeric(12, 2) NOT NULL DEFAULT 0,
    payments_made        numeric(12, 2) NOT NULL DEFAULT 0,
    allocated_deductions numeric(12, 2) NOT NULL DEFAULT 0,
    correction_total     numeric(12, 2) NOT NULL DEFAULT 0,
    closing_balance      numeric(12, 2) NOT NULL DEFAULT 0,
    settlement_status    varchar(50) NOT NULL DEFAULT 'Open' CHECK (settlement_status IN ('Open', 'Reviewed', 'Partially Settled', 'Settled', 'Closed')),
    notes                text,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_settlement_labourer_item UNIQUE (settlement_id, labourer_id),
    CONSTRAINT settlement_item_balance CHECK (
        closing_balance = opening_balance + current_earnings - payments_made - allocated_deductions + correction_total)
);

CREATE TABLE IF NOT EXISTS public.labour_settlement_corrections (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id      uuid NOT NULL REFERENCES public.contractors(id) ON DELETE RESTRICT,
    settlement_item_id uuid NOT NULL REFERENCES public.labour_monthly_settlement_items(id) ON DELETE RESTRICT,
    adjustment         numeric(12, 2) NOT NULL CHECK (adjustment <> 0),
    reason             text NOT NULL CHECK (length(trim(reason)) >= 5),
    previous_values    jsonb NOT NULL,
    corrected_values   jsonb NOT NULL,
    corrected_by       uuid NOT NULL,
    corrected_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlement_contractor_month ON public.labour_monthly_settlements(contractor_id, year_month);
CREATE INDEX IF NOT EXISTS idx_settlement_items_labourer ON public.labour_monthly_settlement_items(labourer_id, year_month);
CREATE INDEX IF NOT EXISTS idx_settlement_corrections_item ON public.labour_settlement_corrections(settlement_item_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Closed-month lock on 249's ledger tables
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.lh_month_closed(p_contractor uuid, p_date date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
    SELECT COALESCE(p_date IS NOT NULL, false) AND EXISTS (
        SELECT 1 FROM public.labour_monthly_settlements s
         WHERE s.contractor_id = p_contractor AND s.year_month = to_char(p_date, 'YYYY-MM') AND s.status = 'Closed');
$$;

CREATE OR REPLACE FUNCTION public.lh_closed_month_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
DECLARE
    v_rows  record;
    v_date  date;
    v_contr uuid;
BEGIN
    -- Check the row before and after the change: neither may sit in a closed month.
    FOR v_rows IN SELECT * FROM (VALUES (CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END),
                                        (CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END)) AS x(j) WHERE j IS NOT NULL LOOP
        v_contr := (v_rows.j ->> 'contractor_id')::uuid;
        v_date := CASE TG_TABLE_NAME
            WHEN 'daily_work_entries' THEN (v_rows.j ->> 'work_date')::date
            WHEN 'labour_payments' THEN (v_rows.j ->> 'payment_date')::date
            WHEN 'service_expenses' THEN (v_rows.j ->> 'expense_date')::date
            WHEN 'daily_work_details' THEN (SELECT work_date FROM public.daily_work_entries WHERE id = (v_rows.j ->> 'work_entry_id')::uuid)
            WHEN 'labour_work_allocations' THEN (SELECT work_date FROM public.daily_work_entries WHERE id = (v_rows.j ->> 'work_entry_id')::uuid)
            WHEN 'service_expense_allocations' THEN (SELECT expense_date FROM public.service_expenses WHERE id = (v_rows.j ->> 'expense_id')::uuid)
        END;
        IF public.lh_month_closed(v_contr, v_date) THEN
            RAISE EXCEPTION 'Month % is closed; use a settlement correction instead', to_char(v_date, 'YYYY-MM') USING ERRCODE = '23514';
        END IF;
    END LOOP;
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['daily_work_entries','daily_work_details','labour_work_allocations',
                             'labour_payments','service_expenses','service_expense_allocations'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS lh_05_closed_month ON public.%I', t);
        EXECUTE format('CREATE TRIGGER lh_05_closed_month BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.lh_closed_month_guard()', t);
    END LOOP;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. Settlement functions (the only write path to settlement tables)
-- ────────────────────────────────────────────────────────────────────────────
-- Close a month: compute every figure from the ledger, lock it. Owner/Manager only.
CREATE OR REPLACE FUNCTION public.lh_close_month(p_contractor uuid, p_year_month varchar, p_notes text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_id    uuid;
    v_from  date;
    v_to    date;
    v_prev  varchar(7);
BEGIN
    IF NOT public.lh_can_write(p_contractor) THEN
        RAISE EXCEPTION 'Not authorised to close this month' USING ERRCODE = '42501';
    END IF;
    IF p_year_month !~ '^[0-9]{4}-(0[1-9]|1[0-2])$' THEN
        RAISE EXCEPTION 'Month must be YYYY-MM' USING ERRCODE = '22023';
    END IF;
    v_from := to_date(p_year_month || '-01', 'YYYY-MM-DD');
    v_to := (v_from + interval '1 month - 1 day')::date;
    IF v_to >= (now() AT TIME ZONE 'Asia/Kolkata')::date THEN
        RAISE EXCEPTION 'A month can only be closed after it has ended' USING ERRCODE = '23514';
    END IF;

    PERFORM pg_advisory_xact_lock(hashtextextended('lh_settle:' || p_contractor::text, 0));

    INSERT INTO public.labour_monthly_settlements (contractor_id, year_month)
    VALUES (p_contractor, p_year_month)
    ON CONFLICT (contractor_id, year_month) DO NOTHING;
    SELECT id INTO v_id FROM public.labour_monthly_settlements
     WHERE contractor_id = p_contractor AND year_month = p_year_month FOR UPDATE;
    IF (SELECT status FROM public.labour_monthly_settlements WHERE id = v_id) = 'Closed' THEN
        RAISE EXCEPTION 'Month % is already closed', p_year_month USING ERRCODE = '23514';
    END IF;
    -- Months close in order: a later closed month would otherwise keep a stale opening balance.
    IF EXISTS (SELECT 1 FROM public.labour_monthly_settlements
                WHERE contractor_id = p_contractor AND status = 'Closed' AND year_month > p_year_month) THEN
        RAISE EXCEPTION 'A later month is already closed; months must be closed in order' USING ERRCODE = '23514';
    END IF;

    -- Latest earlier closed month supplies opening balances.
    SELECT max(year_month) INTO v_prev FROM public.labour_monthly_settlements
     WHERE contractor_id = p_contractor AND status = 'Closed' AND year_month < p_year_month;

    DELETE FROM public.labour_monthly_settlement_items WHERE settlement_id = v_id; -- recomputed below (month not closed yet)

    INSERT INTO public.labour_monthly_settlement_items (
        settlement_id, contractor_id, labourer_id, year_month, working_days, total_weight_kg,
        opening_balance, current_earnings, payments_made, allocated_deductions, correction_total, closing_balance, settlement_status)
    SELECT v_id, p_contractor, l.id, p_year_month,
           COALESCE(w.days, 0), COALESCE(w.weight, 0),
           COALESCE(o.closing, 0), COALESCE(w.earned, 0), COALESCE(p.paid, 0), COALESCE(d.deducted, 0), 0,
           COALESCE(o.closing, 0) + COALESCE(w.earned, 0) - COALESCE(p.paid, 0) - COALESCE(d.deducted, 0),
           'Closed'
      FROM public.labourers l
      LEFT JOIN (SELECT labourer_id, count(DISTINCT work_date) days, sum(allocated_weight_kg) weight, sum(allocated_amount) earned
                   FROM public.v_labour_work_lines WHERE contractor_id = p_contractor AND work_date BETWEEN v_from AND v_to
                  GROUP BY labourer_id) w ON w.labourer_id = l.id
      LEFT JOIN (SELECT labourer_id, sum(amount) paid FROM public.labour_payments
                  WHERE contractor_id = p_contractor AND payment_date BETWEEN v_from AND v_to GROUP BY labourer_id) p ON p.labourer_id = l.id
      LEFT JOIN (SELECT sea.labourer_id, sum(sea.allocated_amount) deducted FROM public.service_expense_allocations sea
                   JOIN public.service_expenses se ON se.id = sea.expense_id
                  WHERE se.contractor_id = p_contractor AND se.expense_date BETWEEN v_from AND v_to GROUP BY sea.labourer_id) d ON d.labourer_id = l.id
      LEFT JOIN (SELECT i.labourer_id, i.closing_balance closing FROM public.labour_monthly_settlement_items i
                   JOIN public.labour_monthly_settlements s ON s.id = i.settlement_id
                  WHERE s.contractor_id = p_contractor AND s.year_month = v_prev) o ON o.labourer_id = l.id
     WHERE l.contractor_id = p_contractor
       AND (w.labourer_id IS NOT NULL OR p.labourer_id IS NOT NULL OR d.labourer_id IS NOT NULL OR COALESCE(o.closing, 0) <> 0);

    UPDATE public.labour_monthly_settlements s SET
        status = 'Closed', closed_at = now(), closed_by = auth.uid(), notes = COALESCE(p_notes, s.notes), updated_at = now(),
        total_labourers = x.n, total_working_days = (SELECT count(DISTINCT work_date) FROM public.daily_work_entries
                                                       WHERE contractor_id = p_contractor AND work_date BETWEEN v_from AND v_to),
        total_weight_kg = x.weight, total_earned = x.earned, total_paid = x.paid, total_deductions = x.deducted,
        opening_balance_total = x.opening, closing_balance_total = x.closing,
        contractor_expenses = (SELECT COALESCE(sum(amount), 0) FROM public.service_expenses
                                WHERE contractor_id = p_contractor AND expense_date BETWEEN v_from AND v_to
                                  AND allocation_scope = 'Contractor expense')
      FROM (SELECT count(*) n, COALESCE(sum(total_weight_kg), 0) weight, COALESCE(sum(current_earnings), 0) earned,
                   COALESCE(sum(payments_made), 0) paid, COALESCE(sum(allocated_deductions), 0) deducted,
                   COALESCE(sum(opening_balance), 0) opening, COALESCE(sum(closing_balance), 0) closing
              FROM public.labour_monthly_settlement_items WHERE settlement_id = v_id) x
     WHERE s.id = v_id;
    RETURN v_id;
END;
$$;

-- The approved correction process for a closed month. Owner only, logged, latest closed month only.
CREATE OR REPLACE FUNCTION public.lh_correct_settlement_item(p_item_id uuid, p_adjustment numeric, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
    v_item public.labour_monthly_settlement_items%ROWTYPE;
    v_corr uuid;
BEGIN
    SELECT * INTO v_item FROM public.labour_monthly_settlement_items WHERE id = p_item_id FOR UPDATE;
    IF NOT FOUND OR NOT public.lh_is_owner(v_item.contractor_id) THEN
        RAISE EXCEPTION 'Only the contractor owner can correct a closed month' USING ERRCODE = '42501';
    END IF;
    IF p_adjustment IS NULL OR p_adjustment = 0 OR p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
        RAISE EXCEPTION 'A non-zero adjustment and a reason (5+ characters) are required' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (SELECT 1 FROM public.labour_monthly_settlements s
                WHERE s.contractor_id = v_item.contractor_id AND s.status = 'Closed' AND s.year_month > v_item.year_month) THEN
        RAISE EXCEPTION 'A later month is already closed; correct the latest closed month instead' USING ERRCODE = '23514';
    END IF;

    PERFORM set_config('lh.settlement_write', 'on', true);
    UPDATE public.labour_monthly_settlement_items
       SET correction_total = correction_total + p_adjustment,
           closing_balance = closing_balance + p_adjustment, updated_at = now()
     WHERE id = p_item_id;
    UPDATE public.labour_monthly_settlements
       SET closing_balance_total = closing_balance_total + p_adjustment, updated_at = now()
     WHERE id = v_item.settlement_id;
    INSERT INTO public.labour_settlement_corrections
        (contractor_id, settlement_item_id, adjustment, reason, previous_values, corrected_values, corrected_by)
    VALUES (v_item.contractor_id, p_item_id, p_adjustment, trim(p_reason),
            jsonb_build_object('closing_balance', v_item.closing_balance, 'correction_total', v_item.correction_total),
            jsonb_build_object('closing_balance', v_item.closing_balance + p_adjustment,
                               'correction_total', v_item.correction_total + p_adjustment),
            auth.uid())
    RETURNING id INTO v_corr;
    PERFORM set_config('lh.settlement_write', 'off', true);
    RETURN v_corr;
END;
$$;

-- Settlement-table writes outside these functions are refused even for SECURITY DEFINER callers
-- other than the correction path (API roles have no write grants at all).
CREATE OR REPLACE FUNCTION public.lh_settlement_item_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.settlement_status = 'Closed' THEN
            RAISE EXCEPTION 'Closed settlement items cannot be deleted' USING ERRCODE = '23514';
        END IF;
        RETURN OLD;
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.settlement_status = 'Closed'
       AND COALESCE(current_setting('lh.settlement_write', true), '') <> 'on' THEN
        RAISE EXCEPTION 'Closed settlement items change only through lh_correct_settlement_item' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lh_10_settlement_item_guard ON public.labour_monthly_settlement_items;
CREATE TRIGGER lh_10_settlement_item_guard BEFORE UPDATE OR DELETE ON public.labour_monthly_settlement_items
    FOR EACH ROW EXECUTE FUNCTION public.lh_settlement_item_guard();

-- ────────────────────────────────────────────────────────────────────────────
-- 4. Row Level Security + grants: read-only for API roles
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    p text;
BEGIN
    FOREACH t IN ARRAY ARRAY['labour_monthly_settlements','labour_monthly_settlement_items','labour_settlement_corrections'] LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
        FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', p, t);
        END LOOP;
        EXECUTE format('CREATE POLICY lh_read ON public.%I FOR SELECT TO authenticated USING (public.lh_can_read(contractor_id))', t);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
        EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.fn_carry_forward_monthly_settlement(uuid, varchar);

REVOKE ALL ON FUNCTION public.lh_month_closed(uuid, date), public.lh_close_month(uuid, varchar, text),
                       public.lh_correct_settlement_item(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lh_month_closed(uuid, date), public.lh_close_month(uuid, varchar, text),
                          public.lh_correct_settlement_item(uuid, numeric, text) TO authenticated;
REVOKE ALL ON FUNCTION public.lh_closed_month_guard(), public.lh_settlement_item_guard() FROM PUBLIC, anon, authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
