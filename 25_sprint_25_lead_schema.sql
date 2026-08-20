-- SPRINT 25: Lead Data Model Foundation
-- Extends the existing crm_parties table to natively support Lead lifecycle

-- 1. Add lead_source to capture origination data for Leads
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS lead_source VARCHAR(255);

-- Note: crm_status is already a VARCHAR(50), so it natively supports 'Lead' 
-- without requiring an ENUM type modification. No other structural changes 
-- are required as crm_parties already contains name, contact, location, 
-- and assignment fields.
