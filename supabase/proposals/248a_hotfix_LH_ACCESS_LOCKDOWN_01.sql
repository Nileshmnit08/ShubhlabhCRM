-- ============================================================================
-- PROPOSED HOTFIX: 248a_hotfix_LH_ACCESS_LOCKDOWN_01.sql
-- SPRINT: LH-ACCESS-LOCKDOWN-01 — close anonymous/API access to the labour tables
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- Rollback: 248a_rollback_hotfix_LH_ACCESS_LOCKDOWN_01.sql (re-opens the exposure; not recommended)
--
-- WHY (live inventory supplied by the Product Owner, 2026-11-03):
--   247 FOUNDATION, 248 and the retired lh_ schema are all applied. On every table the API
--   roles `anon` and `authenticated` hold ALL privileges (incl. TRUNCATE, which bypasses RLS),
--   and the policies are USING (true). Anyone holding the public app key can read labourer
--   names/phones and payments, and insert, change, delete or truncate them.
--
-- WHAT IT DOES (privileges only — no data, table, column, policy or trigger change):
--   - REVOKE ALL on the 20 labour tables and their views from PUBLIC, anon and authenticated.
--   - REVOKE EXECUTE on the 247/248 functions from PUBLIC, anon and authenticated.
--   - Skips any object that does not exist, so it is safe on partial installs and re-runnable.
--   Data stays fully intact and readable by the database owner (SQL editor / dashboard),
--   ready for the 249/250 upgrade.
--
-- IMPACT: none expected on working apps. Repo search (2026-11-03): no CRM, Field Assist or
--   LabourHisaab code reads or writes these tables; LabourHisaab keeps data in memory only.
--
-- NOT CHANGED: Supabase's default privileges for future tables (project-wide setting).
-- ============================================================================

BEGIN;

DO $$
DECLARE
    obj text;
BEGIN
    FOREACH obj IN ARRAY ARRAY[
        -- 247 FOUNDATION tables + views
        'contractors','labourers','labour_rates','daily_work_entries','daily_work_details',
        'labour_work_allocations','labour_payments','service_expenses','service_expense_allocations',
        'v_daily_contractor_summary','v_weekly_contractor_summary','v_monthly_contractor_summary',
        'v_individual_monthly_statement',
        -- 248 tables
        'labour_monthly_settlements','labour_monthly_settlement_items','labour_settlement_corrections',
        -- retired lh_ schema tables + view
        'lh_labourers','lh_work_rates','lh_work_entries','lh_work_allocations','lh_payments',
        'lh_service_expenses','lh_service_expense_allocations','lh_daily_ledger_view'
    ] LOOP
        IF to_regclass('public.' || obj) IS NOT NULL THEN
            EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', obj);
        END IF;
    END LOOP;

    IF to_regprocedure('public.fn_calculate_work_amount(numeric, varchar, numeric, int, int)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.fn_calculate_work_amount(numeric, varchar, numeric, int, int) FROM PUBLIC, anon, authenticated;
    END IF;
    IF to_regprocedure('public.fn_check_work_allocation_limit()') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.fn_check_work_allocation_limit() FROM PUBLIC, anon, authenticated;
    END IF;
    IF to_regprocedure('public.fn_carry_forward_monthly_settlement(uuid, varchar)') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.fn_carry_forward_monthly_settlement(uuid, varchar) FROM PUBLIC, anon, authenticated;
    END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────────────────────
-- Verification after applying (read-only). Expect ZERO rows:
--   SELECT table_name, grantee, privilege_type
--     FROM information_schema.role_table_grants
--    WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
--      AND (table_name LIKE 'lh\_%' OR table_name IN ('contractors','labourers','labour_rates',
--           'daily_work_entries','daily_work_details','labour_work_allocations','labour_payments',
--           'service_expenses','service_expense_allocations','labour_monthly_settlements',
--           'labour_monthly_settlement_items','labour_settlement_corrections',
--           'v_daily_contractor_summary','v_weekly_contractor_summary','v_monthly_contractor_summary',
--           'v_individual_monthly_statement'));
-- ────────────────────────────────────────────────────────────────────────────
