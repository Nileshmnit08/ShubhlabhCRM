-- SPRINT FIX: SL-ORDER-SINGLE-SOURCE-OF-TRUTH-01
-- Objective: Fix views to use native weight column instead of regex parsing on product_name

-- 1. Update v_customer_timeline
DROP VIEW IF EXISTS public.v_customer_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_customer_timeline WITH (security_invoker = true) AS

-- Interactions
SELECT 
    party_id::uuid AS party_id,
    'Interaction'::text AS event_type,
    created_at::timestamptz AS event_date,
    channel::text AS title,
    (outcome || COALESCE(': ' || note, ''))::text AS description,
    id::text AS source_id,
    false::boolean AS is_tally
FROM public.interactions

UNION ALL

-- Follow-ups
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
    r.party_id,
    'Requirement Logged' AS event_type,
    r.created_at AS event_date,
    COALESCE(ri.product_name, r.product_type) AS title,
    'Qty: ' || COALESCE(ri.quantity, r.quantity)::text || ' ' || COALESCE(ri.unit, r.unit) || 
    CASE 
        WHEN COALESCE(ri.weight, 0) > 0 THEN 
            ' | Total: ' || (COALESCE(ri.quantity, r.quantity) * ri.weight)::text || ' kg'
        WHEN ri.product_name ~ '\((\d+)\s*kg\)' THEN 
            ' | Total: ' || (COALESCE(ri.quantity, r.quantity) * (substring(ri.product_name from '\((\d+)\s*kg\)')::numeric))::text || ' kg'
        ELSE ''
    END || ' | Status: ' || r.status AS description,
    r.id::text || COALESCE('-' || ri.id::text, '') AS source_id,
    false AS is_tally
FROM public.requirements r
LEFT JOIN public.requirement_items ri ON r.id = ri.requirement_id

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
    c.party_id,
    'Call' AS event_type,
    c.started_at AS event_date,
    CASE 
        WHEN c.direction = 'INCOMING' THEN 'Incoming call from Customer to Operator ' || COALESCE(u.display_name, 'Unknown')
        WHEN c.direction = 'OUTGOING' THEN 'Customer called by Operator ' || COALESCE(u.display_name, 'Unknown')
        WHEN c.direction = 'MISSED' THEN 'Missed call to/from Operator ' || COALESCE(u.display_name, 'Unknown')
        ELSE 'Call with ' || COALESCE(u.display_name, 'Unknown')
    END AS title,
    'Duration: ' || CASE WHEN c.duration_seconds > 0 THEN c.duration_seconds::text || 's' ELSE 'Unknown/Missed' END || ' | Number: ' || 
    CASE 
        WHEN public.is_admin() THEN c.normalized_phone
        ELSE CONCAT(SUBSTRING(c.normalized_phone, 1, 4), '*****', SUBSTRING(c.normalized_phone, length(c.normalized_phone) - 2, 3))
    END AS description,
    c.id::text AS source_id,
    false AS is_tally
FROM public.crm_call_events c
LEFT JOIN public.app_users u ON c.staff_id = u.id
WHERE c.party_id IS NOT NULL

UNION ALL

-- Tally Transactions
SELECT 
    crm_party_id AS party_id,
    'Tally Transaction' AS event_type,
    voucher_date::timestamptz AS event_date,
    voucher_type || COALESCE(' #' || voucher_no, '') AS title,
    CASE WHEN is_credit THEN 'Cr. ₹' ELSE 'Dr. ₹' END || amount::text AS description,
    id::text AS source_id,
    true AS is_tally
FROM public.tally_transactions;

GRANT SELECT ON public.v_customer_timeline TO authenticated;
GRANT SELECT ON public.v_customer_timeline TO anon;


-- 2. Update v_field_staff_activity_timeline
DROP VIEW IF EXISTS public.v_field_staff_activity_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_field_staff_activity_timeline WITH (security_invoker = true) AS

-- VISITS
SELECT 
    v.staff_id::uuid AS staff_id,
    v.party_id::uuid AS party_id,
    c.display_name::text AS party_name,
    'Visit'::text AS activity_type,
    v.started_at::timestamptz AS activity_time,
    ('Visit (' || COALESCE(v.status, 'COMPLETED') || ')')::text AS title,
    COALESCE(v.notes, '')::text AS description,
    v.id::text AS source_id,
    'crm_visits'::text AS source_table
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
    COALESCE(ri.product_name, r.product_type) AS title,
    'Qty: ' || COALESCE(ri.quantity, r.quantity)::text || ' ' || COALESCE(ri.unit, r.unit) || 
    CASE 
        WHEN COALESCE(ri.weight, 0) > 0 THEN 
            ' | Total: ' || (COALESCE(ri.quantity, r.quantity) * ri.weight)::text || ' kg'
        WHEN ri.product_name ~ '\((\d+)\s*kg\)' THEN 
            ' | Total: ' || (COALESCE(ri.quantity, r.quantity) * (substring(ri.product_name from '\((\d+)\s*kg\)')::numeric))::text || ' kg'
        ELSE ''
    END || COALESCE(' | Notes: ' || NULLIF(r.notes, ''), '') AS description,
    r.id::text || COALESCE('-' || ri.id::text, '') AS source_id,
    'requirements' AS source_table
FROM public.requirements r
LEFT JOIN public.requirement_items ri ON r.id = ri.requirement_id
LEFT JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.assigned_to IS NOT NULL

UNION ALL

-- FOLLOW-UPS
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
    c.staff_id,
    c.party_id,
    p.display_name AS party_name,
    'Call' AS activity_type,
    c.started_at AS activity_time,
    CASE 
        WHEN c.direction = 'INCOMING' THEN 'Incoming call from Customer to Operator ' || COALESCE(u.display_name, 'Unknown')
        WHEN c.direction = 'OUTGOING' THEN 'Customer called by Operator ' || COALESCE(u.display_name, 'Unknown')
        WHEN c.direction = 'MISSED' THEN 'Missed call to/from Operator ' || COALESCE(u.display_name, 'Unknown')
        ELSE 'Call with ' || COALESCE(u.display_name, 'Unknown')
    END AS title,
    'Duration: ' || CASE WHEN c.duration_seconds > 0 THEN c.duration_seconds::text || 's' ELSE 'Unknown/Missed' END || ' | Number: ' || 
    CASE 
        WHEN public.is_admin() THEN c.normalized_phone
        ELSE CONCAT(SUBSTRING(c.normalized_phone, 1, 4), '*****', SUBSTRING(c.normalized_phone, length(c.normalized_phone) - 2, 3))
    END AS description,
    c.id::text AS source_id,
    'crm_call_events' AS source_table
FROM public.crm_call_events c
LEFT JOIN public.app_users u ON c.staff_id = u.id
LEFT JOIN public.crm_parties p ON c.party_id = p.id
WHERE c.staff_id IS NOT NULL AND c.party_id IS NOT NULL;

GRANT SELECT ON public.v_field_staff_activity_timeline TO authenticated;
GRANT SELECT ON public.v_field_staff_activity_timeline TO anon;
