-- SPRINT 18: Add Notification Status to Master View
-- We update the view to pull the most recent WhatsApp notification status for each customer.

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
    ln.delivery_status AS assignment_notification_status
FROM public.crm_parties c
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id;
