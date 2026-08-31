-- Migration: 97_sprint_24_bag_based_rewards.sql
-- Implement Bag-Based Dealer Schemes & Automated Rewards

-- 1. Product Enhancements
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS bag_conversion_factor DECIMAL(10,4) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(50) DEFAULT 'Bags';

-- Update existing sample products (assuming 50kg bags for feed)
UPDATE public.products 
SET bag_conversion_factor = 1.0, unit_of_measure = 'Bags' 
WHERE unit_of_measure = 'Bags';

-- 2. Sales Transactions Engine
CREATE TABLE IF NOT EXISTS public.sales_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    invoice_no VARCHAR(100) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'Completed', -- Completed, Cancelled
    total_amount NUMERIC(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sales_invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity NUMERIC(15,2) NOT NULL,
    unit_of_measure VARCHAR(50),
    unit_conversion_factor DECIMAL(10,4) DEFAULT 1.0,
    converted_bag_quantity NUMERIC(15,2) NOT NULL,
    is_return BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'Valid', -- Valid, Cancelled
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scheme Configuration Updates
ALTER TABLE public.dealer_schemes
ADD COLUMN IF NOT EXISTS overlap_policy VARCHAR(50) DEFAULT 'Highest Value', -- Highest Value, Cumulative, Prioritized
ADD COLUMN IF NOT EXISTS customer_type VARCHAR(100) DEFAULT 'Dealers Only',
ADD COLUMN IF NOT EXISTS territory_eligibility VARCHAR(50) DEFAULT 'All',
ADD COLUMN IF NOT EXISTS product_eligibility VARCHAR(50) DEFAULT 'All';

-- dealer_scheme_slabs was created in 96_sprint_23, we'll augment it
ALTER TABLE public.dealer_scheme_slabs
ADD COLUMN IF NOT EXISTS min_bags NUMERIC(15,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_bags NUMERIC(15,2),
ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'Physical Gift',
ADD COLUMN IF NOT EXISTS reward_value NUMERIC(15,2) DEFAULT 0;

-- 4. Automated Eligibility & Rewards
CREATE TABLE IF NOT EXISTS public.dealer_reward_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    slab_id UUID REFERENCES public.dealer_scheme_slabs(id) ON DELETE CASCADE,
    qualifying_bags NUMERIC(15,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Eligible', -- Eligible, Pending Approval, Approved, Fulfilled, Reversed
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(customer_id, scheme_id, slab_id)
);

CREATE TABLE IF NOT EXISTS public.dealer_reward_calculation_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.crm_parties(id) ON DELETE CASCADE,
    scheme_id UUID REFERENCES public.dealer_schemes(id) ON DELETE CASCADE,
    old_bag_total NUMERIC(15,2),
    new_bag_total NUMERIC(15,2),
    trigger_event VARCHAR(100), -- Invoice Inserted, Invoice Cancelled
    transaction_id UUID, -- Optional link to sales_invoices
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoices_date ON public.sales_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_sales_line_items_invoice ON public.sales_invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_reward_eligibility_customer ON public.dealer_reward_eligibility(customer_id);

-- 5. Automated Recalculation Functions
CREATE OR REPLACE FUNCTION public.recalculate_dealer_scheme_eligibility(p_customer_id UUID, p_scheme_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_bags NUMERIC(15,2) := 0;
    v_scheme_start DATE;
    v_scheme_end DATE;
    v_scheme_status VARCHAR(50);
    v_slab_record RECORD;
BEGIN
    -- Get scheme details
    SELECT start_date, end_date, status 
    INTO v_scheme_start, v_scheme_end, v_scheme_status
    FROM public.dealer_schemes 
    WHERE id = p_scheme_id;
    
    IF v_scheme_status != 'Active' THEN
        RETURN;
    END IF;

    -- Calculate total qualifying bags
    SELECT COALESCE(SUM(
        CASE 
            WHEN sili.is_return = true OR sili.status = 'Cancelled' THEN -sili.converted_bag_quantity
            ELSE sili.converted_bag_quantity
        END
    ), 0) INTO v_total_bags
    FROM public.sales_invoice_line_items sili
    JOIN public.sales_invoices si ON sili.invoice_id = si.id
    WHERE si.customer_id = p_customer_id
      AND si.status = 'Completed'
      AND si.invoice_date >= v_scheme_start
      AND si.invoice_date <= v_scheme_end;

    -- Log audit
    INSERT INTO public.dealer_reward_calculation_audit (customer_id, scheme_id, old_bag_total, new_bag_total, trigger_event)
    VALUES (p_customer_id, p_scheme_id, null, v_total_bags, 'Recalculation Triggered');

    -- Evaluate slabs
    FOR v_slab_record IN 
        SELECT id, min_bags, max_bags 
        FROM public.dealer_scheme_slabs 
        WHERE scheme_id = p_scheme_id 
        ORDER BY min_bags ASC
    LOOP
        -- Check if eligible
        IF v_total_bags >= v_slab_record.min_bags AND (v_slab_record.max_bags IS NULL OR v_total_bags <= v_slab_record.max_bags) THEN
            -- Upsert eligibility
            INSERT INTO public.dealer_reward_eligibility (customer_id, scheme_id, slab_id, qualifying_bags, status)
            VALUES (p_customer_id, p_scheme_id, v_slab_record.id, v_total_bags, 'Eligible')
            ON CONFLICT (customer_id, scheme_id, slab_id) 
            DO UPDATE SET 
                qualifying_bags = EXCLUDED.qualifying_bags,
                updated_at = NOW();
        ELSE
            -- If fell below threshold due to return, mark as Reversed if it exists
            UPDATE public.dealer_reward_eligibility
            SET status = 'Reversed', updated_at = NOW()
            WHERE customer_id = p_customer_id AND scheme_id = p_scheme_id AND slab_id = v_slab_record.id AND status = 'Eligible';
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger Function
CREATE OR REPLACE FUNCTION public.trg_sales_line_item_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_invoice_date DATE;
    v_scheme_record RECORD;
BEGIN
    -- Get customer and date from invoice
    IF TG_OP = 'DELETE' THEN
        SELECT customer_id, invoice_date INTO v_customer_id, v_invoice_date
        FROM public.sales_invoices WHERE id = OLD.invoice_id;
    ELSE
        SELECT customer_id, invoice_date INTO v_customer_id, v_invoice_date
        FROM public.sales_invoices WHERE id = NEW.invoice_id;
    END IF;

    -- Find all active schemes covering this date
    FOR v_scheme_record IN
        SELECT id FROM public.dealer_schemes
        WHERE status = 'Active' 
          AND start_date <= v_invoice_date 
          AND end_date >= v_invoice_date
    LOOP
        PERFORM public.recalculate_dealer_scheme_eligibility(v_customer_id, v_scheme_record.id);
    END LOOP;

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_sales_line_item_change
AFTER INSERT OR UPDATE OR DELETE ON public.sales_invoice_line_items
FOR EACH ROW EXECUTE FUNCTION public.trg_sales_line_item_changed();
