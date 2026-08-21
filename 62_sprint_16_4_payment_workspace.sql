-- MICRO-SPRINT 16.4: PAYMENT FOLLOW-UP WORKSPACE

DROP VIEW IF EXISTS public.v_payment_followup_workspace CASCADE;
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
