-- ==============================================================================
-- ROLLBACK: MASTER MICRO-SPRINT: SL-VISITOR-MANAGEMENT-01
-- Description: Drops public.visitor_register table, storage policies, and triggers.
-- ==============================================================================

BEGIN;

-- Drop trigger and function
DROP TRIGGER IF EXISTS trg_visitor_register_updated_at ON public.visitor_register;
DROP FUNCTION IF EXISTS public.handle_visitor_register_updated_at();

-- Drop RLS policies on visitor_register
DROP POLICY IF EXISTS "allow_auth_select_visitor_register" ON public.visitor_register;
DROP POLICY IF EXISTS "allow_auth_insert_visitor_register" ON public.visitor_register;
DROP POLICY IF EXISTS "allow_auth_update_visitor_register" ON public.visitor_register;

-- Drop RLS policies on storage.objects for visitor-photos
DROP POLICY IF EXISTS "allow_auth_select_visitor_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_auth_insert_visitor_photos" ON storage.objects;
DROP POLICY IF EXISTS "allow_auth_update_visitor_photos" ON storage.objects;

-- Drop table
DROP TABLE IF EXISTS public.visitor_register CASCADE;

-- Note: We do not drop the 'visitor-photos' storage bucket to avoid deleting existing files,
-- but the table and policies are safely dropped.

COMMIT;
