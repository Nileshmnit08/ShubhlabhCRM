-- Migration: 115_raw_material_price_entries_status.sql
-- Description: Adds status tracking to raw material price entries to prevent unverified information from automatically becoming official.

ALTER TABLE public.raw_material_price_entries 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

-- Existing records are considered Official since they were manually entered or seeded
UPDATE public.raw_material_price_entries 
SET status = 'Official' 
WHERE status = 'Pending' OR status IS NULL;
