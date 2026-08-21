-- MICRO-SPRINT 14.1: COMMUNICATION CENTER FOUNDATION
-- Add direction, purpose, and requirement linking to interactions

ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'Outbound',
ADD COLUMN IF NOT EXISTS purpose VARCHAR(100),
ADD COLUMN IF NOT EXISTS related_requirement_id UUID REFERENCES public.requirements(id) ON DELETE SET NULL;

-- Backfill purpose from interaction_type if it makes sense (Optional, but safe)
UPDATE public.interactions 
SET purpose = interaction_type 
WHERE purpose IS NULL AND interaction_type IS NOT NULL;
