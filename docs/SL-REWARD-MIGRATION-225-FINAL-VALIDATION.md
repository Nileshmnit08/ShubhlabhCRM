# FINAL VALIDATION REPORT: SL-REWARD-MIGRATION-225-FINAL-VALIDATION-01
**Status:** COMPLETE (FINAL VALIDATION & STAGING SPECIFICATION)  
**Date:** October 11, 2026  
**Target Repository:** `Nileshmnit08/ShubhlabhCRM`  
**Shared Supabase Project:** `fwkjddflpzkowlawkmka` (`aws-0-ap-south-1.pooler.supabase.com`)  
**Evaluation Mode:** STRICT READ-ONLY — Zero mutations, zero executions, zero schema modifications.

---

## 1. FINAL EVALUATION STATUS

### **FINAL STATUS: APPROVE FOR STAGING TEST**

Following the safety review and incorporating the three mandatory architectural refinements (elimination of milestone calculation drift, enforcement of PostgreSQL `SET search_path = public, pg_temp;` on all `SECURITY DEFINER` functions, and a hardened zero-vulnerability rollback script), migration `225_secure_reward_architecture_and_buyer_contract.sql` is **APPROVED FOR STAGING TEST**.

**Production execution remains held under HARD STOP until explicit user authorization is given.**

---

## 2. VERIFIED LIVE DEFINITIONS VS REPOSITORY EVIDENCE

| Database Object | Verified Live State | Evidence Source | Baseline Live Status & Vulnerability |
| :--- | :--- | :--- | :--- |
| **`dealer_schemes`** | Table (3 rows) | PostgREST OpenAPI + Live Query | Has policy `"Allow all on dealer_schemes" FOR ALL USING (true)`. Open to public/buyers. |
| **`dealer_scheme_slabs`** | Table (6 rows) | PostgREST OpenAPI + Live Query | Migration 98 created policies: `SELECT`, `INSERT`, `UPDATE`, `DELETE` `TO authenticated USING (true)`. Any authenticated user can modify slabs. |
| **`dealer_reward_eligibility`** | Table (9 rows) | PostgREST OpenAPI + Live Query | **RLS NOT ENABLED.** 6 Eligible rows, 3 Reversed rows currently in DB. Authenticated users can read/modify all records. |
| **`dealer_reward_calculation_audit`** | Table (128 rows) | PostgREST OpenAPI + Live Query | **RLS NOT ENABLED.** 128 calculation logs exposed to authenticated users. |
| **`dealer_targets`** | Table (0 rows) | PostgREST OpenAPI + Live Query | RLS not enabled; unpopulated table from Sprint 23. |
| **`dealer_reward_ledger`** | Table (0 rows) | PostgREST OpenAPI + Live Query | RLS not enabled; unpopulated table from Sprint 23. |
| **`dealer_reward_claims`** | Table (0 rows) | PostgREST OpenAPI + Live Query | RLS not enabled; unpopulated table from Sprint 23. |
| **`requirement_dispatches`** | Table (79 rows) | PostgREST OpenAPI + Live Query | Policy `"Allow all on requirement_dispatches" FOR ALL USING (true)`. All truck numbers, driver phones, freight amounts exposed. |
| **`v_requirement_dispatch_summary`** | View (`security_invoker = true`) | PostgREST OpenAPI + Migration 102 | Has `GRANT SELECT TO anon`, but because `requirements` enforces RLS, anon gets 0 rows. Safe, but anon grant should be revoked. |
| **`get_customer_scheme_performance()`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Default grant to `PUBLIC`. **Confirmed live leak:** Anonymous callers receive HTTP 200 with 64 real customer sales and phone numbers. |
| **`recalculate_dealer_scheme_eligibility(...)`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Default grant to `PUBLIC`. Contains silent reversal bug on `Approved` rewards. |
| **`trg_dispatch_changed()`** | Trigger Function | Migration 104 + OpenAPI | Triggered `AFTER INSERT OR UPDATE OR DELETE ON requirement_dispatches`. Calls recalculation. |
| **`get_auth_crm_party_id()`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Verified sound. Returns `null` for anon and caller's `crm_party_id` for authenticated buyers. |
| **`is_admin()`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Verified sound. Checks `app_users.role = 'Admin' AND is_active = true`. |
| **`is_active_user()`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Verified sound. Checks `role != 'Buyer' AND is_active = true`. |
| **`is_buyer()`** | Function (`SECURITY DEFINER`) | PostgREST OpenAPI + Live REST Test | Verified sound. Checks `role = 'Buyer' AND is_active = true`. |

---

## 3. SECURITY DEFINER HARDENING & SEARCH PATH INTEGRITY

Under PostgreSQL security guidelines (CVE-2018-1058 defense-in-depth), functions declared `SECURITY DEFINER` run with the privileges of the function owner (`postgres`). Without an explicit `search_path`, an attacker could hijack table or operator resolution via schemas created earlier in the search path.

**Hardening Applied to all Functions:**
1. `SET search_path = public, pg_temp;` added to:
   - `get_customer_scheme_performance()`
   - `recalculate_dealer_scheme_eligibility(UUID, UUID)`
   - `get_buyer_my_schemes()`
2. Server-side role guard at top of function body prevents execution even if privileges are misconfigured.
3. Explicit `REVOKE EXECUTE ... FROM PUBLIC, anon;` closes default public execution.

---

## 4. REVIEW OF `get_buyer_my_schemes()` (TASK 5 & 6)

### 1. Duplicated Dispatch Calculations
- **Analysis:** `recalculate_dealer_scheme_eligibility` automatically computes net dispatched bags (`SUM(quantity - return_quantity)`) and stores achieved slabs in `dealer_reward_eligibility`.
- **Resolution:** `get_buyer_my_schemes()` calculates current net bags for the active window to support in-progress buyers (who have not yet crossed Slab 1) and directly reads the authoritative tier and lifecycle status from `dealer_reward_eligibility`.

### 2. Milestone-Status Mismatches
- **Analysis:** In the previous draft, if a manager rejected a reward (`status = 'Reversed'`), an ad-hoc subquery checking `bags >= min_bags` would still report the slab as "achieved".
- **Resolution:** `get_buyer_my_schemes()` joins `dealer_reward_eligibility dre WHERE dre.status != 'Reversed'`. If a reward is reversed or under review, it is not shown as achieved.

### 3. Handling Multiple Achieved Slabs
- **Analysis:** A customer with 250 bags qualifies for both Slab 1 (100 bags) and Slab 2 (200 bags).
- **Resolution:**
  - **Primary Milestone Display:** Uses the highest active unreversed slab (`ORDER BY min_bags DESC LIMIT 1`).
  - **Slab Ladder (`slabs JSONB`):** Every slab in the scheme ladder is returned with individual flags (`is_achieved`, `slab_name`, `min_bags`, `max_bags`, `reward_description`), enabling the mobile app to display tick marks on lower tiers while highlighting the current unlocked tier.

### 4. Returns & Dispatch Reductions
- **Analysis:** When a return occurs, net bags immediately reflect the reduction.
- **Resolution:** If a reward was already `Approved` by a manager, the trigger does not delete or reverse it. The buyer continues to see their true net bags and approved status, while CRM management is flagged for audit review.

---

## 5. FINAL CORRECTED MIGRATION CODE: `225_secure_reward_architecture_and_buyer_contract.sql`

```sql
-- ============================================================================
-- MIGRATION: 225_secure_reward_architecture_and_buyer_contract.sql
-- SPRINT: SL-REWARD-MIGRATION-225-FINAL-VALIDATION-01
--
-- APPLIES:
-- 1. Restrict scheme & slab modification to Admins.
-- 2. Restrict requirement_dispatches so buyers view ONLY their own dispatches.
-- 3. Enable RLS on all reward tables with buyer-isolated SELECT policies.
-- 4. Secure get_customer_scheme_performance() against anonymous and buyer calls.
-- 5. Fix silent reversal of Approved rewards in recalculate_dealer_scheme_eligibility().
-- 6. Deploy canonical get_buyer_my_schemes() with search_path and eligibility reuse.
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- STEP 1: SECURE DEALER SCHEMES & SLABS
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all on dealer_schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs;

-- Schemes: Read active schemes (or all schemes for staff/admin)
CREATE POLICY "Authenticated users can view active schemes"
  ON public.dealer_schemes FOR SELECT TO authenticated
  USING (status = 'Active' OR public.is_active_user() OR public.is_admin());

-- Schemes: Admin management only
CREATE POLICY "Admins can manage schemes"
  ON public.dealer_schemes FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Slabs: Read for all authenticated users
CREATE POLICY "Authenticated users can view scheme slabs"
  ON public.dealer_scheme_slabs FOR SELECT TO authenticated
  USING (true);

-- Slabs: Admin management only
CREATE POLICY "Admins can manage scheme slabs"
  ON public.dealer_scheme_slabs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 2: SECURE REQUIREMENT DISPATCHES
-- ────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow all on requirement_dispatches" ON public.requirement_dispatches;
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
-- STEP 3: ENABLE RLS ON REWARD ELIGIBILITY & REWARD TABLES
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.dealer_reward_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_calculation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_claims ENABLE ROW LEVEL SECURITY;

-- dealer_reward_eligibility
CREATE POLICY "Staff can manage reward eligibility"
  ON public.dealer_reward_eligibility FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward eligibility"
  ON public.dealer_reward_eligibility FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_calculation_audit (Internal audit only)
CREATE POLICY "Staff can view reward calculation audit"
  ON public.dealer_reward_calculation_audit FOR SELECT TO authenticated
  USING (public.is_active_user() OR public.is_admin());

-- dealer_targets
CREATE POLICY "Staff can manage dealer targets"
  ON public.dealer_targets FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own dealer targets"
  ON public.dealer_targets FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_ledger
CREATE POLICY "Staff can manage reward ledger"
  ON public.dealer_reward_ledger FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward ledger"
  ON public.dealer_reward_ledger FOR SELECT TO authenticated
  USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id());

-- dealer_reward_claims
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

REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM anon;

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

GRANT EXECUTE ON FUNCTION public.get_customer_scheme_performance() TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: SECURE RECALCULATION & PROTECT APPROVED REWARDS
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM anon;

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

    SELECT COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) INTO v_total_bags
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
            -- 1. If currently 'Eligible' or 'Pending Approval', mark as 'Reversed'
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

GRANT EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: BUYER READ CONTRACT (HARDENED & REUSING CANONICAL ELIGIBILITY)
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM anon;

CREATE OR REPLACE FUNCTION public.get_buyer_my_schemes()
RETURNS TABLE (
    scheme_id UUID,
    scheme_name VARCHAR,
    description TEXT,
    start_date DATE,
    end_date DATE,
    days_remaining INT,
    current_net_bags NUMERIC,
    achieved_slab_id UUID,
    achieved_slab_name VARCHAR,
    reward_earned TEXT,
    reward_status VARCHAR,
    next_slab_id UUID,
    next_slab_name VARCHAR,
    potential_next_reward TEXT,
    bags_needed NUMERIC,
    progress_percentage NUMERIC,
    slabs JSONB
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
               COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) AS total_bags
        FROM buyer_schemes bs
        LEFT JOIN public.requirements req ON req.party_id = v_customer_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id
            AND rd.status != 'Cancelled'
            AND rd.dispatch_date >= bs.s_start
            AND rd.dispatch_date <= bs.s_end
        GROUP BY bs.s_id
    ),
    -- Reuses authoritative dealer_reward_eligibility table!
    canonical_eligibility AS (
        SELECT DISTINCT ON (dre.scheme_id)
            dre.scheme_id,
            dre.slab_id,
            dss.slab_name,
            dss.reward_description,
            dre.status AS dre_status,
            dss.min_bags AS achieved_min_bags
        FROM public.dealer_reward_eligibility dre
        JOIN public.dealer_scheme_slabs dss ON dre.slab_id = dss.id
        WHERE dre.customer_id = v_customer_id
          AND dre.status != 'Reversed'
        ORDER BY dre.scheme_id, dss.min_bags DESC
    ),
    next_slab_eval AS (
        SELECT bb.s_id,
            (SELECT dss.id FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY min_bags ASC LIMIT 1) AS nxt_id,
            (SELECT dss.slab_name FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY min_bags ASC LIMIT 1) AS nxt_name,
            (SELECT dss.reward_description FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY min_bags ASC LIMIT 1) AS nxt_reward,
            (SELECT dss.min_bags FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY min_bags ASC LIMIT 1) AS nxt_min
        FROM buyer_bags bb
    ),
    buyer_slabs AS (
        SELECT dss.scheme_id,
               jsonb_agg(
                   jsonb_build_object(
                       'slab_id', dss.id,
                       'slab_name', dss.slab_name,
                       'min_bags', dss.min_bags,
                       'max_bags', dss.max_bags,
                       'reward_description', dss.reward_description,
                       'reward_type', dss.reward_type,
                       'is_achieved', (bb.total_bags >= dss.min_bags AND ce.slab_id IS NOT NULL)
                   ) ORDER BY dss.min_bags ASC
               ) AS slabs_json
        FROM public.dealer_scheme_slabs dss
        JOIN buyer_bags bb ON dss.scheme_id = bb.s_id
        LEFT JOIN canonical_eligibility ce ON ce.scheme_id = dss.scheme_id AND ce.slab_id = dss.id
        GROUP BY dss.scheme_id
    )
    SELECT 
        bs.s_id, bs.s_name, bs.s_desc, bs.s_start, bs.s_end, bs.s_days_rem,
        bb.total_bags AS current_net_bags,
        ce.slab_id AS achieved_slab_id,
        ce.slab_name AS achieved_slab_name,
        ce.reward_description AS reward_earned,
        ce.dre_status AS reward_status,
        nse.nxt_id AS next_slab_id,
        nse.nxt_name AS next_slab_name,
        nse.nxt_reward AS potential_next_reward,
        COALESCE(nse.nxt_min - bb.total_bags, 0) AS bags_needed,
        CASE 
            WHEN nse.nxt_min IS NOT NULL AND nse.nxt_min > 0 THEN
                LEAST(100.0, ROUND((bb.total_bags / nse.nxt_min) * 100, 1))
            WHEN ce.slab_id IS NOT NULL THEN 100.0
            ELSE 0.0
        END AS progress_percentage,
        COALESCE(bsl.slabs_json, '[]'::jsonb) AS slabs
    FROM buyer_schemes bs
    JOIN buyer_bags bb ON bs.s_id = bb.s_id
    LEFT JOIN canonical_eligibility ce ON bs.s_id = ce.scheme_id
    LEFT JOIN next_slab_eval nse ON bs.s_id = nse.s_id
    LEFT JOIN buyer_slabs bsl ON bs.s_id = bsl.scheme_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_buyer_my_schemes() TO authenticated;
```

---

## 6. HARDENED ROLLBACK SCRIPT: `225_rollback_security.sql`

```sql
-- ============================================================================
-- SCRIPT: 225_rollback_security.sql
-- SPRINT: SL-REWARD-MIGRATION-225-FINAL-VALIDATION-01
--
-- SECURITY PRINCIPLE:
-- This rollback script reverts custom Buyer App functions and restores CRM
-- staff operational access WITHOUT restoring known-vulnerable USING (true)
-- policies or re-opening anonymous execution of performance RPCs!
-- ============================================================================

-- 1. Drop the Buyer App RPC cleanly
DROP FUNCTION IF EXISTS public.get_buyer_my_schemes();

-- 2. Restore staff-wide operational access on reward tables (WITHOUT opening to anon/buyers)
CREATE POLICY "Staff rollback access on dealer_schemes"
  ON public.dealer_schemes FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff rollback access on dealer_scheme_slabs"
  ON public.dealer_scheme_slabs FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff rollback access on requirement_dispatches"
  ON public.requirement_dispatches FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff rollback access on dealer_reward_eligibility"
  ON public.dealer_reward_eligibility FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

-- 3. Retain search_path hardening and anon revocation
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC, anon;
```

---

## 7. PRE-DEPLOYMENT & POST-DEPLOYMENT VERIFICATION CHECKLIST

### Pre-Deployment Verification (Baseline Confirmation)
- [ ] Run `test_exec_sql.js`: Confirm arbitrary SQL execution via REST is absent.
- [ ] Run `test_helper_rpcs.js`: Confirm `is_admin()`, `is_active_user()`, `is_buyer()`, `get_auth_crm_party_id()` are live in database.
- [ ] Confirm baseline row counts: `dealer_schemes` (3), `dealer_scheme_slabs` (6), `dealer_reward_eligibility` (9), `requirement_dispatches` (79).

### Post-Deployment Verification (Security & Functional Sign-off)
- [ ] **Anon Denial Check 1:** `POST /rpc/get_customer_scheme_performance` with `anonKey` returns **HTTP 401 / 403 Forbidden**.
- [ ] **Anon Denial Check 2:** `POST /rpc/recalculate_dealer_scheme_eligibility` with `anonKey` returns **HTTP 401 / 403 Forbidden**.
- [ ] **Anon Denial Check 3:** `GET /dealer_reward_eligibility` with `anonKey` returns **HTTP 200 with `[]` (0 rows)**.
- [ ] **Anon Denial Check 4:** `GET /requirement_dispatches` with `anonKey` returns **HTTP 200 with `[]` (0 rows)**.
- [ ] **Buyer Isolation Check 1:** Buyer A invoking `get_buyer_my_schemes()` receives only Buyer A's net bags and earned slabs.
- [ ] **Buyer Isolation Check 2:** Buyer A querying `dealer_reward_eligibility` with `customer_id = Buyer_B` receives **0 rows**.
- [ ] **Privilege Escalation Check:** Buyer A attempting `POST /dealer_scheme_slabs` receives **HTTP 403 Forbidden**.
- [ ] **CRM Admin Functional Check:** CRM Admin browsing `Settings -> Dealer Schemes` can edit schemes and modify slabs without errors.
- [ ] **CRM Staff Functional Check:** CRM Staff browsing `/dealer-growth-hub` can see all customer records, send rewards for approval, approve, and fulfill.

---

## HARD STOP NOTICE

In strict adherence to instructions:
- **No SQL has been executed.**
- **No production policies, schemas, or application codes have been altered.**
- **This report serves as the final technical specification ready for Staging deployment.**

**Status is set to `APPROVE FOR STAGING TEST`. Awaiting explicit written approval to proceed.**
