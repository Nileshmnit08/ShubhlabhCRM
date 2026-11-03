-- ============================================================================
-- ROLLBACK for 248a_hotfix_LH_ACCESS_LOCKDOWN_01.sql
-- STATUS: PROPOSED — NOT APPLIED — NOT RECOMMENDED
--
-- WARNING: this RE-OPENS the exposure the hotfix closed — anyone with the public app key
-- regains full read/write/delete/truncate access to labour data. Use only if an unexpected
-- dependency breaks and the Product Owner explicitly accepts the exposure while it is fixed.
-- It restores exactly the grants observed live on 2026-11-03 (ALL to anon and authenticated).
-- ============================================================================

BEGIN;

DO $$
DECLARE
    obj text;
BEGIN
    FOREACH obj IN ARRAY ARRAY[
        'contractors','labourers','labour_rates','daily_work_entries','daily_work_details',
        'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations',
        'v_daily_contractor_summary','v_weekly_contractor_summary','v_monthly_contractor_summary',
        'v_individual_monthly_statement',
        'labour_monthly_settlements','labour_monthly_settlement_items','labour_settlement_corrections',
        'lh_labourers','lh_work_rates','lh_work_entries','lh_work_allocations','lh_payments',
        'lh_service_expenses','lh_service_expense_allocations','lh_daily_ledger_view'
    ] LOOP
        IF to_regclass('public.' || obj) IS NOT NULL THEN
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', obj);
        END IF;
    END LOOP;

    IF to_regprocedure('public.fn_calculate_work_amount(numeric, varchar, numeric, int, int)') IS NOT NULL THEN
        GRANT EXECUTE ON FUNCTION public.fn_calculate_work_amount(numeric, varchar, numeric, int, int) TO PUBLIC;
    END IF;
    IF to_regprocedure('public.fn_check_work_allocation_limit()') IS NOT NULL THEN
        GRANT EXECUTE ON FUNCTION public.fn_check_work_allocation_limit() TO PUBLIC;
    END IF;
    IF to_regprocedure('public.fn_carry_forward_monthly_settlement(uuid, varchar)') IS NOT NULL THEN
        GRANT EXECUTE ON FUNCTION public.fn_carry_forward_monthly_settlement(uuid, varchar) TO PUBLIC;
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
