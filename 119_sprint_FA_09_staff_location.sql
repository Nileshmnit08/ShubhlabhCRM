-- Migration: 119_sprint_FA_09_staff_location.sql
-- Description: Create staff_location_history table for continuous tracking (FA-09)

CREATE TABLE IF NOT EXISTS public.staff_location_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    session_id UUID,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy NUMERIC,
    captured_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_location_history_staff ON public.staff_location_history(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_history_session ON public.staff_location_history(session_id);
CREATE INDEX IF NOT EXISTS idx_staff_location_history_captured ON public.staff_location_history(captured_at);

-- Row Level Security
ALTER TABLE public.staff_location_history ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT their own location records
CREATE POLICY "Enable insert access for authenticated users to own records" 
    ON public.staff_location_history FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Allow authenticated users to SELECT their own location records
CREATE POLICY "Enable read access for users to own records" 
    ON public.staff_location_history FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);
