-- SPRINT FA-08B: Customer Location Foundation
-- Description: Extend public.crm_parties with approved nullable location fields

-- 1. Add Location Columns to crm_parties
DO $$
BEGIN
    -- Latitude
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_parties' 
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.crm_parties ADD COLUMN latitude NUMERIC;
    END IF;

    -- Longitude
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_parties' 
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.crm_parties ADD COLUMN longitude NUMERIC;
    END IF;

    -- Location Accuracy
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_parties' 
        AND column_name = 'location_accuracy'
    ) THEN
        ALTER TABLE public.crm_parties ADD COLUMN location_accuracy NUMERIC;
    END IF;

    -- Location Captured At
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'crm_parties' 
        AND column_name = 'location_captured_at'
    ) THEN
        ALTER TABLE public.crm_parties ADD COLUMN location_captured_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
