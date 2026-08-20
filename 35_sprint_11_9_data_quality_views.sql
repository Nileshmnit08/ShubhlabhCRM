-- MICRO-SPRINT 11.9: DATA QUALITY CONTROL
-- Create a view to centralize data quality issues for management reporting.

CREATE OR REPLACE VIEW public.v_data_quality_issues AS

-- 1. Missing Mobile Numbers (High Priority for Active/Dormant Customers)
SELECT 
    'Missing Contact Info' AS issue_type,
    id AS party_id,
    display_name AS entity_name,
    'Mobile number is missing' AS description,
    'High' AS severity,
    created_at,
    'CRM Party' AS entity_type
FROM public.crm_parties
WHERE (mobile IS NULL OR mobile = '') 
  AND crm_status IN ('Active', 'Dormant')

UNION ALL

-- 2. Unassigned Active Customers (High Priority)
SELECT 
    'Unassigned Account' AS issue_type,
    id AS party_id,
    display_name AS entity_name,
    'Active customer has no assigned owner' AS description,
    'High' AS severity,
    created_at,
    'CRM Party' AS entity_type
FROM public.crm_parties
WHERE crm_status = 'Active' 
  AND assigned_owner_id IS NULL

UNION ALL

-- 3. Stale Follow-ups (Medium Priority)
SELECT 
    'Stale Task' AS issue_type,
    f.party_id AS party_id,
    c.display_name AS entity_name,
    'Follow-up is over 14 days overdue: ' || f.reason AS description,
    'Medium' AS severity,
    f.created_at,
    'Follow-up' AS entity_type
FROM public.follow_ups f
LEFT JOIN public.crm_parties c ON f.party_id = c.id
WHERE f.status = 'Pending' 
  AND f.due_at < (CURRENT_DATE - INTERVAL '14 days')

UNION ALL

-- 4. Unresolved Tally Identities (Low Priority)
SELECT 
    'Unresolved Identity' AS issue_type,
    NULL::uuid AS party_id,
    t.tally_ledger_name AS entity_name,
    'Tally record pending review queue' AS description,
    'Low' AS severity,
    q.created_at,
    'Tally Record' AS entity_type
FROM public.identity_review_queue q
LEFT JOIN public.tally_raw_parties t ON q.tally_raw_party_id = t.id
WHERE q.status = 'Pending'

ORDER BY severity ASC, created_at DESC;

-- Grant permissions
GRANT SELECT ON public.v_data_quality_issues TO authenticated;
GRANT SELECT ON public.v_data_quality_issues TO anon;
