-- MICRO-SPRINT 15.3: COMMERCIAL INTENT CAPTURE
-- Adds a specific commercial intent classification to requirements/opportunities

ALTER TABLE public.requirements 
ADD COLUMN IF NOT EXISTS intent_type VARCHAR(100) DEFAULT 'Product Interest';

-- Index for analytics and filtering
CREATE INDEX IF NOT EXISTS idx_requirements_intent_type ON public.requirements(intent_type);
