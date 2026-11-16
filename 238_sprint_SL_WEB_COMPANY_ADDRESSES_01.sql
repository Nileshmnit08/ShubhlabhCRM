-- =============================================================================
-- Migration 238: Native Supabase Website Company Addresses Management
-- Micro-Sprint: SL-WEBSITE-ADDRESS-CMS-01
-- Target: PostgreSQL / Supabase
-- Description: Creates company_addresses table, website_company_addresses view,
--              performance indexes, RLS policies, and seeds verified default address.
-- =============================================================================

-- 1. Table: company_addresses
CREATE TABLE IF NOT EXISTS public.company_addresses (
    id BIGSERIAL PRIMARY KEY,
    location_name VARCHAR(150) NOT NULL,
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    landmark VARCHAR(150),
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    office_phone VARCHAR(50),
    whatsapp_number VARCHAR(50),
    email VARCHAR(191),
    google_maps_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Performance Indexes for Public Ordering & Primary Lookup
CREATE INDEX IF NOT EXISTS idx_company_addresses_active ON public.company_addresses (is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_company_addresses_primary ON public.company_addresses (is_primary);

-- 3. Website CMS Namespaced Projection View Compatibility
CREATE OR REPLACE VIEW public.website_company_addresses AS
SELECT * FROM public.company_addresses;

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.company_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active addresses" ON public.company_addresses;
CREATE POLICY "Public can view active addresses"
    ON public.company_addresses FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all addresses" ON public.company_addresses;
CREATE POLICY "Admins can view all addresses"
    ON public.company_addresses FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage addresses" ON public.company_addresses;
CREATE POLICY "Admins can manage addresses"
    ON public.company_addresses FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5. Grant Permissions
GRANT SELECT ON public.company_addresses TO anon, authenticated;
GRANT ALL ON public.company_addresses TO authenticated, service_role;
GRANT SELECT ON public.website_company_addresses TO anon, authenticated;
GRANT ALL ON public.website_company_addresses TO authenticated, service_role;

-- 6. Seed Verified Default Primary Office & Works Address
INSERT INTO public.company_addresses (
    location_name,
    address_line1,
    address_line2,
    landmark,
    city,
    state,
    pincode,
    country,
    office_phone,
    whatsapp_number,
    email,
    google_maps_url,
    display_order,
    is_active,
    is_primary
) VALUES (
    'Head Office & Manufacturing Works',
    'RIICO Industrial Area',
    'Plot No. 42-45, Agro Food Park',
    'Near Highway By-Pass',
    'Jaipur',
    'Rajasthan',
    '302013',
    'India',
    '+91 94619 24461',
    '+91 94619 24461',
    'contact@shubhlabhfeeds.in',
    'https://maps.google.com/?q=Shubh+Labh+Cattle+Feed+Rajasthan',
    1,
    true,
    true
);
