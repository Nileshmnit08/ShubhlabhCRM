-- Migration: 235_sprint_FM_05_visit_integration_rls_fix.sql
-- Description: Fix RLS for field_visit_travel_links to allow trigger-based inserts and deletes

CREATE POLICY "Enable insert access for users to own links" 
    ON public.field_visit_travel_links FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable delete access for users to own links" 
    ON public.field_visit_travel_links FOR DELETE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);
