-- MICRO-SPRINT FA-TRAVEL-05
-- Establish the authoritative Admin-controlled travel reimbursement rate system

CREATE TABLE IF NOT EXISTS public.travel_expense_rates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rate_per_km NUMERIC(10,2) NOT NULL CHECK (rate_per_km > 0),
    effective_from TIMESTAMPTZ NOT NULL,
    effective_to TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    created_by UUID REFERENCES public.app_users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_effective_dates CHECK (effective_to IS NULL OR effective_to > effective_from)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_travel_expense_rates_effective ON public.travel_expense_rates(effective_from, effective_to);

-- Trigger to update modified timestamp
DROP TRIGGER IF EXISTS update_travel_expense_rates_modtime ON public.travel_expense_rates;
CREATE TRIGGER update_travel_expense_rates_modtime
BEFORE UPDATE ON public.travel_expense_rates
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Enable RLS
ALTER TABLE public.travel_expense_rates ENABLE ROW LEVEL SECURITY;

-- Admins can INSERT and UPDATE
CREATE POLICY "Admins can insert rates"
ON public.travel_expense_rates FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
);

CREATE POLICY "Admins can update rates"
ON public.travel_expense_rates FOR UPDATE
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
)
WITH CHECK (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
);

-- Everyone (Authenticated) can SELECT rates to calculate expenses or view
CREATE POLICY "Authenticated users can view rates"
ON public.travel_expense_rates FOR SELECT
TO authenticated
USING (true);

-- No one can hard delete
CREATE POLICY "No one can delete rates"
ON public.travel_expense_rates FOR DELETE
TO authenticated
USING (false);

-- TRIGGER: Prevent historical mutation
CREATE OR REPLACE FUNCTION prevent_historical_rate_mutation()
RETURNS TRIGGER AS $$
BEGIN
    -- If the rate was already effective in the past, do not allow changing its rate or its start date.
    IF OLD.effective_from <= CURRENT_TIMESTAMP AND (NEW.rate_per_km <> OLD.rate_per_km OR NEW.effective_from <> OLD.effective_from) THEN
        RAISE EXCEPTION 'Cannot modify rate or effective_from for historical rates. Close this period and create a new rate.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_historical_mutation ON public.travel_expense_rates;
CREATE TRIGGER trigger_prevent_historical_mutation
BEFORE UPDATE ON public.travel_expense_rates
FOR EACH ROW
EXECUTE FUNCTION prevent_historical_rate_mutation();

-- TRIGGER: Prevent hard deletion entirely
CREATE OR REPLACE FUNCTION prevent_rate_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Historical rates cannot be deleted. Update status to CANCELLED instead.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_rate_delete ON public.travel_expense_rates;
CREATE TRIGGER trigger_prevent_rate_delete
BEFORE DELETE ON public.travel_expense_rates
FOR EACH ROW
EXECUTE FUNCTION prevent_rate_hard_delete();

-- RPC: Safely insert a new rate and close the previous active rate without overlap
CREATE OR REPLACE FUNCTION public.set_travel_rate(p_rate_per_km NUMERIC, p_effective_from TIMESTAMPTZ)
RETURNS UUID AS $$
DECLARE
    v_admin_id UUID;
    v_new_id UUID;
    v_overlap_count INT;
BEGIN
    -- Authorize
    SELECT id INTO v_admin_id FROM public.app_users WHERE id = auth.uid() AND role = 'Admin';
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized. Only Admins can set travel rates.';
    END IF;

    -- Validate positive rate
    IF p_rate_per_km <= 0 THEN
        RAISE EXCEPTION 'Rate must be positive';
    END IF;

    -- Check for future rate collisions (another rate scheduled at or after this one)
    SELECT COUNT(*) INTO v_overlap_count
    FROM public.travel_expense_rates
    WHERE status = 'ACTIVE'
      AND effective_from >= p_effective_from;

    IF v_overlap_count > 0 THEN
        RAISE EXCEPTION 'Cannot create rate: A future rate is already scheduled at or after this time. Cancel the future rate first.';
    END IF;

    -- Close the currently open active rate (the one where effective_to is null or past p_effective_from)
    UPDATE public.travel_expense_rates
    SET effective_to = p_effective_from
    WHERE status = 'ACTIVE' 
      AND (effective_to IS NULL OR effective_to > p_effective_from)
      AND effective_from < p_effective_from;

    -- Insert the new rate
    INSERT INTO public.travel_expense_rates (
        rate_per_km, effective_from, effective_to, created_by, status
    ) VALUES (
        p_rate_per_km, p_effective_from, NULL, v_admin_id, 'ACTIVE'
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
