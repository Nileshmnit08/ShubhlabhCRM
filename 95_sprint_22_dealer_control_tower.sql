-- Migration: 95_sprint_22_dealer_control_tower.sql
-- Overhauls the Dealer Control Tower view to include transparent health logic and all dealers.

DROP VIEW IF EXISTS public.v_management_dealer_control CASCADE;
CREATE OR REPLACE VIEW public.v_management_dealer_control WITH (security_invoker = true) AS
WITH DealerBase AS (
    SELECT 
        cm.id AS party_id,
        cm.display_name,
        cm.territory_name,
        cm.territory_manager_name,
        cm.owner_name,
        cm.assigned_owner_id,
        cm.crm_status,
        cm.mobile,
        cm.city,
        
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
        ) AS last_engagement_date
        
    FROM public.v_customer_master cm
    WHERE cm.relationship_type = 'Dealer' 
      AND cm.crm_status != 'Unknown'
),
ComputedHealth AS (
    SELECT 
        d.*,
        COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.last_engagement_date), 9999) AS days_since_last_activity,
        
        CASE 
            WHEN d.crm_status = 'Inactive' THEN 'Inactive'
            WHEN d.territory_name IS NULL OR d.assigned_owner_id IS NULL OR d.mobile IS NULL OR d.mobile = '' THEN 'Needs Attention'
            WHEN COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.last_engagement_date), 9999) > 30 THEN 'Inactive'
            WHEN d.overdue_actions_count > 0 THEN 'At Risk'
            WHEN COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.last_engagement_date), 9999) BETWEEN 16 AND 30 THEN 'At Risk'
            ELSE 'Healthy'
        END AS health_category,
        
        CASE 
            WHEN d.crm_status = 'Inactive' THEN 'Manually marked inactive'
            WHEN d.territory_name IS NULL THEN 'Missing territory assignment'
            WHEN d.assigned_owner_id IS NULL THEN 'Missing salesperson assignment'
            WHEN d.mobile IS NULL OR d.mobile = '' THEN 'Missing contact number'
            WHEN COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.last_engagement_date), 9999) > 30 THEN 'No activity for > 30 days'
            WHEN d.overdue_actions_count > 0 THEN d.overdue_actions_count::text || ' overdue follow-ups'
            WHEN COALESCE(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.last_engagement_date), 9999) BETWEEN 16 AND 30 THEN 'No activity for 16-30 days'
            ELSE 'Active and on track'
        END AS health_reason_text
    FROM DealerBase d
)
SELECT * FROM ComputedHealth;

GRANT SELECT ON public.v_management_dealer_control TO authenticated;
