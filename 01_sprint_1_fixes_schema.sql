-- SPRINT 1 FIXES SCHEMA

-- 1. Add Relationship Type to crm_parties to decouple it from CRM status
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(50) DEFAULT 'Customer';
