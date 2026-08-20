-- MICRO-SPRINT 12.6: CUSTOMER RISK
-- Introduce explainable rule-based customer-risk identification using validated data.

CREATE OR REPLACE VIEW public.v_customer_risk WITH (security_invoker = true) AS
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    act.interaction_window_category,
    act.total_overdue_follow_ups,
    COALESCE(p.is_interrupted_pattern, false) AS is_interrupted_pattern,
    p.purchase_frequency_category,
    
    -- Risk Classification Rules V1.0
    CASE 
        -- HIGH RISK: Repeated overdues, OR (Repeat Buyer + Interrupted Pattern + Neglected Contact)
        WHEN act.total_overdue_follow_ups >= 2 THEN 'High Risk'
        WHEN COALESCE(p.is_interrupted_pattern, false) = true AND act.interaction_window_category IN ('Neglected (>90 days)', 'No Contact History') THEN 'High Risk'
        
        -- AT RISK: 1 overdue follow-up, OR (Repeat Buyer + Interrupted Pattern), OR Contact Slipping
        WHEN act.total_overdue_follow_ups = 1 THEN 'At Risk'
        WHEN COALESCE(p.is_interrupted_pattern, false) = true THEN 'At Risk'
        WHEN act.interaction_window_category = 'Slipping (31-90 days)' AND p.purchase_frequency_category != 'No Purchase History' THEN 'At Risk'
        
        -- LOW RISK: Active contact and normal purchase pattern
        WHEN act.interaction_window_category = 'Active (0-30 days)' AND COALESCE(p.is_interrupted_pattern, false) = false THEN 'Low Risk'
        
        ELSE 'Unknown'
    END AS risk_level,
    
    -- Evidence Generator
    COALESCE(
        NULLIF(
            CONCAT_WS(' | ',
                CASE WHEN act.total_overdue_follow_ups > 0 THEN act.total_overdue_follow_ups || ' overdue follow-ups' ELSE NULL END,
                CASE WHEN COALESCE(p.is_interrupted_pattern, false) = true THEN 'Purchase pattern interrupted' ELSE NULL END,
                CASE WHEN act.interaction_window_category IN ('Slipping (31-90 days)', 'Neglected (>90 days)') THEN 'Contact ' || act.interaction_window_category ELSE NULL END
            ), 
        ''), 
    'No explicit risk factors identified') AS risk_evidence

FROM public.crm_parties c
LEFT JOIN public.v_activity_intelligence act ON c.id = act.party_id
LEFT JOIN public.v_purchase_behaviour p ON c.id = p.party_id;

GRANT SELECT ON public.v_customer_risk TO authenticated;
GRANT SELECT ON public.v_customer_risk TO anon;
