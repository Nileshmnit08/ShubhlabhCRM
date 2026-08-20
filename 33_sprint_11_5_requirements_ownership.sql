-- MICRO-SPRINT 11.5 REQUIREMENT INTELLIGENCE
-- Add assigned_to / ownership to requirements

ALTER TABLE public.requirements
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.app_users(id) ON DELETE SET NULL;

-- If we have existing requirements without an owner, we could ideally backfill them if needed, 
-- but since this is rapid development, they can remain NULL or be assigned by an Admin later.

-- Ensure the existing RLS policies allow the assigned user or admin to update them.
-- In 08_sprint_8_fixes_schema.sql we had: 
-- CREATE POLICY "Active users Reqs Update" ON public.requirements FOR UPDATE USING (public.is_active_user());
-- Since the policy allows any active user, we don't strictly need to modify RLS for assignment yet, 
-- but adding assigned_to gives us the data architecture for future strict assignment policies.
