-- 139_sprint_COMM_07_fix_customer_phone.sql
-- Fixes the identify_unknown_number RPC to correctly persist the phone number 
-- to the customer's authoritative record (crm_parties) when linking an existing customer.

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

        -- Update the authoritative phone field in crm_parties
        UPDATE public.crm_parties 
        SET mobile = p_norm_phone, updated_at = NOW()
        WHERE id = v_party_id;
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
