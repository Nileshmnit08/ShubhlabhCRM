-- SPRINT 24: Activity Integration Schema
-- Adds a reference to the related payment task in interactions to prevent duplicates and enable traceability

ALTER TABLE public.interactions 
ADD COLUMN IF NOT EXISTS related_follow_up_id UUID REFERENCES public.follow_ups(id) ON DELETE SET NULL;
