-- ============================================================================
-- STATUS: SUPERSEDED (2026-11-03) — DO NOT APPLY.
-- Replaced by 249_sprint_LH_FOUNDATION_SECURE_01.sql + 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- (security blockers and data defects fixed; see LH-MIGRATION-REVIEW-01.md). Kept for history.
-- ============================================================================
-- ROLLBACK SPRINT: LH-DB-01 — Shubh Labh Labour Hisab Database Foundation
-- Description: Cleanly drops views, functions, triggers, and tables created in 247 proposal.
-- ============================================================================

-- 1. Drop Views
DROP VIEW IF EXISTS public.v_individual_monthly_statement CASCADE;
DROP VIEW IF EXISTS public.v_monthly_contractor_summary CASCADE;
DROP VIEW IF EXISTS public.v_weekly_contractor_summary CASCADE;
DROP VIEW IF EXISTS public.v_daily_contractor_summary CASCADE;

-- 2. Drop Triggers conditionally (only if table exists, avoiding 42P01 error)
DO $$
BEGIN
    IF to_regclass('public.labour_work_allocations') IS NOT NULL THEN
        DROP TRIGGER IF EXISTS trg_check_work_allocation_limit ON public.labour_work_allocations;
    END IF;
END $$;

-- 3. Drop Functions
DROP FUNCTION IF EXISTS public.fn_check_work_allocation_limit() CASCADE;
DROP FUNCTION IF EXISTS public.fn_calculate_work_amount(NUMERIC, VARCHAR, NUMERIC, INT, INT) CASCADE;

-- 4. Drop Tables (in reverse dependency order with CASCADE)
DROP TABLE IF EXISTS public.service_expense_allocations CASCADE;
DROP TABLE IF EXISTS public.service_expenses CASCADE;
DROP TABLE IF EXISTS public.labour_payments CASCADE;
DROP TABLE IF EXISTS public.labour_work_allocations CASCADE;
DROP TABLE IF EXISTS public.daily_work_details CASCADE;
DROP TABLE IF EXISTS public.daily_work_entries CASCADE;
DROP TABLE IF EXISTS public.labour_rates CASCADE;
DROP TABLE IF EXISTS public.labourers CASCADE;
DROP TABLE IF EXISTS public.contractors CASCADE;
