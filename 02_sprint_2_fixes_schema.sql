-- SPRINT 2 FIXES SCHEMA

-- 1. Remove existing duplicate raw parties before applying constraint
-- We keep the most recently created record (max id or max first_seen) for each tally_ledger_name.
DELETE FROM public.tally_raw_parties
WHERE id IN (
    SELECT id
    FROM (
        SELECT id, ROW_NUMBER() OVER(PARTITION BY tally_ledger_name ORDER BY first_seen DESC) as row_num
        FROM public.tally_raw_parties
    ) t
    WHERE t.row_num > 1
);

-- 2. Ensure tally_raw_parties has a UNIQUE constraint on tally_ledger_name for idempotency
ALTER TABLE public.tally_raw_parties 
ADD CONSTRAINT tally_ledger_name_unique UNIQUE (tally_ledger_name);
