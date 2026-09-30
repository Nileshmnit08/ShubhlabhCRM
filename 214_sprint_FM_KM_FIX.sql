-- Migration: 214_sprint_FM_KM_FIX.sql
-- Description: Unified location points view and distance/segment recalculation fix

CREATE OR REPLACE VIEW public.vw_field_session_unified_points AS
WITH session_info AS (
    SELECT id, staff_id, started_at, ended_at
    FROM public.staff_tracking_sessions
),
all_points AS (
    -- 1. Continuous tracking points
    SELECT h.session_id, h.id::text AS point_id, h.latitude, h.longitude, COALESCE(h.accuracy, 0) AS accuracy, h.captured_at, 'TRACKING' as source
    FROM public.staff_location_history h
    WHERE h.latitude IS NOT NULL AND h.longitude IS NOT NULL
      AND h.latitude != 0 AND h.longitude != 0
    
    UNION ALL
    
    -- 2. Session Start
    SELECT id AS session_id, 'session_start' AS point_id, started_latitude, started_longitude, COALESCE(started_accuracy, 0), started_at, 'SESSION_START'
    FROM public.staff_tracking_sessions
    WHERE started_latitude IS NOT NULL AND started_longitude IS NOT NULL
      AND started_latitude != 0 AND started_longitude != 0
      
    UNION ALL
    
    -- 3. Session End
    SELECT id AS session_id, 'session_end' AS point_id, ended_latitude, ended_longitude, COALESCE(ended_accuracy, 0), ended_at, 'SESSION_END'
    FROM public.staff_tracking_sessions
    WHERE ended_latitude IS NOT NULL AND ended_longitude IS NOT NULL
      AND ended_latitude != 0 AND ended_longitude != 0
      
    UNION ALL
    
    -- 4. Visit Start
    SELECT s.id AS session_id, 'visit_start_' || v.id AS point_id, 
           COALESCE(v.start_latitude, v.latitude) AS latitude, 
           COALESCE(v.start_longitude, v.longitude) AS longitude, 
           COALESCE(v.start_location_accuracy, 0) AS accuracy, 
           v.started_at AS captured_at, 'VISIT_START' AS source
    FROM public.crm_visits v
    JOIN session_info s ON v.staff_id = s.staff_id
    WHERE v.started_at >= (s.started_at - INTERVAL '5 minutes') AND (s.ended_at IS NULL OR v.started_at <= (s.ended_at + INTERVAL '5 minutes'))
      AND COALESCE(v.start_latitude, v.latitude) IS NOT NULL 
      AND COALESCE(v.start_longitude, v.longitude) IS NOT NULL
      AND COALESCE(v.start_latitude, v.latitude) != 0 
      AND COALESCE(v.start_longitude, v.longitude) != 0

    UNION ALL
    
    -- 5. Visit End
    SELECT s.id AS session_id, 'visit_end_' || v.id AS point_id, 
           v.ended_latitude AS latitude, 
           v.ended_longitude AS longitude, 
           COALESCE(v.ended_location_accuracy, 0) AS accuracy, 
           v.ended_at AS captured_at, 'VISIT_END' AS source
    FROM public.crm_visits v
    JOIN session_info s ON v.staff_id = s.staff_id
    WHERE v.ended_at IS NOT NULL
      AND v.ended_at >= (s.started_at - INTERVAL '5 minutes') AND (s.ended_at IS NULL OR v.ended_at <= (s.ended_at + INTERVAL '5 minutes'))
      AND v.ended_latitude IS NOT NULL 
      AND v.ended_longitude IS NOT NULL
      AND v.ended_latitude != 0 
      AND v.ended_longitude != 0
),
ranked_points AS (
    SELECT *,
           ROW_NUMBER() OVER(PARTITION BY session_id, captured_at, latitude, longitude ORDER BY source) as rn
    FROM all_points
)
SELECT session_id, point_id AS id, latitude, longitude, accuracy, captured_at, source
FROM ranked_points
WHERE rn = 1;


-- 2.5 Overloaded Haversine Distance Function for DOUBLE PRECISION compatibility
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
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
                
            -- RULE 3: Accuracy Filter (> 500m) -> Increased tolerance for visit events that might have poor accuracy initially
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
                effective_dist_m := ROUND(raw_dist_m);
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
                segment_distance_m = effective_dist_m,
                implied_speed_kmh = ROUND(impl_speed_kmh::numeric, 2)
            WHERE id = rec.id::uuid;
        END IF;
        
    END LOOP;

    -- Update authoritative verified distance
    UPDATE public.staff_tracking_sessions
    SET verified_distance_meters = total_distance,
        total_distance_km = ROUND(total_distance / 1000.0, 2)
    WHERE id = p_session_id;

END;
$$ LANGUAGE plpgsql;


-- Segment Recalculation Engine
CREATE OR REPLACE FUNCTION public.recalculate_session_segments(p_session_id UUID)
RETURNS VOID AS $$
DECLARE
    rec RECORD;
    staff_uuid UUID;
    
    seg_start_rec RECORD := NULL;
    seg_last_moved_rec RECORD := NULL;
    anchor_rec RECORD := NULL;
    last_drift_rec RECORD := NULL;
    
    seg_distance INT := 0;
    seg_point_count INT := 0;
    state VARCHAR(20) := 'STOPPED';
    
    dist_from_anchor FLOAT;
    time_at_anchor FLOAT;
    time_from_prev FLOAT;
    prev_time TIMESTAMPTZ := NULL;
    
    STOP_THRESHOLD_SEC INT := 300; -- 5 minutes
    GAP_THRESHOLD_SEC INT := 7200; -- 2 hours
    DRIFT_THRESHOLD_M INT := 15;   -- 15 meters
    
BEGIN
    -- Get staff_id
    SELECT staff_id INTO staff_uuid FROM public.staff_tracking_sessions WHERE id = p_session_id;
    IF staff_uuid IS NULL THEN
        RETURN;
    END IF;

    -- Clear existing segments for recalculation
    DELETE FROM public.field_travel_segments WHERE session_id = p_session_id;

    FOR rec IN 
        SELECT id, latitude, longitude, accuracy, captured_at, source
        FROM public.vw_field_session_unified_points
        WHERE session_id = p_session_id
        ORDER BY captured_at ASC
    LOOP
        -- Simple anomaly filtering
        IF rec.accuracy > 500 THEN
            CONTINUE;
        END IF;

        IF prev_time IS NOT NULL THEN
            time_from_prev := EXTRACT(EPOCH FROM (rec.captured_at - prev_time));
            
            -- GAP DETECTION (e.g. 2 hours missing)
            IF time_from_prev > GAP_THRESHOLD_SEC THEN
                -- Close segment if moving
                IF state = 'MOVING' AND seg_distance > 0 THEN
                    INSERT INTO public.field_travel_segments (
                        session_id, staff_id, started_at, ended_at, 
                        start_latitude, start_longitude, end_latitude, end_longitude,
                        distance_meters, duration_seconds, point_count
                    ) VALUES (
                        p_session_id, staff_uuid, seg_start_rec.captured_at, seg_last_moved_rec.captured_at,
                        seg_start_rec.latitude, seg_start_rec.longitude, seg_last_moved_rec.latitude, seg_last_moved_rec.longitude,
                        seg_distance, EXTRACT(EPOCH FROM (seg_last_moved_rec.captured_at - seg_start_rec.captured_at)), seg_point_count
                    );
                END IF;
                -- Reset completely
                anchor_rec := rec;
                seg_start_rec := rec;
                seg_last_moved_rec := rec;
                seg_distance := 0;
                seg_point_count := 1;
                state := 'STOPPED';
                last_drift_rec := rec;
            END IF;
        END IF;
        
        prev_time := rec.captured_at;

        IF anchor_rec IS NULL THEN
            anchor_rec := rec;
            seg_start_rec := rec;
            seg_last_moved_rec := rec;
            last_drift_rec := rec;
            seg_distance := 0;
            seg_point_count := 1;
            state := 'STOPPED'; -- Start as stopped until movement occurs
            CONTINUE;
        END IF;

        -- Calculate distance from anchor (simulating FM-03 logic to perfectly align)
        dist_from_anchor := public.calculate_haversine_distance(anchor_rec.latitude::NUMERIC, anchor_rec.longitude::NUMERIC, rec.latitude::NUMERIC, rec.longitude::NUMERIC);
        
        IF dist_from_anchor >= DRIFT_THRESHOLD_M THEN
            -- MOVEMENT DETECTED
            IF state = 'STOPPED' THEN
                -- Transition from STOPPED to MOVING
                IF last_drift_rec IS NOT NULL THEN
                    seg_start_rec := anchor_rec; 
                    -- Overwrite the captured_at with the time we actually started moving
                    seg_start_rec.captured_at := last_drift_rec.captured_at;
                ELSE
                    seg_start_rec := anchor_rec;
                END IF;
                
                seg_distance := 0;
                seg_point_count := 0;
            END IF;
            
            state := 'MOVING';
            seg_distance := seg_distance + ROUND(dist_from_anchor);
            seg_point_count := seg_point_count + 1;
            
            -- Advance anchor
            anchor_rec := rec;
            seg_last_moved_rec := rec;
            
        ELSE
            -- NO SIGNIFICANT MOVEMENT (DRIFT)
            time_at_anchor := EXTRACT(EPOCH FROM (rec.captured_at - anchor_rec.captured_at));
            
            IF state = 'MOVING' THEN
                seg_point_count := seg_point_count + 1;
                
                IF time_at_anchor >= STOP_THRESHOLD_SEC THEN
                    -- STOP DETECTED (Exceeded 5 minutes at anchor)
                    IF seg_distance > 0 THEN
                        INSERT INTO public.field_travel_segments (
                            session_id, staff_id, started_at, ended_at, 
                            start_latitude, start_longitude, end_latitude, end_longitude,
                            distance_meters, duration_seconds, point_count
                        ) VALUES (
                            p_session_id, staff_uuid, seg_start_rec.captured_at, anchor_rec.captured_at,
                            seg_start_rec.latitude, seg_start_rec.longitude, anchor_rec.latitude, anchor_rec.longitude,
                            seg_distance, EXTRACT(EPOCH FROM (anchor_rec.captured_at - seg_start_rec.captured_at)), seg_point_count
                        );
                    END IF;
                    
                    state := 'STOPPED';
                    seg_distance := 0;
                END IF;
            ELSE
                -- Already STOPPED. 
                last_drift_rec := rec;
            END IF;
        END IF;

    END LOOP;

    -- Close final segment if still moving
    IF state = 'MOVING' AND seg_distance > 0 THEN
        INSERT INTO public.field_travel_segments (
            session_id, staff_id, started_at, ended_at, 
            start_latitude, start_longitude, end_latitude, end_longitude,
            distance_meters, duration_seconds, point_count
        ) VALUES (
            p_session_id, staff_uuid, seg_start_rec.captured_at, seg_last_moved_rec.captured_at,
            seg_start_rec.latitude, seg_start_rec.longitude, seg_last_moved_rec.latitude, seg_last_moved_rec.longitude,
            seg_distance, EXTRACT(EPOCH FROM (seg_last_moved_rec.captured_at - seg_start_rec.captured_at)), seg_point_count
        );
    END IF;

END;
$$ LANGUAGE plpgsql;

-- Apply recalculation to all existing sessions to fix the 0 Verified KM issue
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
