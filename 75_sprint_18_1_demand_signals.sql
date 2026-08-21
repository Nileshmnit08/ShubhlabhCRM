-- MICRO-SPRINT 18.1: DEMAND SIGNAL FOUNDATION
-- Unifies requirements, commercial intents, purchase behaviour, and Tally transactions into a single demand-signal layer.

CREATE OR REPLACE VIEW public.v_demand_signals WITH (security_invoker = true) AS

-- 1. Stated Requirement (Intent is NULL or 'Product Interest')
SELECT 
    'Stated Requirement' AS signal_type,
    r.id::text AS source_id,
    r.party_id,
    r.created_at AS signal_date,
    r.product_type AS product_reference,
    CONCAT(r.quantity, ' units expected by ', COALESCE(r.expected_date::text, 'TBD')) AS description,
    r.status AS signal_status,
    c.display_name AS party_name,
    c.assigned_owner_id
FROM public.requirements r
JOIN public.crm_parties c ON r.party_id = c.id
WHERE (r.intent_type IS NULL OR r.intent_type = 'Product Interest')

UNION ALL

-- 2. Commercial Intent (Intent is explicitly stated and advanced)
SELECT 
    'Commercial Intent' AS signal_type,
    r.id::text AS source_id,
    r.party_id,
    r.created_at AS signal_date,
    r.product_type AS product_reference,
    CONCAT('Intent: ', r.intent_type, ' | ', r.quantity, ' units') AS description,
    r.status AS signal_status,
    c.display_name AS party_name,
    c.assigned_owner_id
FROM public.requirements r
JOIN public.crm_parties c ON r.party_id = c.id
WHERE r.intent_type IS NOT NULL AND r.intent_type != 'Product Interest'

UNION ALL

-- 3. Repeat Purchase Evidence (Consistent buyer pattern from Tally BI)
SELECT 
    'Repeat Purchase Evidence' AS signal_type,
    pb.party_id::text AS source_id,
    pb.party_id,
    CURRENT_DATE::timestamp with time zone AS signal_date,
    'Historical Pattern' AS product_reference,
    CONCAT('Average gap: ', pb.avg_days_between_purchases, ' days across ', pb.total_purchases, ' purchases.') AS description,
    CASE WHEN pb.is_interrupted_pattern THEN 'Action Needed' ELSE 'Validated' END AS signal_status,
    pb.display_name AS party_name,
    pb.assigned_owner_id
FROM public.v_purchase_behaviour pb
WHERE pb.total_purchases > 1

UNION ALL

-- 4. Tally-Confirmed Transaction (Sales Voucher)
SELECT 
    'Tally Transaction' AS signal_type,
    tt.id::text AS source_id,
    tt.crm_party_id AS party_id,
    tt.voucher_date::timestamp with time zone AS signal_date,
    tt.tally_ledger_name AS product_reference,
    CONCAT('Voucher ', tt.voucher_no, ' for Amt ', tt.amount) AS description,
    'Closed' AS signal_status,
    c.display_name AS party_name,
    c.assigned_owner_id
FROM public.tally_transactions tt
JOIN public.crm_parties c ON tt.crm_party_id = c.id
WHERE tt.is_credit = false AND tt.voucher_type = 'Sales';

GRANT SELECT ON public.v_demand_signals TO authenticated;
