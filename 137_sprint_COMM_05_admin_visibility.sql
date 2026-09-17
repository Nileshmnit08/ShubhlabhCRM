-- 137_sprint_COMM_05_admin_visibility.sql
-- Fixes masking for admins and adds the ability to identify unknown numbers

-- 1. Create a view that enriches call events with names and conditionally masks the phone
CREATE OR REPLACE VIEW public.v_crm_call_events_enriched WITH (security_invoker = true) AS
SELECT 
    c.*,
    u.display_name AS staff_name,
    p.display_name AS party_name,
    CASE 
        WHEN public.is_admin() THEN c.normalized_phone
        ELSE CONCAT(SUBSTRING(c.normalized_phone, 1, 4), '*****', SUBSTRING(c.normalized_phone, length(c.normalized_phone) - 2, 3))
    END AS display_phone
FROM public.crm_call_events c
LEFT JOIN public.app_users u ON c.staff_id = u.id
LEFT JOIN public.crm_parties p ON c.party_id = p.id;

GRANT SELECT ON public.v_crm_call_events_enriched TO authenticated;
GRANT SELECT ON public.v_crm_call_events_enriched TO anon;

-- 2. Create an RPC to safely identify and map unknown numbers
CREATE OR REPLACE FUNCTION public.identify_unknown_number(p_norm_phone TEXT, p_party_id UUID, p_party_name TEXT)
RETURNS UUID AS $$
DECLARE
    v_party_id UUID;
BEGIN
    -- Only allow admins to identify numbers
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only administrators can identify unknown numbers.';
    END IF;

    IF p_norm_phone IS NULL OR p_norm_phone = '' THEN
        RAISE EXCEPTION 'Phone number is required';
    END IF;

    IF p_party_id IS NOT NULL THEN
        -- Verify party exists
        SELECT id INTO v_party_id FROM public.crm_parties WHERE id = p_party_id;
        IF v_party_id IS NULL THEN
            RAISE EXCEPTION 'Party ID not found';
        END IF;
    ELSE
        -- Create new party
        IF p_party_name IS NULL OR p_party_name = '' THEN
            RAISE EXCEPTION 'Party name is required when creating a new record';
        END IF;
        
        -- Defaulting other required/useful fields based on existing table structure
        INSERT INTO public.crm_parties (display_name, mobile)
        VALUES (p_party_name, p_norm_phone)
        RETURNING id INTO v_party_id;
    END IF;

    -- Update all historical unlinked calls for this number
    UPDATE public.crm_call_events
    SET 
        party_id = v_party_id,
        match_status = 'matched',
        updated_at = NOW()
    WHERE normalized_phone = p_norm_phone 
      AND party_id IS NULL;

    RETURN v_party_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
