-- =============================================================================
-- Migration 236: Native Supabase Website CMS Architecture
-- Micro-Sprint: SL-WEB-CMS-SUPABASE-01
-- Target: PostgreSQL / Supabase
-- Description: Creates namespaced website CMS tables, RLS policies, and seeds
--              verified initial baseline content idempotently.
-- =============================================================================

-- 1. Table: website_media_assets
CREATE TABLE IF NOT EXISTS public.website_media_assets (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) UNIQUE NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    width INTEGER,
    height INTEGER,
    alt_text VARCHAR(255) DEFAULT '',
    uploaded_by UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Table: website_site_settings
CREATE TABLE IF NOT EXISTS public.website_site_settings (
    id BIGSERIAL PRIMARY KEY,
    setting_key VARCHAR(64) UNIQUE NOT NULL,
    setting_value TEXT,
    setting_group VARCHAR(32) NOT NULL DEFAULT 'general',
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_system_locked BOOLEAN NOT NULL DEFAULT false,
    description VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Table: website_site_sections
CREATE TABLE IF NOT EXISTS public.website_site_sections (
    id BIGSERIAL PRIMARY KEY,
    section_key VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle TEXT,
    eyebrow VARCHAR(100),
    lead_text TEXT,
    body_text TEXT,
    primary_cta_text VARCHAR(100),
    primary_cta_url VARCHAR(255),
    secondary_cta_text VARCHAR(100),
    secondary_cta_url VARCHAR(255),
    media_id BIGINT REFERENCES public.website_media_assets(id) ON DELETE SET NULL,
    additional_data JSONB DEFAULT '{}'::jsonb,
    is_published BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Table: website_product_categories
CREATE TABLE IF NOT EXISTS public.website_product_categories (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    category_badge VARCHAR(50),
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Table: website_products
CREATE TABLE IF NOT EXISTS public.website_products (
    id BIGSERIAL PRIMARY KEY,
    category_id BIGINT REFERENCES public.website_product_categories(id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    short_description TEXT NOT NULL,
    full_description TEXT,
    packaging_desc VARCHAR(255),
    main_image_id BIGINT REFERENCES public.website_media_assets(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Table: website_knowledge_articles
CREATE TABLE IF NOT EXISTS public.website_knowledge_articles (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    category VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    content_body TEXT NOT NULL,
    cover_image_id BIGINT REFERENCES public.website_media_assets(id) ON DELETE SET NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    published_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Table: website_navigation_items
CREATE TABLE IF NOT EXISTS public.website_navigation_items (
    id BIGSERIAL PRIMARY KEY,
    location VARCHAR(20) NOT NULL DEFAULT 'header',
    label VARCHAR(100) NOT NULL,
    url VARCHAR(255) NOT NULL,
    target VARCHAR(20) NOT NULL DEFAULT '_self',
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Table: website_audit_logs
CREATE TABLE IF NOT EXISTS public.website_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Indexes for Fast Public Read Queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_website_site_settings_public ON public.website_site_settings (is_public, setting_group);
CREATE INDEX IF NOT EXISTS idx_website_site_sections_published ON public.website_site_sections (section_key, is_published);
CREATE INDEX IF NOT EXISTS idx_website_products_status ON public.website_products (status, display_order);
CREATE INDEX IF NOT EXISTS idx_website_articles_status ON public.website_knowledge_articles (status, published_at);
CREATE INDEX IF NOT EXISTS idx_website_nav_active ON public.website_navigation_items (location, is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_website_audit_entity ON public.website_audit_logs (entity_type, created_at DESC);

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================

ALTER TABLE public.website_media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_site_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_knowledge_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_audit_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 1. website_media_assets RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view media assets" ON public.website_media_assets;
CREATE POLICY "Public can view media assets"
    ON public.website_media_assets FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage media assets" ON public.website_media_assets;
CREATE POLICY "Admins can manage media assets"
    ON public.website_media_assets FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 2. website_site_settings RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view public settings" ON public.website_site_settings;
CREATE POLICY "Public can view public settings"
    ON public.website_site_settings FOR SELECT
    TO anon
    USING (is_public = true);

DROP POLICY IF EXISTS "Admins can view all settings" ON public.website_site_settings;
CREATE POLICY "Admins can view all settings"
    ON public.website_site_settings FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage settings" ON public.website_site_settings;
CREATE POLICY "Admins can manage settings"
    ON public.website_site_settings FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 3. website_site_sections RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published sections" ON public.website_site_sections;
CREATE POLICY "Public can view published sections"
    ON public.website_site_sections FOR SELECT
    TO anon
    USING (is_published = true);

DROP POLICY IF EXISTS "Admins can view all sections" ON public.website_site_sections;
CREATE POLICY "Admins can view all sections"
    ON public.website_site_sections FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage sections" ON public.website_site_sections;
CREATE POLICY "Admins can manage sections"
    ON public.website_site_sections FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 4. website_product_categories RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view product categories" ON public.website_product_categories;
CREATE POLICY "Public can view product categories"
    ON public.website_product_categories FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage product categories" ON public.website_product_categories;
CREATE POLICY "Admins can manage product categories"
    ON public.website_product_categories FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. website_products RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published products" ON public.website_products;
CREATE POLICY "Public can view published products"
    ON public.website_products FOR SELECT
    TO anon
    USING (status = 'published');

DROP POLICY IF EXISTS "Admins can view all products" ON public.website_products;
CREATE POLICY "Admins can view all products"
    ON public.website_products FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage products" ON public.website_products;
CREATE POLICY "Admins can manage products"
    ON public.website_products FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 6. website_knowledge_articles RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published articles" ON public.website_knowledge_articles;
CREATE POLICY "Public can view published articles"
    ON public.website_knowledge_articles FOR SELECT
    TO anon
    USING (status = 'published' AND published_at <= now());

DROP POLICY IF EXISTS "Admins can view all articles" ON public.website_knowledge_articles;
CREATE POLICY "Admins can view all articles"
    ON public.website_knowledge_articles FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage articles" ON public.website_knowledge_articles;
CREATE POLICY "Admins can manage articles"
    ON public.website_knowledge_articles FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. website_navigation_items RLS
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active navigation" ON public.website_navigation_items;
CREATE POLICY "Public can view active navigation"
    ON public.website_navigation_items FOR SELECT
    TO anon
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can view all navigation" ON public.website_navigation_items;
CREATE POLICY "Admins can view all navigation"
    ON public.website_navigation_items FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage navigation" ON public.website_navigation_items;
CREATE POLICY "Admins can manage navigation"
    ON public.website_navigation_items FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- -----------------------------------------------------------------------------
-- 8. website_audit_logs RLS
-- (Strictly invisible to anon; append-only for admins; no updates or deletes)
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.website_audit_logs;
CREATE POLICY "Admins can view audit logs"
    ON public.website_audit_logs FOR SELECT
    TO authenticated
    USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.website_audit_logs;
CREATE POLICY "Admins can insert audit logs"
    ON public.website_audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());

-- =============================================================================
-- Seed Initial Baseline Content (Idempotent: ON CONFLICT DO NOTHING)
-- =============================================================================

-- 1. Seed Site Settings
INSERT INTO public.website_site_settings (setting_key, setting_value, setting_group, is_public, is_system_locked, description)
VALUES
('brand_name', 'SHUBH LABH', 'general', true, false, 'Official brand name'),
('brand_tagline', 'DAIRY NUTRITION', 'general', true, false, 'Brand tagline'),
('announcement_text', 'Nutrition made with farmers in mind ✳ Serving dairy ambitions across Rajasthan', 'general', true, false, 'Top announcement banner text'),
('announcement_active', '1', 'general', true, false, 'Announcement banner visibility toggle (1/0)'),
('crm_login_url', 'https://shubhlabh-crm.vercel.app/', 'integration', true, true, 'Immutable external CRM destination URL'),
('phone_number', NULL, 'contact', true, false, 'Official customer helpline'),
('whatsapp_number', NULL, 'contact', true, false, 'WhatsApp Business phone number'),
('public_email', NULL, 'contact', true, false, 'Public contact email'),
('postal_address', NULL, 'contact', true, false, 'Registered factory / office address'),
('meta_title', 'Shubh Labh | Better Nutrition. Stronger Dairy.', 'seo', true, false, 'Default page meta title'),
('meta_description', 'Shubh Labh — cattle feed and dairy nutrition solutions built for cattle well-being and dairy farmer progress across Rajasthan.', 'seo', true, false, 'Default page meta description'),
('footer_text', 'Shubh Labh is committed to farmer-first dairy nutrition, balanced cattle feed formulation, and consistent quality across Rajasthan.', 'general', true, false, 'Footer corporate narrative')
ON CONFLICT (setting_key) DO NOTHING;

-- 2. Seed Site Sections
INSERT INTO public.website_site_sections (section_key, title, subtitle, eyebrow, lead_text, body_text, primary_cta_text, primary_cta_url, secondary_cta_text, secondary_cta_url, additional_data, is_published)
VALUES
('hero', 'Better nutrition. Stronger dairy.', 'Thoughtful cattle nutrition for the people who keep India''s dairy story moving forward.', 'A partner in dairy progress', NULL, NULL, 'Explore our products ↗', '#products', 'Discover Shubh Labh →', '#about', '{"kicker": "NOURISH THE HERD. NURTURE THE FUTURE.", "indicator": "01 / 03 • Nutrition • Care • Progress"}'::jsonb, true),
('trust_strip', 'Core Guiding Pillars', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '["Farmer-first thinking", "Nutrition-led approach", "Quality-minded processes", "Growing together"]'::jsonb, true),
('about', 'For every farmer''s effort, there is a bigger dream.', 'Rooted in trust. Focused on progress.', 'Welcome to Shubh Labh', 'Dairy farming is built on daily dedication. We bring thoughtful nutrition, balanced formulation, and honest quality to every bag.', 'Shubh Labh brings together cattle-feed products designed to support animal wellness, milk productivity, and herd longevity. Rooted in farmer trust and focused on sustainable dairy progress.', NULL, NULL, NULL, NULL, '{"pillars": [{"title": "Farmer at the centre", "desc": "Every feed formulation starts from the practical realities of daily dairy management."}, {"title": "Quality with care", "desc": "Clean raw materials, balanced nutritional ratios, and strict batch hygiene."}, {"title": "Progress together", "desc": "Partnering with dairy families and rural distributors for lasting growth."}]}'::jsonb, true),
('dealer', 'Let''s take dairy nutrition further.', 'Partnering with progressive rural entrepreneurs across Rajasthan.', 'Become a Dealer', NULL, 'We partner with passionate distributors and rural dealers who believe in farmer-first values, transparent quality, and steady business growth.', 'Enquire about dealership ↗', '#contact', NULL, NULL, '{"benefits": ["Consistent commercial margins and dependable dispatch", "Farmer-tested feed formulations with strong field acceptance", "Dedicated marketing support and nutritional advisory guidance"]}'::jsonb, true)
ON CONFLICT (section_key) DO NOTHING;

-- 3. Seed Product Categories
INSERT INTO public.website_product_categories (id, name, slug, category_badge, display_order)
VALUES
(1, 'Cattle Feed', 'cattle-feed', 'CATTLE FEED', 1),
(2, 'Nutrition Support', 'nutrition-support', 'NUTRITION SUPPORT', 2)
ON CONFLICT (slug) DO NOTHING;

-- 4. Seed Products
INSERT INTO public.website_products (id, category_id, name, slug, short_description, full_description, packaging_desc, display_order, status)
VALUES
(1, 1, 'Shubh Labh Dairy Special', 'dairy-special', 'Balanced dairy ration crafted to support milk yield, digestion, and daily body condition in milking cows and buffaloes.', NULL, 'Available in 50 kg moisture-resistant woven bags', 1, 'published'),
(2, 2, 'Performance Premix', 'performance-premix', 'Nutritional formulation built for balanced energy, mineral support, and consistent dairy performance.', NULL, 'Available in 25 kg & 50 kg packs', 2, 'published'),
(3, 2, 'Specialised Nutrition', 'specialised-nutrition', 'Targeted feeding solutions for transition phases, dry cows, and growing calves.', NULL, 'Available in 25 kg bags', 3, 'published')
ON CONFLICT (slug) DO NOTHING;

-- Reset product sequences to match seeded IDs
SELECT setval(pg_get_serial_sequence('public.website_product_categories', 'id'), COALESCE((SELECT MAX(id) FROM public.website_product_categories), 1));
SELECT setval(pg_get_serial_sequence('public.website_products', 'id'), COALESCE((SELECT MAX(id) FROM public.website_products), 1));

-- 5. Seed Knowledge Articles
INSERT INTO public.website_knowledge_articles (id, title, slug, category, summary, content_body, display_order, status, published_at)
VALUES
(1, 'Essential Feeding Practices for Peak Milk Production', 'feeding-practices-peak-production', 'Dairy Nutrition', 'Practical guidance on dry matter intake, green fodder proportion, and clean drinking water for lactating animals.', '<p>A balanced ration provides energy, protein, fiber, minerals, and vitamins in correct proportion. Ensuring ad-libitum clean drinking water and consistent daily feeding schedules enhances rumination and lactation stability.</p>', 1, 'published', now()),
(2, 'Seasonal Dairy Care & Transition Management', 'seasonal-dairy-care', 'Dairy Care', 'Supporting cow health and metabolic balance through weather shifts and calving cycles.', '<p>Managing heat stress during peak summers and providing shelter during chilly winter nights preserves lactation persistence and prevents metabolic disorders during transition phases.</p>', 2, 'published', now())
ON CONFLICT (slug) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.website_knowledge_articles', 'id'), COALESCE((SELECT MAX(id) FROM public.website_knowledge_articles), 1));

-- 6. Seed Navigation Items
INSERT INTO public.website_navigation_items (location, label, url, target, display_order, is_active)
VALUES
('header', 'Home', '#home', '_self', 1, true),
('header', 'Products', '#products', '_self', 2, true),
('header', 'About', '#about', '_self', 3, true),
('header', 'Knowledge', '#knowledge', '_self', 4, true),
('header', 'Become a Dealer', '#dealer', '_self', 5, true),
('header', 'Contact', '#contact', '_self', 6, true)
ON CONFLICT DO NOTHING;
