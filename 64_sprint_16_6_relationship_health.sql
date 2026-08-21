-- MICRO-SPRINT 16.6: RELATIONSHIP HEALTH
-- Upgrade the customer health view to include Requirements and Issues

DROP VIEW IF EXISTS public.v_customer_health CASCADE;
CREATE OR REPLACE VIEW public.v_customer_health WITH (security_invoker = true) AS
WITH party_metrics AS (
    SELECT 
        p.id AS party_id,
        p.crm_status,
        (SELECT MAX(created_at) FROM public.interactions i WHERE i.party_id = p.id) AS last_interaction_date,
        (SELECT COUNT(*) FROM public.follow_ups f WHERE f.party_id = p.id AND f.status = 'Pending' AND f.due_at < CURRENT_DATE) AS overdue_followups,
        (SELECT COUNT(*) FROM public.follow_ups f WHERE f.party_id = p.id AND f.status = 'Pending' AND f.due_at >= CURRENT_DATE) AS upcoming_followups,
        (SELECT COUNT(*) FROM public.crm_issues iss WHERE iss.party_id = p.id AND iss.status NOT IN ('Resolved', 'Closed')) AS unresolved_issues,
        (SELECT COUNT(*) FROM public.requirements req WHERE req.party_id = p.id AND req.status IN ('Blocked', 'Stalled')) AS stalled_requirements
    FROM public.crm_parties p
)
SELECT 
    party_id,
    last_interaction_date,
    overdue_followups,
    upcoming_followups,
    unresolved_issues,
    stalled_requirements,
    CASE
        WHEN crm_status IN ('Dormant', 'Lost') THEN 'Inactive'
        WHEN unresolved_issues > 0 OR stalled_requirements > 0 OR overdue_followups > 0 THEN 'At Risk'
        WHEN crm_status = 'Active' AND (last_interaction_date IS NULL OR last_interaction_date < (CURRENT_DATE - INTERVAL '30 days')) THEN 'At Risk'
        WHEN last_interaction_date >= (CURRENT_DATE - INTERVAL '30 days') AND overdue_followups = 0 AND unresolved_issues = 0 AND stalled_requirements = 0 THEN 'Healthy'
        WHEN last_interaction_date IS NULL AND upcoming_followups = 0 THEN 'Unknown'
        ELSE 'Unknown'
    END AS health_status,
    -- Construct a JSON array of risk factors for the frontend to render explicitly
    (
        SELECT json_agg(reason) FROM (
            SELECT 'Unresolved Service Issues (' || unresolved_issues || ')' AS reason WHERE unresolved_issues > 0
            UNION ALL
            SELECT 'Stalled/Blocked Requirements (' || stalled_requirements || ')' WHERE stalled_requirements > 0
            UNION ALL
            SELECT 'Overdue Follow-ups (' || overdue_followups || ')' WHERE overdue_followups > 0
            UNION ALL
            SELECT 'No contact in over 30 days' WHERE crm_status = 'Active' AND (last_interaction_date IS NULL OR last_interaction_date < (CURRENT_DATE - INTERVAL '30 days'))
        ) sub
    ) AS risk_factors,
    CASE
        WHEN crm_status IN ('Dormant', 'Lost') THEN 'Customer is marked as ' || crm_status
        WHEN unresolved_issues > 0 THEN 'Customer has unresolved service issues'
        WHEN stalled_requirements > 0 THEN 'Customer has stalled requirements'
        WHEN overdue_followups > 0 THEN overdue_followups || ' overdue follow-up(s)'
        WHEN crm_status = 'Active' AND last_interaction_date IS NULL THEN 'No contact history'
        WHEN crm_status = 'Active' AND last_interaction_date < (CURRENT_DATE - INTERVAL '30 days') THEN 'No contact in over 30 days'
        WHEN last_interaction_date >= (CURRENT_DATE - INTERVAL '30 days') AND overdue_followups = 0 THEN 'Recently contacted, no overdue tasks'
        ELSE 'Insufficient interaction history'
    END AS health_reason
FROM party_metrics;

-- Recreate v_customer_master because we CASCADE dropped v_customer_health
CREATE OR REPLACE VIEW public.v_customer_master WITH (security_invoker = true) AS
WITH LatestNotification AS (
    SELECT DISTINCT ON (customer_id) 
        customer_id, 
        delivery_status, 
        created_at
    FROM public.owner_whatsapp_notifications
    ORDER BY customer_id, created_at DESC
)
SELECT 
    c.*,
    u.display_name AS owner_name,
    f.total_billed,
    f.total_received,
    f.outstanding_balance,
    f.last_payment_date,
    f.last_order_date,
    (
        (CASE WHEN c.display_name IS NOT NULL AND c.display_name != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.mobile IS NOT NULL AND c.mobile != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.city IS NOT NULL AND c.city != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.gst_number IS NOT NULL AND c.gst_number != '' THEN 20 ELSE 0 END) +
        (CASE WHEN c.assigned_owner_id IS NOT NULL THEN 20 ELSE 0 END)
    ) AS profile_completeness,
    ln.delivery_status AS assignment_notification_status,
    ch.health_status,
    ch.health_reason,
    ch.risk_factors
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id
LEFT JOIN public.v_customer_health ch ON c.id = ch.party_id;
