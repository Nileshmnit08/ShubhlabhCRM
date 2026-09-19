-- Migration: 142_sprint_FA_TRAVEL_03_segments.sql
-- Description: Create staff_travel_segments (FA-TRAVEL-03)

CREATE TABLE IF NOT EXISTS public.staff_travel_segments (
    id UUID PRIMARY KEY,
    tracking_session_id UUID NOT NULL REFERENCES public.staff_tracking_sessions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES public.app_users(id),
    from_type VARCHAR(50) NOT NULL,
    from_reference_id UUID,
    from_latitude NUMERIC,
    from_longitude NUMERIC,
    from_timestamp TIMESTAMPTZ NOT NULL,
    to_type VARCHAR(50) NOT NULL,
    to_reference_id UUID,
    to_latitude NUMERIC,
    to_longitude NUMERIC,
    to_timestamp TIMESTAMPTZ NOT NULL,
    distance_km NUMERIC NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.staff_travel_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert own segments" ON public.staff_travel_segments
    FOR INSERT WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can view own segments" ON public.staff_travel_segments
    FOR SELECT USING (auth.uid() = staff_id);

CREATE POLICY "Staff can update own segments" ON public.staff_travel_segments
    FOR UPDATE USING (auth.uid() = staff_id);

CREATE POLICY "Admin can view all segments" ON public.staff_travel_segments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.app_users
            WHERE app_users.id = auth.uid() AND app_users.role = 'Admin'
        )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_travel_segments_session ON public.staff_travel_segments(tracking_session_id);
CREATE INDEX IF NOT EXISTS idx_travel_segments_staff ON public.staff_travel_segments(staff_id);
