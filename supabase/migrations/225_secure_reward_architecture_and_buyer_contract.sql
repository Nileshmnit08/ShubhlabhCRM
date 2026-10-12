-- ============================================================================
-- MIGRATION: 225_secure_reward_architecture_and_buyer_contract.sql
-- SPRINT: SL-REWARD-SECURITY-AND-DATA-CONTRACT-02
--
-- PURPOSE:
-- 1. Restrict dealer schemes and slabs creation/editing/deletion to Admins.
-- 2. Restrict requirement_dispatches so buyers view ONLY their own dispatches.
-- 3. Enable RLS on all reward tables with buyer-isolated SELECT policies.
-- 4. Secure get_customer_scheme_performance() against anonymous and buyer calls.
-- 5. Fix silent reversal bug in recalculate_dealer_scheme_eligibility() on Approved rewards.
-- 6. Deploy canonical get_buyer_my_schemes() with search_path and multi-milestone ladder.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1: SECURE DEALER SCHEMES & SLABS
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all on dealer_schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Authenticated users can view active schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Admins can manage schemes" ON public.dealer_schemes;

DROP POLICY IF EXISTS "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Authenticated users can view scheme slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Admins can manage scheme slabs" ON public.dealer_scheme_slabs;

-- Schemes: Active schemes visible to all authenticated users; all schemes to Staff/Admin
CREATE POLICY "Authenticated users can view active schemes"
  ON public.dealer_schemes FOR SELECT TO authenticated
  USING (status = 'Active' OR public.is_active_user() OR public.is_admin());

-- Schemes: Admin management only
CREATE POLICY "Admins can manage schemes"
  ON public.dealer_schemes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Slabs: Viewable by all authenticated users
CREATE POLICY "Authenticated users can view scheme slabs"
  ON public.dealer_scheme_slabs FOR SELECT TO authenticated
  USING (true);

-- Slabs: Admin management only (Blocks unauthorized buyer tampering)
CREATE POLICY "Admins can manage scheme slabs"
  ON public.dealer_scheme_slabs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2: SECURE REQUIREMENT DISPATCHES
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all on requirement_dispatches" ON public.requirement_dispatches;
DROP POLICY IF EXISTS "Staff can manage requirement dispatches" ON public.requirement_dispatches;
DROP POLICY IF EXISTS "Buyers can view own dispatches" ON public.requirement_dispatches;

REVOKE SELECT ON public.v_requirement_dispatch_summary FROM anon;

-- Staff/Admin: Full operational dispatch management
CREATE POLICY "Staff can manage requirement dispatches"
  ON public.requirement_dispatches FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

-- Buyer: SELECT ONLY their own requirement dispatches
CREATE POLICY "Buyers can view own dispatches"
  ON public.requirement_dispatches FOR SELECT TO authenticated
  USING (
    public.is_buyer() AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_dispatches.requirement_id
        AND r.party_id = public.get_auth_crm_party_id()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 3: ENABLE RLS ON ALL REWARD TABLES
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.dealer_reward_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_calculation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_claims ENABLE ROW LEVEL SECURITY;

-- dealer_reward_eligibility
DROP POLICY IF EXISTS "Staff can manage reward eligibility" ON public.dealer_reward_eligibility;
DROP POLICY IF EXISTS "Buyers can view own reward eligibility" ON public.dealer_reward_eligibility;

CREATE POLICY "Staff can manage reward eligibility"
  ON public.dealer_reward_eligibility FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward eligibility"
  ON public.dealer_reward_eligibility FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_calculation_audit (Internal audit log; no buyer access)
DROP POLICY IF EXISTS "Staff can view reward calculation audit" ON public.dealer_reward_calculation_audit;

CREATE POLICY "Staff can view reward calculation audit"
  ON public.dealer_reward_calculation_audit FOR SELECT TO authenticated
  USING (public.is_active_user() OR public.is_admin());

-- dealer_targets
DROP POLICY IF EXISTS "Staff can manage dealer targets" ON public.dealer_targets;
DROP POLICY IF EXISTS "Buyers can view own dealer targets" ON public.dealer_targets;

CREATE POLICY "Staff can manage dealer targets"
  ON public.dealer_targets FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own dealer targets"
  ON public.dealer_targets FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_ledger
DROP POLICY IF EXISTS "Staff can manage reward ledger" ON public.dealer_reward_ledger;
DROP POLICY IF EXISTS "Buyers can view own reward ledger" ON public.dealer_reward_ledger;

CREATE POLICY "Staff can manage reward ledger"
  ON public.dealer_reward_ledger FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward ledger"
  ON public.dealer_reward_ledger FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_claims
DROP POLICY IF EXISTS "Staff can manage reward claims" ON public.dealer_reward_claims;
DROP POLICY IF EXISTS "Buyers can view own reward claims" ON public.dealer_reward_claims;

CREATE POLICY "Staff can manage reward claims"
  ON public.dealer_reward_claims FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward claims"
  ON public.dealer_reward_claims FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 4: RESTRICT GLOBAL PERFORMANCE RPC (WITH SEARCH_PATH HARDENING)
-- ────────────────────────────────────────────────────────────────────────────

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
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Guard: Only internal CRM staff or admins may view company-wide performance
    IF NOT (public.is_active_user() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Access denied: CRM staff only' USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    WITH active_schemes AS (
        SELECT ds.id, ds.name, ds.start_date, ds.end_date, 
               ds.near_slab_percentage, ds.near_slab_bag_threshold
        FROM public.dealer_schemes ds
        WHERE ds.status = 'Active'
    ),
    purchasing_customers AS (
        SELECT DISTINCT c.id, c.display_name, c.mobile, c.city, c.territory_name, c.owner_name
        FROM public.v_customer_master c
        LEFT JOIN public.sales_invoices si ON c.id = si.customer_id AND si.status = 'Completed'
        LEFT JOIN public.requirements req ON c.id = req.party_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id AND rd.status != 'Cancelled'
        WHERE c.crm_status = 'Active' AND (si.id IS NOT NULL OR rd.id IS NOT NULL)
    ),
    scheme_bags AS (
        SELECT pc.id AS customer_id, s.id AS scheme_id,
               COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) AS current_net_bags
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
        SELECT pc.id AS customer_id,
               COALESCE(SUM(
                   CASE WHEN sili.is_return = true OR sili.status = 'Cancelled' THEN -sili.converted_bag_quantity
                        ELSE sili.converted_bag_quantity END
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
        SELECT hb.customer_id, hb.hist_total_bags,
            GREATEST(1, LEAST(3, COALESCE(
                (EXTRACT(year FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))) * 12 +
                 EXTRACT(month FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))))::INT, 1
            ))) AS active_months,
            hb.hist_total_bags / GREATEST(1, LEAST(3, COALESCE(
                (EXTRACT(year FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))) * 12 +
                 EXTRACT(month FROM age(date_trunc('month', CURRENT_DATE), date_trunc('month', hb.first_invoice_date))))::INT, 1
            ))) AS historical_monthly_bags
        FROM historical_bags hb
    ),
    slab_eval AS (
        SELECT sb.customer_id, sb.scheme_id, sb.current_net_bags, hm.historical_monthly_bags,
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
    SELECT s.id, s.name, s.start_date, s.end_date,
        GREATEST(0, (s.end_date - CURRENT_DATE)::INT),
        pc.id, pc.display_name, pc.mobile, pc.city, pc.territory_name, pc.owner_name,
        se.current_net_bags, se.historical_monthly_bags,
        ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2),
        CASE WHEN ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2) > 0 
             THEN ROUND((se.current_net_bags / NULLIF(ROUND(se.historical_monthly_bags * (GREATEST(0, LEAST((CURRENT_DATE - s.start_date)::INT, (s.end_date - s.start_date)::INT)) / 30.0), 2), 0)) * 100, 2)
             ELSE 0 END,
        se.achieved_slab_id, se.achieved_slab_name, se.next_slab_id, se.next_slab_name,
        COALESCE(se.next_slab_min_bags - se.current_net_bags, 0),
        se.reward_earned, se.potential_next_reward,
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
$$;

REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_customer_scheme_performance() TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: SECURE RECALCULATION & PROTECT APPROVED REWARDS
-- ────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.recalculate_dealer_scheme_eligibility(UUID, UUID);

CREATE OR REPLACE FUNCTION public.recalculate_dealer_scheme_eligibility(p_customer_id UUID, p_scheme_id UUID)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_total_bags NUMERIC(15,2) := 0;
    v_scheme_start DATE;
    v_scheme_end DATE;
    v_scheme_status VARCHAR(50);
    v_slab_record RECORD;
BEGIN
    -- Guard: If invoked over direct RPC, require Staff or Admin
    IF auth.uid() IS NOT NULL AND NOT (public.is_active_user() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Access denied: internal calculation only' USING ERRCODE = '42501';
    END IF;

    SELECT start_date, end_date, status INTO v_scheme_start, v_scheme_end, v_scheme_status
    FROM public.dealer_schemes WHERE id = p_scheme_id;
    
    IF v_scheme_status != 'Active' THEN
        RETURN;
    END IF;

    -- Compute net bags (deducting returns, avoiding negative values)
    SELECT GREATEST(0, COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0)) INTO v_total_bags
    FROM public.requirement_dispatches rd
    JOIN public.requirements req ON rd.requirement_id = req.id
    WHERE req.party_id = p_customer_id
      AND rd.status != 'Cancelled'
      AND rd.dispatch_date >= v_scheme_start
      AND rd.dispatch_date <= v_scheme_end;

    INSERT INTO public.dealer_reward_calculation_audit (customer_id, scheme_id, old_bag_total, new_bag_total, trigger_event)
    VALUES (p_customer_id, p_scheme_id, null, v_total_bags, 'Recalculation Triggered');

    FOR v_slab_record IN 
        SELECT id, min_bags, max_bags FROM public.dealer_scheme_slabs 
        WHERE scheme_id = p_scheme_id ORDER BY min_bags ASC
    LOOP
        IF v_total_bags >= v_slab_record.min_bags AND (v_slab_record.max_bags IS NULL OR v_total_bags <= v_slab_record.max_bags) THEN
            INSERT INTO public.dealer_reward_eligibility (customer_id, scheme_id, slab_id, qualifying_bags, status)
            VALUES (p_customer_id, p_scheme_id, v_slab_record.id, v_total_bags, 'Eligible')
            ON CONFLICT (customer_id, scheme_id, slab_id) 
            DO UPDATE SET 
                qualifying_bags = EXCLUDED.qualifying_bags,
                status = CASE 
                    WHEN public.dealer_reward_eligibility.status = 'Reversed' THEN 'Eligible' 
                    ELSE public.dealer_reward_eligibility.status 
                END,
                updated_at = NOW();
        ELSE
            -- Below threshold:
            -- 1. If currently 'Eligible' or 'Pending Approval', safe to mark as 'Reversed'
            UPDATE public.dealer_reward_eligibility
            SET status = 'Reversed', updated_at = NOW()
            WHERE customer_id = p_customer_id 
              AND scheme_id = p_scheme_id 
              AND slab_id = v_slab_record.id 
              AND status IN ('Eligible', 'Pending Approval');

            -- 2. If currently 'Approved', DO NOT silently reverse!
            IF EXISTS (
                SELECT 1 FROM public.dealer_reward_eligibility
                WHERE customer_id = p_customer_id 
                  AND scheme_id = p_scheme_id 
                  AND slab_id = v_slab_record.id 
                  AND status = 'Approved'
            ) THEN
                INSERT INTO public.dealer_reward_calculation_audit (
                    customer_id, scheme_id, old_bag_total, new_bag_total, trigger_event
                ) VALUES (
                    p_customer_id, p_scheme_id, v_total_bags, v_slab_record.min_bags, 
                    'DEFICIT_ON_APPROVED_REWARD: Review Required'
                );
            END IF;
            -- 3. If currently 'Fulfilled', physical gift handed over; leave intact.
        END IF;
    END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) TO authenticated;

-- Ensure dispatch trigger function is hardened as SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.trg_dispatch_changed()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
    v_dispatch_date DATE;
    v_scheme_record RECORD;
BEGIN
    IF TG_OP = 'DELETE' THEN
        SELECT party_id INTO v_customer_id FROM public.requirements WHERE id = OLD.requirement_id;
        v_dispatch_date := OLD.dispatch_date;
    ELSE
        SELECT party_id INTO v_customer_id FROM public.requirements WHERE id = NEW.requirement_id;
        v_dispatch_date := NEW.dispatch_date;
    END IF;

    FOR v_scheme_record IN
        SELECT id FROM public.dealer_schemes
        WHERE status = 'Active' 
          AND start_date <= v_dispatch_date 
          AND end_date >= v_dispatch_date
    LOOP
        PERFORM public.recalculate_dealer_scheme_eligibility(v_customer_id, v_scheme_record.id);
    END LOOP;

    RETURN NULL;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: BUYER READ CONTRACT (CANONICAL MULTI-MILESTONE ELIGIBILITY REUSE)
-- ────────────────────────────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.get_buyer_my_schemes();

CREATE OR REPLACE FUNCTION public.get_buyer_my_schemes()
RETURNS TABLE (
    scheme_id UUID,
    scheme_name TEXT,
    description TEXT,
    start_date DATE,
    end_date DATE,
    days_remaining INT,
    current_net_bags NUMERIC,
    highest_achieved_slab_id UUID,
    highest_achieved_slab_name TEXT,
    highest_reward_earned TEXT,
    highest_milestone_status TEXT,
    next_slab_id UUID,
    next_slab_name TEXT,
    potential_next_reward TEXT,
    bags_needed_for_next NUMERIC,
    progress_to_next_percentage NUMERIC,
    milestones JSONB
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_customer_id UUID;
BEGIN
    -- Server-side identity anchor; NEVER trusts client-supplied ID
    v_customer_id := public.get_auth_crm_party_id();
    
    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    WITH buyer_schemes AS (
        SELECT ds.id AS s_id, ds.name AS s_name, ds.description AS s_desc,
               ds.start_date AS s_start, ds.end_date AS s_end,
               GREATEST(0, (ds.end_date - CURRENT_DATE)::INT) AS s_days_rem
        FROM public.dealer_schemes ds
        WHERE ds.status = 'Active'
    ),
    buyer_bags AS (
        SELECT bs.s_id,
               GREATEST(0, COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0)) AS total_bags
        FROM buyer_schemes bs
        LEFT JOIN public.requirements req ON req.party_id = v_customer_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id
            AND rd.status != 'Cancelled'
            AND rd.dispatch_date >= bs.s_start
            AND rd.dispatch_date <= bs.s_end
        GROUP BY bs.s_id
    ),
    -- Reuses authoritative dealer_reward_eligibility table without DISTINCT ON loss!
    all_milestones AS (
        SELECT 
            dss.scheme_id,
            dss.id AS slab_id,
            dss.slab_name,
            dss.min_bags,
            dss.max_bags,
            dss.reward_description,
            dss.reward_type,
            dss.reward_value,
            bb.total_bags,
            dre.id AS eligibility_id,
            dre.earned_at,
            dre.approved_at,
            dre.fulfilled_at,
            (CASE 
                WHEN dre.status = 'Fulfilled' THEN 'Fulfilled'
                WHEN dre.status = 'Approved' AND bb.total_bags < dss.min_bags THEN 'Review Required'
                WHEN dre.status = 'Approved' THEN 'Approved'
                WHEN dre.status = 'Pending Approval' THEN 'Pending Approval'
                WHEN dre.status = 'Eligible' THEN 'Eligible'
                WHEN dre.status = 'Reversed' THEN 'Reversed'
                WHEN bb.total_bags >= dss.min_bags THEN 'Eligible'
                ELSE 'In Progress'
            END)::TEXT AS calculated_milestone_status,
            (bb.total_bags >= dss.min_bags AND (dre.status IS NULL OR dre.status != 'Reversed')) AS is_milestone_achieved,
            GREATEST(0, dss.min_bags - bb.total_bags) AS bags_needed,
            CASE 
                WHEN dss.min_bags > 0 THEN LEAST(100.0, ROUND((bb.total_bags / dss.min_bags) * 100, 1))
                ELSE 100.0
            END AS milestone_progress_pct
        FROM public.dealer_scheme_slabs dss
        JOIN buyer_bags bb ON dss.scheme_id = bb.s_id
        LEFT JOIN public.dealer_reward_eligibility dre 
            ON dre.slab_id = dss.id 
           AND dre.customer_id = v_customer_id 
           AND dre.scheme_id = dss.scheme_id
    ),
    aggregated_milestones AS (
        SELECT 
            m.scheme_id,
            jsonb_agg(
                jsonb_build_object(
                    'slab_id', m.slab_id,
                    'slab_name', m.slab_name,
                    'min_bags', m.min_bags,
                    'max_bags', m.max_bags,
                    'reward_description', m.reward_description,
                    'reward_type', m.reward_type,
                    'reward_value', m.reward_value,
                    'milestone_status', m.calculated_milestone_status,
                    'is_achieved', m.is_milestone_achieved,
                    'bags_needed', m.bags_needed,
                    'progress_percentage', m.milestone_progress_pct,
                    'earned_at', m.earned_at,
                    'approved_at', m.approved_at,
                    'fulfilled_at', m.fulfilled_at
                ) ORDER BY m.min_bags ASC
            ) AS milestones_json,
            -- Highest achieved milestone
            (SELECT am.slab_id FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = true 
             ORDER BY am.min_bags DESC LIMIT 1) AS hi_slab_id,
            (SELECT am.slab_name FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = true 
             ORDER BY am.min_bags DESC LIMIT 1) AS hi_slab_name,
            (SELECT am.reward_description FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = true 
             ORDER BY am.min_bags DESC LIMIT 1) AS hi_reward_desc,
            (SELECT am.calculated_milestone_status::TEXT FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = true 
             ORDER BY am.min_bags DESC LIMIT 1)::TEXT AS hi_milestone_status,
            -- Next milestone above current bags
            (SELECT am.slab_id FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = false 
             ORDER BY am.min_bags ASC LIMIT 1) AS nxt_slab_id,
            (SELECT am.slab_name FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = false 
             ORDER BY am.min_bags ASC LIMIT 1) AS nxt_slab_name,
            (SELECT am.reward_description FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = false 
             ORDER BY am.min_bags ASC LIMIT 1) AS nxt_reward_desc,
            (SELECT am.bags_needed FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = false 
             ORDER BY am.min_bags ASC LIMIT 1) AS nxt_bags_needed,
            (SELECT am.milestone_progress_pct FROM all_milestones am 
             WHERE am.scheme_id = m.scheme_id AND am.is_milestone_achieved = false 
             ORDER BY am.min_bags ASC LIMIT 1) AS nxt_progress_pct
        FROM all_milestones m
        GROUP BY m.scheme_id
    )
    SELECT 
        bs.s_id AS scheme_id,
        bs.s_name::TEXT AS scheme_name,
        bs.s_desc::TEXT AS description,
        bs.s_start AS start_date,
        bs.s_end AS end_date,
        bs.s_days_rem AS days_remaining,
        bb.total_bags::NUMERIC AS current_net_bags,
        am.hi_slab_id AS highest_achieved_slab_id,
        am.hi_slab_name::TEXT AS highest_achieved_slab_name,
        am.hi_reward_desc::TEXT AS highest_reward_earned,
        am.hi_milestone_status::TEXT AS highest_milestone_status,
        am.nxt_slab_id AS next_slab_id,
        am.nxt_slab_name::TEXT AS next_slab_name,
        am.nxt_reward_desc::TEXT AS potential_next_reward,
        COALESCE(am.nxt_bags_needed, 0)::NUMERIC AS bags_needed_for_next,
        COALESCE(am.nxt_progress_pct, 100.0)::NUMERIC AS progress_to_next_percentage,
        COALESCE(am.milestones_json, '[]'::jsonb) AS milestones
    FROM buyer_schemes bs
    JOIN buyer_bags bb ON bs.s_id = bb.s_id
    LEFT JOIN aggregated_milestones am ON bs.s_id = am.scheme_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_buyer_my_schemes() TO authenticated;
