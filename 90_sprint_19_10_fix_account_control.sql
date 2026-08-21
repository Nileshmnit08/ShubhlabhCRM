-- MICRO-SPRINT 19.10: RESTORE MANAGEMENT ACCOUNT CONTROL
-- The v_management_account_control view was accidentally dropped CASCADE during Sprint 18.3 
-- when v_customer_opportunities was replaced. This script cleanly restores it.

CREATE OR REPLACE VIEW public.v_management_account_control WITH (security_invoker = true) AS
SELECT 
    cm.id AS party_id,
    cm.display_name,
    cm.owner_name,
    cm.assigned_owner_id,
    cm.crm_status,
    cm.relationship_type,
    cm.health_status,
    cm.health_reason,
    cm.risk_factors,
    cm.outstanding_balance,
    cm.last_payment_date,
    (SELECT COUNT(*) FROM public.v_customer_opportunities o WHERE o.party_id = cm.id) AS open_opportunities_count,
    pfw.next_payment_followup_date,
    pfw.next_payment_followup_status
FROM public.v_customer_master cm
LEFT JOIN LATERAL (
    SELECT follow_up_date AS next_payment_followup_date, status AS next_payment_followup_status
    FROM public.follow_ups
    WHERE party_id = cm.id AND follow_up_type = 'Payment'
    ORDER BY created_at DESC
    LIMIT 1
) pfw ON true
WHERE cm.crm_status != 'Unknown';

GRANT SELECT ON public.v_management_account_control TO authenticated;
GRANT SELECT ON public.v_management_account_control TO anon;
