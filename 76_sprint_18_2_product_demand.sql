-- MICRO-SPRINT 18.2: PRODUCT DEMAND VIEW
-- Enriches the demand signals with product master categories and territory boundaries for practical grouping.

CREATE OR REPLACE VIEW public.v_product_demand_signals WITH (security_invoker = true) AS
SELECT 
    ds.*,
    COALESCE(p.category, 'Uncategorized') AS product_category,
    COALESCE(p.name, ds.product_reference) AS standardized_product_name,
    cm.territory_name,
    cm.territory_manager_name
FROM public.v_demand_signals ds
LEFT JOIN public.products p ON p.name = ds.product_reference
LEFT JOIN public.v_customer_master cm ON cm.id = ds.party_id;

GRANT SELECT ON public.v_product_demand_signals TO authenticated;
