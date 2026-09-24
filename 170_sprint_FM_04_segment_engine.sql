-- Migration: 170_sprint_FM_04_segment_engine.sql
-- Description: Travel Segment Engine (FM-04)

CREATE TABLE IF NOT EXISTS public.field_travel_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.staff_tracking_sessions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ NOT NULL,
    start_latitude NUMERIC,
    start_longitude NUMERIC,
    end_latitude NUMERIC,
    end_longitude NUMERIC,
    distance_meters INT NOT NULL DEFAULT 0,
    duration_seconds INT NOT NULL DEFAULT 0,
    point_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) DEFAULT 'CALCULATED',
    quality_status VARCHAR(50) DEFAULT 'GOOD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.field_travel_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users to own records" 
    ON public.field_travel_segments FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable read access for Admins" 
    ON public.field_travel_segments FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM app_users 
        WHERE id = auth.uid() AND role = 'Admin'
      )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_field_travel_segments_session ON public.field_travel_segments(session_id);
CREATE INDEX IF NOT EXISTS idx_field_travel_segments_staff ON public.field_travel_segments(staff_id);


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
        SELECT id, latitude, longitude, accuracy, captured_at, status
        FROM public.staff_location_history
        WHERE session_id = p_session_id
        ORDER BY captured_at ASC
    LOOP
        -- Skip anomalies handled by FM-03 (keep them out of segment calculations)
        IF rec.status IN ('REJECTED_FOR_DISTANCE', 'SUSPECT') THEN
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
        dist_from_anchor := public.calculate_haversine_distance(anchor_rec.latitude, anchor_rec.longitude, rec.latitude, rec.longitude);
        
        IF dist_from_anchor >= DRIFT_THRESHOLD_M THEN
            -- MOVEMENT DETECTED
            IF state = 'STOPPED' THEN
                -- Transition from STOPPED to MOVING
                -- We use the last point we were still stopped as the true start time of movement
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
                -- Track the last point we were still stopped at the anchor
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

-- Hook into the FM-03 Distance Engine Trigger
CREATE OR REPLACE FUNCTION public.trigger_recalculate_session_distance()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        IF OLD.session_id IS NOT NULL THEN
            PERFORM public.recalculate_session_distance(OLD.session_id);
            PERFORM public.recalculate_session_segments(OLD.session_id);
        END IF;
        RETURN OLD;
    ELSE
        IF NEW.session_id IS NOT NULL THEN
            PERFORM public.recalculate_session_distance(NEW.session_id);
            PERFORM public.recalculate_session_segments(NEW.session_id);
        END IF;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
