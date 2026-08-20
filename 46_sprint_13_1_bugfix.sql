-- SPRINT 13.1 BUGFIX: Resolve PostgreSQL CTE Alias Scope Issue (relation 'a' does not exist)
-- This migration safely drops the corrupted views and recreates them using explicit, non-conflicting aliases.

DROP VIEW IF EXISTS public.v_customer_opportunities CASCADE;
DROP VIEW IF EXISTS public.v_customer_risk CASCADE;
DROP VIEW IF EXISTS public.v_activity_intelligence CASCADE;

-- 1. Recreate v_activity_intelligence with explicit aliases (no 'a')
CREATE OR REPLACE VIEW public.v_activity_intelligence WITH (security_invoker = true) AS
WITH activity_stats AS (
    SELECT 
        party_id,
        MAX(created_at) as last_interaction_date,
        COUNT(*) as total_interactions
    FROM public.interactions
    GROUP BY party_id
),
follow_up_stats AS (
    SELECT 
        party_id,
        COUNT(CASE WHEN status = 'Pending' AND due_at < CURRENT_DATE THEN 1 END) as overdue_follow_ups
    FROM public.follow_ups
    GROUP BY party_id
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    act_stats.last_interaction_date,
    CURRENT_DATE - (act_stats.last_interaction_date AT TIME ZONE 'UTC')::DATE AS days_since_last_interaction,
    CASE 
        WHEN act_stats.last_interaction_date IS NULL THEN 'No Contact History'
        WHEN (CURRENT_DATE - (act_stats.last_interaction_date AT TIME ZONE 'UTC')::DATE) <= 30 THEN 'Active (0-30 days)'
        WHEN (CURRENT_DATE - (act_stats.last_interaction_date AT TIME ZONE 'UTC')::DATE) <= 90 THEN 'Slipping (31-90 days)'
        ELSE 'Neglected (>90 days)'
    END AS interaction_window_category,
    
    f.last_order_date AS last_purchase_date,
    CURRENT_DATE - f.last_order_date AS days_since_last_purchase,
    CASE 
        WHEN f.last_order_date IS NULL THEN 'No Purchase History'
        WHEN (CURRENT_DATE - f.last_order_date) <= 90 THEN 'Recent Buyer (0-90 days)'
        WHEN (CURRENT_DATE - f.last_order_date) <= 180 THEN 'Cooling (91-180 days)'
        ELSE 'Dormant Buyer (>180 days)'
    END AS purchase_window_category,
    
    COALESCE(fu_stats.overdue_follow_ups, 0) AS total_overdue_follow_ups,
    CASE WHEN COALESCE(fu_stats.overdue_follow_ups, 0) >= 2 THEN true ELSE false END AS has_repeated_overdue,
    
    -- Construct evidence string
    CONCAT_WS(' | ', 
        CASE 
            WHEN act_stats.last_interaction_date IS NULL THEN 'Never contacted'
            ELSE 'Last contact ' || (CURRENT_DATE - (act_stats.last_interaction_date AT TIME ZONE 'UTC')::DATE) || ' days ago'
        END,
        CASE 
            WHEN f.last_order_date IS NULL THEN 'Never purchased'
            ELSE 'Last purchase ' || (CURRENT_DATE - f.last_order_date) || ' days ago'
        END,
        CASE 
            WHEN COALESCE(fu_stats.overdue_follow_ups, 0) > 0 THEN COALESCE(fu_stats.overdue_follow_ups, 0) || ' overdue follow-ups'
            ELSE NULL
        END
    ) AS evidence_summary

FROM public.crm_parties c
LEFT JOIN activity_stats act_stats ON c.id = act_stats.party_id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN follow_up_stats fu_stats ON c.id = fu_stats.party_id;

GRANT SELECT ON public.v_activity_intelligence TO authenticated;
GRANT SELECT ON public.v_activity_intelligence TO anon;


-- 2. Recreate v_customer_risk with explicit aliases
CREATE OR REPLACE VIEW public.v_customer_risk WITH (security_invoker = true) AS
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    act_int.interaction_window_category,
    act_int.total_overdue_follow_ups,
    COALESCE(p.is_interrupted_pattern, false) AS is_interrupted_pattern,
    p.purchase_frequency_category,
    
    -- Risk Classification Rules V1.0
    CASE 
        WHEN act_int.total_overdue_follow_ups >= 2 THEN 'High Risk'
        WHEN COALESCE(p.is_interrupted_pattern, false) = true AND act_int.interaction_window_category IN ('Neglected (>90 days)', 'No Contact History') THEN 'High Risk'
        WHEN act_int.total_overdue_follow_ups = 1 THEN 'At Risk'
        WHEN COALESCE(p.is_interrupted_pattern, false) = true THEN 'At Risk'
        WHEN act_int.interaction_window_category = 'Slipping (31-90 days)' AND p.purchase_frequency_category != 'No Purchase History' THEN 'At Risk'
        WHEN act_int.interaction_window_category = 'Active (0-30 days)' AND COALESCE(p.is_interrupted_pattern, false) = false THEN 'Low Risk'
        ELSE 'Unknown'
    END AS risk_level,
    
    COALESCE(
        NULLIF(
            CONCAT_WS(' | ',
                CASE WHEN act_int.total_overdue_follow_ups > 0 THEN act_int.total_overdue_follow_ups || ' overdue follow-ups' ELSE NULL END,
                CASE WHEN COALESCE(p.is_interrupted_pattern, false) = true THEN 'Purchase pattern interrupted' ELSE NULL END,
                CASE WHEN act_int.interaction_window_category IN ('Slipping (31-90 days)', 'Neglected (>90 days)') THEN 'Contact ' || act_int.interaction_window_category ELSE NULL END
            ), 
        ''), 
    'No explicit risk factors identified') AS risk_evidence

FROM public.crm_parties c
LEFT JOIN public.v_activity_intelligence act_int ON c.id = act_int.party_id
LEFT JOIN public.v_purchase_behaviour p ON c.id = p.party_id;

GRANT SELECT ON public.v_customer_risk TO authenticated;
GRANT SELECT ON public.v_customer_risk TO anon;


-- 3. Recreate v_customer_opportunities with explicit aliases
CREATE OR REPLACE VIEW public.v_customer_opportunities WITH (security_invoker = true) AS
SELECT 
    req_det.party_id,
    crm_pty.display_name,
    crm_pty.assigned_owner_id,
    'Open Requirement' AS opportunity_type,
    CONCAT('Demand for ', req_det.quantity, ' of ', req_det.standardized_product_type, ' (', req_det.age_category, ')') AS evidence,
    'Fulfill requirement or follow-up on quote' AS recommended_action,
    1 AS priority_sort
FROM public.v_requirement_demand_details req_det
JOIN public.crm_parties crm_pty ON req_det.party_id = crm_pty.id

UNION ALL

SELECT 
    react_int.party_id,
    react_int.display_name,
    crm_pty.assigned_owner_id,
    'Reactivation' AS opportunity_type,
    CONCAT('Approved for reactivation on ', react_int.approved_at::DATE, '. Task: ', COALESCE(react_int.task_status, 'None')) AS evidence,
    'Execute reactivation workflow/call' AS recommended_action,
    2 AS priority_sort
FROM public.v_reactivation_intelligence react_int
JOIN public.crm_parties crm_pty ON react_int.party_id = crm_pty.id
WHERE react_int.is_approved = true AND react_int.is_reactivated = false

UNION ALL

SELECT 
    purch_beh.party_id,
    purch_beh.display_name,
    purch_beh.assigned_owner_id,
    'Purchase Gap' AS opportunity_type,
    CONCAT('Avg purchase gap is ', purch_beh.avg_days_between_purchases, ' days, but last purchase was ', (CURRENT_DATE - purch_beh.last_purchase_date), ' days ago.') AS evidence,
    'Check inventory levels / Call to restock' AS recommended_action,
    3 AS priority_sort
FROM public.v_purchase_behaviour purch_beh
WHERE purch_beh.is_interrupted_pattern = true

UNION ALL

SELECT 
    act_int.party_id,
    act_int.display_name,
    act_int.assigned_owner_id,
    'Recent Engagement' AS opportunity_type,
    CONCAT('Last contact was ', act_int.days_since_last_interaction, ' days ago. (', act_int.interaction_window_category, ')') AS evidence,
    'Convert engagement into a requirement/sale' AS recommended_action,
    4 AS priority_sort
FROM public.v_activity_intelligence act_int
LEFT JOIN public.v_requirement_demand_details req_det ON act_int.party_id = req_det.party_id
WHERE act_int.interaction_window_category = 'Active (0-30 days)' 
  AND req_det.party_id IS NULL;

GRANT SELECT ON public.v_customer_opportunities TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO anon;
