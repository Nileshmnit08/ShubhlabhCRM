-- Migration: 145_fix_tracking_sessions_fk.sql
-- Description: Fix missing foreign key relationship between staff_tracking_sessions and public.app_users

-- Drop the existing FK to auth.users if it exists to avoid duplicate constraints on the same column
ALTER TABLE public.staff_tracking_sessions
DROP CONSTRAINT IF EXISTS staff_tracking_sessions_staff_id_fkey;

-- Add the correct FK to public.app_users, which is required by PostgREST to resolve nested selects like app_users:staff_id (display_name)
ALTER TABLE public.staff_tracking_sessions
ADD CONSTRAINT staff_tracking_sessions_staff_id_fkey 
FOREIGN KEY (staff_id) 
REFERENCES public.app_users(id) 
ON DELETE CASCADE;

-- Notify PostgREST to reload the schema cache so the API recognizes the new relationship
NOTIFY pgrst, 'reload schema';
