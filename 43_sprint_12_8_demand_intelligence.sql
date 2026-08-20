-- MICRO-SPRINT 12.8: REQUIREMENT DEMAND INTELLIGENCE
-- Turn structured feed-grade requirements into reliable demand visibility by product/category.

-- 1. Detailed Demand View (For Customer Drill-down and explicit evidence)
CREATE OR REPLACE VIEW public.v_requirement_demand_details AS
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
    END AS age_category
FROM public.requirements r
LEFT JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.status = 'Open';

-- 2. Aggregated Demand Summary View (For Category consistency and grouped counts)
CREATE OR REPLACE VIEW public.v_requirement_demand_summary AS
SELECT 
    standardized_product_type,
    COUNT(requirement_id) AS total_open_requirements,
    COUNT(DISTINCT party_id) AS unique_customers,
    SUM(quantity) AS total_open_quantity,
    MIN(age_in_days) AS freshest_requirement_days,
    MAX(age_in_days) AS oldest_requirement_days,
    ROUND(AVG(age_in_days), 1) AS average_age_days,
    -- Identify repeated product/category demand (more than 1 distinct customer)
    CASE 
        WHEN COUNT(DISTINCT party_id) > 1 THEN true 
        ELSE false 
    END AS is_repeated_demand
FROM public.v_requirement_demand_details
GROUP BY standardized_product_type;

GRANT SELECT ON public.v_requirement_demand_details TO authenticated;
GRANT SELECT ON public.v_requirement_demand_summary TO authenticated;
GRANT SELECT ON public.v_requirement_demand_details TO anon;
GRANT SELECT ON public.v_requirement_demand_summary TO anon;
