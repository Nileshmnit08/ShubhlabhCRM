-- ============================================================
-- SPRINT ID: CRM-ACCESS-01
-- Migration: 261_sprint_CRM_ACCESS_01_app_release_config.sql
-- Description: Optional additive column to persist Order App Release configuration
-- Target: public.crm_settings
-- ============================================================

-- Safe additive column
ALTER TABLE public.crm_settings 
ADD COLUMN IF NOT EXISTS customer_app_release_config JSONB DEFAULT '{
  "downloadUrl": "https://shubhlabh.in/download",
  "appVersion": "v1.2.0",
  "releaseDate": "2026-11-17",
  "isActive": true
}'::jsonb;

-- Comment
COMMENT ON COLUMN public.crm_settings.customer_app_release_config IS 
'Stores latest customer-facing Shubh Labh Order mobile app release metadata, permanent download URL, version, and status.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
