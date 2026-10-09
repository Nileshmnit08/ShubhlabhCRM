-- Fix: Update calculate_daily_travel_expense to use verified_distance_meters as the authoritative source
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

    -- Aggregate sessions using authoritative verified_distance_meters
    SELECT 
        ROUND((SUM(COALESCE(verified_distance_meters, 0)) / 1000.0)::numeric, 2),
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
    ELSIF ABS(v_sum_session_dist - v_sum_segment_dist) > 5.0 AND v_status = 'CALCULATED' THEN
        -- Relaxed mismatch threshold from 0.05 to 5.0 km to accommodate verified distance (straight-line fallback) vs GPS trace gaps
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

-- Update Trigger to automatically recalculate on session closure AND when distance updates
CREATE OR REPLACE FUNCTION trigger_calculate_expense_on_session_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate if status changed to CLOSED, OR if already CLOSED and verified distance changed
    IF (NEW.status = 'CLOSED' AND (OLD.status IS NULL OR OLD.status <> 'CLOSED'))
       OR (NEW.status = 'CLOSED' AND NEW.verified_distance_meters IS DISTINCT FROM OLD.verified_distance_meters) THEN
        PERFORM public.calculate_daily_travel_expense(NEW.staff_id, NEW.business_date);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
