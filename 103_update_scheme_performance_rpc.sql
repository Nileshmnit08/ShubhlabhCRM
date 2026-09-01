-- Migration: 103_update_scheme_performance_rpc.sql
-- Description: Update scheme performance RPC to use dispatches instead of invoices for active achievements

DROP FUNCTION IF EXISTS public.get_customer_scheme_performance();

CREATE OR REPLACE FUNCTION public.get_customer_scheme_performance()
RETURNS TABLE (
    scheme_id UUID,
    scheme_name VARCHAR,
    start_date DATE,
    end_date DATE,
    days_remaining INT,
    customer_id UUID,
    customer_name VARCHAR,
    mobile VARCHAR,
    city VARCHAR,
    territory_name VARCHAR,
    owner_name VARCHAR,
    current_net_bags NUMERIC,
    historical_monthly_bags NUMERIC,
    expected_bags_to_date NUMERIC,
    pace_percentage NUMERIC,
    achieved_slab_id UUID,
    achieved_slab_name VARCHAR,
    next_slab_id UUID,
    next_slab_name VARCHAR,
    bags_needed NUMERIC,
    reward_earned TEXT,
    potential_next_reward TEXT,
    status VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH active_schemes AS (
        SELECT 
            ds.id, ds.name, ds.start_date, ds.end_date, 
            ds.near_slab_percentage, ds.near_slab_bag_threshold
        FROM public.dealer_schemes ds
        WHERE ds.status = 'Active'
    ),
    purchasing_customers AS (
        -- Customers with at least one historical invoice OR a dispatch
        SELECT DISTINCT c.id, c.display_name, c.mobile, c.city, c.territory_name, c.owner_name
        FROM public.v_customer_master c
        LEFT JOIN public.sales_invoices si ON c.id = si.customer_id AND si.status = 'Completed'
        LEFT JOIN public.requirements req ON c.id = req.party_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id AND rd.status != 'Cancelled'
        WHERE c.crm_status = 'Active' AND (si.id IS NOT NULL OR rd.id IS NOT NULL)
    ),
    scheme_bags AS (
        SELECT 
            pc.id AS customer_id,
            s.id AS scheme_id,
            COALESCE(SUM(
                rd.quantity - COALESCE(rd.return_quantity, 0)
            ), 0) AS current_net_bags
        FROM purchasing_customers pc
        CROSS JOIN active_schemes s
        LEFT JOIN public.requirements req ON pc.id = req.party_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id 
            AND rd.status != 'Cancelled' 
            AND rd.dispatch_date >= s.start_date 
            AND rd.dispatch_date <= s.end_date
        GROUP BY pc.id, s.id
    ),
    historical_bags AS (
        SELECT 
            pc.id AS customer_id,
            COALESCE(SUM(
                CASE 
                    WHEN sili.is_return = true OR sili.status = 'Cancelled' THEN -sili.converted_bag_quantity
                    ELSE sili.converted_bag_quantity
                END
            ), 0) AS hist_total_bags,
            MIN(si.invoice_date) AS first_invoice_date
        FROM purchasing_customers pc
        LEFT JOIN public.sales_invoices si ON pc.id = si.customer_id 
            AND si.status = 'Completed' 
            AND si.invoice_date >= (date_trunc('month', CURRENT_DATE) - INTERVAL '3 months')
            AND si.invoice_date < date_trunc('month', CURRENT_DATE)
        LEFT JOIN public.sales_invoice_line_items sili ON si.id = sili.invoice_id
        GROUP BY pc.id
    ),
    historical_metrics AS (
        SELECT 
            hb.customer_id,
            hb.hist_total_bags,
            GREATEST(1, 
                LEAST(3, 
                    COALESCE(
                        (EXTRACT(year FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))) * 12 +
                        EXTRACT(month FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))))::INT,
                        1
                    )
                )
            ) AS active_months,
            hb.hist_total_bags / GREATEST(1, 
                LEAST(3, 
                    COALESCE(
                        (EXTRACT(year FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))) * 12 +
                        EXTRACT(month FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))))::INT,
                        1
                    )
                )
            ) AS historical_monthly_bags
        FROM historical_bags hb
    ),
    slab_eval AS (
        SELECT 
            sb.customer_id,
            sb.scheme_id,
            sb.current_net_bags,
            hm.historical_monthly_bags,
            (SELECT id FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags <= sb.current_net_bags ORDER BY min_bags DESC LIMIT 1) AS achieved_slab_id,
            (SELECT slab_name FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags <= sb.current_net_bags ORDER BY min_bags DESC LIMIT 1) AS achieved_slab_name,
            (SELECT reward_description FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags <= sb.current_net_bags ORDER BY min_bags DESC LIMIT 1) AS reward_earned,
            (SELECT id FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags > sb.current_net_bags ORDER BY min_bags ASC LIMIT 1) AS next_slab_id,
            (SELECT slab_name FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags > sb.current_net_bags ORDER BY min_bags ASC LIMIT 1) AS next_slab_name,
            (SELECT reward_description FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags > sb.current_net_bags ORDER BY min_bags ASC LIMIT 1) AS potential_next_reward,
            (SELECT min_bags FROM public.dealer_scheme_slabs dss WHERE dss.scheme_id = sb.scheme_id AND dss.min_bags > sb.current_net_bags ORDER BY min_bags ASC LIMIT 1) AS next_slab_min_bags
        FROM scheme_bags sb
        JOIN historical_metrics hm ON sb.customer_id = hm.customer_id
    )
    SELECT 
        s.id AS scheme_id,
        s.name AS scheme_name,
        s.start_date,
        s.end_date,
        GREATEST(0, (s.end_date - CURRENT_DATE)::INT) AS days_remaining,
        pc.id AS customer_id,
        pc.display_name AS customer_name,
        pc.mobile,
        pc.city,
        pc.territory_name,
        pc.owner_name,
        se.current_net_bags,
        se.historical_monthly_bags,
        ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2) AS expected_bags_to_date,
        CASE 
            WHEN ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2) > 0 
            THEN ROUND((se.current_net_bags / NULLIF(ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2), 0)) * 100, 2)
            ELSE 0 
        END AS pace_percentage,
        se.achieved_slab_id,
        se.achieved_slab_name,
        se.next_slab_id,
        se.next_slab_name,
        COALESCE(se.next_slab_min_bags - se.current_net_bags, 0) AS bags_needed,
        se.reward_earned,
        se.potential_next_reward,
        (CASE
            WHEN CURRENT_DATE > s.end_date THEN 'ended'
            WHEN se.achieved_slab_id IS NOT NULL THEN 'eligible'
            WHEN se.next_slab_id IS NOT NULL AND (
                (se.next_slab_min_bags - se.current_net_bags) <= s.near_slab_bag_threshold OR 
                ((se.next_slab_min_bags - se.current_net_bags) / NULLIF(se.next_slab_min_bags, 0) * 100) <= s.near_slab_percentage
            ) THEN 'near_next_slab'
            WHEN se.current_net_bags > 0 THEN 
                CASE 
                    WHEN se.historical_monthly_bags <= 0 THEN 'no_baseline'
                    WHEN (se.current_net_bags / NULLIF(ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2), 0)) >= 0.9 THEN 'in_progress'
                    WHEN (se.current_net_bags / NULLIF(ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2), 0)) >= 0.8 THEN 'near_monthly_target'
                    ELSE 'at_risk'
                END
            ELSE 'no_activity'
        END)::VARCHAR AS status
    FROM purchasing_customers pc
    JOIN slab_eval se ON pc.id = se.customer_id
    JOIN active_schemes s ON se.scheme_id = s.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_customer_scheme_performance() TO authenticated;
