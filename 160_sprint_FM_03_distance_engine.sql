-- Migration: 160_sprint_FM_03_distance_engine.sql
-- Description: Verified Distance Engine (FM-03)

-- 1. Add schema columns
ALTER TABLE public.staff_tracking_sessions
ADD COLUMN IF NOT EXISTS verified_distance_meters INT DEFAULT 0;

ALTER TABLE public.staff_location_history
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'VALID',
ADD COLUMN IF NOT EXISTS segment_distance_m INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS implied_speed_kmh NUMERIC DEFAULT 0;

-- 2. Haversine Distance Function
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    lat1 NUMERIC, lon1 NUMERIC,
    lat2 NUMERIC, lon2 NUMERIC
) RETURNS FLOAT AS $$
DECLARE
    radius FLOAT := 6371000; -- Earth radius in meters
    dlat FLOAT;
    dlon FLOAT;
    a FLOAT;
    c FLOAT;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 0;
    END IF;
    dlat := radians(lat2 - lat1);
    dlon := radians(lon2 - lon1);
    a := sin(dlat/2) * sin(dlat/2) +
         cos(radians(lat1)) * cos(radians(lat2)) *
         sin(dlon/2) * sin(dlon/2);
    c := 2 * atan2(sqrt(a), sqrt(1-a));
    RETURN radius * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Session Distance Recalculation Engine
CREATE OR REPLACE FUNCTION public.recalculate_session_distance(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    prev_rec RECORD := NULL;
    total_distance INT := 0;
    raw_dist_m FLOAT;
    effective_dist_m INT;
    time_diff_sec FLOAT;
    impl_speed_kmh FLOAT;
    point_status VARCHAR(50);
BEGIN
    -- Loop through all points in session ordered by captured_at (never insertion order)
    FOR rec IN 
        SELECT id, latitude, longitude, accuracy, captured_at
        FROM public.staff_location_history
        WHERE session_id = p_session_id
        ORDER BY captured_at ASC
    LOOP
        point_status := 'VALID';
        raw_dist_m := 0;
        effective_dist_m := 0;
        impl_speed_kmh := 0;
        
        IF prev_rec IS NOT NULL THEN
            time_diff_sec := EXTRACT(EPOCH FROM (rec.captured_at - prev_rec.captured_at));
            raw_dist_m := public.calculate_haversine_distance(prev_rec.latitude, prev_rec.longitude, rec.latitude, rec.longitude);
            
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
                
            -- RULE 3: Accuracy Filter (> 50m) -> Inaccurate, ignore point
            ELSIF rec.accuracy > 50 THEN
                point_status := 'REJECTED_FOR_DISTANCE';
                effective_dist_m := 0;
                
            -- RULE 4: Stationary Drift (< 15m) -> Absorb drift, do NOT advance prev_rec
            ELSIF raw_dist_m < 15 THEN
                point_status := 'VALID';
                effective_dist_m := 0;
                
            -- RULE 5: Valid Movement
            ELSE
                point_status := 'VALID';
                effective_dist_m := ROUND(raw_dist_m);
                total_distance := total_distance + effective_dist_m;
                prev_rec := rec;
            END IF;
            
        ELSE
            -- First point handling
            IF rec.accuracy > 50 THEN
                point_status := 'REJECTED_FOR_DISTANCE';
            ELSE
                point_status := 'VALID';
                prev_rec := rec;
            END IF;
        END IF;

        -- Update the point with engine output silently (bypassing triggers)
        UPDATE public.staff_location_history
        SET status = point_status, 
            segment_distance_m = effective_dist_m,
            implied_speed_kmh = ROUND(impl_speed_kmh::numeric, 2)
        WHERE id = rec.id;
        
    END LOOP;

    -- Update authoritative verified distance
    UPDATE public.staff_tracking_sessions
    SET verified_distance_meters = total_distance
    WHERE id = p_session_id;

END;
$$ LANGUAGE plpgsql;

-- 4. Trigger Function
CREATE OR REPLACE FUNCTION public.trigger_recalculate_session_distance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.session_id IS NOT NULL THEN
            PERFORM public.recalculate_session_distance(OLD.session_id);
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.session_id IS NOT NULL THEN
            PERFORM public.recalculate_session_distance(NEW.session_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach Trigger (Depth 0 ensures no recursion from the silent UPDATE inside the engine)
DROP TRIGGER IF EXISTS trig_location_history_recalc ON public.staff_location_history;
CREATE TRIGGER trig_location_history_recalc
AFTER INSERT OR UPDATE OF latitude, longitude, accuracy, captured_at, session_id OR DELETE
ON public.staff_location_history
FOR EACH ROW
WHEN (pg_trigger_depth() = 0)
EXECUTE FUNCTION public.trigger_recalculate_session_distance();
