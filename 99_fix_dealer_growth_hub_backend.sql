-- Migration: 99_fix_dealer_growth_hub_backend.sql
-- Description: Add missing relationship_type to crm_parties and recreate dependent views

-- 1. Add relationship_type
ALTER TABLE public.crm_parties 
ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(50) DEFAULT 'Customer';

-- 2. Drop v_customer_master and cascade to drop dependent views
DROP VIEW IF EXISTS public.v_customer_master CASCADE;

-- 3. Recreate v_customer_master
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
    t.name AS territory_name,
    t.assigned_manager_id AS territory_manager_id,
    tu.display_name AS territory_manager_name,
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
LEFT JOIN public.crm_territories t ON c.territory_id = t.id
LEFT JOIN public.app_users tu ON t.assigned_manager_id = tu.id
LEFT JOIN public.v_customer_financials f ON c.id = f.party_id
LEFT JOIN LatestNotification ln ON c.id = ln.customer_id
LEFT JOIN public.v_customer_health ch ON c.id = ch.party_id;

GRANT SELECT ON public.v_customer_master TO authenticated;

-- 4. Restore dependent views

-- 4a. v_dealership_network
CREATE OR REPLACE VIEW public.v_dealership_network WITH (security_invoker = true) AS
SELECT 
    cm.*,
    dp.dealer_classification,
    dp.operating_status AS dealer_operating_status
FROM public.v_customer_master cm
JOIN public.crm_dealer_profiles dp ON cm.id = dp.party_id
WHERE cm.relationship_type = 'Dealer';

GRANT SELECT ON public.v_dealership_network TO authenticated;

-- 4b. v_management_account_control
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

-- 4c. v_payment_followup_workspace
CREATE OR REPLACE VIEW public.v_payment_followup_workspace WITH (security_invoker = true) AS
WITH LatestPaymentFollowUp AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, follow_up_date, reason, status, priority, sequence_id, created_at
    FROM public.follow_ups
    WHERE follow_up_type = 'Payment'
    ORDER BY party_id, created_at DESC
),
LatestPaymentInteraction AS (
    SELECT DISTINCT ON (party_id)
        id, party_id, channel, outcome, note, created_at
    FROM public.interactions
    ORDER BY party_id, created_at DESC
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.mobile,
    c.whatsapp,
    c.owner_name,
    c.assigned_owner_id,
    c.outstanding_balance,
    c.last_payment_date,
    c.last_order_date,
    c.city,
    f.follow_up_date AS next_payment_followup_date,
    f.reason AS next_payment_followup_reason,
    f.status AS next_payment_followup_status,
    f.id AS next_payment_followup_id,
    i.created_at AS last_interaction_date,
    i.outcome AS last_interaction_outcome,
    i.channel AS last_interaction_channel
FROM public.v_customer_master c
LEFT JOIN LatestPaymentFollowUp f ON c.id = f.party_id
LEFT JOIN LatestPaymentInteraction i ON c.id = i.party_id
WHERE c.outstanding_balance > 0;

GRANT SELECT ON public.v_payment_followup_workspace TO authenticated;

-- 4d. v_dealer_growth_hub (from sprint 23)
CREATE OR REPLACE VIEW public.v_dealer_growth_hub WITH (security_invoker = true) AS
SELECT 
    cm.id AS customer_id,
    cm.display_name,
    cm.mobile,
    cm.city,
    cm.territory_name,
    cm.assigned_owner_id,
    cm.owner_name,
    
    (SELECT COUNT(*) FROM public.dealer_targets dt WHERE dt.customer_id = cm.id AND dt.status = 'Active') AS active_targets_count,
    (SELECT COUNT(*) FROM public.dealer_scheme_participations sp WHERE sp.party_id = cm.id AND sp.status = 'Enrolled') AS active_schemes_count,
    
    (SELECT MAX(created_at) FROM public.interactions i WHERE i.party_id = cm.id) AS last_engagement_date,
    
    (SELECT SUM(points) FROM public.dealer_reward_ledger rl WHERE rl.customer_id = cm.id AND rl.transaction_type = 'Earned') -
    COALESCE((SELECT SUM(points) FROM public.dealer_reward_ledger rl WHERE rl.customer_id = cm.id AND rl.transaction_type = 'Redeemed'), 0) AS current_reward_points,
    
    (SELECT COUNT(*) FROM public.dealer_reward_claims rc WHERE rc.customer_id = cm.id AND rc.status = 'Pending') AS pending_claims_count
    
FROM public.v_customer_master cm
WHERE cm.relationship_type = 'Dealer';

GRANT SELECT ON public.v_dealer_growth_hub TO authenticated;
