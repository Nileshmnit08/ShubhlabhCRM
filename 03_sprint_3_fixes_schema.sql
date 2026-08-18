-- SPRINT 3 FIXES SCHEMA

-- 1. Add original_follow_up_date to preserve the initial due date on postpone
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS original_follow_up_date DATE;

-- 2. Update existing rows where original_follow_up_date is null
UPDATE public.follow_ups 
SET original_follow_up_date = follow_up_date
WHERE original_follow_up_date IS NULL;

-- 3. Add postpone_note
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS postpone_note TEXT;
