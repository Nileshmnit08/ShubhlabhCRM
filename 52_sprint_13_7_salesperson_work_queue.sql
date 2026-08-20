-- MICRO-SPRINT 13.7: SALESPERSON WORK QUEUE
-- Create a prioritized actionable queue blending explicit CRM tasks with generated opportunities.

CREATE OR REPLACE VIEW public.v_salesperson_work_queue WITH (security_invoker = true) AS
-- Segment A: Explicit Scheduled Follow-ups
SELECT 
    f.id AS work_item_id,
    'Follow-up' AS work_item_type,
    f.party_id,
    c.display_name AS customer_name,
    f.assigned_to AS assigned_owner_id,
    f.reason AS title,
    f.notes AS evidence,
    'Complete Follow-up' AS recommended_action,
    -- Priority Scoring for Follow-ups
    -- 1 = Overdue, 2 = Due Today, 10 = Future
    CASE 
        WHEN COALESCE(f.due_at::DATE, f.follow_up_date) < CURRENT_DATE THEN 1
        WHEN COALESCE(f.due_at::DATE, f.follow_up_date) = CURRENT_DATE THEN 2
        ELSE 10 
    END AS priority_score,
    COALESCE(f.due_at::DATE, f.follow_up_date) AS relevant_date
FROM public.follow_ups f
JOIN public.crm_parties c ON f.party_id = c.id
WHERE f.status = 'Pending'

UNION ALL

-- Segment B: Dynamic Intelligence Opportunities
SELECT 
    NULL::UUID AS work_item_id,
    'Opportunity' AS work_item_type,
    o.party_id,
    o.display_name AS customer_name,
    o.assigned_owner_id,
    o.opportunity_type AS title,
    o.evidence,
    o.recommended_action,
    -- Priority Scoring for Opportunities 
    -- Original 1-7 becomes 3-9, slotting neatly between Today's tasks (2) and Future tasks (10).
    (o.priority_sort + 2) AS priority_score,
    CURRENT_DATE AS relevant_date
FROM public.v_customer_opportunities o;

GRANT SELECT ON public.v_salesperson_work_queue TO authenticated;
GRANT SELECT ON public.v_salesperson_work_queue TO anon;
