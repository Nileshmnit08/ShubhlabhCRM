-- MICRO-SPRINT 12.4: CUSTOMER ACTIVITY INTELLIGENCE
-- Use actual activity data to identify active, inactive or neglected relationships without changing CRM Status.

CREATE OR REPLACE VIEW public.v_activity_intelligence WITH (security_invoker = true) AS
WITH activity_stats AS (
    SELECT 
        party_id,
        MAX(created_at) as last_interaction_date,
        COUNT(*) as total_interactions
    FROM public.interactions
    GROUP BY party_id
),
follow_up_stats AS (
    SELECT 
        party_id,
        COUNT(CASE WHEN status = 'Pending' AND due_at < CURRENT_DATE THEN 1 END) as overdue_follow_ups
    FROM public.follow_ups
    GROUP BY party_id
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    act.last_interaction_date,
    CURRENT_DATE - (act.last_interaction_date AT TIME ZONE 'UTC')::DATE AS days_since_last_interaction,
    CASE 
        WHEN act.last_interaction_date IS NULL THEN 'No Contact History'
        WHEN (CURRENT_DATE - (act.last_interaction_date AT TIME ZONE 'UTC')::DATE) <= 30 THEN 'Active (0-30 days)'
        WHEN (CURRENT_DATE - (act.last_interaction_date AT TIME ZONE 'UTC')::DATE) <= 90 THEN 'Slipping (31-90 days)'
        ELSE 'Neglected (>90 days)'
    END AS interaction_window_category,
    
    f.last_order_date AS last_purchase_date,
    CURRENT_DATE - f.last_order_date AS days_since_last_purchase,
    CASE 
        WHEN f.last_order_date IS NULL THEN 'No Purchase History'
        WHEN (CURRENT_DATE - f.last_order_date) <= 90 THEN 'Recent Buyer (0-90 days)'
        WHEN (CURRENT_DATE - f.last_order_date) <= 180 THEN 'Cooling (91-180 days)'
        ELSE 'Dormant Buyer (>180 days)'
    END AS purchase_window_category,
    
    COALESCE(fu.overdue_follow_ups, 0) AS total_overdue_follow_ups,
    CASE WHEN COALESCE(fu.overdue_follow_ups, 0) >= 2 THEN true ELSE false END AS has_repeated_overdue,
    
    -- Construct evidence string
    CONCAT_WS(' | ', 
        CASE 
            WHEN act.last_interaction_date IS NULL THEN 'Never contacted'
            ELSE 'Last contact ' || (CURRENT_DATE - (act.last_interaction_date AT TIME ZONE 'UTC')::DATE) || ' days ago'
        END,
        CASE 
            WHEN f.last_order_date IS NULL THEN 'Never purchased'
            ELSE 'Last purchase ' || (CURRENT_DATE - f.last_order_date) || ' days ago'
        END,
        CASE 
            WHEN COALESCE(fu.overdue_follow_ups, 0) > 0 THEN COALESCE(fu.overdue_follow_ups, 0) || ' overdue follow-ups'
            ELSE NULL
        END
    ) AS evidence_summary

FROM public.crm_parties c
LEFT JOIN activity_stats act ON c.id = act.party_id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN follow_up_stats fu ON c.id = fu.party_id;

GRANT SELECT ON public.v_activity_intelligence TO authenticated;
GRANT SELECT ON public.v_activity_intelligence TO anon;
