-- Migration: 133_allow_admin_view_crm_visits.sql
-- Purpose: Allow CRM Admin users to view all visits in public.crm_visits

CREATE POLICY "Allow admins to view visits" 
ON public.crm_visits 
FOR SELECT 
TO authenticated 
USING (
    public.is_admin()
);
