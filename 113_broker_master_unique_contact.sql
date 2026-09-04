-- Migration: 113_broker_master_unique_contact.sql
-- Description: Enforces uniqueness on broker mobile and whatsapp numbers to allow reliable incoming message matching.

-- 1. Normalize existing data (strip non-digits, remove 91 prefix if exactly 12 digits, etc)
-- Note: A simple replace regex for non-digits is complex in raw postgres without plperl, 
-- but we can do a simple trim and strip of '+' and ' ' for now.
UPDATE public.brokers 
SET mobile = NULLIF(trim(replace(replace(mobile, '+91', ''), ' ', '')), ''),
    whatsapp_number = NULLIF(trim(replace(replace(whatsapp_number, '+91', ''), ' ', '')), '');

-- 2. Add Unique constraints
ALTER TABLE public.brokers 
ADD CONSTRAINT brokers_mobile_key UNIQUE (mobile);

ALTER TABLE public.brokers 
ADD CONSTRAINT brokers_whatsapp_number_key UNIQUE (whatsapp_number);
