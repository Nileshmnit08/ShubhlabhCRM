-- SPRINT 28: Dormant Candidate Review Schema
-- Extends the Dormant Candidates view to include Human Review state without modifying crm_parties.

DROP VIEW IF EXISTS v_dormant_candidates CASCADE;
CREATE OR REPLACE VIEW v_dormant_candidates AS
WITH sales_stats AS (
    SELECT 
        crm_party_id,
        MAX(voucher_date) as last_sale_date,
        COUNT(id) as qualifying_tx_count
    FROM public.tally_transactions
    WHERE voucher_type ILIKE '%sale%' 
      AND amount > 0 
      AND NOT is_credit
    GROUP BY crm_party_id
),
latest_reviews AS (
    SELECT 
        party_id,
        outcome,
        user_id,
        created_at,
        ROW_NUMBER() OVER (PARTITION BY party_id ORDER BY created_at DESC) as rn
    FROM public.interactions
    WHERE interaction_type = 'Dormant Review'
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.mobile,
    c.whatsapp,
    c.city,
    c.assigned_owner_id,
    u.display_name AS owner_name,
    s.last_sale_date,
    CURRENT_DATE - s.last_sale_date AS days_inactive,
    s.qualifying_tx_count,
    CASE 
        WHEN s.last_sale_date IS NULL THEN 'No Tally sales history available.'
        WHEN (CURRENT_DATE - s.last_sale_date) > 180 THEN 'No qualifying sale transaction for ' || (CURRENT_DATE - s.last_sale_date) || ' days.'
        ELSE NULL
    END AS candidate_reason,
    COALESCE(lr.outcome, 'PENDING') AS review_state,
    lr.user_id AS reviewed_by,
    ru.display_name AS reviewed_by_name,
    lr.created_at AS reviewed_at
FROM public.crm_parties c
LEFT JOIN sales_stats s ON c.id = s.crm_party_id
LEFT JOIN public.app_users u ON c.assigned_owner_id = u.id
LEFT JOIN latest_reviews lr ON c.id = lr.party_id AND lr.rn = 1
LEFT JOIN public.app_users ru ON lr.user_id = ru.id
WHERE c.crm_status = 'Active' 
  AND (s.last_sale_date IS NULL OR (CURRENT_DATE - s.last_sale_date) > 180);
