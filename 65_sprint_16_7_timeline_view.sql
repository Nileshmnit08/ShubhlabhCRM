-- MICRO-SPRINT 16.7: CUSTOMER TIMELINE INTELLIGENCE

DROP VIEW IF EXISTS public.v_customer_timeline CASCADE;
CREATE OR REPLACE VIEW public.v_customer_timeline WITH (security_invoker = true) AS

-- 1. Interactions
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

-- 2. Follow-ups (Tasks completed)
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

-- 3. Requirements Created
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

-- 4. Service Issues
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

-- 5. Tally Transactions
SELECT 
    crm_party_id AS party_id,
    'Tally Transaction' AS event_type,
    voucher_date AS event_date,
    voucher_type || COALESCE(' #' || voucher_no, '') AS title,
    CASE WHEN is_credit THEN 'Cr. ₹' ELSE 'Dr. ₹' END || amount::text AS description,
    id::text AS source_id,
    true AS is_tally
FROM public.tally_transactions;

-- Note: We rely on the frontend or backend API query to ORDER BY event_date DESC
-- and filter by party_id.
