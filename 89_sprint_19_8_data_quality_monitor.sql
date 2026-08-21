-- MICRO-SPRINT 19.8: CRM DATA QUALITY MONITOR
-- Augments the Data Quality view with explicit checks designed to protect the Automation Engine.

DROP VIEW IF EXISTS public.v_data_quality_issues CASCADE;
CREATE VIEW public.v_data_quality_issues WITH (security_invoker = true) AS

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

-- 2. Unassigned Active/Dormant Accounts (High Priority - Blocks Targeted Alerts)
SELECT 
    'Unassigned Account' AS issue_type,
    id AS party_id,
    display_name AS entity_name,
    'Account has no assigned owner' AS description,
    'High' AS severity,
    created_at,
    'CRM Party' AS entity_type
FROM public.crm_parties
WHERE crm_status IN ('Active', 'Dormant')
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

UNION ALL

-- 5. Duplicate / Overlapping Open Signals (High Priority)
SELECT 
    'Duplicate Signal' AS issue_type,
    r1.party_id,
    c.display_name AS entity_name,
    'Multiple open requirements for same product: ' || COALESCE(r1.product_type, 'Unknown') AS description,
    'High' AS severity,
    r1.created_at,
    'Requirement' AS entity_type
FROM public.requirements r1
JOIN public.requirements r2 ON r1.party_id = r2.party_id 
    AND r1.product_type = r2.product_type 
    AND r1.id != r2.id
JOIN public.crm_parties c ON r1.party_id = c.id
WHERE r1.status NOT IN ('Closed', 'Lost') 
  AND r2.status NOT IN ('Closed', 'Lost')
  AND r1.id > r2.id

UNION ALL

-- 6. Stale Open Signals (Medium Priority)
SELECT 
    'Stale Signal' AS issue_type,
    r.party_id,
    c.display_name AS entity_name,
    'Open Requirement > 90 days old: ' || COALESCE(r.product_type, 'Unknown') AS description,
    'Medium' AS severity,
    r.created_at,
    'Requirement' AS entity_type
FROM public.requirements r
JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.status NOT IN ('Closed', 'Lost', 'Confirmed') 
  AND r.created_at < (CURRENT_DATE - INTERVAL '90 days')

UNION ALL

-- 7. Orphaned Actions (High Priority)
SELECT 
    'Orphaned Action' AS issue_type,
    f.party_id,
    'Unknown Party'::VARCHAR(255) AS entity_name,
    'Action assigned to missing party record' AS description,
    'High' AS severity,
    f.created_at,
    'Follow-up' AS entity_type
FROM public.follow_ups f
LEFT JOIN public.crm_parties c ON f.party_id = c.id
WHERE c.id IS NULL AND f.party_id IS NOT NULL

UNION ALL

-- 8. Broken Signal Links (High Priority)
SELECT 
    'Broken Evidence Link' AS issue_type,
    r.party_id,
    c.display_name AS entity_name,
    'Linked signal source not found: ' || rs.signal_type AS description,
    'High' AS severity,
    rs.created_at,
    'Requirement Signal' AS entity_type
FROM public.requirement_signals rs
JOIN public.requirements r ON rs.requirement_id = r.id
JOIN public.crm_parties c ON r.party_id = c.id
WHERE rs.signal_type = 'Tally Transaction' 
  AND NOT EXISTS (SELECT 1 FROM public.tally_transactions t WHERE t.id::text = rs.signal_source_id)

UNION ALL

-- 9. Missing Product / Context in Requirement (Medium Priority)
SELECT 
    'Missing Context' AS issue_type,
    r.party_id,
    c.display_name AS entity_name,
    'Requirement missing product type or quantity' AS description,
    'Medium' AS severity,
    r.created_at,
    'Requirement' AS entity_type
FROM public.requirements r
JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.status NOT IN ('Closed', 'Lost')
  AND (r.product_type IS NULL OR r.product_type = '' OR r.quantity IS NULL OR r.quantity <= 0)

UNION ALL

-- 10. Duplicate Active Follow-ups (Medium Priority) [Sprint 19.8]
SELECT 
    'Duplicate Action' AS issue_type,
    f.party_id,
    'Multiple Pending'::VARCHAR(255) AS entity_name,
    'Multiple pending follow-ups for same reason: ' || f.reason AS description,
    'Medium' AS severity,
    MIN(f.created_at) AS created_at,
    'Follow-up' AS entity_type
FROM public.follow_ups f
WHERE f.status = 'Pending'
GROUP BY f.party_id, f.reason
HAVING COUNT(*) > 1

UNION ALL

-- 11. Invalid Product Links (Low Priority) [Sprint 19.8]
SELECT 
    'Invalid Product' AS issue_type,
    r.party_id,
    'Unknown Product: ' || r.product_type AS entity_name,
    'Product type in requirement does not match catalog' AS description,
    'Low' AS severity,
    r.created_at,
    'Requirement' AS entity_type
FROM public.requirements r
WHERE r.status NOT IN ('Closed', 'Lost')
  AND r.product_type IS NOT NULL 
  AND r.product_type != ''
  AND NOT EXISTS (SELECT 1 FROM public.products p WHERE p.name = r.product_type)

UNION ALL

-- 12. Incomplete Dealer Link / Missing Territory (Medium Priority) [Sprint 19.8]
SELECT 
    'Unassigned Territory' AS issue_type,
    id AS party_id,
    display_name AS entity_name,
    'Active Dealer has no assigned territory' AS description,
    'High' AS severity,
    created_at,
    'CRM Party' AS entity_type
FROM public.crm_parties
WHERE relationship_type = 'Dealer' 
  AND crm_status = 'Active'
  AND territory_id IS NULL

ORDER BY severity ASC, created_at DESC;

-- Grant permissions
GRANT SELECT ON public.v_data_quality_issues TO authenticated;
GRANT SELECT ON public.v_data_quality_issues TO anon;
