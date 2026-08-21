-- MICRO-SPRINT 17.8: DISTRIBUTION GAP & COVERAGE INTELLIGENCE

CREATE OR REPLACE VIEW public.v_coverage_gaps WITH (security_invoker = true) AS
-- 1. Unassigned Territories
SELECT 
    'Unassigned Territory' AS gap_type,
    t.name AS entity_name,
    t.id AS entity_id,
    'Territory' AS entity_type,
    'No manager is assigned to this territory. ' || (SELECT COUNT(*) FROM crm_parties p WHERE p.territory_id = t.id) || ' dealers affected.' AS evidence
FROM public.crm_territories t
WHERE t.assigned_manager_id IS NULL AND t.status = 'Active'

UNION ALL

-- 2. Orphaned Dealers
SELECT
    'Orphaned Dealer' AS gap_type,
    p.display_name AS entity_name,
    p.id AS entity_id,
    'Dealer' AS entity_type,
    CASE 
        WHEN p.territory_id IS NULL AND p.assigned_owner_id IS NULL THEN 'No territory and no direct owner assigned.'
        WHEN p.territory_id IS NULL THEN 'No territory assigned.'
        ELSE 'No direct CRM owner assigned.'
    END AS evidence
FROM public.crm_parties p
WHERE p.relationship_type = 'Dealer' AND p.crm_status != 'Unknown' AND (p.territory_id IS NULL OR p.assigned_owner_id IS NULL)

UNION ALL

-- 3. Neglected Dealers with Active Intent
SELECT
    'Neglected Dealer (Active Intent)' AS gap_type,
    cm.display_name AS entity_name,
    cm.id AS entity_id,
    'Dealer' AS entity_type,
    'Has active commercial intent but no interaction in last 30 days and no scheduled tasks.' AS evidence
FROM public.v_customer_master cm
JOIN (
    SELECT party_id, COUNT(*) as open_reqs 
    FROM public.requirements 
    WHERE status NOT IN ('Closed', 'Lost', 'Confirmed') 
    GROUP BY party_id
) req ON req.party_id = cm.id
LEFT JOIN (
    SELECT party_id, MAX(created_at) as last_int 
    FROM public.interactions 
    GROUP BY party_id
) int_data ON int_data.party_id = cm.id
LEFT JOIN (
    SELECT party_id, COUNT(*) as pending_tasks 
    FROM public.follow_ups 
    WHERE status = 'Pending' 
    GROUP BY party_id
) fu_data ON fu_data.party_id = cm.id
WHERE cm.relationship_type = 'Dealer' 
  AND req.open_reqs > 0
  AND (int_data.last_int IS NULL OR int_data.last_int < NOW() - INTERVAL '30 days')
  AND (fu_data.pending_tasks IS NULL OR fu_data.pending_tasks = 0);

GRANT SELECT ON public.v_coverage_gaps TO authenticated;
