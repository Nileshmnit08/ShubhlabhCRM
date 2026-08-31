-- Migration: 98_fix_dealer_scheme_slabs_rls.sql
-- Description: Add explicit Row Level Security (RLS) policies for dealer_scheme_slabs

ALTER TABLE public.dealer_scheme_slabs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read slabs
CREATE POLICY "Enable read access for authenticated users on slabs" 
ON public.dealer_scheme_slabs FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to insert slabs
CREATE POLICY "Enable insert access for authenticated users on slabs" 
ON public.dealer_scheme_slabs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update slabs
CREATE POLICY "Enable update access for authenticated users on slabs" 
ON public.dealer_scheme_slabs FOR UPDATE 
TO authenticated 
USING (true) WITH CHECK (true);

-- Allow authenticated users to delete slabs
CREATE POLICY "Enable delete access for authenticated users on slabs" 
ON public.dealer_scheme_slabs FOR DELETE 
TO authenticated 
USING (true);
