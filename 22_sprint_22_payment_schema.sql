-- SPRINT 22: Payment Task Data Model
-- Implements the database foundation for Payment Follow-up based on MS 9.1 audit.

-- 1. Add minimum required fields to follow_ups
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS follow_up_type VARCHAR(50) DEFAULT 'General',
ADD COLUMN IF NOT EXISTS amount_promised DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS promise_date DATE,
ADD COLUMN IF NOT EXISTS reference_id VARCHAR(255);

-- 2. Update existing Views that rely on follow_ups

-- Drop dependent views first
DROP VIEW IF EXISTS v_today_followups CASCADE;
DROP VIEW IF EXISTS v_overdue_followups CASCADE;

-- Recreate v_today_followups
CREATE OR REPLACE VIEW v_today_followups AS
SELECT 
    f.*, 
    c.display_name, 
    c.mobile, 
    c.whatsapp 
FROM public.follow_ups f 
JOIN public.crm_parties c ON f.party_id = c.id 
WHERE f.status = 'Pending' AND f.follow_up_date = CURRENT_DATE;

-- Recreate v_overdue_followups
CREATE OR REPLACE VIEW v_overdue_followups AS
SELECT 
    f.*, 
    c.display_name, 
    c.mobile, 
    c.whatsapp 
FROM public.follow_ups f 
JOIN public.crm_parties c ON f.party_id = c.id 
WHERE f.status = 'Pending' AND f.follow_up_date < CURRENT_DATE;
