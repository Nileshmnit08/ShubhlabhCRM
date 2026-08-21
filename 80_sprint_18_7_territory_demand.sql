-- MICRO-SPRINT 18.7: TERRITORY DEMAND PLANNING
-- Aggregates demand signals and actions up to the territory level.

CREATE OR REPLACE VIEW public.v_territory_demand_planning WITH (security_invoker = true) AS
SELECT 
    t.id AS territory_id,
    t.name AS territory_name,
    t.assigned_manager_id AS manager_id,
    u.display_name AS manager_name,
    
    -- Coverage Context
    COUNT(DISTINCT c.id) AS total_customers,
    COUNT(DISTINCT CASE WHEN c.relationship_type = 'Dealer' THEN c.id END) AS total_dealers,
    
    -- Demand Context
    COUNT(DISTINCT ds.source_id) AS total_demand_signals,
    COUNT(DISTINCT CASE WHEN ds.signal_type IN ('Tally Transaction', 'Repeat Purchase Evidence') THEN ds.source_id END) AS observed_demand_count,
    COUNT(DISTINCT CASE WHEN ds.signal_type IN ('Stated Requirement', 'Commercial Intent') THEN ds.source_id END) AS estimated_demand_count,
    
    -- Action Context
    COUNT(DISTINCT f.id) AS pending_actions,
    
    -- Basic Product Coverage
    ARRAY_AGG(DISTINCT ds.product_reference) FILTER (WHERE ds.product_reference IS NOT NULL AND ds.product_reference != 'Historical Pattern') AS active_products

FROM public.crm_territories t
LEFT JOIN public.app_users u ON t.assigned_manager_id = u.id
LEFT JOIN public.crm_parties c ON t.id = c.territory_id
LEFT JOIN public.v_demand_signals ds ON c.id = ds.party_id
LEFT JOIN public.follow_ups f ON c.id = f.party_id AND f.status = 'Pending'
GROUP BY t.id, t.name, t.assigned_manager_id, u.display_name;

GRANT SELECT ON public.v_territory_demand_planning TO authenticated;
GRANT SELECT ON public.v_territory_demand_planning TO anon;
