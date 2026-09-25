-- Add is_priority and customer_code to crm_parties to support explicit Priority tracking
ALTER TABLE public.crm_parties
ADD COLUMN IF NOT EXISTS is_priority BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);
