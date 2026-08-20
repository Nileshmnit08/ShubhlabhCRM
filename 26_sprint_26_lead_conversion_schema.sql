-- SPRINT 26: Lead Conversion Foundation
-- Adds target customer tracking for Leads that are linked to existing Customers.

ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS converted_to_party_id UUID REFERENCES public.crm_parties(id) ON DELETE SET NULL;
