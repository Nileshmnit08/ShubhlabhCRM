-- MICRO-SPRINT FA-TRAVEL-06
-- Daily Travel Expense Calculation Foundation

CREATE TABLE IF NOT EXISTS public.daily_travel_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    staff_id UUID NOT NULL REFERENCES public.app_users(id),
    business_date DATE NOT NULL,
    total_distance_km NUMERIC(10,2),
    applicable_rate_id UUID REFERENCES public.travel_expense_rates(id),
    applicable_rate_per_km NUMERIC(10,2),
    calculated_amount NUMERIC(10,2),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    snapshot_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(staff_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_expenses_staff_date ON public.daily_travel_expenses(staff_id, business_date);

-- Enable RLS
ALTER TABLE public.daily_travel_expenses ENABLE ROW LEVEL SECURITY;

-- Admins can view all expenses
CREATE POLICY "Admins can view all daily expenses"
ON public.daily_travel_expenses FOR SELECT
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.app_users WHERE id = auth.uid() AND role = 'Admin')
);

-- Staff can view their own expenses
CREATE POLICY "Staff can view own daily expenses"
ON public.daily_travel_expenses FOR SELECT
TO authenticated
USING (
    staff_id = auth.uid()
);

-- No one can manually insert/update/delete from the client. The calculation function handles it.
CREATE POLICY "No manual insert" ON public.daily_travel_expenses FOR INSERT TO authenticated WITH CHECK (false);
CREATE POLICY "No manual update" ON public.daily_travel_expenses FOR UPDATE TO authenticated USING (false);
CREATE POLICY "No manual delete" ON public.daily_travel_expenses FOR DELETE TO authenticated USING (false);

-- Calculation Function
CREATE OR REPLACE FUNCTION public.calculate_daily_travel_expense(p_staff_id UUID, p_business_date DATE)
RETURNS VOID AS $$
DECLARE
    v_open_sessions INT;
    v_sum_session_dist NUMERIC;
    v_sum_segment_dist NUMERIC;
    v_min_started_at TIMESTAMPTZ;
    v_max_ended_at TIMESTAMPTZ;
    v_rate_count INT;
    v_rate_id UUID;
    v_rate_per_km NUMERIC;
    v_amount NUMERIC;
    v_status VARCHAR(50);
    v_snapshot JSONB;
BEGIN
    -- Check if any sessions are still open for this day
    SELECT COUNT(*) INTO v_open_sessions
    FROM public.staff_tracking_sessions
    WHERE staff_id = p_staff_id AND business_date = p_business_date AND status = 'OPEN';

    IF v_open_sessions > 0 THEN
        -- Upsert as PENDING
        INSERT INTO public.daily_travel_expenses (staff_id, business_date, status, updated_at)
        VALUES (p_staff_id, p_business_date, 'PENDING', CURRENT_TIMESTAMP)
        ON CONFLICT (staff_id, business_date) DO UPDATE 
        SET status = 'PENDING', updated_at = CURRENT_TIMESTAMP;
        RETURN;
    END IF;

    -- Aggregate sessions
    SELECT 
        SUM(total_distance_km),
        MIN(started_at),
        MAX(ended_at)
    INTO v_sum_session_dist, v_min_started_at, v_max_ended_at
    FROM public.staff_tracking_sessions
    WHERE staff_id = p_staff_id AND business_date = p_business_date AND status = 'CLOSED';

    -- If no closed sessions exist, return safely
    IF v_sum_session_dist IS NULL AND v_min_started_at IS NULL THEN
        RETURN;
    END IF;

    -- Aggregate segments
    SELECT SUM(distance_km) INTO v_sum_segment_dist
    FROM public.staff_travel_segments
    WHERE tracking_session_id IN (
        SELECT id FROM public.staff_tracking_sessions
        WHERE staff_id = p_staff_id AND business_date = p_business_date AND status = 'CLOSED'
    );

    v_sum_session_dist := COALESCE(v_sum_session_dist, 0);
    v_sum_segment_dist := COALESCE(v_sum_segment_dist, 0);

    -- Find applicable rates based on travel duration
    SELECT COUNT(*) INTO v_rate_count
    FROM public.travel_expense_rates
    WHERE status = 'ACTIVE'
      AND effective_from <= v_max_ended_at
      AND (effective_to IS NULL OR effective_to > v_min_started_at);

    IF v_rate_count = 1 THEN
        SELECT id, rate_per_km INTO v_rate_id, v_rate_per_km
        FROM public.travel_expense_rates
        WHERE status = 'ACTIVE'
          AND effective_from <= v_max_ended_at
          AND (effective_to IS NULL OR effective_to > v_min_started_at)
        LIMIT 1;
          
        v_amount := ROUND((v_sum_session_dist * v_rate_per_km)::numeric, 2);
        v_status := 'CALCULATED';
    ELSIF v_rate_count = 0 THEN
        v_status := 'RATE_UNAVAILABLE';
        v_amount := NULL;
        v_rate_id := NULL;
        v_rate_per_km := NULL;
    ELSE
        -- Rate boundary crossed mid-travel. Requires explicit review.
        v_status := 'RATE_ALLOCATION_REQUIRES_REVIEW';
        v_amount := NULL;
        v_rate_id := NULL;
        v_rate_per_km := NULL;
    END IF;

    -- Distance Reconciliation Logic
    IF v_sum_session_dist = 0 THEN
        v_amount := 0;
        v_status := 'CALCULATED';
    ELSIF ABS(v_sum_session_dist - v_sum_segment_dist) > 0.05 AND v_status = 'CALCULATED' THEN
        v_status := 'REVIEW_REQUIRED';
    END IF;

    -- Snapshot metadata
    v_snapshot := jsonb_build_object(
        'session_km', v_sum_session_dist,
        'segment_km', v_sum_segment_dist,
        'rate_count', v_rate_count
    );

    -- Upsert final daily record
    INSERT INTO public.daily_travel_expenses (
        staff_id, 
        business_date, 
        total_distance_km, 
        applicable_rate_id, 
        applicable_rate_per_km, 
        calculated_amount, 
        status, 
        snapshot_data, 
        updated_at
    )
    VALUES (
        p_staff_id, 
        p_business_date, 
        v_sum_session_dist, 
        v_rate_id, 
        v_rate_per_km, 
        v_amount, 
        v_status, 
        v_snapshot, 
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (staff_id, business_date) DO UPDATE SET
        total_distance_km = EXCLUDED.total_distance_km,
        applicable_rate_id = EXCLUDED.applicable_rate_id,
        applicable_rate_per_km = EXCLUDED.applicable_rate_per_km,
        calculated_amount = EXCLUDED.calculated_amount,
        status = EXCLUDED.status,
        snapshot_data = EXCLUDED.snapshot_data,
        updated_at = CURRENT_TIMESTAMP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically recalculate on session closure
CREATE OR REPLACE FUNCTION trigger_calculate_expense_on_session_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Only calculate if status changed to CLOSED
    IF NEW.status = 'CLOSED' AND (OLD.status IS NULL OR OLD.status <> 'CLOSED') THEN
        PERFORM public.calculate_daily_travel_expense(NEW.staff_id, NEW.business_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_daily_expense ON public.staff_tracking_sessions;
CREATE TRIGGER trg_calc_daily_expense
AFTER UPDATE ON public.staff_tracking_sessions
FOR EACH ROW
EXECUTE FUNCTION trigger_calculate_expense_on_session_close();
