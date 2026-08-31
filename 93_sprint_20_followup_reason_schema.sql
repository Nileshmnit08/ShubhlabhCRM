-- Migration: 93_sprint_20_followup_reason_schema.sql

-- Add categorized reason fields to follow_ups
ALTER TABLE public.follow_ups 
ADD COLUMN IF NOT EXISTS follow_up_reason TEXT,
ADD COLUMN IF NOT EXISTS custom_reason TEXT;

-- We intentionally DO NOT drop the existing `reason` column.
-- It will continue to be populated for backward compatibility with existing views,
-- timeline interactions, and reporting dashboards.
