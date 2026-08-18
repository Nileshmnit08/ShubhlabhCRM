-- SPRINT 6: Simple Business Intelligence

-- 1. Add postpone_count to follow_ups
ALTER TABLE public.follow_ups
ADD COLUMN IF NOT EXISTS postpone_count INTEGER DEFAULT 0;

-- 2. Open Requirements View
CREATE OR REPLACE VIEW v_open_requirements AS
SELECT 
    r.id, 
    r.party_id, 
    r.product_type, 
    r.quantity, 
    r.unit, 
    r.expected_rate, 
    r.expected_date, 
    r.status, 
    c.display_name AS party_name 
FROM public.requirements r 
JOIN public.crm_parties c ON r.party_id = c.id 
WHERE r.status NOT IN ('Closed', 'Lost', 'Confirmed');

-- 3. Requirement Demand View
DROP VIEW IF EXISTS v_requirement_demand;
CREATE OR REPLACE VIEW v_requirement_demand AS
SELECT 
    r.product_type, 
    p.category,
    r.unit, 
    SUM(r.quantity) as total_quantity, 
    COUNT(*) as open_req_count 
FROM v_open_requirements r
LEFT JOIN public.products p ON r.product_type = p.name
GROUP BY r.product_type, p.category, r.unit;

-- 4. Today's Follow-ups View
CREATE OR REPLACE VIEW v_today_followups AS
SELECT 
    f.*, 
    c.display_name, 
    c.mobile, 
    c.whatsapp 
FROM public.follow_ups f 
JOIN public.crm_parties c ON f.party_id = c.id 
WHERE f.status = 'Pending' AND f.follow_up_date = CURRENT_DATE;

-- 5. Overdue Follow-ups View
CREATE OR REPLACE VIEW v_overdue_followups AS
SELECT 
    f.*, 
    c.display_name, 
    c.mobile, 
    c.whatsapp 
FROM public.follow_ups f 
JOIN public.crm_parties c ON f.party_id = c.id 
WHERE f.status = 'Pending' AND f.follow_up_date < CURRENT_DATE;

-- 6. Customer Attention View
DROP VIEW IF EXISTS v_customer_attention;
CREATE OR REPLACE VIEW v_customer_attention AS
WITH latest_interactions AS (
    SELECT party_id, MAX(created_at) as last_contact_date
    FROM public.interactions
    GROUP BY party_id
),
open_req_counts AS (
    SELECT party_id, COUNT(*) as req_count
    FROM public.requirements
    WHERE status NOT IN ('Closed', 'Lost', 'Confirmed')
    GROUP BY party_id
),
pending_followups AS (
    SELECT party_id, MAX(follow_up_date) as last_followup_date, MAX(postpone_count) as max_postpones
    FROM public.follow_ups
    WHERE status = 'Pending'
    GROUP BY party_id
)
SELECT 
    c.id AS party_id, 
    c.display_name,
    li.last_contact_date,
    COALESCE(orq.req_count, 0) AS open_req_count,
    COALESCE(pf.max_postpones, 0) AS max_postpones,
    CASE
        WHEN c.crm_status = 'Active' AND (li.last_contact_date IS NULL OR li.last_contact_date < CURRENT_DATE - INTERVAL '30 days') AND COALESCE(orq.req_count, 0) = 0 THEN 'Dormant Candidate'
        WHEN COALESCE(orq.req_count, 0) > 0 AND (pf.last_followup_date IS NULL OR pf.last_followup_date < CURRENT_DATE - INTERVAL '3 days') THEN 'At-Risk Candidate'
        WHEN COALESCE(pf.max_postpones, 0) >= 3 THEN 'Follow-up Risk'
        ELSE 'Healthy'
    END as attention_reason,
    CASE
        WHEN c.crm_status = 'Active' AND (li.last_contact_date IS NULL OR li.last_contact_date < CURRENT_DATE - INTERVAL '30 days') AND COALESCE(orq.req_count, 0) = 0 THEN 'Active customer with no contact in 30 days & no open requirements.'
        WHEN COALESCE(orq.req_count, 0) > 0 AND (pf.last_followup_date IS NULL OR pf.last_followup_date < CURRENT_DATE - INTERVAL '3 days') THEN 'Open requirement exists but no follow-up scheduled within 3 days.'
        WHEN COALESCE(pf.max_postpones, 0) >= 3 THEN 'Follow-up has been postponed 3 or more times.'
        ELSE 'No risk detected.'
    END as attention_rule_desc
FROM public.crm_parties c
LEFT JOIN latest_interactions li ON c.id = li.party_id
LEFT JOIN open_req_counts orq ON c.id = orq.party_id
LEFT JOIN pending_followups pf ON c.id = pf.party_id
WHERE
    (c.crm_status = 'Active' AND (li.last_contact_date IS NULL OR li.last_contact_date < CURRENT_DATE - INTERVAL '30 days') AND COALESCE(orq.req_count, 0) = 0)
    OR (COALESCE(orq.req_count, 0) > 0 AND (pf.last_followup_date IS NULL OR pf.last_followup_date < CURRENT_DATE - INTERVAL '3 days'))
    OR (COALESCE(pf.max_postpones, 0) >= 3);
