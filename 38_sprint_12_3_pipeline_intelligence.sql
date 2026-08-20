-- MICRO-SPRINT 12.3: SALES PIPELINE INTELLIGENCE
-- Create transparent visibility from lead/customer interaction through requirement, follow-up and outcome using existing data.

CREATE OR REPLACE VIEW public.v_pipeline_intelligence WITH (security_invoker = true) AS
WITH party_interactions AS (
    SELECT 
        party_id,
        COUNT(*) as total_interactions,
        MAX(created_at) as last_interaction_date,
        COUNT(CASE WHEN interaction_type = 'Dormant Review' THEN 1 END) as dormant_reviews
    FROM public.interactions
    GROUP BY party_id
),
party_requirements AS (
    SELECT 
        party_id,
        COUNT(*) as total_requirements,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) as open_requirements,
        COUNT(CASE WHEN status = 'Open' AND expected_date < CURRENT_DATE THEN 1 END) as overdue_requirements,
        COUNT(CASE WHEN status = 'Fulfilled' THEN 1 END) as fulfilled_requirements,
        COUNT(CASE WHEN status = 'Lost' THEN 1 END) as lost_requirements,
        SUM(CASE WHEN status = 'Open' THEN quantity ELSE 0 END) as open_pipeline_quantity
    FROM public.requirements
    GROUP BY party_id
),
party_follow_ups AS (
    SELECT 
        party_id,
        COUNT(*) as total_follow_ups,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as open_follow_ups,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_follow_ups
    FROM public.follow_ups
    GROUP BY party_id
)
SELECT 
    p.id AS party_id,
    p.display_name,
    p.crm_status,
    p.lead_source,
    p.assigned_owner_id,
    CASE 
        WHEN p.crm_status = 'Lead' THEN '1. Lead'
        WHEN p.crm_status = 'Active' AND COALESCE(r.open_requirements, 0) > 0 THEN '3. Active Opportunity'
        WHEN p.crm_status = 'Active' THEN '2. Active Customer'
        WHEN p.crm_status = 'Dormant' THEN '4. Dormant'
        WHEN p.crm_status = 'Lost' THEN '5. Lost'
        ELSE 'Unknown'
    END AS pipeline_stage,
    
    COALESCE(i.total_interactions, 0) AS total_interactions,
    i.last_interaction_date,
    
    COALESCE(r.total_requirements, 0) AS total_requirements,
    COALESCE(r.open_requirements, 0) AS open_requirements,
    COALESCE(r.overdue_requirements, 0) AS overdue_requirements,
    COALESCE(r.open_pipeline_quantity, 0) AS open_pipeline_quantity,
    
    COALESCE(f.open_follow_ups, 0) AS open_follow_ups,
    COALESCE(f.completed_follow_ups, 0) AS completed_follow_ups

FROM public.crm_parties p
LEFT JOIN party_interactions i ON p.id = i.party_id
LEFT JOIN party_requirements r ON p.id = r.party_id
LEFT JOIN party_follow_ups f ON p.id = f.party_id;

GRANT SELECT ON public.v_pipeline_intelligence TO authenticated;
GRANT SELECT ON public.v_pipeline_intelligence TO anon;
