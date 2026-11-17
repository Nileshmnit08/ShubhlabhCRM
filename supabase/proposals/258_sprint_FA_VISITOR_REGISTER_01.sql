-- ============================================================================
-- PROPOSED MIGRATION: 258_sprint_FA_VISITOR_REGISTER_01.sql
-- SPRINT: FA-VISITOR-REGISTER-01 — Field Assist Visitor Registration & Gate Pass
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- This file intentionally lives in supabase/proposals/ (not supabase/migrations/)
-- so it cannot be picked up by `supabase db push` before approval.
-- Rollback: supabase/proposals/258_rollback_sprint_FA_VISITOR_REGISTER_01.sql
--
-- PURPOSE:
-- 1. visitor_register — Single authoritative visitor registration table
--    capturing visitor identity, purpose, vehicle, photograph, pass number,
--    entry timestamp, and exit timestamp without duplicate records.
--
-- CLIENT CONTRACT (Field Assist, via the existing SyncService queue):
--   Register:  INSERT INTO visitor_register {
--                id (client UUID), pass_number, visitor_name, mobile_number,
--                company_name, address, category, person_to_meet,
--                purpose_of_visit, vehicle_number, photo_url, registered_by,
--                entry_time, status:'IN'
--              }
--   Mark Exit: UPDATE visitor_register SET exit_time = now(), status = 'OUT',
--              updated_at = now() WHERE id = :id;
--
-- SAFETY: Additive only. No existing table, policy or row is modified.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.visitor_register (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_number          TEXT NOT NULL,
    visitor_name         TEXT NOT NULL,
    mobile_number        VARCHAR(15) NOT NULL,
    company_name         TEXT,
    address              TEXT,
    category             TEXT NOT NULL DEFAULT 'Other',
    person_to_meet       TEXT,
    purpose_of_visit     TEXT,
    vehicle_number       TEXT,
    photo_url            TEXT NOT NULL,
    registered_by        UUID REFERENCES public.app_users(id) ON DELETE SET NULL,
    entry_time           TIMESTAMPTZ NOT NULL DEFAULT now(),
    exit_time            TIMESTAMPTZ,
    status               TEXT NOT NULL DEFAULT 'IN',
    notes                TEXT,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT visitor_register_category_check
        CHECK (category IN ('Customer', 'Dealer', 'Supplier', 'Transporter', 'Other')),
    CONSTRAINT visitor_register_status_check
        CHECK (status IN ('IN', 'OUT')),
    CONSTRAINT visitor_register_pass_number_unique
        UNIQUE (pass_number),
    CONSTRAINT visitor_register_exit_after_entry
        CHECK (exit_time IS NULL OR exit_time >= entry_time),
    CONSTRAINT visitor_register_status_exit_consistency
        CHECK ((status = 'OUT') = (exit_time IS NOT NULL))
);

COMMENT ON TABLE public.visitor_register IS
  'FA-VISITOR-REGISTER-01: Single visitor registration and gate pass record for factory/office visitor management.';
COMMENT ON COLUMN public.visitor_register.pass_number IS
  'Unique visitor pass number generated at registration (e.g. VR-YYYYMMDD-XXXX).';
COMMENT ON COLUMN public.visitor_register.photo_url IS
  'URL or compressed image data URI of the visitor captured at registration.';
COMMENT ON COLUMN public.visitor_register.status IS
  'Current visitor status: IN (active on premises) or OUT (exited).';

CREATE INDEX IF NOT EXISTS idx_visitor_register_entry_time
    ON public.visitor_register (entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_register_status
    ON public.visitor_register (status);

CREATE INDEX IF NOT EXISTS idx_visitor_register_mobile
    ON public.visitor_register (mobile_number);

CREATE INDEX IF NOT EXISTS idx_visitor_register_registered_by
    ON public.visitor_register (registered_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.visitor_register ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view visitor records
CREATE POLICY "Allow authenticated users to view visitor register"
    ON public.visitor_register
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert new visitor records
CREATE POLICY "Allow authenticated users to insert visitor register"
    ON public.visitor_register
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update visitor records (e.g., mark exit)
CREATE POLICY "Allow authenticated users to update visitor register"
    ON public.visitor_register
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
