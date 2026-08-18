-- SPRINT 12: Settings Engine V2 Schema Updates

-- 1. Add Personalization Fields to app_users
ALTER TABLE public.app_users 
ADD COLUMN IF NOT EXISTS theme_mode VARCHAR(20) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS sidebar_style VARCHAR(20) DEFAULT 'default',
ADD COLUMN IF NOT EXISTS card_density VARCHAR(20) DEFAULT 'comfortable',
ADD COLUMN IF NOT EXISTS wallpaper_url TEXT,
ADD COLUMN IF NOT EXISTS layout_mode VARCHAR(20) DEFAULT 'standard';

-- 2. Add Branding Fields to crm_settings
ALTER TABLE public.crm_settings 
ADD COLUMN IF NOT EXISTS crm_name VARCHAR(255) DEFAULT 'Feed CRM',
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS app_logo_url TEXT,
ADD COLUMN IF NOT EXISTS favicon_url TEXT;

