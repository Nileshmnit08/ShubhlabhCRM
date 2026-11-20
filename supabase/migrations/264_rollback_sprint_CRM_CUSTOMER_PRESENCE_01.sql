-- ============================================================================
-- ROLLBACK MIGRATION: 264_rollback_sprint_CRM_CUSTOMER_PRESENCE_01.sql
-- SPRINT: CRM-CUSTOMER-PRESENCE-01C
--
-- PURPOSE:
-- Safely revert all presence schema, RPCs, triggers, and Realtime publications.
-- ============================================================================

-- 1. Remove from Realtime publication
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'customer_app_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.customer_app_sessions;
    END IF;
END $$;

-- 2. Drop RPC Functions
DROP FUNCTION IF EXISTS public.customer_presence_start(TEXT, JSONB);
DROP FUNCTION IF EXISTS public.customer_presence_heartbeat(TEXT);
DROP FUNCTION IF EXISTS public.customer_presence_background(TEXT);
DROP FUNCTION IF EXISTS public.customer_presence_foreground(TEXT);
DROP FUNCTION IF EXISTS public.customer_presence_end(TEXT);

-- 3. Drop Trigger and Function
DROP TRIGGER IF EXISTS trg_protect_session_identity ON public.customer_app_sessions;
DROP FUNCTION IF EXISTS public.trg_fn_protect_session_identity();

-- 4. Drop Table
DROP TABLE IF EXISTS public.customer_app_sessions;
