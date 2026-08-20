-- MICRO-SPRINT 13.6: REQUIREMENT -> SALES OPPORTUNITY
-- Connect captured feed-grade requirements to actionable commercial follow-up.

DROP VIEW IF EXISTS public.v_customer_opportunities CASCADE;
DROP VIEW IF EXISTS public.v_requirement_demand_summary CASCADE;
DROP VIEW IF EXISTS public.v_requirement_demand_details CASCADE;

-- 1. Detailed Demand View (Now with Latest Action context)
CREATE OR REPLACE VIEW public.v_requirement_demand_details WITH (security_invoker = true) AS
WITH latest_interactions AS (
    SELECT party_id, created_at, note, ROW_NUMBER() OVER(PARTITION BY party_id ORDER BY created_at DESC) as rn
    FROM public.interactions
)
SELECT 
    r.id AS requirement_id,
    r.party_id,
    c.display_name AS customer_name,
    c.crm_status,
    COALESCE(NULLIF(TRIM(r.product_type), ''), 'Uncategorized') AS standardized_product_type,
    r.quantity,
    r.status,
    r.expected_date,
    r.created_at,
    CURRENT_DATE - r.created_at::DATE AS age_in_days,
    CASE 
        WHEN (CURRENT_DATE - r.created_at::DATE) <= 15 THEN 'Fresh (0-15 days)'
        WHEN (CURRENT_DATE - r.created_at::DATE) <= 30 THEN 'Aging (16-30 days)'
        ELSE 'Stale (>30 days)'
    END AS age_category,
    li.created_at AS latest_interaction_date,
    li.note AS latest_interaction_note
FROM public.requirements r
LEFT JOIN public.crm_parties c ON r.party_id = c.id
LEFT JOIN latest_interactions li ON r.party_id = li.party_id AND li.rn = 1
WHERE r.status = 'Open';


-- 2. Aggregated Demand Summary View (Restored unchanged)
CREATE OR REPLACE VIEW public.v_requirement_demand_summary WITH (security_invoker = true) AS
SELECT 
    standardized_product_type,
    COUNT(requirement_id) AS total_open_requirements,
    COUNT(DISTINCT party_id) AS unique_customers,
    SUM(quantity) AS total_open_quantity,
    MIN(age_in_days) AS freshest_requirement_days,
    MAX(age_in_days) AS oldest_requirement_days,
    ROUND(AVG(age_in_days), 1) AS average_age_days,
    CASE WHEN COUNT(DISTINCT party_id) > 1 THEN true ELSE false END AS is_repeated_demand
FROM public.v_requirement_demand_details
GROUP BY standardized_product_type;


-- 3. Refine Opportunities View
CREATE OR REPLACE VIEW public.v_customer_opportunities WITH (security_invoker = true) AS
-- 1. Open Requirement Opportunities (Now with Dynamic Actions)
SELECT 
    req_det.party_id,
    crm_pty.display_name,
    crm_pty.assigned_owner_id,
    'Open Requirement' AS opportunity_type,
    CONCAT('Demand for ', req_det.quantity, ' of ', req_det.standardized_product_type, ' (', req_det.age_category, ').', 
           COALESCE(' Latest action: ' || req_det.latest_interaction_date::DATE || ' - ' || LEFT(req_det.latest_interaction_note, 50), ' No recent actions logged.')) AS evidence,
    CASE 
        WHEN req_det.age_category = 'Fresh (0-15 days)' THEN 'Send initial quote / Follow-up on pricing'
        WHEN req_det.age_category = 'Aging (16-30 days)' THEN 'Negotiate terms / Assess competitor pricing'
        ELSE 'Final attempt to close or mark as Lost'
    END AS recommended_action,
    1 AS priority_sort
FROM public.v_requirement_demand_details req_det
JOIN public.crm_parties crm_pty ON req_det.party_id = crm_pty.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = req_det.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Open Requirement) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = req_det.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Open Requirement%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 2. Reactivation Opportunities
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
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = react_int.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Reactivation) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = react_int.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Reactivation%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 3. Interrupted Purchase Pattern (Purchase Gap)
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
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = purch_beh.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Purchase Gap) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = purch_beh.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Purchase Gap%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 4. Recent Engagement (Active contact but no open requirement)
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
  AND req_det.party_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = act_int.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Recent Engagement) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = act_int.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Recent Engagement%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 5. High-Potential Dormant Customer (Pending Review, repeat buyer)
SELECT 
    dorm_cand.party_id,
    dorm_cand.display_name,
    dorm_cand.assigned_owner_id,
    'Dormant Opportunity' AS opportunity_type,
    CONCAT('Inactive for ', dorm_cand.days_inactive, ' days. High potential: ', dorm_cand.qualifying_tx_count, ' historical purchases.') AS evidence,
    'Review for Reactivation or Call Customer' AS recommended_action,
    5 AS priority_sort
FROM public.v_dormant_candidates dorm_cand
WHERE dorm_cand.review_state = 'PENDING'
  AND dorm_cand.qualifying_tx_count >= 2
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = dorm_cand.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Dormant Opportunity) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = dorm_cand.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Dormant Opportunity%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 6. Onboarding Gap (Insufficient History - 1 purchase only, dropped off)
SELECT 
    purch_beh.party_id,
    purch_beh.display_name,
    purch_beh.assigned_owner_id,
    'Onboarding Gap' AS opportunity_type,
    CONCAT('Single purchase made ', (CURRENT_DATE - purch_beh.last_purchase_date), ' days ago. Insufficient history for baseline.') AS evidence,
    'Follow-up to secure repeat business / onboarding' AS recommended_action,
    6 AS priority_sort
FROM public.v_purchase_behaviour purch_beh
WHERE purch_beh.is_onboarding_gap = true
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = purch_beh.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Onboarding Gap) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = purch_beh.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Onboarding Gap%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
)

UNION ALL

-- 7. Cross-Sell Opportunity (Active Requirement + Historical Categories)
SELECT 
    req_det.party_id,
    crm_pty.display_name,
    crm_pty.assigned_owner_id,
    'Cross-Sell Opportunity' AS opportunity_type,
    CONCAT('Active demand for ', req_det.standardized_product_type, '. Historical purchases include: ', hist_cat.category_list, '. Ask to restock.') AS evidence,
    'Cross-sell historical categories on current quote' AS recommended_action,
    7 AS priority_sort
FROM public.v_requirement_demand_details req_det
JOIN public.crm_parties crm_pty ON req_det.party_id = crm_pty.id
JOIN public.v_customer_historical_categories hist_cat ON req_det.party_id = hist_cat.crm_party_id
WHERE hist_cat.distinct_categories > 0
AND NOT EXISTS (
    SELECT 1 FROM public.follow_ups f 
    WHERE f.party_id = req_det.party_id AND f.status = 'Pending' AND f.notes LIKE 'Opportunity (Cross-Sell Opportunity) Accepted%'
) AND NOT EXISTS (
    SELECT 1 FROM public.interactions i 
    WHERE i.party_id = req_det.party_id AND i.interaction_type = 'Opportunity Dismissed' AND i.note LIKE 'Opportunity: Cross-Sell Opportunity%' AND i.created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
);

GRANT SELECT ON public.v_requirement_demand_details TO authenticated;
GRANT SELECT ON public.v_requirement_demand_summary TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO authenticated;

GRANT SELECT ON public.v_requirement_demand_details TO anon;
GRANT SELECT ON public.v_requirement_demand_summary TO anon;
GRANT SELECT ON public.v_customer_opportunities TO anon;
