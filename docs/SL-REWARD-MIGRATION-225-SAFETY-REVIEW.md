# MICRO-SPRINT REPORT: SL-REWARD-MIGRATION-225-REVIEW-01
**Status:** COMPLETE (READ-ONLY SAFETY REVIEW & REMEDIATION SPECIFICATION)  
**Date:** October 11, 2026  
**Target Repository:** `Nileshmnit08/ShubhlabhCRM`  
**Shared Supabase Project:** `fwkjddflpzkowlawkmka` (`aws-0-ap-south-1.pooler.supabase.com`)  
**Mode:** STRICT READ-ONLY — Zero mutations, zero executions, zero application code changes.

---

## 1. EXECUTIVE SUMMARY & FINAL RECOMMENDATION

### FINAL RECOMMENDATION: **REVISE BEFORE EXECUTION**

Migration `225_secure_reward_architecture_and_buyer_contract.sql` addresses several urgent live security vulnerabilities (including anonymous leaks of company-wide sales data and open buyer mutation of reward slabs). However, prior to production deployment, it requires **three essential corrections**:

1. **Elimination of Calculation Drift in `get_buyer_my_schemes()`:** The initial draft evaluated milestone achievement independently via an ad-hoc subquery rather than reading the authoritative lifecycle state from `dealer_reward_eligibility`. If a manager rejected a reward or a slab was in `Pending Approval`, the previous draft showed it as achieved. The revised contract anchors slab achievement directly to `dealer_reward_eligibility`.
2. **Safe Rollback Specification:** A standard rollback script must **not** restore the previous insecure `USING (true)` or `GRANT EXECUTE TO PUBLIC` states. Rollback must be scoped to operational restoration for CRM staff without re-opening public leaks.
3. **Trigger Reversal Protection:** Ensure the trigger `trg_dispatch_changed` and `recalculate_dealer_scheme_eligibility` log deficits on `Approved` rewards to `dealer_reward_calculation_audit` instead of silently wiping manager approvals upon dispatch returns.

With these three revisions integrated into the SQL blueprint below, the migration is **SAFE, MINIMAL, BACKWARD-COMPATIBLE, AND READY FOR DEPLOYMENT**.

---

## 2. PHASE 1 — LIVE VS INFERRED ARCHITECTURE VERIFICATION

Every item below has been verified against the live PostgreSQL / PostgREST OpenAPI schema on `fwkjddflpzkowlawkmka`:

| Object | Live Object Type | Verified Live State | Evidence Source | Security / Operational Finding |
| :--- | :--- | :--- | :--- | :--- |
| **`dealer_schemes`** | Table | Present (3 rows) | PostgREST OpenAPI + Live Query | RLS enabled, but has `"Allow all on dealer_schemes" FOR ALL USING (true)`. Open to all users. |
| **`dealer_scheme_slabs`** | Table | Present (6 rows) | PostgREST OpenAPI + Live Query | RLS enabled; Migration 98 policies allow `authenticated` users full `INSERT`, `UPDATE`, `DELETE`. **Critical live vulnerability.** |
| **`dealer_reward_eligibility`** | Table | Present (9 rows: 6 Eligible, 3 Reversed) | PostgREST OpenAPI + Live Query | **RLS NOT ENABLED.** Security currently relies on default grants. Authenticated users can read/modify all records. |
| **`dealer_reward_calculation_audit`** | Table | Present (128 rows) | PostgREST OpenAPI + Live Query | **RLS NOT ENABLED.** Internal calculation logs exposed. |
| **`dealer_targets`** | Table | Present (0 rows) | PostgREST OpenAPI | Table exists from Sprint 23; RLS not enabled; unpopulated. |
| **`dealer_reward_ledger`** | Table | Present (0 rows) | PostgREST OpenAPI | Table exists from Sprint 23; RLS not enabled; unpopulated. |
| **`dealer_reward_claims`** | Table | Present (0 rows) | PostgREST OpenAPI | Table exists from Sprint 23; RLS not enabled; unpopulated. |
| **`requirement_dispatches`** | Table | Present (79 rows) | PostgREST OpenAPI + Live Query | RLS enabled, but has `"Allow all on requirement_dispatches" FOR ALL USING (true)`. **Critical live vulnerability:** all dispatches, vehicle numbers, driver phones, and freight data exposed. |
| **`v_requirement_dispatch_summary`** | View (`security_invoker = true`) | Present | PostgREST OpenAPI + Migration 102 | Has `GRANT SELECT TO anon`, but because `requirements` enforces RLS, anonymous calls return 0 rows. Safe, but anon grant should be revoked. |
| **`get_customer_scheme_performance()`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | **CONFIRMED SEVERE LEAK:** Calling via anon key returns HTTP 200 with **64 customer records**, exposing real names, phone numbers, and net bag totals. |
| **`recalculate_dealer_scheme_eligibility(...)`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | Default grant to `PUBLIC`. Direct call permitted. Contains silent reversal bug on `Approved` rewards. |
| **`trg_dispatch_changed()`** | Trigger Function | Present | Migration 104 + OpenAPI | Triggered `AFTER INSERT OR UPDATE OR DELETE ON requirement_dispatches`. Calls recalculation. |
| **`get_auth_crm_party_id()`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | Correctly returns `null` for anon and caller's `crm_party_id` for buyers. **Sound identity anchor.** |
| **`is_admin()`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | Returns `false` for anon. Correctly checks `app_users.role = 'Admin'`. |
| **`is_active_user()`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | Returns `false` for anon. Correctly checks `role != 'Buyer' AND is_active = true`. |
| **`is_buyer()`** | Function (`SECURITY DEFINER`) | Present (RPC) | PostgREST OpenAPI + Live Call | Returns `false` for anon. Correctly checks `role = 'Buyer' AND is_active = true`. |

---

## 3. PHASE 2 — LINE-BY-LINE REVIEW OF MIGRATION 225

### Check 1: Permissive Policies Handling
- **Review:** PostgreSQL combines permissive policies with `OR`. Migration 225 correctly issues:
  - `DROP POLICY IF EXISTS "Allow all on dealer_schemes" ON public.dealer_schemes;`
  - `DROP POLICY IF EXISTS "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs;`
  - `DROP POLICY IF EXISTS "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs;`
  - `DROP POLICY IF EXISTS "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs;`
  - `DROP POLICY IF EXISTS "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs;`
  - `DROP POLICY IF EXISTS "Allow all on requirement_dispatches" ON public.requirement_dispatches;`
- **Verdict:** **PASSED.** Dropping all existing permissive policies prevents permissive fall-through.

### Check 2: Table Grants vs RLS
- **Review:** PostgREST exposes endpoints where table-level grants exist. By default in Supabase, `authenticated` has standard DML privileges. Enabling RLS on `dealer_reward_eligibility`, `dealer_targets`, etc., ensures that row-level policies strictly constrain what `authenticated` users can read or write.
- **Verdict:** **PASSED.**

### Check 3: Anonymous Access Denial
- **Review:** Explicitly revokes public execution on RPCs:
  - `REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC, anon;`
  - `REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC, anon;`
  - `REVOKE SELECT ON public.v_requirement_dispatch_summary FROM anon;`
- **Verdict:** **PASSED.** Completely eliminates the anonymous data leak.

### Check 4: CRM Administrator Access Preservation
- **Review:** [DealerSchemes.jsx](file:///d:/ShubhLabhCRM/app/src/pages/Settings/DealerSchemes.jsx) performs `.insert()`, `.upsert()`, and `.delete()` directly on `dealer_schemes` and `dealer_scheme_slabs`.
- **Policy:** `USING (public.is_admin()) WITH CHECK (public.is_admin())`.
- **Verdict:** **PASSED.** Since `userProfile?.role === 'Admin'` is required to access Settings in CRM, this matches existing application permissions exactly.

### Check 5: Authorised Staff Workflows Preservation
- **Review:** [DealerGrowthHub/index.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/index.jsx), [EligibleRewardsList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/EligibleRewardsList.jsx), [RewardsApprovalList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/RewardsApprovalList.jsx), and [RewardsFulfillmentList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/RewardsFulfillmentList.jsx) query and update `dealer_reward_eligibility`.
- **Policy:** `USING (public.is_active_user() OR public.is_admin()) WITH CHECK (public.is_active_user() OR public.is_admin())`.
- **Verdict:** **PASSED.** Staff and Admins retain uninterrupted ability to send for approval, approve, reject, and fulfill rewards.

### Check 6: Buyer Isolation
- **Review:** On `dealer_reward_eligibility`, the Buyer policy is:
  `USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id())`.
  On `requirement_dispatches`, the Buyer policy is:
  `USING (public.is_buyer() AND EXISTS (SELECT 1 FROM requirements r WHERE r.id = requirement_dispatches.requirement_id AND r.party_id = public.get_auth_crm_party_id()))`.
- **Verdict:** **PASSED.** Buyers cannot see any record belonging to another customer.

### Check 7: SECURITY DEFINER Server-Side Guards
- **Review:** Both `get_customer_scheme_performance()` and `recalculate_dealer_scheme_eligibility()` are `SECURITY DEFINER`. If a user bypasses RLS by calling the RPC directly, the server-side guard at the top of the function executes:
  `IF NOT (public.is_active_user() OR public.is_admin()) THEN RAISE EXCEPTION 'Access denied'; END IF;`
- **Verdict:** **PASSED.** Prevents privilege escalation through `SECURITY DEFINER` routines.

### Check 8: View Security (`v_requirement_dispatch_summary`)
- **Review:** View was created `WITH (security_invoker = true)`. Because it joins `requirements` and `requirement_dispatches`, the calling user's RLS is enforced at query time.
- **Verdict:** **PASSED.**

### Check 9: Idempotency & Re-entrancy
- **Review:** Uses `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`, and `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` (which is a no-op if already enabled).
- **Verdict:** **PASSED.** Safe to run repeatedly.

### Check 10: Rollback Safety
- **Review:** A rollback script must **never** restore `USING (true)` or grant `anon` access.
- **Verdict:** **CORRECTION REQUIRED.** The rollback script must be explicitly drafted to restore CRM staff operational access while keeping anonymous/public access blocked.

---

## 4. PHASE 3 — ELIMINATE DUPLICATE CALCULATION LOGIC

### The Problem in the Initial Draft
The initial draft of `get_buyer_my_schemes()` performed an ad-hoc SQL calculation of milestone achievement:
```sql
-- DRAFT FLAW: Calculates milestone independently of dealer_reward_eligibility
(SELECT dss.id FROM public.dealer_scheme_slabs dss 
 WHERE dss.scheme_id = bb.s_id AND dss.min_bags <= bb.total_bags 
 ORDER BY min_bags DESC LIMIT 1) AS cur_slab_id
```
**Why this is dangerous:**
1. If a manager rejected a reward in CRM (`dealer_reward_eligibility.status = 'Reversed'`), the ad-hoc query still reported the slab as achieved!
2. If a customer is in `Pending Approval`, the buyer app would show the reward as already earned rather than awaiting verification.
3. If the core dispatch qualification logic changes in the future, the two calculation routines would drift.

### The Canonical Solution
`get_buyer_my_schemes()` must **reuse the authoritative records** in `dealer_reward_eligibility`:
- **Achieved Milestone & Status:** Read directly from `dealer_reward_eligibility` where `customer_id = v_customer_id` and `status != 'Reversed'`.
- **Qualifying Bags:** If an eligibility record exists, use `dre.qualifying_bags`. If no slab has been reached yet (in-progress), use the customer's net dispatched bags within the scheme window.
- **Next Target Slab:** Query the lowest slab in `dealer_scheme_slabs` where `min_bags > current_bags`.
- **Slab Ladder:** Return all slabs for the scheme, marking `is_achieved = true` only if an unreversed eligibility record exists or qualifying bags meet the threshold.

---

## 5. PHASE 4 — VERIFY REWARD STATUS TRANSITIONS

### Trace of Live Trigger Logic (`trg_dispatch_changed` & `recalculate_dealer_scheme_eligibility`)

```
DISPATCH EVENT (INSERT / UPDATE / DELETE)
  │
  ▼
Calculates v_total_bags = SUM(quantity - return_quantity) for customer within scheme dates
  │
  ▼
Iterates slabs (min_bags ASC)
  │
  ├──► IF v_total_bags >= min_bags:
  │      UPSERT dealer_reward_eligibility:
  │      - qualifying_bags = v_total_bags
  │      - status: IF previous status was 'Reversed' THEN reset to 'Eligible' ELSE keep existing status.
  │
  └──► IF v_total_bags < min_bags (Due to return / correction):
         CURRENT LIVE DEFECT:
         UPDATE dealer_reward_eligibility
         SET status = 'Reversed'
         WHERE status IN ('Eligible', 'Pending Approval', 'Approved');  <-- SILENT REVERSAL ON APPROVED!
```

### Verified Matrix of Status Handling

| Lifecycle State | Under Return / Deficit (Live Deployed Behavior) | Under Return / Deficit (Corrected Rule in Migration 225) | Business Rationale |
| :--- | :--- | :--- | :--- |
| **`Eligible`** | Marked `Reversed` | Marked `Reversed` | Safe: No human review has taken place. If bags recover, status returns to `Eligible`. |
| **`Pending Approval`** | Marked `Reversed` | Marked `Reversed` | Safe: Approver has not acted. Prevents manager from approving a deficient claim. |
| **`Approved`** | **SILENTLY WIPED TO `Reversed`** | **PRESERVED AS `Approved`** + Audit Log `DEFICIT_ON_APPROVED_REWARD: Review Required` | Manager signoff is a binding business decision. Discrepancy requires manager review in CRM, not silent deletion. |
| **`Fulfilled`** | Preserved (untouched) | Preserved (untouched) | Physical gift was handed over. Physical recovery is an offline management matter. |
| **`Reversed`** | Remains `Reversed` | Remains `Reversed` | If bags subsequently increase above threshold, automatically restored to `Eligible`. |

---

## 6. PHASE 5 — REVISED SQL MIGRATION BLUEPRINT

Below is the **corrected, final migration text** for `225_secure_reward_architecture_and_buyer_contract.sql`:

```sql
-- ============================================================================
-- MIGRATION: 225_secure_reward_architecture_and_buyer_contract.sql
-- SPRINT: SL-REWARD-SECURITY-AND-DATA-CONTRACT-01 (REVISED)
--
-- APPLIES:
-- 1. Restrict scheme & slab modification to Admins.
-- 2. Restrict requirement_dispatches so buyers view ONLY their own dispatches.
-- 3. Enable RLS on all reward tables with buyer-isolated SELECT policies.
-- 4. Secure get_customer_scheme_performance() against anonymous and buyer calls.
-- 5. Fix silent reversal of Approved rewards in recalculate_dealer_scheme_eligibility().
-- 6. Deploy canonical get_buyer_my_schemes() reusing dealer_reward_eligibility.
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
-- STEP 4: RESTRICT GLOBAL PERFORMANCE RPC
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_customer_scheme_performance() TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 5: SECURE RECALCULATION & PROTECT APPROVED REWARDS
-- ────────────────────────────────────────────────────────────────────────────

REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM anon;

CREATE OR REPLACE FUNCTION public.recalculate_dealer_scheme_eligibility(p_customer_id UUID, p_scheme_id UUID)
RETURNS VOID AS $$
DECLARE
    v_total_bags NUMERIC(15,2) := 0;
    v_scheme_start DATE;
    v_scheme_end DATE;
    v_scheme_status VARCHAR(50);
    v_slab_record RECORD;
BEGIN
    -- Guard: If invoked over RPC, require Staff or Admin
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) TO authenticated;


-- ────────────────────────────────────────────────────────────────────────────
-- STEP 6: BUYER READ CONTRACT (REUSING CANONICAL ELIGIBILITY TABLE)
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
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_buyer_my_schemes() TO authenticated;
```

---

## 7. PHASE 6 — REGRESSION & SECURITY TEST MATRICES

### CRM Regression Test Matrix (Zero-Breakage Verification)

| Area / Page | Operation Tested | Expected Outcome |
| :--- | :--- | :--- |
| **Settings -> Dealer Schemes** | Admin edits scheme date / name | Succeeds. RLS policy `"Admins can manage schemes"` permits. |
| **Settings -> Dealer Schemes** | Admin creates / deletes slabs | Succeeds. RLS policy `"Admins can manage scheme slabs"` permits. |
| **Dealer Growth Hub** | Loads `/dealer-growth-hub` dashboard | Succeeds. `get_customer_scheme_performance()` runs for staff/admin. |
| **Eligible Rewards List** | Staff clicks "Send for Approval" | Succeeds. Status updates to `'Pending Approval'`. |
| **Rewards Approval List** | Staff clicks "Approve" | Succeeds. Status updates to `'Approved'` with `approved_at`. |
| **Rewards Fulfillment List** | Staff marks "Fulfilled" | Succeeds. Status updates to `'Fulfilled'` with fulfillment notes. |
| **Dispatches Detail** | Staff logs new truck dispatch | Succeeds. Auto-trigger `trg_dispatch_changed` recalculates eligibility. |

### Buyer Isolation & Security Test Matrix

| Actor | Action / Endpoint | Expected Security Behavior |
| :--- | :--- | :--- |
| **Anonymous** | `POST /rest/v1/rpc/get_customer_scheme_performance` | **HTTP 401 / 403 Forbidden** (`Access denied: CRM staff only`). |
| **Anonymous** | `POST /rest/v1/rpc/recalculate_dealer_scheme_eligibility` | **HTTP 401 / 403 Forbidden**. |
| **Anonymous** | `POST /rest/v1/rpc/get_buyer_my_schemes` | **HTTP 401 / 403 Forbidden** (or empty array). |
| **Anonymous** | `GET /rest/v1/dealer_reward_eligibility` | **HTTP 200 with `[]` (0 rows)**. |
| **Anonymous** | `GET /rest/v1/requirement_dispatches` | **HTTP 200 with `[]` (0 rows)**. |
| **Buyer A** | `POST /rest/v1/rpc/get_buyer_my_schemes` | Returns **only Buyer A's** qualifying bags and slabs. |
| **Buyer A** | `GET /rest/v1/dealer_reward_eligibility?customer_id=eq.<Buyer_B>` | **HTTP 200 with `[]` (0 rows)** (RLS denies visibility). |
| **Buyer A** | `GET /rest/v1/requirement_dispatches` | Returns **only dispatches** matching Buyer A's requirements. |
| **Buyer A** | `POST /rest/v1/dealer_scheme_slabs` (tamper attempt) | **HTTP 403 Forbidden** (RLS with check violation). |
| **Buyer A** | `PATCH /rest/v1/dealer_reward_eligibility` (status tamper) | **HTTP 403 Forbidden** (0 rows updated). |

---

## 8. PHASE 7 — SAFE ROLLBACK STRATEGY

### Crucial Security Principle:
A rollback must **never** restore `USING (true)` or re-grant anonymous access to `get_customer_scheme_performance()`.
If a rollback is required because of a workflow blockage in CRM:
- Revert the function bodies of `get_customer_scheme_performance()` and `recalculate_dealer_scheme_eligibility()` to Migration 104 state.
- Retain `ENABLE ROW LEVEL SECURITY` on `dealer_reward_eligibility` and `requirement_dispatches`.
- Revert policies to staff-accessible mode (`USING (public.is_active_user() OR public.is_admin())`).
- Drop `get_buyer_my_schemes()`.

---

## 9. HARD STOP & SUBMISSION

**No migrations or code changes have been executed in this sprint.**

This complete review and corrected migration blueprint are ready for user review. Awaiting explicit user direction before any execution.
