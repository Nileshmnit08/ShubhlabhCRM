-- SPRINT 8: Production Hardening, Security & Data Integrity

-- 1. Index optimization for common access paths
CREATE INDEX IF NOT EXISTS idx_requirements_party_id ON public.requirements(party_id);
CREATE INDEX IF NOT EXISTS idx_interactions_party_id ON public.interactions(party_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_party_id ON public.follow_ups(party_id);
CREATE INDEX IF NOT EXISTS idx_tally_transactions_crm_party_id ON public.tally_transactions(crm_party_id);
CREATE INDEX IF NOT EXISTS idx_party_identity_links_crm_id ON public.party_identity_links(crm_party_id);

-- 2. Safely Update Foreign Key Constraints to prevent accidental data loss on merge
-- We drop the CASCADE behavior for party deletions so that merging logic is forced to explicitly
-- reassign records rather than accidentally dropping them.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'crm_parties'
          AND tc.table_name IN ('requirements', 'interactions', 'follow_ups', 'tally_transactions', 'party_identity_links')
    LOOP
        EXECUTE 'ALTER TABLE public.' || r.table_name || ' DROP CONSTRAINT ' || r.constraint_name;
    END LOOP;
END $$;

ALTER TABLE public.requirements ADD CONSTRAINT requirements_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.crm_parties(id) ON DELETE RESTRICT;
ALTER TABLE public.interactions ADD CONSTRAINT interactions_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.crm_parties(id) ON DELETE RESTRICT;
ALTER TABLE public.follow_ups ADD CONSTRAINT follow_ups_party_id_fkey FOREIGN KEY (party_id) REFERENCES public.crm_parties(id) ON DELETE RESTRICT;
ALTER TABLE public.tally_transactions ADD CONSTRAINT tally_transactions_crm_party_id_fkey FOREIGN KEY (crm_party_id) REFERENCES public.crm_parties(id) ON DELETE RESTRICT;
ALTER TABLE public.party_identity_links ADD CONSTRAINT party_identity_links_crm_party_id_fkey FOREIGN KEY (crm_party_id) REFERENCES public.crm_parties(id) ON DELETE RESTRICT;

-- 3. Stricter Row Level Security (RLS)
-- Drop the overly permissive USING (true) policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND policyname LIKE 'Allow all on %'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- Recreate policies for authenticated users only
-- (Assumes the application will implement a login page or uses a Supabase auth token)
CREATE POLICY "Auth only crm_parties" ON public.crm_parties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only requirements" ON public.requirements FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only interactions" ON public.interactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only follow_ups" ON public.follow_ups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only tally_imports" ON public.tally_imports FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only tally_raw_parties" ON public.tally_raw_parties FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only party_identity_links" ON public.party_identity_links FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only identity_review_queue" ON public.identity_review_queue FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only tally_raw_transactions" ON public.tally_raw_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only tally_transactions" ON public.tally_transactions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Auth only requirements_history" ON public.requirements_history FOR ALL USING (auth.role() = 'authenticated');
