-- Migration: 150_sprint_FM_01_field_sessions.sql
-- Description: Create field_tracking_sessions table for FM-01

CREATE TABLE IF NOT EXISTS public.field_tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    start_accuracy_m NUMERIC,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    end_accuracy_m NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only one ACTIVE session per staff member
CREATE UNIQUE INDEX IF NOT EXISTS idx_field_tracking_sessions_active_session 
ON public.field_tracking_sessions(staff_id) 
WHERE status = 'ACTIVE';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_field_tracking_sessions_staff ON public.field_tracking_sessions(staff_id);
CREATE INDEX IF NOT EXISTS idx_field_tracking_sessions_status ON public.field_tracking_sessions(status);

-- Row Level Security
ALTER TABLE public.field_tracking_sessions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to INSERT their own tracking sessions
CREATE POLICY "Enable insert access for authenticated users to own records" 
    ON public.field_tracking_sessions FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Allow authenticated users to SELECT their own tracking sessions
CREATE POLICY "Enable read access for users to own records" 
    ON public.field_tracking_sessions FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Allow authenticated users to UPDATE their own tracking sessions
CREATE POLICY "Enable update access for users to own records" 
    ON public.field_tracking_sessions FOR UPDATE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id)
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);
    
-- Allow admins to read all tracking sessions
CREATE POLICY "Enable read access for Admins" 
    ON public.field_tracking_sessions FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM app_users 
        WHERE id = auth.uid() AND role = 'Admin'
      )
    );
