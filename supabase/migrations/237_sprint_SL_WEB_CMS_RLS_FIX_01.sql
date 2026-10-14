-- =============================================================================
-- Migration 237: Native Supabase Website CMS RLS & Public Access Hardening
-- Micro-Sprint: SL-WEB-CMS-RELEASE-PREP-01
-- Target: PostgreSQL / Supabase
-- Description: Corrects public read policies for both anonymous and authenticated
--              visitors without exposing draft content. Restricts media asset
--              visibility to explicitly public assets and protects internal metadata.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Hardening website_media_assets & Public Media Projection
-- -----------------------------------------------------------------------------
ALTER TABLE public.website_media_assets 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_website_media_public 
ON public.website_media_assets (is_public);

-- Drop previous open public policy on base table
DROP POLICY IF EXISTS "Public can view media assets" ON public.website_media_assets;
DROP POLICY IF EXISTS "Public can view public media assets" ON public.website_media_assets;

-- Base table website_media_assets is restricted to active CRM administrators only.
-- This ensures internal metadata (uploaded_by staff UUID, storage paths) is NEVER exposed to public visitors.
DROP POLICY IF EXISTS "Admins can view all media assets" ON public.website_media_assets;
CREATE POLICY "Admins can view all media assets"
    ON public.website_media_assets FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Secure public view that projects only public media assets and strips internal metadata
DROP VIEW IF EXISTS public.website_public_media_assets CASCADE;
CREATE VIEW public.website_public_media_assets AS
SELECT 
    id,
    file_name,
    stored_name,
    mime_type,
    alt_text,
    created_at
FROM public.website_media_assets
WHERE is_public = true;

-- Grant public read access strictly to the safe projection view
GRANT SELECT ON public.website_public_media_assets TO anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Correct website_site_settings Public Read Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view public settings" ON public.website_site_settings;
CREATE POLICY "Public can view public settings"
    ON public.website_site_settings FOR SELECT
    TO anon, authenticated
    USING (is_public = true);

-- -----------------------------------------------------------------------------
-- 3. Correct website_site_sections Public Read Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published sections" ON public.website_site_sections;
CREATE POLICY "Public can view published sections"
    ON public.website_site_sections FOR SELECT
    TO anon, authenticated
    USING (is_published = true);

-- -----------------------------------------------------------------------------
-- 4. Correct website_products Public Read Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published products" ON public.website_products;
CREATE POLICY "Public can view published products"
    ON public.website_products FOR SELECT
    TO anon, authenticated
    USING (status = 'published');

-- -----------------------------------------------------------------------------
-- 5. Correct website_knowledge_articles Public Read Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published articles" ON public.website_knowledge_articles;
CREATE POLICY "Public can view published articles"
    ON public.website_knowledge_articles FOR SELECT
    TO anon, authenticated
    USING (status = 'published' AND published_at <= now());

-- -----------------------------------------------------------------------------
-- 6. Correct website_navigation_items Public Read Policy
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active navigation" ON public.website_navigation_items;
CREATE POLICY "Public can view active navigation"
    ON public.website_navigation_items FOR SELECT
    TO anon, authenticated
    USING (is_active = true);
