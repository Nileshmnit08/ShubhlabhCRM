-- ============================================================================
-- ROLLBACK: 258_rollback_sprint_FA_VISITOR_REGISTER_01.sql
-- SPRINT: FA-VISITOR-REGISTER-01 — Field Assist Visitor Registration & Gate Pass
--
-- STATUS: PROPOSED — NOT APPLIED
-- Reverts: supabase/proposals/258_sprint_FA_VISITOR_REGISTER_01.sql
-- ============================================================================

DROP TABLE IF EXISTS public.visitor_register CASCADE;
