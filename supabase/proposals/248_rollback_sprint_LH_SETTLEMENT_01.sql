-- ============================================================================
-- STATUS: SUPERSEDED (2026-11-03) — DO NOT APPLY.
-- Replaced by 249_sprint_LH_FOUNDATION_SECURE_01.sql + 250_sprint_LH_SETTLEMENT_SECURE_01.sql
-- (security blockers and data defects fixed; see LH-MIGRATION-REVIEW-01.md). Kept for history.
-- ============================================================================
-- PROPOSED ROLLBACK: 248_rollback_sprint_LH_SETTLEMENT_01.sql
-- SPRINT: LH-SETTLEMENT-01 — Monthly Settlement & Account Closing
--
-- Safely removes monthly settlement tables, functions, and indexes.
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_carry_forward_monthly_settlement(UUID, VARCHAR);

DROP TABLE IF EXISTS public.labour_settlement_corrections CASCADE;
DROP TABLE IF EXISTS public.labour_monthly_settlement_items CASCADE;
DROP TABLE IF EXISTS public.labour_monthly_settlements CASCADE;

