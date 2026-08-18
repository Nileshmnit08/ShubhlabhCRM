-- SPRINT 2 FIXES SCHEMA

-- 1. Ensure tally_raw_parties has a UNIQUE constraint on tally_ledger_name for idempotency
-- We will apply it scoped per import_id to allow different imports to maintain safety, 
-- or global? A single Tally ledger name should map uniquely to a CRM party. 
-- Since tally_raw_parties is essentially a staging table for identities, 
-- we want one unique tally_raw_parties row per ledger name globally to prevent 
-- duplicating resolution queues for the exact same Tally entity across multiple imports.

ALTER TABLE public.tally_raw_parties 
ADD CONSTRAINT tally_ledger_name_unique UNIQUE (tally_ledger_name);
