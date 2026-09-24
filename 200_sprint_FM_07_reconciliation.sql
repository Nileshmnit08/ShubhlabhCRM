-- Migration: 200_sprint_FM_07_reconciliation.sql
-- Description: Field Mobility & Expense Reconciliation Views (FM-07)

-- 1. TIMELINE VIEW
CREATE OR REPLACE VIEW public.vw_field_timeline AS
SELECT 
    id, staff_id, started_at AS event_time, 'SESSION_START' AS event_type,
    NULL::UUID AS reference_id, 'Field Session Started' AS description,
    NULL::NUMERIC AS amount, NULL::INT AS distance_m, status
FROM public.staff_tracking_sessions

UNION ALL

SELECT 
    id, staff_id, ended_at AS event_time, 'SESSION_END' AS event_type,
    NULL::UUID, 'Field Session Ended',
    NULL, NULL, status
FROM public.staff_tracking_sessions WHERE ended_at IS NOT NULL

UNION ALL

SELECT 
    id, staff_id, ended_at AS event_time, 'TRAVEL_SEGMENT' AS event_type,
    session_id AS reference_id, 'Travel Segment',
    NULL, distance_meters, status
FROM public.field_travel_segments

UNION ALL

SELECT 
    v.id, v.staff_id, v.started_at AS event_time, 'VISIT' AS event_type,
    p.id AS reference_id, 'Customer Visit: ' || COALESCE(p.display_name, 'Unknown'),
    NULL, NULL, v.status
FROM public.crm_visits v
JOIN public.crm_parties p ON v.party_id = p.id

UNION ALL

SELECT 
    id, staff_id, 
    (expense_date + expense_time)::timestamptz AS event_time,
    'EXPENSE' AS event_type,
    session_id AS reference_id,
    category || ' Expense: ' || COALESCE(description, ''),
    amount, NULL, status
FROM public.field_expenses;


-- 2. EXPENSE RECONCILIATION VIEW
CREATE OR REPLACE VIEW public.vw_field_expense_reconciliation AS
SELECT
    e.id AS expense_id,
    e.staff_id,
    e.expense_date,
    e.expense_time,
    (e.expense_date + e.expense_time)::timestamptz AS event_time,
    e.category,
    e.amount,
    e.status,
    e.session_id,
    e.visit_id,
    CASE WHEN e.latitude IS NOT NULL THEN 'AVAILABLE' ELSE 'NOT_AVAILABLE' END AS location_availability,
    
    CASE
        WHEN e.session_id IS NOT NULL AND e.latitude IS NOT NULL AND e.visit_id IS NOT NULL THEN 'SUPPORTED'
        WHEN e.session_id IS NOT NULL OR e.latitude IS NOT NULL OR e.visit_id IS NOT NULL THEN 'PARTIALLY_SUPPORTED'
        ELSE 'NO_MOBILITY_EVIDENCE'
    END AS evidence_status
FROM public.field_expenses e;


-- 3. VISIT RECONCILIATION VIEW
CREATE OR REPLACE VIEW public.vw_field_visit_reconciliation AS
SELECT
    v.id AS visit_id,
    v.staff_id,
    v.party_id,
    v.started_at,
    v.ended_at,
    CASE WHEN v.latitude IS NOT NULL THEN 'AVAILABLE' ELSE 'NOT_AVAILABLE' END AS location_availability,
    
    (SELECT COUNT(*) FROM public.field_visit_travel_links vl WHERE vl.visit_id = v.id) AS linked_segment_count,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM public.field_visit_travel_links vl WHERE vl.visit_id = v.id) THEN 'SUPPORTED'
        ELSE 'NO_VERIFIED_MOBILITY_LINK'
    END AS mobility_evidence_status
FROM public.crm_visits v;


-- 4. SESSION RECONCILIATION VIEW
CREATE OR REPLACE VIEW public.vw_field_session_reconciliation AS
SELECT 
    s.id AS session_id,
    s.staff_id,
    s.business_date,
    s.started_at,
    s.ended_at,
    s.verified_distance_meters,
    
    (SELECT COUNT(*) FROM public.field_travel_segments ts WHERE ts.session_id = s.id) AS travel_segment_count,
    
    COALESCE((SELECT SUM(ts.distance_meters) FROM public.field_travel_segments ts WHERE ts.session_id = s.id), 0) AS sum_segment_distance,
    
    (SELECT COUNT(DISTINCT vl.visit_id) 
     FROM public.field_travel_segments ts 
     JOIN public.field_visit_travel_links vl ON ts.id = vl.travel_segment_id
     WHERE ts.session_id = s.id) AS linked_visit_count,
     
    (SELECT COUNT(*) FROM public.field_expenses e WHERE e.session_id = s.id) AS expense_count,
    
    COALESCE((SELECT SUM(e.amount) FROM public.field_expenses e WHERE e.session_id = s.id), 0) AS expense_total,
    
    -- Tolerance check: If sum(segment.distance) differs from session.verified_distance by more than 15 meters (drift tolerance limit).
    CASE 
        WHEN ABS(s.verified_distance_meters - COALESCE((SELECT SUM(ts.distance_meters) FROM public.field_travel_segments ts WHERE ts.session_id = s.id), 0)) > 15 THEN 'DATA_INCONSISTENCY'
        WHEN s.verified_distance_meters > 0 AND (SELECT COUNT(*) FROM public.field_expenses e WHERE e.session_id = s.id) > 0 THEN 'SUPPORTED'
        WHEN s.verified_distance_meters = 0 AND (SELECT COUNT(*) FROM public.field_expenses e WHERE e.session_id = s.id) > 0 THEN 'NO_MOBILITY_EVIDENCE'
        WHEN s.verified_distance_meters > 0 THEN 'PARTIAL' -- Movement occurred, maybe no expenses yet
        ELSE 'AMBIGUOUS'
    END AS mobility_evidence_status

FROM public.staff_tracking_sessions s;
