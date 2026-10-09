-- Migration: 234_sprint_FM_04_segment_engine_rls_fix.sql
-- Description: Fix RLS for field_travel_segments to allow trigger-based inserts and deletes

CREATE POLICY "Enable insert access for users to own records" 
    ON public.field_travel_segments FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable update access for users to own records" 
    ON public.field_travel_segments FOR UPDATE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable delete access for users to own records" 
    ON public.field_travel_segments FOR DELETE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);
