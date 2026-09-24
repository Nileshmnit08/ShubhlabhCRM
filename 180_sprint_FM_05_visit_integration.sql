-- Migration: 180_sprint_FM_05_visit_integration.sql
-- Description: Field Mobility Visit Integration (FM-05)

CREATE TABLE IF NOT EXISTS public.field_visit_travel_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.crm_visits(id) ON DELETE CASCADE,
    travel_segment_id UUID NOT NULL REFERENCES public.field_travel_segments(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES auth.users(id),
    link_status VARCHAR(50) DEFAULT 'CANDIDATE', -- UNLINKED, CANDIDATE, CONFIRMED, REJECTED
    link_method VARCHAR(50) NOT NULL, -- TIME_AND_LOCATION_MATCH, SESSION_VISIT_MATCH, EXPLICIT_USER_LINK
    temporal_gap_seconds INT,
    spatial_gap_meters INT,
    evidence_quality VARCHAR(50) DEFAULT 'GOOD',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(visit_id, travel_segment_id)
);

-- RLS
ALTER TABLE public.field_visit_travel_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for users to own links" 
    ON public.field_visit_travel_links FOR SELECT 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable update access for users to own links" 
    ON public.field_visit_travel_links FOR UPDATE
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable read access for Admins" 
    ON public.field_visit_travel_links FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM app_users 
        WHERE id = auth.uid() AND role = 'Admin'
      )
    );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_field_visit_travel_links_visit ON public.field_visit_travel_links(visit_id);
CREATE INDEX IF NOT EXISTS idx_field_visit_travel_links_segment ON public.field_visit_travel_links(travel_segment_id);
CREATE INDEX IF NOT EXISTS idx_field_visit_travel_links_staff ON public.field_visit_travel_links(staff_id);

-- Matcher Function
CREATE OR REPLACE FUNCTION public.match_visit_to_travel_segments(p_visit_id UUID)
RETURNS VOID AS $$
DECLARE
    v_rec RECORD;
    seg_rec RECORD;
    temp_gap INT;
    spat_gap FLOAT;
    match_quality VARCHAR(50);
    l_method VARCHAR(50);
    
    -- Thresholds derived from FM-02 Geofence (50m) and reasonable working limits (30 mins)
    SPATIAL_THRESHOLD_M INT := 50; 
    TEMPORAL_THRESHOLD_SEC INT := 1800; -- 30 minutes
BEGIN
    SELECT * INTO v_rec FROM public.crm_visits WHERE id = p_visit_id;
    IF v_rec IS NULL OR v_rec.latitude IS NULL OR v_rec.longitude IS NULL THEN
        RETURN;
    END IF;

    -- Evaluate Travel BEFORE Visit (Segment ends near Visit start)
    FOR seg_rec IN 
        SELECT * FROM public.field_travel_segments 
        WHERE staff_id = v_rec.staff_id
        AND ended_at BETWEEN v_rec.started_at - INTERVAL '2 hours' AND v_rec.started_at + INTERVAL '2 hours'
    LOOP
        temp_gap := ABS(EXTRACT(EPOCH FROM (v_rec.started_at - seg_rec.ended_at)));
        spat_gap := public.calculate_haversine_distance(seg_rec.end_latitude, seg_rec.end_longitude, v_rec.latitude, v_rec.longitude);
        
        IF temp_gap <= TEMPORAL_THRESHOLD_SEC AND spat_gap <= SPATIAL_THRESHOLD_M THEN
            match_quality := 'GOOD';
            l_method := 'TIME_AND_LOCATION_MATCH';
            
            INSERT INTO public.field_visit_travel_links (
                visit_id, travel_segment_id, staff_id, link_status, link_method, 
                temporal_gap_seconds, spatial_gap_meters, evidence_quality
            ) VALUES (
                v_rec.id, seg_rec.id, v_rec.staff_id, 'CANDIDATE', l_method,
                temp_gap, ROUND(spat_gap), match_quality
            ) ON CONFLICT (visit_id, travel_segment_id) DO NOTHING;
        END IF;
    END LOOP;

    -- Evaluate Travel AFTER Visit (Segment starts near Visit end)
    FOR seg_rec IN 
        SELECT * FROM public.field_travel_segments 
        WHERE staff_id = v_rec.staff_id
        AND started_at BETWEEN v_rec.ended_at - INTERVAL '2 hours' AND v_rec.ended_at + INTERVAL '2 hours'
    LOOP
        temp_gap := ABS(EXTRACT(EPOCH FROM (seg_rec.started_at - v_rec.ended_at)));
        spat_gap := public.calculate_haversine_distance(seg_rec.start_latitude, seg_rec.start_longitude, v_rec.latitude, v_rec.longitude);
        
        IF temp_gap <= TEMPORAL_THRESHOLD_SEC AND spat_gap <= SPATIAL_THRESHOLD_M THEN
            match_quality := 'GOOD';
            l_method := 'TIME_AND_LOCATION_MATCH';
            
            INSERT INTO public.field_visit_travel_links (
                visit_id, travel_segment_id, staff_id, link_status, link_method, 
                temporal_gap_seconds, spatial_gap_meters, evidence_quality
            ) VALUES (
                v_rec.id, seg_rec.id, v_rec.staff_id, 'CANDIDATE', l_method,
                temp_gap, ROUND(spat_gap), match_quality
            ) ON CONFLICT (visit_id, travel_segment_id) DO NOTHING;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-match when a Visit is Created/Updated
CREATE OR REPLACE FUNCTION public.trigger_match_visit_segments()
RETURNS TRIGGER AS $$
BEGIN
    -- Only match if location is present and the visit is completed (has ended_at)
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND NEW.ended_at IS NOT NULL THEN
        PERFORM public.match_visit_to_travel_segments(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_visit_segment_match ON public.crm_visits;
CREATE TRIGGER trig_visit_segment_match
AFTER INSERT OR UPDATE OF latitude, longitude, started_at, ended_at
ON public.crm_visits
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_visit_segments();

-- Trigger to auto-match when a Travel Segment is Created/Updated
CREATE OR REPLACE FUNCTION public.trigger_match_segment_visits()
RETURNS TRIGGER AS $$
DECLARE
    v_rec RECORD;
BEGIN
    -- Reverse matching: Find visits near this segment
    FOR v_rec IN 
        SELECT id FROM public.crm_visits 
        WHERE staff_id = NEW.staff_id
        AND latitude IS NOT NULL
        AND ended_at IS NOT NULL
        AND (
            (started_at BETWEEN NEW.ended_at - INTERVAL '2 hours' AND NEW.ended_at + INTERVAL '2 hours')
            OR 
            (ended_at BETWEEN NEW.started_at - INTERVAL '2 hours' AND NEW.started_at + INTERVAL '2 hours')
        )
    LOOP
        PERFORM public.match_visit_to_travel_segments(v_rec.id);
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_segment_visit_match ON public.field_travel_segments;
CREATE TRIGGER trig_segment_visit_match
AFTER INSERT OR UPDATE OF start_latitude, end_latitude, started_at, ended_at
ON public.field_travel_segments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_match_segment_visits();
