-- MICRO-SPRINT 12.9: MANAGEMENT INTELLIGENCE DASHBOARD
-- Combine approved Phase 12 intelligence into a compact management control room.

CREATE OR REPLACE VIEW public.v_management_dashboard AS
SELECT 
    -- 1. Data Health Indicators
    (SELECT total_customers FROM public.v_audit_customer_health) AS total_customers,
    (SELECT unlinked_vouchers FROM public.v_audit_voucher_health) AS unlinked_vouchers,
    (SELECT pending_review FROM public.v_audit_tally_identity_health) AS pending_identities,
    
    -- 2. Activity & Follow-up Indicators
    (SELECT overdue_follow_ups FROM public.v_audit_follow_up_health) AS total_overdue_follow_ups,
    (SELECT COUNT(*) FROM public.v_activity_intelligence WHERE interaction_window_category = 'Neglected (>90 days)') AS neglected_customers,
    
    -- 3. Requirement Demand Indicators
    (SELECT open_requirements FROM public.v_audit_requirement_health) AS total_open_requirements,
    (SELECT COUNT(*) FROM public.v_requirement_demand_details WHERE age_category = 'Stale (>30 days)') AS stale_requirements,
    
    -- 4. Validated Purchase & Risk Indicators
    (SELECT COUNT(*) FROM public.v_purchase_behaviour WHERE is_interrupted_pattern = true) AS interrupted_purchase_patterns,
    (SELECT COUNT(*) FROM public.v_customer_risk WHERE risk_level = 'High Risk') AS high_risk_customers,
    (SELECT COUNT(*) FROM public.v_customer_risk WHERE risk_level = 'At Risk') AS at_risk_customers,
    
    -- 5. Reactivation Funnel Indicators
    (SELECT COUNT(*) FROM public.v_reactivation_intelligence WHERE is_approved = true) AS approved_dormant_candidates,
    (SELECT COUNT(*) FROM public.v_reactivation_intelligence WHERE is_reactivated = true) AS successfully_reactivated,
    
    -- 6. Freshness / Coverage
    CURRENT_TIMESTAMP AS dashboard_generated_at;

GRANT SELECT ON public.v_management_dashboard TO authenticated;
GRANT SELECT ON public.v_management_dashboard TO anon;
