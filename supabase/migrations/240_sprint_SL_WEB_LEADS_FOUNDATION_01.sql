-- =============================================================================
-- Migration 240: Website Leads Intake, Forms Foundation & Verification
-- Micro-Sprint: SL-WEB-LEADS-FOUNDATION-01
-- Target: PostgreSQL / Supabase
-- Description:
--   1. Creates website_leads table capturing:
--      - General Contact Inquiries
--      - Dealership & Distribution Applications
--      - Product-Specific Enquiries
--   2. Applies Row Level Security (RLS) permitting public anonymous INSERT with
--      anti-abuse validation, and authenticated staff full management.
--   3. Seeds baseline verification leads.
--   4. Safely resets sequence alignment.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Table: website_leads
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.website_leads (
    id BIGSERIAL PRIMARY KEY,
    lead_type VARCHAR(50) NOT NULL DEFAULT 'contact_inquiry',
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(150),
    subject VARCHAR(200),
    message TEXT,
    preferred_contact VARCHAR(50) DEFAULT 'phone',
    
    -- Dealer Application Specific Fields
    firm_name VARCHAR(200),
    business_type VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Rajasthan',
    district VARCHAR(100),
    city_tehsil VARCHAR(100),
    pincode VARCHAR(10),
    monthly_volume VARCHAR(100),
    investment_capacity VARCHAR(100),
    godown_capacity VARCHAR(100),
    experience_years VARCHAR(50),
    proposed_area TEXT,
    
    -- Product Enquiry Specific Fields
    product_name VARCHAR(200),
    product_slug VARCHAR(100),
    
    -- Metadata & Provenance
    source VARCHAR(50) NOT NULL DEFAULT 'website',
    source_url TEXT,
    ip_address VARCHAR(100),
    user_agent TEXT,
    converted_party_id UUID REFERENCES public.crm_parties(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance & CRM inbox queries
CREATE INDEX IF NOT EXISTS idx_website_leads_status_type 
    ON public.website_leads (status, lead_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_website_leads_phone 
    ON public.website_leads (phone);

CREATE INDEX IF NOT EXISTS idx_website_leads_created_at 
    ON public.website_leads (created_at DESC);

-- Enable RLS
ALTER TABLE public.website_leads ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Row Level Security Policies
-- -----------------------------------------------------------------------------

-- Policy 1: Public (anon and authenticated) can INSERT leads with basic validation check
DROP POLICY IF EXISTS "Public can submit website leads" ON public.website_leads;
CREATE POLICY "Public can submit website leads"
    ON public.website_leads FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        length(trim(full_name)) >= 2 AND
        length(trim(phone)) >= 10
    );

-- Policy 2: Authenticated Staff / Admins can SELECT all leads
DROP POLICY IF EXISTS "Staff can view website leads" ON public.website_leads;
CREATE POLICY "Staff can view website leads"
    ON public.website_leads FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Authenticated Staff / Admins can UPDATE leads (status, notes, assigned_to)
DROP POLICY IF EXISTS "Staff can update website leads" ON public.website_leads;
CREATE POLICY "Staff can update website leads"
    ON public.website_leads FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 4: Admins can DELETE leads
DROP POLICY IF EXISTS "Admins can delete website leads" ON public.website_leads;
CREATE POLICY "Admins can delete website leads"
    ON public.website_leads FOR DELETE
    TO authenticated
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. Idempotent Baseline Seed Data for Verification
-- -----------------------------------------------------------------------------
INSERT INTO public.website_leads (
    id, lead_type, status, full_name, phone, whatsapp, email, 
    subject, message, preferred_contact, firm_name, business_type, 
    state, district, city_tehsil, pincode, monthly_volume, 
    investment_capacity, godown_capacity, experience_years, proposed_area, 
    product_name, product_slug, source, admin_notes, created_at, updated_at
) VALUES 
(
    1,
    'contact_inquiry',
    'new',
    'Rajesh Kumar Sharma',
    '9829012345',
    '9829012345',
    'rajesh.sharma@example.com',
    'Bulk Feed Supply Inquiry',
    'Interested in 50 bags of Shubh Labh Dairy Special for our cooperative dairy farm near Bassi, Jaipur.',
    'phone',
    'Sharma Dairy & Cattle Care',
    'Commercial Dairy Farm',
    'Rajasthan',
    'Jaipur',
    'Bassi',
    '303301',
    '10–25 Tons',
    '₹5–10 Lakhs',
    '500–1500 sq ft',
    '8 years',
    'Bassi and Chaksu tehsil',
    NULL,
    NULL,
    'website',
    'Initial verification seed lead',
    now() - INTERVAL '2 days',
    now() - INTERVAL '2 days'
),
(
    2,
    'dealer_application',
    'new',
    'Mukesh Choudhary',
    '9414098765',
    '9414098765',
    'mukesh.kisanfeed@example.com',
    'Dealership Application for Sikar District',
    'We run a fertilizer and seed shop in Ringas. We want to become an authorized dealer for Shubh Labh cattle feed across Ringas and Sri Madhopur.',
    'whatsapp',
    'Kisan Agro Agency',
    'Feed & Agro Retailer',
    'Rajasthan',
    'Sikar',
    'Ringas',
    '332404',
    '25–50 Tons',
    '₹10–25 Lakhs',
    '1500+ sq ft',
    '12 years',
    'Ringas, Sri Madhopur, and adjoining villages',
    NULL,
    NULL,
    'website',
    'Candidate has high existing footfall and retail premises on main highway',
    now() - INTERVAL '1 day',
    now() - INTERVAL '1 day'
),
(
    3,
    'product_enquiry',
    'new',
    'Suresh Meena',
    '9785011223',
    '9785011223',
    'suresh.meena@example.com',
    'Product Inquiry: Shubh Labh ByPassFat 99',
    'Need 10 bags of ByPassFat 99 for high-yielding Murrah buffaloes in early lactation.',
    'phone',
    'Meena Dairy Farm',
    'Dairy Farm',
    'Rajasthan',
    'Dausa',
    'Lalsot',
    '303503',
    '< 10 Tons',
    '₹2–5 Lakhs',
    'Under 500 sq ft',
    '5 years',
    'Lalsot',
    'Shubh Labh ByPassFat 99',
    'bypassfat-99',
    'website',
    'Interested in milk fat percentage improvement',
    now() - INTERVAL '4 hours',
    now() - INTERVAL '4 hours'
)
ON CONFLICT (id) DO UPDATE SET
    lead_type = EXCLUDED.lead_type,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    whatsapp = EXCLUDED.whatsapp,
    email = EXCLUDED.email,
    subject = EXCLUDED.subject,
    message = EXCLUDED.message,
    firm_name = EXCLUDED.firm_name,
    business_type = EXCLUDED.business_type,
    district = EXCLUDED.district,
    updated_at = now();

-- -----------------------------------------------------------------------------
-- 4. Dynamic Sequence Alignment
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    seq_name TEXT;
    max_id BIGINT;
BEGIN
    seq_name := pg_get_serial_sequence('public.website_leads', 'id');
    IF seq_name IS NOT NULL THEN
        SELECT COALESCE(MAX(id), 0) + 1 INTO max_id FROM public.website_leads;
        EXECUTE 'SELECT setval(' || quote_literal(seq_name) || ', ' || max_id || ', false)';
        RAISE NOTICE 'Aligned sequence % to %', seq_name, max_id;
    END IF;
END $$;
