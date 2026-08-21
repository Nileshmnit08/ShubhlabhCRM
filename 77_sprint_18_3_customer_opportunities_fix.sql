-- MICRO-SPRINT 18.3 & 18.4: REPEAT-BUY PLANNING & DEALER REPLENISHMENT
-- Safely replaces v_customer_opportunities preserving all dealer and deduplication logic from Sprint 17.5.

CREATE OR REPLACE VIEW public.v_customer_opportunities WITH (security_invoker = true) AS
-- 1. Open Requirement / Dealer Opportunities
SELECT 
    req_det.party_id,
    crm_pty.display_name,
    crm_pty.assigned_owner_id,
    CASE 
        WHEN crm_pty.relationship_type = 'Dealer' THEN COALESCE(req_det.intent_type::VARCHAR, 'Dealer Opportunity'::VARCHAR)
        ELSE 'Open Requirement'::VARCHAR 
    END AS opportunity_type,
    CONCAT(
        CASE WHEN crm_pty.relationship_type = 'Dealer' THEN 'Dealer Intent: ' ELSE 'Demand for ' END,
        req_det.quantity, ' ', COALESCE(req_det.unit, 'units'), ' of ', req_det.standardized_product_type, 
        CASE WHEN req_det.expected_rate IS NOT NULL THEN CONCAT(' @ ₹', req_det.expected_rate) ELSE '' END,
        ' (', req_det.age_category, ').', 
        COALESCE(' Latest action: ' || req_det.latest_interaction_date::DATE || ' - ' || LEFT(req_det.latest_interaction_note, 50), ' No recent actions logged.'),
        CASE 
            WHEN crm_pty.relationship_type = 'Dealer' AND (
                SELECT MAX(t.voucher_date) FROM public.tally_transactions t 
                WHERE t.crm_party_id = req_det.party_id AND t.voucher_type = 'Sales' AND t.is_credit = false AND t.voucher_date >= req_det.created_at::DATE
            ) IS NOT NULL 
            THEN CONCAT('. Tally Verified: Sales Voucher recorded on ', (
                SELECT MAX(t.voucher_date) FROM public.tally_transactions t 
                WHERE t.crm_party_id = req_det.party_id AND t.voucher_type = 'Sales' AND t.is_credit = false AND t.voucher_date >= req_det.created_at::DATE
            ))
            ELSE ''
        END
    )::TEXT AS evidence,
    CASE 
        WHEN crm_pty.relationship_type = 'Dealer' AND req_det.intent_type = 'Quotation Requested' THEN 'Prepare and send quotation / Estimate'
        WHEN crm_pty.relationship_type = 'Dealer' AND req_det.intent_type = 'Order Intention' THEN 'Verify Tally for PO / Follow up on dispatch'
        WHEN crm_pty.relationship_type = 'Dealer' AND req_det.intent_type = 'Price Discussion' THEN 'Negotiate pricing and margins'
        WHEN req_det.age_category = 'Fresh (0-15 days)' THEN 'Send initial quote / Follow-up on pricing'
        WHEN req_det.age_category = 'Aging (16-30 days)' THEN 'Negotiate terms / Assess competitor pricing'
        ELSE 'Final attempt to close or mark as Lost'
    END::TEXT AS recommended_action,
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
    'Reactivation'::VARCHAR AS opportunity_type,
    CONCAT('Approved for reactivation on ', react_int.approved_at::DATE, '. Task: ', COALESCE(react_int.task_status, 'None'))::TEXT AS evidence,
    'Execute reactivation workflow/call'::TEXT AS recommended_action,
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

-- 3. Interrupted Purchase Pattern (Purchase Gap / Dealer Replenishment)
SELECT 
    purch_beh.party_id,
    purch_beh.display_name,
    purch_beh.assigned_owner_id,
    CASE WHEN crm_pty.relationship_type = 'Dealer' THEN 'Dealer Replenishment'::VARCHAR ELSE 'Purchase Gap'::VARCHAR END AS opportunity_type,
    CONCAT('Avg purchase gap is ', purch_beh.avg_days_between_purchases, ' days, but last purchase was ', (CURRENT_DATE - purch_beh.last_purchase_date), ' days ago.')::TEXT AS evidence,
    CASE WHEN crm_pty.relationship_type = 'Dealer' THEN 'Check dealer market demand / Schedule replenishment'::TEXT ELSE 'Check inventory levels / Call to restock'::TEXT END AS recommended_action,
    3 AS priority_sort
FROM public.v_purchase_behaviour purch_beh
JOIN public.crm_parties crm_pty ON purch_beh.party_id = crm_pty.id
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
    'Recent Engagement'::VARCHAR AS opportunity_type,
    CONCAT('Last contact was ', act_int.days_since_last_interaction, ' days ago. (', act_int.interaction_window_category, ')')::TEXT AS evidence,
    'Convert engagement into a requirement/sale'::TEXT AS recommended_action,
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
    'Dormant Opportunity'::VARCHAR AS opportunity_type,
    CONCAT('Inactive for ', dorm_cand.days_inactive, ' days. High potential: ', dorm_cand.qualifying_tx_count, ' historical purchases.')::TEXT AS evidence,
    'Review for Reactivation or Call Customer'::TEXT AS recommended_action,
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
    'Onboarding Gap'::VARCHAR AS opportunity_type,
    CONCAT('Single purchase made ', (CURRENT_DATE - purch_beh.last_purchase_date), ' days ago. Insufficient history for baseline.')::TEXT AS evidence,
    'Follow-up to secure repeat business / onboarding'::TEXT AS recommended_action,
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
    'Cross-Sell Opportunity'::VARCHAR AS opportunity_type,
    CONCAT('Active demand for ', req_det.standardized_product_type, '. Historical purchases include: ', hist_cat.category_list, '. Ask to restock.')::TEXT AS evidence,
    'Cross-sell historical categories on current quote'::TEXT AS recommended_action,
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
)

UNION ALL

-- 8. First-Time Buyer Check-in (Insufficient History, 18.3 addition)
SELECT 
    purch_beh.party_id,
    purch_beh.display_name,
    purch_beh.assigned_owner_id,
    'First-Time Buyer'::VARCHAR AS opportunity_type,
    CONCAT('Single purchase made on ', purch_beh.last_purchase_date, ' (', (CURRENT_DATE - purch_beh.last_purchase_date), ' days ago). No repeat pattern established.')::TEXT AS evidence,
    'Check satisfaction / Convert to repeat buyer'::TEXT AS recommended_action,
    8 AS priority_sort
FROM public.v_purchase_behaviour purch_beh
JOIN public.crm_parties crm_pty ON purch_beh.party_id = crm_pty.id
WHERE purch_beh.purchase_frequency_category = 'Single Purchase' 
  AND (CURRENT_DATE - purch_beh.last_purchase_date) > 15
  AND purch_beh.is_onboarding_gap = false;

GRANT SELECT ON public.v_customer_opportunities TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO anon;
