-- SPRINT 23: Payment Outcome Schema
-- Adds outcome fields for structured payment follow-up responses

ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS outcome_category VARCHAR(255);
