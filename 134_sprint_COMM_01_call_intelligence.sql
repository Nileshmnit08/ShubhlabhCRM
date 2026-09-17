-- 134_sprint_COMM_01_call_intelligence.sql
-- Migration for capturing field-staff call metadata into the CRM

CREATE TABLE IF NOT EXISTS public.crm_call_events (
    id UUID PRIMARY KEY,
    staff_id UUID NOT NULL,
    party_id UUID NULL,
    phone_number TEXT NOT NULL,
    normalized_phone TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('INCOMING', 'OUTGOING', 'UNKNOWN')),
    call_type TEXT NOT NULL CHECK (call_type IN ('ANSWERED', 'MISSED', 'REJECTED', 'UNKNOWN')),
    started_at TIMESTAMPTZ NULL,
    ended_at TIMESTAMPTZ NULL,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    device_event_id TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'android_call_log',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency constraint: Prevent same call from being recorded multiple times
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_call_events_idempotency ON public.crm_call_events (staff_id, device_event_id);
-- Add constraint using the unique index
ALTER TABLE public.crm_call_events ADD CONSTRAINT uq_crm_call_events_device_event UNIQUE USING INDEX idx_crm_call_events_idempotency;

-- RLS
ALTER TABLE public.crm_call_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can insert own call events"
    ON public.crm_call_events
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = staff_id);

CREATE POLICY "Staff can view own call events"
    ON public.crm_call_events
    FOR SELECT
    TO authenticated
    USING (auth.uid() = staff_id);

CREATE POLICY "Admins can view all call events"
    ON public.crm_call_events
    FOR SELECT
    TO authenticated
    USING (
        public.is_admin()
    );

-- Add index on party_id for future customer matching speed
CREATE INDEX IF NOT EXISTS idx_crm_call_events_party_id ON public.crm_call_events (party_id);
-- Add index on normalized_phone for faster search and matching
CREATE INDEX IF NOT EXISTS idx_crm_call_events_normalized_phone ON public.crm_call_events (normalized_phone);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp_crm_call_events()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp_crm_call_events ON public.crm_call_events;
CREATE TRIGGER set_timestamp_crm_call_events
BEFORE UPDATE ON public.crm_call_events
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp_crm_call_events();
