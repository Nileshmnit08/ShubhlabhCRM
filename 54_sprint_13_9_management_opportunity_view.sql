-- MICRO-SPRINT 13.9: MANAGEMENT OPPORTUNITY VIEW
-- Give management a compact view of opportunity volume, actions and outcomes.

-- 1. Create Drilldown View (Combines Unactioned and Actioned)
CREATE OR REPLACE VIEW public.v_management_opportunity_drilldown WITH (security_invoker = true) AS
-- Unactioned Opportunities
SELECT 
    party_id,
    display_name AS customer_name,
    assigned_owner_id,
    opportunity_type,
    'Unactioned' AS current_state,
    NULL::DATE AS due_date,
    evidence AS details
FROM public.v_customer_opportunities

UNION ALL

-- Actioned Opportunities (Accepted or Dismissed)
SELECT 
    t.party_id,
    t.customer_name,
    t.assigned_owner_id,
    t.opportunity_type,
    CASE 
        WHEN t.initial_action = 'Dismissed' THEN 'Dismissed'
        WHEN t.initial_action = 'Accepted' AND t.current_status = 'Pending' THEN 'Accepted - Pending'
        WHEN t.initial_action = 'Accepted' AND t.current_status = 'Completed' THEN 'Accepted - Completed'
        ELSE t.current_status
    END AS current_state,
    (SELECT due_at::DATE FROM public.follow_ups WHERE id = t.tracking_id) AS due_date,
    COALESCE(t.final_outcome, t.context) AS details
FROM public.v_opportunity_tracking t
WHERE t.opportunity_type IS NOT NULL;

GRANT SELECT ON public.v_management_opportunity_drilldown TO authenticated;
GRANT SELECT ON public.v_management_opportunity_drilldown TO anon;

-- 2. Create Summary View by Type
CREATE OR REPLACE VIEW public.v_management_opportunity_summary WITH (security_invoker = true) AS
SELECT 
    opportunity_type,
    COUNT(*) AS total_opportunities,
    COUNT(*) FILTER (WHERE current_state = 'Unactioned') AS unactioned_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Pending') AS accepted_pending_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Pending' AND due_date < CURRENT_DATE) AS overdue_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Completed') AS accepted_completed_count,
    COUNT(*) FILTER (WHERE current_state = 'Dismissed') AS dismissed_count
FROM public.v_management_opportunity_drilldown
GROUP BY opportunity_type
ORDER BY total_opportunities DESC;

GRANT SELECT ON public.v_management_opportunity_summary TO authenticated;
GRANT SELECT ON public.v_management_opportunity_summary TO anon;

-- 3. Create Summary View by Owner
CREATE OR REPLACE VIEW public.v_management_opportunity_by_owner WITH (security_invoker = true) AS
SELECT 
    assigned_owner_id,
    opportunity_type,
    COUNT(*) AS total_opportunities,
    COUNT(*) FILTER (WHERE current_state = 'Unactioned') AS unactioned_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Pending') AS accepted_pending_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Pending' AND due_date < CURRENT_DATE) AS overdue_count,
    COUNT(*) FILTER (WHERE current_state = 'Accepted - Completed') AS accepted_completed_count,
    COUNT(*) FILTER (WHERE current_state = 'Dismissed') AS dismissed_count
FROM public.v_management_opportunity_drilldown
GROUP BY assigned_owner_id, opportunity_type
ORDER BY assigned_owner_id, total_opportunities DESC;

GRANT SELECT ON public.v_management_opportunity_by_owner TO authenticated;
GRANT SELECT ON public.v_management_opportunity_by_owner TO anon;
