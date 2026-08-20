-- MICRO-SPRINT 12.5: PURCHASE BEHAVIOUR
-- Use validated voucher-level Tally data for simple recency/frequency/purchase-pattern intelligence.

CREATE OR REPLACE VIEW public.v_purchase_behaviour AS
WITH purchase_stats AS (
    SELECT 
        crm_party_id,
        MIN(voucher_date) as first_purchase_date,
        MAX(voucher_date) as last_purchase_date,
        COUNT(id) as total_purchases,
        SUM(amount) as total_purchase_value,
        -- Calculate the span in days
        (MAX(voucher_date) - MIN(voucher_date)) as days_between_first_last
    FROM public.tally_transactions
    WHERE is_credit = false -- Assuming false is Sale/Debit
    GROUP BY crm_party_id
)
SELECT 
    c.id AS party_id,
    c.display_name,
    c.crm_status,
    c.assigned_owner_id,
    
    ps.first_purchase_date,
    ps.last_purchase_date,
    COALESCE(ps.total_purchases, 0) AS total_purchases,
    COALESCE(ps.total_purchase_value, 0) AS total_purchase_value,
    
    CASE 
        WHEN ps.total_purchases IS NULL OR ps.total_purchases = 0 THEN 'No Purchase History'
        WHEN ps.total_purchases = 1 THEN 'Single Purchase'
        ELSE 'Repeat Buyer'
    END AS purchase_frequency_category,
    
    -- Average days between purchases (only if > 1 purchase)
    CASE 
        WHEN ps.total_purchases > 1 AND ps.days_between_first_last > 0 THEN 
            ROUND(ps.days_between_first_last::numeric / (ps.total_purchases - 1), 0)
        ELSE NULL
    END AS avg_days_between_purchases,
    
    -- Interrupted pattern detection
    -- Rule: If average is e.g. 10 days, and it has been > 15 days (1.5x) since the last purchase, flag it.
    CASE 
        WHEN ps.total_purchases > 1 
             AND ps.days_between_first_last > 0 
             AND (CURRENT_DATE - ps.last_purchase_date) > (ps.days_between_first_last / (ps.total_purchases - 1)) * 1.5 
             THEN true 
        ELSE false 
    END AS is_interrupted_pattern,
    
    -- Source period / Freshness
    CASE 
        WHEN ps.last_purchase_date IS NOT NULL THEN 
            CONCAT('History spans ', COALESCE(ps.days_between_first_last, 0), ' days. Last purchase ', (CURRENT_DATE - ps.last_purchase_date), ' days ago.')
        ELSE 'No Tally voucher data available.'
    END AS data_freshness_evidence

FROM public.crm_parties c
LEFT JOIN purchase_stats ps ON c.id = ps.crm_party_id;

GRANT SELECT ON public.v_purchase_behaviour TO authenticated;
GRANT SELECT ON public.v_purchase_behaviour TO anon;
