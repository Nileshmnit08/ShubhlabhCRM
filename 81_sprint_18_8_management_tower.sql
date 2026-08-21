-- MICRO-SPRINT 18.8: MANAGEMENT DEMAND CONTROL TOWER
-- Creates aggregated KPIs for demand execution and commercial follow-through.

CREATE OR REPLACE VIEW public.v_management_demand_tower WITH (security_invoker = true) AS
SELECT
    CURRENT_TIMESTAMP AS last_refreshed,
    
    -- Demand Signals
    (SELECT COUNT(*) FROM public.v_demand_signals) AS total_open_demand_signals,
    (SELECT COUNT(*) FROM public.v_demand_signals WHERE signal_type IN ('Tally Transaction', 'Repeat Purchase Evidence')) AS total_observed_demand,
    (SELECT COUNT(*) FROM public.v_demand_signals WHERE signal_type NOT IN ('Tally Transaction', 'Repeat Purchase Evidence')) AS total_estimated_demand,
    
    -- Action Workload
    (SELECT COUNT(*) FROM public.follow_ups WHERE status = 'Pending' AND priority = 'High') AS unresolved_high_priority_actions,
    (SELECT MIN(follow_up_date) FROM public.follow_ups WHERE status = 'Pending' AND priority = 'High') AS oldest_high_priority_action_date,
    (SELECT COUNT(*) FROM public.v_customer_opportunities WHERE opportunity_type IN ('Dealer Replenishment', 'Purchase Gap')) AS repeat_replenishment_workload,
    
    -- Conversions
    (SELECT COUNT(DISTINCT requirement_id) FROM public.requirement_signals) AS demand_to_opportunity_conversions,
    (SELECT COUNT(*) FROM public.requirements WHERE status NOT IN ('Closed', 'Lost')) AS total_active_opportunities
;

GRANT SELECT ON public.v_management_demand_tower TO authenticated;
GRANT SELECT ON public.v_management_demand_tower TO anon;
