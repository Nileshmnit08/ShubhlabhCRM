-- MICRO-SPRINT 13.4: PURCHASE GAP INTELLIGENCE
-- Refine purchase behaviour to isolate insufficient history (Onboarding Gap) from established interrupted patterns.

DROP VIEW IF EXISTS public.v_customer_opportunities CASCADE;
DROP VIEW IF EXISTS public.v_purchase_behaviour CASCADE;

-- 1. Extend Purchase Behaviour View
CREATE OR REPLACE VIEW public.v_purchase_behaviour WITH (security_invoker = true) AS
WITH purchase_stats AS (
    SELECT 
        crm_party_id,
        MIN(voucher_date) as first_purchase_date,
        MAX(voucher_date) as last_purchase_date,
        COUNT(id) as total_purchases,
        SUM(amount) as total_purchase_value,
        (MAX(voucher_date) - MIN(voucher_date)) as days_between_first_last
    FROM public.tally_transactions
    WHERE is_credit = false 
    GROUP BY crm_party_id
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    ps.first_purchase_date,
    ps.last_purchase_date,
    COALESCE(ps.total_purchases, 0) AS total_purchases,
    COALESCE(ps.total_purchase_value, 0) AS total_purchase_value,
    
    CASE 
        WHEN ps.total_purchases IS NULL OR ps.total_purchases = 0 THEN 'No Purchase History'
        WHEN ps.total_purchases = 1 THEN 'Single Purchase'
        ELSE 'Repeat Buyer'
    END AS purchase_frequency_category,
    
    CASE 
        WHEN ps.total_purchases > 1 AND ps.days_between_first_last > 0 THEN 
            ROUND(ps.days_between_first_last::numeric / (ps.total_purchases - 1), 0)
        ELSE NULL
    END AS avg_days_between_purchases,
    
    -- Established Baseline Gap Rule (Requires > 1 purchase)
    CASE 
        WHEN ps.total_purchases > 1 
             AND ps.days_between_first_last > 0 
             AND (CURRENT_DATE - ps.last_purchase_date) > (ps.days_between_first_last / (ps.total_purchases - 1)) * 1.5 
             THEN true 
        ELSE false 
    END AS is_interrupted_pattern,
    
    -- Insufficient History Rule (Exactly 1 purchase, dropped off after 30 days)
    CASE 
        WHEN ps.total_purchases = 1 
             AND (CURRENT_DATE - ps.last_purchase_date) > 30 
             THEN true 
        ELSE false 
    END AS is_onboarding_gap,
    
    CASE 
        WHEN ps.last_purchase_date IS NOT NULL THEN 
            CONCAT('History spans ', COALESCE(ps.days_between_first_last, 0), ' days. Last purchase ', (CURRENT_DATE - ps.last_purchase_date), ' days ago.')
        ELSE 'No Tally voucher data available.'
    END AS data_freshness_evidence

FROM public.crm_parties c
LEFT JOIN purchase_stats ps ON c.id = ps.crm_party_id;

GRANT SELECT ON public.v_purchase_behaviour TO authenticated;
GRANT SELECT ON public.v_purchase_behaviour TO anon;


-- 2. Extend Opportunities View
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
);

GRANT SELECT ON public.v_customer_opportunities TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO anon;
