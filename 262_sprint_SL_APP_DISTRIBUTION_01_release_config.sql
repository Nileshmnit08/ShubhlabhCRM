-- ============================================================
-- SPRINT ID: SL-APP-DISTRIBUTION-01
-- Migration: 262_sprint_SL_APP_DISTRIBUTION_01_release_config.sql
-- Description: Authoritative Order App Release config pointing to official website
-- Target: public.crm_settings
-- ============================================================

-- Ensure column exists with authoritative default
ALTER TABLE public.crm_settings 
ADD COLUMN IF NOT EXISTS customer_app_release_config JSONB DEFAULT '{
  "downloadUrl": "https://www.shubhlabhfeeds.in/order-app",
  "appVersion": "v1.0.0",
  "releaseDate": "2026-10-12",
  "isActive": true
}'::jsonb;

-- Update singleton row id = 1 with verified release config
UPDATE public.crm_settings
SET customer_app_release_config = '{
  "downloadUrl": "https://www.shubhlabhfeeds.in/order-app",
  "appVersion": "v1.0.0",
  "releaseDate": "2026-10-12",
  "isActive": true
}'::jsonb
WHERE id = 1;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
