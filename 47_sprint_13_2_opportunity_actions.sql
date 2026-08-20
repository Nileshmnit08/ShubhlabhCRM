-- MICRO-SPRINT 13.2: NEXT BEST FOLLOW-UP
-- Recommend the next human action for an identified opportunity using simple approved rules.

-- 1. Create RPC function for salespeople to Accept or Dismiss opportunities
CREATE OR REPLACE FUNCTION public.rpc_process_opportunity_action(
    p_party_id UUID,
    p_opportunity_type VARCHAR,
    p_action VARCHAR, -- 'Accept' or 'Dismiss'
    p_follow_up_reason VARCHAR DEFAULT NULL,
    p_due_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_dismissal_note TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    v_user_id UUID := auth.uid();
BEGIN
    -- Verify input
    IF p_action NOT IN ('Accept', 'Dismiss') THEN
        RAISE EXCEPTION 'Invalid action. Must be Accept or Dismiss.';
    END IF;

    IF p_action = 'Accept' THEN
        -- Create a follow_up record
        IF p_follow_up_reason IS NULL OR p_due_at IS NULL THEN
            RAISE EXCEPTION 'Accepting an opportunity requires p_follow_up_reason and p_due_at.';
        END IF;
        
        INSERT INTO public.follow_ups (
            party_id, 
            reason, 
            follow_up_date,
            due_at, 
            priority, 
            status, 
            notes, 
            created_by, 
            assigned_to
        ) VALUES (
            p_party_id,
            p_follow_up_reason,
            (p_due_at AT TIME ZONE 'UTC')::DATE,
            p_due_at,
            'Normal',
            'Pending',
            'Opportunity (' || p_opportunity_type || ') Accepted',
            v_user_id,
            v_user_id
        );
        
    ELSIF p_action = 'Dismiss' THEN
        -- Log a dismissal interaction (Channel: Note)
        IF p_dismissal_note IS NULL THEN
            p_dismissal_note := 'Dismissed ' || p_opportunity_type || ' opportunity.';
        END IF;

        INSERT INTO public.interactions (
            party_id,
            user_id,
            channel,
            interaction_type,
            note,
            created_at
        ) VALUES (
            p_party_id,
            v_user_id,
            'Note',
            'Opportunity Dismissed',
            'Opportunity: ' || p_opportunity_type || ' | Reason: ' || p_dismissal_note,
            CURRENT_TIMESTAMP
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant permissions for RPC
GRANT EXECUTE ON FUNCTION public.rpc_process_opportunity_action TO authenticated;

-- 2. Update Opportunities view to hide accepted/dismissed items
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
);

GRANT SELECT ON public.v_customer_opportunities TO authenticated;
GRANT SELECT ON public.v_customer_opportunities TO anon;

