-- MICRO-SPRINT 12.7: REACTIVATION INTELLIGENCE
-- Measure effectiveness of the existing dormant/reactivation workflow.

CREATE OR REPLACE VIEW public.v_reactivation_intelligence WITH (security_invoker = true) AS
WITH reactivation_tasks AS (
    SELECT 
        party_id,
        status,
        outcome_category,
        created_at,
        completed_at,
        ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY created_at DESC) as rn
    FROM public.follow_ups
    WHERE follow_up_type = 'Reactivation'
),
post_approval_sales AS (
    SELECT 
        d.party_id,
        MIN(t.voucher_date) AS first_sale_after_approval
    FROM public.v_dormant_candidates d
    JOIN public.tally_transactions t ON d.party_id = t.crm_party_id
    WHERE t.is_credit = false 
      AND t.voucher_date > d.reviewed_at::DATE
      AND d.review_state = 'APPROVED_FOR_REACTIVATION'
    GROUP BY d.party_id
)
SELECT 
    d.party_id,
    d.display_name,
    d.owner_name,
    d.review_state AS dormant_review_state,
    d.reviewed_at AS approved_at,
    
    CASE WHEN d.review_state = 'APPROVED_FOR_REACTIVATION' THEN true ELSE false END AS is_approved,
    
    rt.status AS task_status,
    rt.completed_at AS task_completed_at,
    rt.outcome_category AS task_outcome,
    
    -- Step timing (Approval -> Task Completion)
    CASE 
        WHEN rt.completed_at IS NOT NULL AND d.reviewed_at IS NOT NULL 
        THEN (rt.completed_at::DATE - d.reviewed_at::DATE)
        ELSE NULL 
    END AS days_to_contact,
    
    ps.first_sale_after_approval AS post_reactivation_sale_date,
    
    -- Reactivated if they bought something after being approved
    CASE WHEN ps.first_sale_after_approval IS NOT NULL THEN true ELSE false END AS is_reactivated,
    
    -- Step timing (Approval -> New Sale)
    CASE 
        WHEN ps.first_sale_after_approval IS NOT NULL AND d.reviewed_at IS NOT NULL 
        THEN (ps.first_sale_after_approval - d.reviewed_at::DATE)
        ELSE NULL 
    END AS days_to_reactivation,
    
    -- Evidence Summary
    CONCAT_WS(' | ',
        CASE WHEN d.review_state = 'APPROVED_FOR_REACTIVATION' THEN 'Approved on ' || d.reviewed_at::DATE ELSE 'Not approved' END,
        CASE WHEN rt.status = 'Completed' THEN 'Contacted after ' || (rt.completed_at::DATE - d.reviewed_at::DATE) || ' days'
             WHEN rt.status = 'Pending' THEN 'Contact pending' 
             ELSE 'No contact task' END,
        CASE WHEN ps.first_sale_after_approval IS NOT NULL THEN 'Reactivated (Sale on ' || ps.first_sale_after_approval || ')' ELSE 'No post-approval sales' END
    ) AS evidence_summary

FROM public.v_dormant_candidates d
LEFT JOIN reactivation_tasks rt ON d.party_id = rt.party_id AND rt.rn = 1
LEFT JOIN post_approval_sales ps ON d.party_id = ps.party_id
WHERE d.review_state = 'APPROVED_FOR_REACTIVATION' OR rt.party_id IS NOT NULL;

GRANT SELECT ON public.v_reactivation_intelligence TO authenticated;
GRANT SELECT ON public.v_reactivation_intelligence TO anon;
