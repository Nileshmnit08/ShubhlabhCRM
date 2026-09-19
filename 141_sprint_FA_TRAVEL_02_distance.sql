-- Migration: 141_sprint_FA_TRAVEL_02_distance.sql
-- Description: Add total_distance_km to staff_tracking_sessions (FA-TRAVEL-02)

ALTER TABLE public.staff_tracking_sessions
ADD COLUMN IF NOT EXISTS total_distance_km NUMERIC DEFAULT 0;
