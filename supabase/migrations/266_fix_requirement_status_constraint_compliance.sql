-- ============================================================================
-- MIGRATION: 266_fix_requirement_status_constraint_compliance.sql
-- Sprint: SL-ORDER-CUSTOMER-ORDER-STATUS-FIX-01
-- Objective: Ensure public.requirements table default and order RPCs strictly comply
-- with req_status_check without dropping or weakening the constraint.
-- ============================================================================

-- 1. Update column default on public.requirements from legacy 'Open' to canonical 'New'
ALTER TABLE public.requirements
  ALTER COLUMN status SET DEFAULT 'New';

COMMENT ON COLUMN public.requirements.status IS
  'Requirement status. Defaults to New (satisfies req_status_check constraint).';

-- 2. Update place_buyer_order RPC to insert 'New' instead of 'Open'
CREATE OR REPLACE FUNCTION public.place_buyer_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_id UUID;
    v_client_ref VARCHAR;
    v_delivery_address TEXT;
    
    v_req_id UUID;
    v_req_ref VARCHAR;
    v_item JSONB;
    v_product_id UUID;
    v_product_name VARCHAR;
    v_category VARCHAR;
    v_quantity NUMERIC;
    v_unit VARCHAR;
    
    v_total_bags NUMERIC := 0;
BEGIN
    -- 1. Validate Buyer / Customer Security
    v_customer_id := public.get_auth_crm_party_id();
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer profile not found for authenticated user or unauthorized';
    END IF;

    v_delivery_address := payload->>'delivery_address';

    -- 2. Create Header in requirements with valid canonical status 'New'
    v_req_id := gen_random_uuid();

    INSERT INTO public.requirements (id, party_id, status, notes)
    VALUES (v_req_id, v_customer_id, 'New', v_delivery_address)
    RETURNING demand_ref INTO v_req_ref;

    -- 3. Process Lines
    FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than 0';
        END IF;

        SELECT name, category INTO v_product_name, v_category
        FROM public.products
        WHERE id = v_product_id;

        v_unit := 'Bags';
        v_total_bags := v_total_bags + v_quantity;

        INSERT INTO public.requirement_items (requirement_id, category, product_name, quantity, unit)
        VALUES (v_req_id, v_category, v_product_name, v_quantity, v_unit);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_req_id, 
        'order_no', v_req_ref,
        'final_amount', 0,
        'scheme_discount', 0
    );
END;
$$;
