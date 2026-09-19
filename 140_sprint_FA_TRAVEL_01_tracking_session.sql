-- Migration: 140_sprint_FA_TRAVEL_01_tracking_session.sql
-- Description: Create staff_tracking_sessions table for daily travel tracking (FA-TRAVEL-01)

CREATE TABLE IF NOT EXISTS public.staff_tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    business_date DATE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    started_latitude NUMERIC,
    started_longitude NUMERIC,
    started_accuracy NUMERIC,
    ended_at TIMESTAMPTZ,
    ended_latitude NUMERIC,
    ended_longitude NUMERIC,
    ended_accuracy NUMERIC,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one OPEN session per staff member
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_tracking_sessions_open_session 
ON public.staff_tracking_sessions(staff_id) 
WHERE status = 'OPEN';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_tracking_sessions_staff ON public.staff_tracking_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_tracking_sessions_date ON public.staff_tracking_sessions(business_date);

-- Row Level Security
ALTER TABLE public.staff_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT their own tracking sessions
CREATE POLICY "Enable insert access for authenticated users to own records" 
    ON public.staff_tracking_sessions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Allow authenticated users to SELECT their own tracking sessions
CREATE POLICY "Enable read access for users to own records" 
    ON public.staff_tracking_sessions FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Allow authenticated users to UPDATE their own tracking sessions
CREATE POLICY "Enable update access for users to own records" 
    ON public.staff_tracking_sessions FOR UPDATE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id)
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);
    
-- Allow admins to read all tracking sessions
CREATE POLICY "Enable read access for Admins" 
    ON public.staff_tracking_sessions FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM app_users 
        WHERE id = auth.uid() AND role = 'Admin'
      )
    );
