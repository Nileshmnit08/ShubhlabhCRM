-- MICRO-SPRINT CRM-ACTIVITY-FIX-02
-- Fix Field Staff Activity Timeline View to explicitly JOIN crm_parties

DROP VIEW IF EXISTS public.v_field_staff_activity_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_field_staff_activity_timeline WITH (security_invoker = true) AS

-- VISITS
SELECT 
    v.staff_id,
    v.party_id,
    c.display_name AS party_name,
    'Visit' AS activity_type,
    v.started_at AS activity_time,
    'Visit (' || COALESCE(v.status, 'COMPLETED') || ')' AS title,
    COALESCE(v.notes, '') AS description,
    v.id::text AS source_id,
    'crm_visits' AS source_table
FROM public.crm_visits v
LEFT JOIN public.crm_parties c ON v.party_id = c.id
WHERE v.staff_id IS NOT NULL

UNION ALL

-- REQUIREMENTS
SELECT 
    r.assigned_to AS staff_id,
    r.party_id,
    c.display_name AS party_name,
    'Requirement' AS activity_type,
    r.created_at AS activity_time,
    r.product_type || ' (Qty: ' || r.quantity || ')' AS title,
    COALESCE(r.notes, '') AS description,
    r.id::text AS source_id,
    'requirements' AS source_table
FROM public.requirements r
LEFT JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.assigned_to IS NOT NULL

UNION ALL

-- FOLLOW-UPS (Completed)
SELECT 
    COALESCE(f.completed_by, f.assigned_to) AS staff_id,
    f.party_id,
    c.display_name AS party_name,
    'Follow-up' AS activity_type,
    COALESCE(f.completed_at, f.updated_at, f.created_at) AS activity_time,
    f.reason AS title,
    COALESCE(f.notes, '') AS description,
    f.id::text AS source_id,
    'follow_ups' AS source_table
FROM public.follow_ups f
LEFT JOIN public.crm_parties c ON f.party_id = c.id
WHERE f.status = 'Completed' AND COALESCE(f.completed_by, f.assigned_to) IS NOT NULL

UNION ALL

-- INTERACTIONS
SELECT 
    i.user_id AS staff_id,
    i.party_id,
    c.display_name AS party_name,
    'Interaction' AS activity_type,
    i.created_at AS activity_time,
    i.channel AS title,
    COALESCE(i.outcome, i.note, '') AS description,
    i.id::text AS source_id,
    'interactions' AS source_table
FROM public.interactions i
LEFT JOIN public.crm_parties c ON i.party_id = c.id
WHERE i.user_id IS NOT NULL;
