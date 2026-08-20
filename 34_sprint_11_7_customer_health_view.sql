-- MICRO-SPRINT 11.7 CUSTOMER HEALTH
-- Create a view to dynamically evaluate customer health based on engagement rules.

CREATE OR REPLACE VIEW public.v_customer_health WITH (security_invoker = true) AS
WITH party_metrics AS (
    SELECT 
        p.id AS party_id,
        p.crm_status,
        (SELECT MAX(created_at) FROM public.interactions i WHERE i.party_id = p.id) AS last_interaction_date,
        (SELECT COUNT(*) FROM public.follow_ups f WHERE f.party_id = p.id AND f.status = 'Pending' AND f.due_at < CURRENT_DATE) AS overdue_followups,
        (SELECT COUNT(*) FROM public.follow_ups f WHERE f.party_id = p.id AND f.status = 'Pending' AND f.due_at >= CURRENT_DATE) AS upcoming_followups
    FROM public.crm_parties p
)
SELECT 
    party_id,
    last_interaction_date,
    overdue_followups,
    upcoming_followups,
    CASE
        WHEN crm_status IN ('Dormant', 'Lost') THEN 'Inactive'
        WHEN overdue_followups > 0 THEN 'At Risk'
        WHEN crm_status = 'Active' AND (last_interaction_date IS NULL OR last_interaction_date < (CURRENT_DATE - INTERVAL '30 days')) THEN 'At Risk'
        WHEN last_interaction_date >= (CURRENT_DATE - INTERVAL '30 days') AND overdue_followups = 0 THEN 'Healthy'
        WHEN last_interaction_date IS NULL AND upcoming_followups = 0 THEN 'Unknown'
        ELSE 'Unknown'
    END AS health_status,
    CASE
        WHEN crm_status IN ('Dormant', 'Lost') THEN 'Customer is marked as ' || crm_status
        WHEN overdue_followups > 0 THEN overdue_followups || ' overdue follow-up(s)'
        WHEN crm_status = 'Active' AND last_interaction_date IS NULL THEN 'No contact history'
        WHEN crm_status = 'Active' AND last_interaction_date < (CURRENT_DATE - INTERVAL '30 days') THEN 'No contact in over 30 days'
        WHEN last_interaction_date >= (CURRENT_DATE - INTERVAL '30 days') AND overdue_followups = 0 THEN 'Recently contacted, no overdue tasks'
        ELSE 'Insufficient interaction history'
    END AS health_reason
FROM party_metrics;

-- Grant permissions
GRANT SELECT ON public.v_customer_health TO authenticated;
GRANT SELECT ON public.v_customer_health TO anon;

-- Update v_customer_master to include health data
DROP VIEW IF EXISTS v_customer_master CASCADE;
CREATE OR REPLACE VIEW v_customer_master AS
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
    ch.health_reason
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id
LEFT JOIN public.v_customer_health ch ON c.id = ch.party_id;
