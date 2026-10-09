-- ============================================================================
-- Migration: 217_sprint_FM_TRAVEL_FIX.sql
-- Description:
--   1. Modifies recalculate_session_distance to sum raw float distances,
--      avoiding rounding errors per-segment.
--   2. Adds triggers to staff_tracking_sessions and crm_visits so that
--      when sessions end or visits occur, the distance is recalculated.
--   3. Backfills all sessions.
-- ============================================================================

-- 1. Redefine recalculate_session_distance
CREATE OR REPLACE FUNCTION public.recalculate_session_distance(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    prev_rec RECORD := NULL;
    total_distance FLOAT := 0;
    raw_dist_m FLOAT;
    effective_dist_m FLOAT;
    time_diff_sec FLOAT;
    impl_speed_kmh FLOAT;
    point_status VARCHAR(50);
BEGIN
    -- Loop through unified points in session ordered by captured_at
    FOR rec IN 
        SELECT id, latitude, longitude, accuracy, captured_at, source
        FROM public.vw_field_session_unified_points
        WHERE session_id = p_session_id
        ORDER BY captured_at ASC
    LOOP
        point_status := 'VALID';
        raw_dist_m := 0;
        effective_dist_m := 0;
        impl_speed_kmh := 0;
        
        IF prev_rec IS NOT NULL THEN
            time_diff_sec := EXTRACT(EPOCH FROM (rec.captured_at - prev_rec.captured_at));
            raw_dist_m := public.calculate_haversine_distance(prev_rec.latitude::NUMERIC, prev_rec.longitude::NUMERIC, rec.latitude::NUMERIC, rec.longitude::NUMERIC);
            
            IF time_diff_sec > 0 THEN
                impl_speed_kmh := (raw_dist_m / 1000.0) / (time_diff_sec / 3600.0);
            ELSE
                impl_speed_kmh := 0;
            END IF;
            
            -- RULE 1: Time Gap (> 2 hours) -> Break segment, start new path
            IF time_diff_sec > 7200 THEN
                point_status := 'VALID';
                effective_dist_m := 0;
                prev_rec := rec;
                
            -- RULE 2: Speed Spike (> 150 km/h) -> Impossible, ignore point
            ELSIF impl_speed_kmh > 150 THEN
                point_status := 'SUSPECT';
                effective_dist_m := 0;
                
            -- RULE 3: Accuracy Filter (> 500m) -> Inaccurate, ignore point
            ELSIF rec.accuracy > 500 THEN
                point_status := 'REJECTED_FOR_DISTANCE';
                effective_dist_m := 0;
                
            -- RULE 4: Stationary Drift (< 15m) -> Absorb drift, do NOT advance prev_rec
            ELSIF raw_dist_m < 15 THEN
                point_status := 'VALID';
                effective_dist_m := 0;
                
            -- RULE 5: Valid Movement
            ELSE
                point_status := 'VALID';
                effective_dist_m := raw_dist_m;
                total_distance := total_distance + effective_dist_m;
                prev_rec := rec;
            END IF;
            
        ELSE
            -- First point handling
            IF rec.accuracy > 500 THEN
                point_status := 'REJECTED_FOR_DISTANCE';
            ELSE
                point_status := 'VALID';
                prev_rec := rec;
            END IF;
        END IF;

        -- We only update staff_location_history for TRACKING points
        IF rec.source = 'TRACKING' THEN
            UPDATE public.staff_location_history
            SET status = point_status, 
                segment_distance_m = ROUND(effective_dist_m),
                implied_speed_kmh = ROUND(impl_speed_kmh::numeric, 2)
            WHERE id = rec.id::uuid;
        END IF;
        
    END LOOP;

    -- Update authoritative verified distance
    UPDATE public.staff_tracking_sessions
    SET verified_distance_meters = ROUND(total_distance),
        total_distance_km = ROUND((total_distance / 1000.0)::numeric, 2)
    WHERE id = p_session_id;

END;
$$ LANGUAGE plpgsql;


-- 2. Trigger on staff_tracking_sessions
CREATE OR REPLACE FUNCTION public.trigger_recalc_on_session_update()
RETURNS TRIGGER AS $$
BEGIN
    -- We must avoid recursion when recalculate_session_distance updates the session itself.
    -- Because recalculate_session_distance updates verified_distance_meters and total_distance_km,
    -- we should only trigger if the geometry or time changes.
    IF TG_OP = 'UPDATE' THEN
        IF NEW.started_at IS DISTINCT FROM OLD.started_at OR
           NEW.ended_at IS DISTINCT FROM OLD.ended_at OR
           NEW.started_latitude IS DISTINCT FROM OLD.started_latitude OR
           NEW.started_longitude IS DISTINCT FROM OLD.started_longitude OR
           NEW.ended_latitude IS DISTINCT FROM OLD.ended_latitude OR
           NEW.ended_longitude IS DISTINCT FROM OLD.ended_longitude THEN
            PERFORM public.recalculate_session_distance(NEW.id);
            PERFORM public.recalculate_session_segments(NEW.id);
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM public.recalculate_session_distance(NEW.id);
        PERFORM public.recalculate_session_segments(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_session_recalc ON public.staff_tracking_sessions;
CREATE TRIGGER trig_session_recalc
AFTER INSERT OR UPDATE
ON public.staff_tracking_sessions
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.trigger_recalc_on_session_update();


-- 3. Trigger on crm_visits
CREATE OR REPLACE FUNCTION public.trigger_recalc_on_visit_update()
RETURNS TRIGGER AS $$
DECLARE
    sess_id UUID;
BEGIN
    -- Find the active/overlapping session for this visit
    SELECT s.id INTO sess_id
    FROM public.staff_tracking_sessions s
    WHERE s.staff_id = COALESCE(NEW.staff_id, OLD.staff_id)
      AND COALESCE(NEW.started_at, OLD.started_at) >= (s.started_at - INTERVAL '5 minutes')
      AND (s.ended_at IS NULL OR COALESCE(NEW.started_at, OLD.started_at) <= (s.ended_at + INTERVAL '5 minutes'))
    LIMIT 1;

    IF sess_id IS NOT NULL THEN
        PERFORM public.recalculate_session_distance(sess_id);
        PERFORM public.recalculate_session_segments(sess_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_visit_recalc ON public.crm_visits;
CREATE TRIGGER trig_visit_recalc
AFTER INSERT OR UPDATE OF started_at, ended_at, start_latitude, start_longitude, ended_latitude, ended_longitude OR DELETE
ON public.crm_visits
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.trigger_recalc_on_visit_update();


-- 4. Re-calculate all existing sessions
DO $$
DECLARE
    sess_id UUID;
BEGIN
    FOR sess_id IN SELECT id FROM public.staff_tracking_sessions
    LOOP
        PERFORM public.recalculate_session_distance(sess_id);
        PERFORM public.recalculate_session_segments(sess_id);
    END LOOP;
END;
$$;
