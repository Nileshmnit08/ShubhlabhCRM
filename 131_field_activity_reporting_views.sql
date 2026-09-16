-- MICRO-SPRINT CRM-ACTIVITY-01
-- Field Staff Activity Timeline View

-- 1. Create a unified, authoritative view of field activity
DROP VIEW IF EXISTS public.v_field_staff_activity_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_field_staff_activity_timeline WITH (security_invoker = true) AS

-- VISITS
SELECT 
    staff_id,
    party_id,
    'Visit' AS activity_type,
    started_at AS activity_time,
    'Visit (' || COALESCE(status, 'COMPLETED') || ')' AS title,
    COALESCE(notes, '') AS description,
    id::text AS source_id,
    'crm_visits' AS source_table
FROM public.crm_visits
WHERE staff_id IS NOT NULL

UNION ALL

-- REQUIREMENTS
SELECT 
    assigned_to AS staff_id,
    party_id,
    'Requirement' AS activity_type,
    created_at AS activity_time,
    product_type || ' (Qty: ' || quantity || ')' AS title,
    COALESCE(notes, '') AS description,
    id::text AS source_id,
    'requirements' AS source_table
FROM public.requirements
WHERE assigned_to IS NOT NULL

UNION ALL

-- FOLLOW-UPS (Completed)
SELECT 
    COALESCE(completed_by, assigned_to) AS staff_id,
    party_id,
    'Follow-up' AS activity_type,
    COALESCE(completed_at, updated_at, created_at) AS activity_time,
    reason AS title,
    COALESCE(notes, '') AS description,
    id::text AS source_id,
    'follow_ups' AS source_table
FROM public.follow_ups
WHERE status = 'Completed' AND COALESCE(completed_by, assigned_to) IS NOT NULL

UNION ALL

-- INTERACTIONS
SELECT 
    user_id AS staff_id,
    party_id,
    'Interaction' AS activity_type,
    created_at AS activity_time,
    channel AS title,
    COALESCE(outcome, note, '') AS description,
    id::text AS source_id,
    'interactions' AS source_table
FROM public.interactions
WHERE user_id IS NOT NULL;
