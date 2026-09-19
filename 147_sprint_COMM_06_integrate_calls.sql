-- MICRO-SPRINT CRM-COMM-06
-- Integrate Communication system with Customer Activity and Field Staff Activity Timeline

-- 1. Update v_customer_timeline to include crm_call_events (using v_crm_call_events_enriched to respect admin masking)
DROP VIEW IF EXISTS public.v_customer_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_customer_timeline WITH (security_invoker = true) AS

-- Interactions
SELECT 
    party_id,
    'Interaction' AS event_type,
    created_at AS event_date,
    channel AS title,
    outcome || COALESCE(': ' || note, '') AS description,
    id::text AS source_id,
    false AS is_tally
FROM public.interactions

UNION ALL

-- Follow-ups (Tasks completed)
SELECT 
    party_id,
    'Task Completed' AS event_type,
    updated_at AS event_date,
    reason AS title,
    'Completed Follow-up (' || follow_up_type || ')' AS description,
    id::text AS source_id,
    false AS is_tally
FROM public.follow_ups
WHERE status = 'Completed'

UNION ALL

-- Requirements Created
SELECT 
    party_id,
    'Requirement Logged' AS event_type,
    created_at AS event_date,
    product_type AS title,
    'Qty: ' || quantity || ' ' || unit || ' | Status: ' || status AS description,
    id::text AS source_id,
    false AS is_tally
FROM public.requirements

UNION ALL

-- Service Issues
SELECT 
    party_id,
    'Service Issue' AS event_type,
    created_at AS event_date,
    category || ' (' || priority || ')' AS title,
    description AS description,
    id::text AS source_id,
    false AS is_tally
FROM public.crm_issues

UNION ALL

-- Calls
SELECT 
    party_id,
    'Call' AS event_type,
    started_at AS event_date,
    CASE 
        WHEN direction = 'INCOMING' THEN 'Incoming call from Customer to Operator ' || staff_name
        WHEN direction = 'OUTGOING' THEN 'Customer called by Operator ' || staff_name
        WHEN direction = 'MISSED' THEN 'Missed call to/from Operator ' || staff_name
        ELSE 'Call with ' || staff_name
    END AS title,
    'Duration: ' || CASE WHEN duration_seconds > 0 THEN duration_seconds::text || 's' ELSE 'Unknown/Missed' END || ' | Number: ' || COALESCE(display_phone, 'Unknown') AS description,
    id::text AS source_id,
    false AS is_tally
FROM public.v_crm_call_events_enriched
WHERE party_id IS NOT NULL

UNION ALL

-- Tally Transactions
SELECT 
    crm_party_id AS party_id,
    'Tally Transaction' AS event_type,
    voucher_date AS event_date,
    voucher_type || COALESCE(' #' || voucher_no, '') AS title,
    CASE WHEN is_credit THEN 'Cr. ₹' ELSE 'Dr. ₹' END || amount::text AS description,
    id::text AS source_id,
    true AS is_tally
FROM public.tally_transactions;

-- 2. Update v_field_staff_activity_timeline to include crm_call_events
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
WHERE i.user_id IS NOT NULL

UNION ALL

-- CALLS
SELECT 
    staff_id,
    party_id,
    party_name,
    'Call' AS activity_type,
    started_at AS activity_time,
    CASE 
        WHEN direction = 'INCOMING' THEN 'Incoming call from Customer to Operator ' || staff_name
        WHEN direction = 'OUTGOING' THEN 'Customer called by Operator ' || staff_name
        WHEN direction = 'MISSED' THEN 'Missed call to/from Operator ' || staff_name
        ELSE 'Call with ' || staff_name
    END AS title,
    'Duration: ' || CASE WHEN duration_seconds > 0 THEN duration_seconds::text || 's' ELSE 'Unknown/Missed' END || ' | Number: ' || COALESCE(display_phone, 'Unknown') AS description,
    id::text AS source_id,
    'crm_call_events' AS source_table
FROM public.v_crm_call_events_enriched
WHERE staff_id IS NOT NULL AND party_id IS NOT NULL;
