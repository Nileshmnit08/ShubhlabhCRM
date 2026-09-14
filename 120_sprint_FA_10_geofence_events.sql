-- Migration: 120_sprint_FA_10_geofence_events.sql
-- Description: Create geofence_events table for FA-10 to record deterministic ENTER/EXIT tracking points.

CREATE TABLE IF NOT EXISTS public.geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('ENTER', 'EXIT')),
    event_time TIMESTAMPTZ NOT NULL,
    latitude NUMERIC NOT NULL,
    longitude NUMERIC NOT NULL,
    accuracy NUMERIC NOT NULL,
    distance_m NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for rapid querying by customer and staff over time
CREATE INDEX IF NOT EXISTS idx_geofence_events_customer ON public.geofence_events(customer_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_staff ON public.geofence_events(staff_id);
CREATE INDEX IF NOT EXISTS idx_geofence_events_time ON public.geofence_events(event_time DESC);

-- Row Level Security
ALTER TABLE public.geofence_events ENABLE ROW LEVEL SECURITY;

-- Staff can insert their own events
CREATE POLICY "Enable insert access for authenticated users to own geofence events" 
    ON public.geofence_events FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

-- Staff can view their own events
CREATE POLICY "Enable read access for users to own geofence events" 
    ON public.geofence_events FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);
