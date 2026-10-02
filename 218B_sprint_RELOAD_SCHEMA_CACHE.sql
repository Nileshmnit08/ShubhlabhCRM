-- =================================================================================
-- SPRINT 218B: POSTGREST SCHEMA CACHE RELOAD
-- =================================================================================
-- Description:
-- Forces the Supabase API (PostgREST) to reload its schema cache.
-- This is strictly required because Sprint 218 altered the return type of
-- get_or_create_direct_chat() from UUID to JSONB. Without this reload,
-- PostgREST will fail with error 42804 (cannot cast type jsonb to uuid).
-- =================================================================================

NOTIFY pgrst, 'reload schema';
