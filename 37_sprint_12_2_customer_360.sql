-- MICRO-SPRINT 12.2 CUSTOMER 360
-- Create a comprehensive 360-degree view of the customer.

CREATE OR REPLACE VIEW public.v_customer_360 AS
WITH tally_info AS (
    SELECT 
        l.crm_party_id,
        STRING_AGG(t.tally_ledger_name, ', ') AS tally_ledger_names,
        STRING_AGG(t.tally_status, ', ') AS tally_statuses
    FROM public.party_identity_links l
    JOIN public.tally_raw_parties t ON l.tally_raw_party_id = t.id
    GROUP BY l.crm_party_id
),
activity_info AS (
    SELECT 
        party_id,
        MAX(created_at) AS last_interaction_date,
        COUNT(*) AS total_interactions
    FROM public.interactions
    GROUP BY party_id
),
follow_up_info AS (
    SELECT 
        party_id,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) AS open_follow_ups,
        COUNT(CASE WHEN status = 'Pending' AND due_at < CURRENT_DATE THEN 1 END) AS overdue_follow_ups,
        MIN(CASE WHEN status = 'Pending' THEN due_at END) AS next_follow_up_date
    FROM public.follow_ups
    GROUP BY party_id
),
requirement_info AS (
    SELECT 
        party_id,
        COUNT(CASE WHEN status = 'Open' THEN 1 END) AS open_requirements,
        COUNT(*) AS total_requirements
    FROM public.requirements
    GROUP BY party_id
),
reactivation_info AS (
    WITH latest_reactivation_task AS (
        SELECT 
            party_id,
            status,
            outcome_category,
            ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY created_at DESC) as rn
        FROM public.follow_ups
        WHERE follow_up_type = 'Reactivation'
    )
    SELECT 
        d.party_id,
        CASE 
            WHEN t.status = 'Pending' THEN 'IN_PROGRESS'
            WHEN t.status IN ('Completed', 'Cancelled') THEN 'COMPLETED'
            ELSE 'APPROVED'
        END AS reactivation_state,
        t.status AS latest_task_status,
        t.outcome_category AS latest_task_outcome
    FROM public.v_dormant_candidates d
    LEFT JOIN latest_reactivation_task t ON d.party_id = t.party_id AND t.rn = 1
    WHERE d.review_state = 'APPROVED_FOR_REACTIVATION'
)
SELECT 
    c.id AS customer_id,
    c.display_name AS crm_display_name,
    c.mobile AS crm_mobile,
    c.whatsapp AS crm_whatsapp,
    c.city AS crm_city,
    c.crm_status,
    c.communication_preference,
    c.preferred_channel,
    
    COALESCE(t.tally_ledger_names, '') AS tally_ledger_names,
    COALESCE(t.tally_statuses, '') AS tally_statuses,
    
    a.last_interaction_date,
    COALESCE(a.total_interactions, 0) AS total_interactions,
    
    COALESCE(f.open_follow_ups, 0) AS open_follow_ups,
    COALESCE(f.overdue_follow_ups, 0) AS overdue_follow_ups,
    f.next_follow_up_date,
    
    COALESCE(r.open_requirements, 0) AS open_requirements,
    COALESCE(r.total_requirements, 0) AS total_requirements,
    
    COALESCE(fin.total_billed, 0) AS total_billed,
    COALESCE(fin.total_received, 0) AS total_received,
    COALESCE(fin.outstanding_balance, 0) AS outstanding_balance,
    fin.last_order_date,
    fin.last_payment_date,
    
    rq.reactivation_state,
    rq.latest_task_status AS reactivation_latest_task_status,
    rq.latest_task_outcome AS reactivation_latest_task_outcome

FROM public.crm_parties c
LEFT JOIN tally_info t ON c.id = t.crm_party_id
LEFT JOIN activity_info a ON c.id = a.party_id
LEFT JOIN follow_up_info f ON c.id = f.party_id
LEFT JOIN requirement_info r ON c.id = r.party_id
LEFT JOIN public.v_customer_financials fin ON c.id = fin.party_id
LEFT JOIN reactivation_info rq ON c.id = rq.party_id;

-- Apply permissions
GRANT SELECT ON public.v_customer_360 TO authenticated;
-- For development only (as per previous sprint patterns)
GRANT SELECT ON public.v_customer_360 TO anon;
