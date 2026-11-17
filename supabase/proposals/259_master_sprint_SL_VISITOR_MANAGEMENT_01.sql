-- ============================================================================
-- PROPOSED MIGRATION: 259_master_sprint_SL_VISITOR_MANAGEMENT_01.sql
-- SPRINT: SL-VISITOR-MANAGEMENT-01 — Unified Factory Visitor Management
--
-- STATUS: PROPOSED — NOT APPLIED — REQUIRES PRODUCT OWNER APPROVAL
-- This file intentionally lives in supabase/proposals/ (not supabase/migrations/)
-- so it cannot be picked up by `supabase db push` before explicit approval.
-- Rollback: supabase/proposals/259_rollback_master_sprint_SL_VISITOR_MANAGEMENT_01.sql
--
-- PURPOSE:
-- Single authoritative database table for Unified Visitor Management shared
-- between the Field Assist mobile application and the Shubh Labh CRM web portal.
--
-- CLIENT CONTRACT:
--   1. Field Assist inserts with:
--      { id (client UUID), pass_number, visitor_name, mobile_number,
--        company_name, address, category, person_to_meet, purpose_of_visit,
--        vehicle_number, photo_url, registered_by, registration_source:'Field Assist',
--        entry_time, status:'IN' }
--   2. CRM Web Portal inserts with:
--      { id (client UUID), pass_number, visitor_name, mobile_number,
--        company_name, address, category, person_to_meet, purpose_of_visit,
--        vehicle_number, photo_url, registered_by, registration_source:'CRM',
--        entry_time, status:'IN' }
--   3. Mark Exit (both platforms):
--      UPDATE visitor_register SET exit_time = now(), status = 'OUT',
--      updated_at = now() WHERE id = :id;
--
-- COMPATIBILITY:
--   The DEFAULT 'Field Assist' on registration_source guarantees that any
--   queued/pending records from Field Assist offline queue will sync cleanly
--   without error.
--
-- SAFETY: Additive only. No existing table, policy or row is modified.
-- ============================================================================

-- 1. Create visitor_register table
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
    registration_source  TEXT NOT NULL DEFAULT 'Field Assist',
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
    CONSTRAINT visitor_register_source_check
        CHECK (registration_source IN ('Field Assist', 'CRM')),
    CONSTRAINT visitor_register_pass_number_unique
        UNIQUE (pass_number),
    CONSTRAINT visitor_register_exit_after_entry
        CHECK (exit_time IS NULL OR exit_time >= entry_time),
    CONSTRAINT visitor_register_status_exit_consistency
        CHECK ((status = 'OUT') = (exit_time IS NOT NULL))
);

COMMENT ON TABLE public.visitor_register IS
  'SL-VISITOR-MANAGEMENT-01: Unified Factory Visitor Management shared between Field Assist mobile app and Shubh Labh CRM web portal.';
COMMENT ON COLUMN public.visitor_register.pass_number IS
  'Unique visitor pass number generated at registration (e.g. VR-YYYYMMDD-XXXX).';
COMMENT ON COLUMN public.visitor_register.photo_url IS
  'Storage path, signed URL, or compressed image data URI captured at registration.';
COMMENT ON COLUMN public.visitor_register.registration_source IS
  'Origin platform: Field Assist (mobile gate app) or CRM (web management portal).';
COMMENT ON COLUMN public.visitor_register.status IS
  'Current visitor status: IN (active on premises) or OUT (exited).';

-- 2. Indexes for fast search and dashboard queries
CREATE INDEX IF NOT EXISTS idx_visitor_register_entry_time
    ON public.visitor_register (entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_visitor_register_status
    ON public.visitor_register (status);

CREATE INDEX IF NOT EXISTS idx_visitor_register_mobile
    ON public.visitor_register (mobile_number);

CREATE INDEX IF NOT EXISTS idx_visitor_register_registered_by
    ON public.visitor_register (registered_by);

CREATE INDEX IF NOT EXISTS idx_visitor_register_source
    ON public.visitor_register (registration_source);

CREATE INDEX IF NOT EXISTS idx_visitor_register_category
    ON public.visitor_register (category);

-- 3. Row Level Security (RLS)
ALTER TABLE public.visitor_register ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users across Field Assist & CRM to view all visitor records
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

-- Allow authenticated users to update visitor records (e.g. mark exit or update notes)
CREATE POLICY "Allow authenticated users to update visitor register"
    ON public.visitor_register
    FOR UPDATE
    TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Storage Bucket Setup (Private bucket for visitor photos)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'visitor-photos',
            'visitor-photos',
            false,
            5242880,
            ARRAY['image/jpeg', 'image/png', 'image/webp']
        )
        ON CONFLICT (id) DO NOTHING;

        -- Authenticated storage policies
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'Authenticated users can upload visitor photos'
        ) THEN
            CREATE POLICY "Authenticated users can upload visitor photos"
                ON storage.objects FOR INSERT
                TO authenticated
                WITH CHECK (bucket_id = 'visitor-photos');
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_policies
            WHERE schemaname = 'storage' AND tablename = 'objects'
            AND policyname = 'Authenticated users can view visitor photos'
        ) THEN
            CREATE POLICY "Authenticated users can view visitor photos"
                ON storage.objects FOR SELECT
                TO authenticated
                USING (bucket_id = 'visitor-photos');
        END IF;
    END IF;
END $$;

-- 5. Updated_at Trigger & Defaults Handler
CREATE OR REPLACE FUNCTION public.handle_visitor_register_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    IF NEW.registration_source IS NULL OR NEW.registration_source = '' THEN
        NEW.registration_source := 'Field Assist';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visitor_register_updated_at ON public.visitor_register;
CREATE TRIGGER trg_visitor_register_updated_at
    BEFORE UPDATE ON public.visitor_register
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_visitor_register_updated_at();

-- 6. Immediate PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';

