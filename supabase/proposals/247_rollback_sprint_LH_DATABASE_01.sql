-- ============================================================================
-- STATUS: RETIRED (Product Owner decision, 2026-11-03) — DO NOT APPLY.
-- Superseded by 247_sprint_LH_DATABASE_FOUNDATION_01.sql + 248_sprint_LH_SETTLEMENT_01.sql.
-- Kept for history only. See supabase/proposals/LH-MIGRATION-REVIEW-01.md.
-- ============================================================================
-- ROLLBACK SPRINT: LH-DB-01 / LH-LEDGER-01
-- Description: Drops Labour Hisab tables, views, and policies cleanly.
-- ============================================================================

DROP VIEW IF EXISTS public.lh_daily_ledger_view CASCADE;

DROP TABLE IF EXISTS public.lh_service_expense_allocations CASCADE;
DROP TABLE IF EXISTS public.lh_service_expenses CASCADE;
DROP TABLE IF EXISTS public.lh_payments CASCADE;
DROP TABLE IF EXISTS public.lh_work_allocations CASCADE;
DROP TABLE IF EXISTS public.lh_work_entries CASCADE;
DROP TABLE IF EXISTS public.lh_work_rates CASCADE;
DROP TABLE IF EXISTS public.lh_labourers CASCADE;
