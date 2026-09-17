-- 135_sprint_COMM_03_customer_phone_matching.sql
-- Migration for automatic customer phone matching on call events

-- 1. Add match_status to crm_call_events
ALTER TABLE public.crm_call_events 
ADD COLUMN IF NOT EXISTS match_status TEXT NOT NULL DEFAULT 'unknown' 
CHECK (match_status IN ('matched', 'unknown', 'ambiguous'));

-- 2. Create IMMUTABLE phone normalization function
CREATE OR REPLACE FUNCTION public.normalize_phone(raw_phone TEXT)
RETURNS TEXT AS $$
DECLARE
    digits TEXT;
BEGIN
    IF raw_phone IS NULL THEN
        RETURN '';
    END IF;
    
    -- Strip all non-digit characters
    digits := regexp_replace(raw_phone, '\D', '', 'g');
    
    -- Indian phone number formatting rules
    IF length(digits) = 10 THEN
        RETURN '91' || digits;
    ELSIF length(digits) = 11 AND left(digits, 1) = '0' THEN
        RETURN '91' || right(digits, 10);
    ELSIF length(digits) > 10 AND left(digits, 2) = '91' THEN
        RETURN digits;
    END IF;
    
    RETURN digits;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Create functional indexes for fast lookups
-- Index on primary mobile
CREATE INDEX IF NOT EXISTS idx_crm_parties_normalized_mobile 
ON public.crm_parties (public.normalize_phone(mobile));

-- Index on alternate whatsapp number
CREATE INDEX IF NOT EXISTS idx_crm_parties_normalized_whatsapp 
ON public.crm_parties (public.normalize_phone(whatsapp));

-- 4. Create authoritative matching RPC (SECURITY DEFINER)
-- This allows field staff to match against all customers securely without exposing arbitrary customer data.
CREATE OR REPLACE FUNCTION public.match_customer_by_phone(call_norm_phone TEXT)
RETURNS TABLE (matched_party_id UUID, status TEXT) AS $$
DECLARE
    found_ids UUID[];
    match_count INTEGER;
BEGIN
    IF call_norm_phone IS NULL OR call_norm_phone = '' THEN
        RETURN QUERY SELECT NULL::UUID, 'unknown'::TEXT;
        RETURN;
    END IF;

    -- Collect all distinct matching customer IDs
    SELECT array_agg(DISTINCT id) INTO found_ids
    FROM public.crm_parties
    WHERE public.normalize_phone(mobile) = call_norm_phone 
       OR public.normalize_phone(whatsapp) = call_norm_phone;
       
    match_count := COALESCE(array_length(found_ids, 1), 0);

    IF match_count = 1 THEN
        -- Exact match
        RETURN QUERY SELECT found_ids[1], 'matched'::TEXT;
    ELSIF match_count > 1 THEN
        -- Duplicate numbers exist in CRM
        RETURN QUERY SELECT NULL::UUID, 'ambiguous'::TEXT;
    ELSE
        -- No match found
        RETURN QUERY SELECT NULL::UUID, 'unknown'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create BEFORE INSERT trigger to auto-match future events
CREATE OR REPLACE FUNCTION public.trigger_match_call_event_customer()
RETURNS TRIGGER AS $$
DECLARE
    match_result RECORD;
BEGIN
    -- Perform match if party_id is not already populated
    IF NEW.party_id IS NULL THEN
        SELECT matched_party_id, status INTO match_result 
        FROM public.match_customer_by_phone(NEW.normalized_phone);
        
        NEW.party_id := match_result.matched_party_id;
        NEW.match_status := match_result.status;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_call_event_customer_trigger ON public.crm_call_events;
CREATE TRIGGER match_call_event_customer_trigger
BEFORE INSERT ON public.crm_call_events
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_call_event_customer();

-- 6. Enrich Historical Events
-- Update existing call events that were captured before this sprint
UPDATE public.crm_call_events
SET 
    party_id = m.matched_party_id,
    match_status = m.status
FROM (
    SELECT id, matched_party_id, status
    FROM public.crm_call_events,
    LATERAL public.match_customer_by_phone(normalized_phone)
    WHERE party_id IS NULL
) m
WHERE crm_call_events.id = m.id;
