-- SPRINT 27: Dormant Customer Identification Rules
-- Implements the 180-day financial inactivity threshold.

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
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.mobile,
    c.whatsapp,
    c.city,
    s.last_sale_date,
    CURRENT_DATE - s.last_sale_date AS days_inactive,
    s.qualifying_tx_count,
    CASE 
        WHEN s.last_sale_date IS NULL THEN 'No Tally sales history available.'
        WHEN (CURRENT_DATE - s.last_sale_date) > 180 THEN 'No qualifying sale transaction for ' || (CURRENT_DATE - s.last_sale_date) || ' days.'
        ELSE NULL
    END AS candidate_reason
FROM public.crm_parties c
LEFT JOIN sales_stats s ON c.id = s.crm_party_id
WHERE c.crm_status = 'Active' 
  AND (s.last_sale_date IS NULL OR (CURRENT_DATE - s.last_sale_date) > 180);
