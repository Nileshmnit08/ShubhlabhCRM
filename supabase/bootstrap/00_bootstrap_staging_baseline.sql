-- ============================================================================
-- SCRIPT: 00_bootstrap_staging_baseline.sql (ROBUST & IDEMPOTENT)
-- SPRINT: SL-REWARD-LOCAL-STAGING-BOOTSTRAP-01
--
-- PURPOSE:
-- Initializes an isolated, minimal baseline schema for validating Migration 225.
-- Safe to execute against a brand-new database OR a pre-existing development/staging schema.
-- Contains ZERO production customer PII, vouchers, or production credentials.
-- Synthetically models Buyer A, Buyer B, Staff, Admin, and sample dispatches.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────────────────────
-- 1. BASELINE IDENTITY & CRM CORE TABLES
-- ────────────────────────────────────────────────────────────────────────────

-- Core CRM Parties Table
CREATE TABLE IF NOT EXISTS public.crm_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,
    mobile VARCHAR(50),
    city VARCHAR(100),
    territory_name VARCHAR(100),
    owner_name VARCHAR(100),
    crm_status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on crm_parties in case the table was pre-existing
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS mobile VARCHAR(50);
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS city VARCHAR(100);
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS territory_name VARCHAR(100);
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS owner_name VARCHAR(100);
ALTER TABLE public.crm_parties ADD COLUMN IF NOT EXISTS crm_status VARCHAR(50) DEFAULT 'Active';

-- Application Users Table
CREATE TABLE IF NOT EXISTS public.app_users (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'Salesperson', -- 'Admin', 'Salesperson', 'Buyer'
    is_active BOOLEAN DEFAULT true,
    crm_party_id UUID REFERENCES public.crm_parties(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on app_users in case the table was pre-existing
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'Salesperson';
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.app_users ADD COLUMN IF NOT EXISTS crm_party_id UUID;

-- Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users 
    WHERE id = auth.uid() AND is_active = true AND role = 'Admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role != 'Buyer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_buyer()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'Buyer'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_crm_party_id()
RETURNS UUID AS $$
  SELECT crm_party_id
  FROM public.app_users
  WHERE id = auth.uid()
    AND is_active = true
    AND role = 'Buyer'
$$ LANGUAGE sql SECURITY DEFINER;

-- Customer Master View (Drop cascade first to handle schema differences)
DROP VIEW IF EXISTS public.v_customer_master CASCADE;

CREATE OR REPLACE VIEW public.v_customer_master AS
SELECT 
    c.id,
    c.display_name,
    COALESCE(c.mobile, '') AS mobile,
    COALESCE(c.city, '') AS city,
    COALESCE(c.territory_name, 'Default Territory') AS territory_name,
    COALESCE(c.owner_name, 'Unassigned') AS owner_name,
    COALESCE(c.crm_status, 'Active') AS crm_status
FROM public.crm_parties c;


-- ────────────────────────────────────────────────────────────────────────────
-- 2. REQUIREMENTS & DISPATCH TABLES
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'Bags',
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS product_type VARCHAR(255) DEFAULT 'Cattle Feed';
ALTER TABLE public.requirements ALTER COLUMN product_type DROP NOT NULL;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Bags';
ALTER TABLE public.requirements ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Pending';

CREATE TABLE IF NOT EXISTS public.requirement_dispatches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requirement_id UUID REFERENCES public.requirements(id) ON DELETE CASCADE NOT NULL,
    dispatch_date DATE NOT NULL,
    quantity NUMERIC NOT NULL CHECK (quantity > 0),
    unit VARCHAR(50) DEFAULT 'Bags',
    truck_number VARCHAR(100) NOT NULL,
    driver_name VARCHAR(255),
    driver_mobile VARCHAR(20),
    transporter_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Dispatched',
    return_quantity NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS dispatch_date DATE;
ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS quantity NUMERIC DEFAULT 0;
ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS unit VARCHAR(50) DEFAULT 'Bags';
ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS truck_number VARCHAR(100);
ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Dispatched';
ALTER TABLE public.requirement_dispatches ADD COLUMN IF NOT EXISTS return_quantity NUMERIC DEFAULT 0;

DROP VIEW IF EXISTS public.v_requirement_dispatch_summary CASCADE;

CREATE OR REPLACE VIEW public.v_requirement_dispatch_summary AS
SELECT 
    r.id AS requirement_id,
    COALESCE(r.quantity, 0) AS required_quantity,
    COALESCE(r.unit, 'Bags') AS unit,
    COALESCE(SUM(
        CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END
    ), 0) AS total_dispatched_quantity,
    GREATEST(0, COALESCE(r.quantity, 0) - COALESCE(SUM(
        CASE WHEN rd.status = 'Cancelled' THEN 0 ELSE rd.quantity - COALESCE(rd.return_quantity, 0) END
    ), 0)) AS pending_quantity
FROM public.requirements r
LEFT JOIN public.requirement_dispatches rd ON r.id = rd.requirement_id
GROUP BY r.id, r.quantity, r.unit;


-- ────────────────────────────────────────────────────────────────────────────
-- 3. REWARD SCHEME & SLABS TABLES (LEGACY PRE-225 BASELINE STATE)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.dealer_schemes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    description TEXT,
    near_slab_percentage NUMERIC DEFAULT 15,
    near_slab_bag_threshold NUMERIC DEFAULT 10,
    overlap_policy VARCHAR(50) DEFAULT 'Highest Value',
    customer_type VARCHAR(100) DEFAULT 'Dealers Only',
    product_eligibility VARCHAR(50) DEFAULT 'All',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS near_slab_percentage NUMERIC DEFAULT 15;
ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS near_slab_bag_threshold NUMERIC DEFAULT 10;
ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS overlap_policy VARCHAR(50) DEFAULT 'Highest Value';
ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS customer_type VARCHAR(100) DEFAULT 'Dealers Only';
ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS product_eligibility VARCHAR(50) DEFAULT 'All';
ALTER TABLE public.dealer_schemes ADD COLUMN IF NOT EXISTS description TEXT;

CREATE TABLE IF NOT EXISTS public.dealer_scheme_slabs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    slab_name VARCHAR(100) NOT NULL,
    threshold_value NUMERIC(15,2) DEFAULT 0,
    min_bags NUMERIC(15,2) NOT NULL DEFAULT 0,
    max_bags NUMERIC(15,2),
    reward_description TEXT,
    reward_type VARCHAR(50) DEFAULT 'Physical Gift',
    reward_value NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS threshold_value NUMERIC(15,2) DEFAULT 0;
ALTER TABLE public.dealer_scheme_slabs ALTER COLUMN threshold_value DROP NOT NULL;
ALTER TABLE public.dealer_scheme_slabs ALTER COLUMN threshold_value SET DEFAULT 0;
ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS min_bags NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS max_bags NUMERIC(15,2);
ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS reward_description TEXT;
ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'Physical Gift';
ALTER TABLE public.dealer_scheme_slabs ADD COLUMN IF NOT EXISTS reward_value NUMERIC(15,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.dealer_reward_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    slab_id UUID REFERENCES public.dealer_scheme_slabs(id) ON DELETE CASCADE,
    qualifying_bags NUMERIC(15,2) NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Eligible',
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    fulfilled_by UUID,
    fulfilled_at TIMESTAMPTZ,
    fulfillment_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS qualifying_bags NUMERIC(15,2) NOT NULL DEFAULT 0;
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Eligible';
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS fulfilled_by UUID;
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ;
ALTER TABLE public.dealer_reward_eligibility ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'dealer_reward_eligibility_customer_scheme_slab_key'
    ) THEN
        ALTER TABLE public.dealer_reward_eligibility 
        ADD CONSTRAINT dealer_reward_eligibility_customer_scheme_slab_key UNIQUE (customer_id, scheme_id, slab_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.dealer_reward_calculation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    old_bag_total NUMERIC(15,2),
    new_bag_total NUMERIC(15,2),
    trigger_event VARCHAR(100),
    transaction_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.dealer_reward_calculation_audit ADD COLUMN IF NOT EXISTS old_bag_total NUMERIC(15,2);
ALTER TABLE public.dealer_reward_calculation_audit ADD COLUMN IF NOT EXISTS new_bag_total NUMERIC(15,2);
ALTER TABLE public.dealer_reward_calculation_audit ADD COLUMN IF NOT EXISTS trigger_event VARCHAR(100);
ALTER TABLE public.dealer_reward_calculation_audit ADD COLUMN IF NOT EXISTS transaction_id UUID;

CREATE TABLE IF NOT EXISTS public.dealer_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    target_period VARCHAR(100),
    target_end_date DATE,
    target_value NUMERIC(15,2) DEFAULT 0,
    achievement_value NUMERIC(15,2) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_reward_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    points NUMERIC(15,2),
    transaction_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.dealer_reward_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE SET NULL,
    points_claimed NUMERIC(15,2),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historical Baseline Tables
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100),
    invoice_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Completed',
    total_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    converted_bag_quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
    is_return BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Valid'
);

-- Legacy Permissive Policies (Pre-225 Baseline)
ALTER TABLE public.dealer_schemes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on dealer_schemes" ON public.dealer_schemes;
CREATE POLICY "Allow all on dealer_schemes" ON public.dealer_schemes FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.dealer_scheme_slabs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs;
CREATE POLICY "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs;
CREATE POLICY "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs;
CREATE POLICY "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs;
CREATE POLICY "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs FOR DELETE TO authenticated USING (true);

ALTER TABLE public.requirement_dispatches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on requirement_dispatches" ON public.requirement_dispatches;
CREATE POLICY "Allow all on requirement_dispatches" ON public.requirement_dispatches FOR ALL USING (true) WITH CHECK (true);


-- ────────────────────────────────────────────────────────────────────────────
-- 4. SYNTHETIC STAGING TEST SEED DATA (ZERO PRODUCTION PII)
-- ────────────────────────────────────────────────────────────────────────────

-- Synthetic Customers
INSERT INTO public.crm_parties (id, display_name, mobile, city, territory_name, owner_name, crm_status)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'Buyer Alpha Cattle Feed', '9999900001', 'Ajmer', 'Rajasthan Central', 'Rajesh Sharma', 'Active'),
  ('22222222-2222-2222-2222-222222222222', 'Buyer Beta Dairy Supplies', '9999900002', 'Jaipur', 'Rajasthan East', 'Vikram Patel', 'Active')
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  mobile = EXCLUDED.mobile,
  city = EXCLUDED.city,
  territory_name = EXCLUDED.territory_name,
  owner_name = EXCLUDED.owner_name,
  crm_status = EXCLUDED.crm_status;

-- Synthetic Auth Users (Inserted into auth.users first to satisfy app_users foreign key)
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user
) VALUES 
  ('00000000-0000-0000-0000-000000000000', 'aaaa1111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'buyer_alpha@test.local', crypt('TestPassword123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'bbbb2222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'buyer_beta@test.local', crypt('TestPassword123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'cccc3333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'staff_user@test.local', crypt('TestPassword123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false),
  ('00000000-0000-0000-0000-000000000000', 'dddd4444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'admin_user@test.local', crypt('TestPassword123!', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}', false)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email;

-- Synthetic Auth Identities (Safe block for GoTrue identity lookup)
DO $$
BEGIN
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at, last_sign_in_at
    ) VALUES
      ('aaaa1111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'buyer_alpha@test.local', jsonb_build_object('sub', 'aaaa1111-1111-1111-1111-111111111111', 'email', 'buyer_alpha@test.local'), 'email', now(), now(), now()),
      ('bbbb2222-2222-2222-2222-222222222222', 'bbbb2222-2222-2222-2222-222222222222', 'buyer_beta@test.local', jsonb_build_object('sub', 'bbbb2222-2222-2222-2222-222222222222', 'email', 'buyer_beta@test.local'), 'email', now(), now(), now()),
      ('cccc3333-3333-3333-3333-333333333333', 'cccc3333-3333-3333-3333-333333333333', 'staff_user@test.local', jsonb_build_object('sub', 'cccc3333-3333-3333-3333-333333333333', 'email', 'staff_user@test.local'), 'email', now(), now(), now()),
      ('dddd4444-4444-4444-4444-444444444444', 'dddd4444-4444-4444-4444-444444444444', 'admin_user@test.local', jsonb_build_object('sub', 'dddd4444-4444-4444-4444-444444444444', 'email', 'admin_user@test.local'), 'email', now(), now(), now())
    ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Synthetic Auth App Users
INSERT INTO public.app_users (id, email, role, is_active, crm_party_id)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'buyer_alpha@test.local', 'Buyer', true, '11111111-1111-1111-1111-111111111111'),
  ('bbbb2222-2222-2222-2222-222222222222', 'buyer_beta@test.local', 'Buyer', true, '22222222-2222-2222-2222-222222222222'),
  ('cccc3333-3333-3333-3333-333333333333', 'staff_user@test.local', 'Salesperson', true, null),
  ('dddd4444-4444-4444-4444-444444444444', 'admin_user@test.local', 'Admin', true, null)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  crm_party_id = EXCLUDED.crm_party_id;

-- Synthetic Scheme & Slabs
INSERT INTO public.dealer_schemes (id, name, start_date, end_date, status, description)
VALUES 
  ('33333333-3333-3333-3333-333333333333', 'Q3 Monsoon Bonanza 2026', '2026-07-01', '2026-10-31', 'Active', 'Seasonal bag volume reward scheme.')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  status = EXCLUDED.status;

INSERT INTO public.dealer_scheme_slabs (id, scheme_id, slab_name, threshold_value, min_bags, max_bags, reward_description, reward_type, reward_value)
VALUES 
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Silver Tier', 50, 50, 99, 'Silver Coin 10g', 'Physical Gift', 1200),
  ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'Gold Tier', 100, 100, NULL, 'Gold Coin 5g', 'Physical Gift', 35000)
ON CONFLICT (id) DO UPDATE SET
  slab_name = EXCLUDED.slab_name,
  threshold_value = EXCLUDED.threshold_value,
  min_bags = EXCLUDED.min_bags,
  max_bags = EXCLUDED.max_bags,
  reward_description = EXCLUDED.reward_description,
  reward_type = EXCLUDED.reward_type,
  reward_value = EXCLUDED.reward_value;

-- Synthetic Orders for Buyer Alpha
INSERT INTO public.requirements (id, party_id, product_type, quantity, unit, status)
VALUES 
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'Cattle Feed', 120, 'Bags', 'Confirmed')
ON CONFLICT (id) DO UPDATE SET
  product_type = EXCLUDED.product_type,
  quantity = EXCLUDED.quantity,
  unit = EXCLUDED.unit;

-- Synthetic Dispatch (60 bags dispatched to Buyer Alpha -> achieves Silver Tier)
INSERT INTO public.requirement_dispatches (id, requirement_id, dispatch_date, quantity, unit, truck_number, status, return_quantity)
VALUES 
  ('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', '2026-08-15', 60, 'Bags', 'RJ-14-GA-1234', 'Dispatched', 0)
ON CONFLICT (id) DO UPDATE SET
  quantity = EXCLUDED.quantity,
  return_quantity = EXCLUDED.return_quantity;
