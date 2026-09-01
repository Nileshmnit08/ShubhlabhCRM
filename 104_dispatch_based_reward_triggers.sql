-- Migration: 104_dispatch_based_reward_triggers.sql
-- Description: Update reward eligibility triggers and recalculation function to use requirement_dispatches

-- 1. Update the recalculation function
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

    -- Calculate total qualifying bags from dispatches (excluding cancelled and deducting returns)
    SELECT COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) INTO v_total_bags
    FROM public.requirement_dispatches rd
    JOIN public.requirements req ON rd.requirement_id = req.id
    WHERE req.party_id = p_customer_id
      AND rd.status != 'Cancelled'
      AND rd.dispatch_date >= v_scheme_start
      AND rd.dispatch_date <= v_scheme_end;

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
                -- Only update status if it was previously Reversed (i.e. they fell below and came back up)
                status = CASE WHEN public.dealer_reward_eligibility.status = 'Reversed' THEN 'Eligible' ELSE public.dealer_reward_eligibility.status END,
                updated_at = NOW();
        ELSE
            -- If fell below threshold due to return, mark as Reversed if it exists and hasn't been fulfilled
            UPDATE public.dealer_reward_eligibility
            SET status = 'Reversed', updated_at = NOW()
            WHERE customer_id = p_customer_id AND scheme_id = p_scheme_id AND slab_id = v_slab_record.id AND status IN ('Eligible', 'Pending Approval', 'Approved');
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the old invoice trigger
DROP TRIGGER IF EXISTS trg_after_sales_line_item_change ON public.sales_invoice_line_items;
DROP FUNCTION IF EXISTS public.trg_sales_line_item_changed();

-- 3. Create new trigger for requirement_dispatches
CREATE OR REPLACE FUNCTION public.trg_dispatch_changed()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_id UUID;
    v_dispatch_date DATE;
    v_scheme_record RECORD;
BEGIN
    -- Get customer and date from dispatch
    IF TG_OP = 'DELETE' THEN
        SELECT party_id INTO v_customer_id FROM public.requirements WHERE id = OLD.requirement_id;
        v_dispatch_date := OLD.dispatch_date;
    ELSE
        SELECT party_id INTO v_customer_id FROM public.requirements WHERE id = NEW.requirement_id;
        v_dispatch_date := NEW.dispatch_date;
    END IF;

    -- Find all active schemes covering this date
    FOR v_scheme_record IN
        SELECT id FROM public.dealer_schemes
        WHERE status = 'Active' 
          AND start_date <= v_dispatch_date 
          AND end_date >= v_dispatch_date
    LOOP
        PERFORM public.recalculate_dealer_scheme_eligibility(v_customer_id, v_scheme_record.id);
    END LOOP;

    RETURN NULL; -- AFTER trigger
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_after_dispatch_change
AFTER INSERT OR UPDATE OR DELETE ON public.requirement_dispatches
FOR EACH ROW EXECUTE FUNCTION public.trg_dispatch_changed();

-- 4. Add approval and fulfillment columns to dealer_reward_eligibility if not exists
ALTER TABLE public.dealer_reward_eligibility
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fulfilled_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS fulfillment_notes TEXT;
