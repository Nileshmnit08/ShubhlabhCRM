-- MICRO-SPRINT 11.2 HOTFIX
-- Add UNIQUE constraint to identity_review_queue to allow ON CONFLICT DO NOTHING

ALTER TABLE public.identity_review_queue 
ADD CONSTRAINT identity_review_queue_tally_raw_party_id_key 
UNIQUE (tally_raw_party_id);
