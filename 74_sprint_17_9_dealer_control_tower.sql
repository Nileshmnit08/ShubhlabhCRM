-- MICRO-SPRINT 17.9: MANAGEMENT DEALER CONTROL TOWER
-- Creates a comprehensive view for dealer channel execution

CREATE OR REPLACE VIEW public.v_management_dealer_control WITH (security_invoker = true) AS
SELECT 
    cm.id AS party_id,
    cm.display_name,
    cm.territory_name,
    cm.territory_manager_name,
    cm.owner_name,
    cm.crm_status,
    cm.health_status,
    
    -- Active Requirements
    (SELECT COUNT(*) 
     FROM public.requirements r 
     WHERE r.party_id = cm.id 
       AND r.status NOT IN ('Closed', 'Lost', 'Confirmed')
    ) AS active_requirements_count,
    
    -- Active Opportunities
    (SELECT COUNT(*) 
     FROM public.v_customer_opportunities o 
     WHERE o.party_id = cm.id
    ) AS active_opportunities_count,
    
    -- Overdue Actions
    (SELECT COUNT(*) 
     FROM public.follow_ups f 
     WHERE f.party_id = cm.id 
       AND f.status = 'Pending' 
       AND (f.follow_up_date < CURRENT_DATE OR f.due_at < CURRENT_TIMESTAMP)
    ) AS overdue_actions_count,
    
    -- Pending Payment Tasks
    (SELECT COUNT(*) 
     FROM public.follow_ups f 
     WHERE f.party_id = cm.id 
       AND f.status = 'Pending' 
       AND f.follow_up_type = 'Payment'
    ) AS pending_payment_tasks,
    
    -- Tally Outstanding Balance
    cm.outstanding_balance AS tally_outstanding_balance,
    
    -- Last Engagement Date
    (SELECT MAX(created_at) 
     FROM public.interactions i 
     WHERE i.party_id = cm.id
    ) AS last_engagement_date,
    
    -- Active Scheme Participation
    (SELECT COUNT(*) 
     FROM public.dealer_scheme_participations sp 
     JOIN public.dealer_schemes ds ON sp.scheme_id = ds.id 
     WHERE sp.party_id = cm.id 
       AND ds.status = 'Active'
    ) AS active_schemes_count
    
FROM public.v_customer_master cm
WHERE cm.relationship_type = 'Dealer' 
  AND cm.crm_status != 'Unknown';

GRANT SELECT ON public.v_management_dealer_control TO authenticated;
