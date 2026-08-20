-- MICRO-SPRINT 13.5: CROSS-SELL OPPORTUNITY
-- Identify evidence-based additional product/category opportunities without opaque ML ranking.

-- 1. Create a view to aggregate historical purchase categories
CREATE OR REPLACE VIEW public.v_customer_historical_categories WITH (security_invoker = true) AS
SELECT 
    crm_party_id,
    COUNT(DISTINCT tally_ledger_name) AS distinct_categories,
    STRING_AGG(DISTINCT tally_ledger_name, ', ') AS category_list
FROM public.tally_transactions
WHERE is_credit = false
GROUP BY crm_party_id;

GRANT SELECT ON public.v_customer_historical_categories TO authenticated;
GRANT SELECT ON public.v_customer_historical_categories TO anon;


-- 2. Refine Opportunities View
DROP VIEW IF EXISTS public.v_customer_opportunities CASCADE;
CREATE OR REPLACE VIEW public.v_customer_opportunities WITH (security_invoker = true) AS
-- 1. Open Requirement Opportunities
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

GRANT SELECT ON public.v_customer_opportunities TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO anon;
