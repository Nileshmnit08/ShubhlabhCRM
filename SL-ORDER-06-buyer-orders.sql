-- SL-ORDER-06-buyer-orders.sql
-- Implements secure, backend-validated e-commerce order placement for the Shubh Labh Order App.

-- 1. Buyer Orders (Header)
CREATE TABLE IF NOT EXISTS public.buyer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE NOT NULL,
    order_no VARCHAR(50) UNIQUE NOT NULL,
    client_reference_id VARCHAR(100) UNIQUE NOT NULL, -- Idempotency key
    status VARCHAR(50) DEFAULT 'Order Lag Gaya', -- 'Order Lag Gaya', 'Maal Taiyar Ho Raha Hai', 'Raste Mein', 'Pahunch Gaya', 'Cancelled'
    total_bags NUMERIC(15,2) DEFAULT 0,
    subtotal_amount NUMERIC(15,2) DEFAULT 0,
    scheme_discount_amount NUMERIC(15,2) DEFAULT 0,
    final_amount NUMERIC(15,2) DEFAULT 0,
    delivery_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Buyer Order Items (Lines)
CREATE TABLE IF NOT EXISTS public.buyer_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_order_id UUID REFERENCES public.buyer_orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
    quantity NUMERIC(15,2) NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(15,2) NOT NULL,
    line_total NUMERIC(15,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE public.buyer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_order_items ENABLE ROW LEVEL SECURITY;

-- Buyers can only see their own orders
DROP POLICY IF EXISTS "Buyers view own orders" ON public.buyer_orders;
CREATE POLICY "Buyers view own orders" ON public.buyer_orders 
    FOR SELECT USING (
        customer_id = public.get_auth_crm_party_id()
    );

DROP POLICY IF EXISTS "Buyers view own order items" ON public.buyer_order_items;
CREATE POLICY "Buyers view own order items" ON public.buyer_order_items 
    FOR SELECT USING (
        buyer_order_id IN (
            SELECT o.id FROM public.buyer_orders o 
            WHERE o.customer_id = public.get_auth_crm_party_id()
        )
    );

-- 4. Order Sequence
CREATE SEQUENCE IF NOT EXISTS buyer_order_seq START 1000;

-- 5. RPC for Atomic Order Placement
CREATE OR REPLACE FUNCTION public.place_buyer_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to safely bypass insert restrictions
AS $$
DECLARE
    v_user_id UUID;
    v_customer_id UUID;
    v_client_ref VARCHAR;
    v_existing_order_id UUID;
    v_existing_order_no VARCHAR;
    v_delivery_address TEXT;
    
    v_order_id UUID;
    v_order_no VARCHAR;
    v_item JSONB;
    v_product_id UUID;
    v_quantity NUMERIC;
    v_unit_price NUMERIC;
    v_line_total NUMERIC;
    
    v_total_bags NUMERIC := 0;
    v_subtotal NUMERIC := 0;
    v_scheme_discount NUMERIC := 0;
    v_final_amount NUMERIC := 0;
BEGIN
    -- 1. Validate Buyer Security (Server side authoritative)
    v_customer_id := public.get_auth_crm_party_id();
    IF v_customer_id IS NULL THEN
        RAISE EXCEPTION 'Customer profile not found for authenticated user or unauthorized';
    END IF;

    -- 2. Idempotency Check
    v_client_ref := payload->>'client_reference_id';
    IF v_client_ref IS NULL THEN
        RAISE EXCEPTION 'Client reference ID is required';
    END IF;

    SELECT id, order_no INTO v_existing_order_id, v_existing_order_no 
    FROM public.buyer_orders 
    WHERE client_reference_id = v_client_ref LIMIT 1;

    IF v_existing_order_id IS NOT NULL THEN
        -- Safely return the existing order if double-tapped
        RETURN jsonb_build_object('success', true, 'order_id', v_existing_order_id, 'order_no', v_existing_order_no, 'status', 'Already processed');
    END IF;

    v_delivery_address := payload->>'delivery_address';

    -- 3. Create Header
    v_order_id := gen_random_uuid();
    v_order_no := 'SL-' || nextval('buyer_order_seq')::TEXT;

    INSERT INTO public.buyer_orders (id, customer_id, order_no, client_reference_id, delivery_address)
    VALUES (v_order_id, v_customer_id, v_order_no, v_client_ref, v_delivery_address);

    -- 4. Process Lines & Calculate Prices Securely
    FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
        v_product_id := (v_item->>'product_id')::UUID;
        v_quantity := (v_item->>'quantity')::NUMERIC;
        
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'Quantity must be greater than 0';
        END IF;

        -- RESOLVE AUTHORITATIVE PRICE HERE
        -- Currently, products don't have a flat price column. We assign a fallback logical value for the B2B demonstration.
        -- In full production, this joins against a `price_books` table.
        v_unit_price := 1250.00; 
        
        v_line_total := v_quantity * v_unit_price;
        
        v_total_bags := v_total_bags + v_quantity;
        v_subtotal := v_subtotal + v_line_total;

        INSERT INTO public.buyer_order_items (buyer_order_id, product_id, quantity, unit_price, line_total)
        VALUES (v_order_id, v_product_id, v_quantity, v_unit_price, v_line_total);
    END LOOP;

    -- 5. Calculate Scheme Disount
    -- Simple logic: if total bags > 50, apply 5% discount (Authoritative server validation)
    IF v_total_bags >= 50 THEN
        v_scheme_discount := v_subtotal * 0.05;
    END IF;

    v_final_amount := v_subtotal - v_scheme_discount;

    -- 6. Finalize Header
    UPDATE public.buyer_orders 
    SET total_bags = v_total_bags,
        subtotal_amount = v_subtotal,
        scheme_discount_amount = v_scheme_discount,
        final_amount = v_final_amount
    WHERE id = v_order_id;

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', v_order_id, 
        'order_no', v_order_no,
        'final_amount', v_final_amount,
        'scheme_discount', v_scheme_discount
    );
END;
$$;
