-- FM-LOCATION-FIX-01: VISIT LOCATION INTEGRITY

-- 1. Add independent Start and End Location fields
ALTER TABLE public.crm_visits
ADD COLUMN IF NOT EXISTS start_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS start_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS start_location_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS start_location_timestamp TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS ended_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ended_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ended_location_accuracy DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS ended_location_timestamp TIMESTAMP WITH TIME ZONE;

-- 2. Preserve historical data
-- The existing latitude/longitude were historically overwritten at End Visit.
-- To ensure independent points exist for older visits, we safely map the legacy coordinates to both start and end,
-- preserving the fact that they occurred at the visit location.
UPDATE public.crm_visits
SET 
    start_latitude = latitude,
    start_longitude = longitude,
    start_location_timestamp = started_at,
    ended_latitude = latitude,
    ended_longitude = longitude,
    ended_location_timestamp = ended_at
WHERE start_latitude IS NULL AND latitude IS NOT NULL;

-- Note: We retain the legacy `latitude` and `longitude` columns for backward compatibility
-- with older queries. We will ensure the mobile app continues to populate `latitude` and `longitude`
-- using the `start_latitude` and `start_longitude` to maintain stability.
