-- SPRINT 8 FIXES: Security, Roles, and Constraints

-- 1. Create App Users Table
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Operator',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- 2. Trigger to Auto-Provision Users (for acceptance testing)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.app_users (id, email, role, is_active)
  VALUES (new.id, new.email, 'Admin', true); -- Default to Admin/Active for testing
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Stricter Row Level Security (RLS)
-- Drop previous basic auth policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND policyname LIKE 'Auth only %'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename;
    END LOOP;
END $$;

-- Policy helper: Is Active User?
CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Policy helper: Is Admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE id = auth.uid() AND is_active = true AND role = 'Admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- App Users Policies
CREATE POLICY "Users can view active users" ON public.app_users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins can update users" ON public.app_users FOR UPDATE USING (public.is_admin());

-- CRM Core Policies (Active users can access)
CREATE POLICY "Active users CRM Select" ON public.crm_parties FOR SELECT USING (public.is_active_user());
CREATE POLICY "Active users CRM Insert" ON public.crm_parties FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Active users CRM Update" ON public.crm_parties FOR UPDATE USING (public.is_active_user());
CREATE POLICY "Active users CRM Delete" ON public.crm_parties FOR DELETE USING (public.is_active_user());

CREATE POLICY "Active users Reqs Select" ON public.requirements FOR SELECT USING (public.is_active_user());
CREATE POLICY "Active users Reqs Insert" ON public.requirements FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Active users Reqs Update" ON public.requirements FOR UPDATE USING (public.is_active_user());
CREATE POLICY "Active users Reqs Delete" ON public.requirements FOR DELETE USING (public.is_active_user());

CREATE POLICY "Active users Ints Select" ON public.interactions FOR SELECT USING (public.is_active_user());
CREATE POLICY "Active users Ints Insert" ON public.interactions FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Active users Ints Update" ON public.interactions FOR UPDATE USING (public.is_active_user());

CREATE POLICY "Active users Fups Select" ON public.follow_ups FOR SELECT USING (public.is_active_user());
CREATE POLICY "Active users Fups Insert" ON public.follow_ups FOR INSERT WITH CHECK (public.is_active_user());
CREATE POLICY "Active users Fups Update" ON public.follow_ups FOR UPDATE USING (public.is_active_user());

CREATE POLICY "Active users Prods Select" ON public.products FOR SELECT USING (public.is_active_user());

-- Financial & Import Policies (Admins only)
CREATE POLICY "Admins only Tally Txns" ON public.tally_transactions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins only Tally Raw Txns" ON public.tally_raw_transactions FOR ALL USING (public.is_admin());
CREATE POLICY "Admins only Tally Imports" ON public.tally_imports FOR ALL USING (public.is_admin());
CREATE POLICY "Admins only Tally Raw Parties" ON public.tally_raw_parties FOR ALL USING (public.is_admin());
CREATE POLICY "Admins only Party Links" ON public.party_identity_links FOR ALL USING (public.is_admin());
CREATE POLICY "Admins only Review Queue" ON public.identity_review_queue FOR ALL USING (public.is_admin());

-- 4. Data Integrity Constraints

-- Requirements table validation
ALTER TABLE public.requirements
  ALTER COLUMN party_id SET NOT NULL,
  ALTER COLUMN product_type SET NOT NULL,
  ALTER COLUMN quantity SET NOT NULL,
  ALTER COLUMN unit SET NOT NULL;

-- Remove old constraint if it exists to replace it
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS req_status_check;
ALTER TABLE public.requirements ADD CONSTRAINT req_status_check 
  CHECK (status IN ('New', 'Quotation Required', 'Quotation Sent', 'Negotiation', 'Confirmed', 'Lost', 'Closed'));

-- Rate/Quantity sanity bounds
ALTER TABLE public.requirements DROP CONSTRAINT IF EXISTS req_positive_values;
ALTER TABLE public.requirements ADD CONSTRAINT req_positive_values
  CHECK (quantity > 0 AND (expected_rate IS NULL OR expected_rate >= 0));

-- Follow up validations
ALTER TABLE public.follow_ups DROP CONSTRAINT IF EXISTS fups_status_check;
ALTER TABLE public.follow_ups ADD CONSTRAINT fups_status_check
  CHECK (status IN ('Pending', 'Completed', 'Cancelled', 'Postponed'));

ALTER TABLE public.follow_ups
  ALTER COLUMN reason SET NOT NULL,
  ALTER COLUMN follow_up_date SET NOT NULL;
