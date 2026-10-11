# MICRO-SPRINT REPORT: SL-REWARD-SECURITY-AND-DATA-CONTRACT-01
**Status:** COMPLETE (READ-ONLY AUDIT & SECURITY BLUEPRINT)  
**Date:** October 11, 2026  
**Target Repository:** `Nileshmnit08/ShubhlabhCRM`  
**Active Project Supabase Reference:** `fwkjddflpzkowlawkmka` (`aws-0-ap-south-1.pooler.supabase.com`)  
**Mode:** STRICT READ-ONLY — No SQL migrations executed, no application code modified.

---

## EXECUTIVE SUMMARY

This report completes **Micro-Sprint SL-REWARD-SECURITY-AND-DATA-CONTRACT-01**. It provides an exhaustive, live-verified security audit of the existing reward-scheme infrastructure across the Supabase backend and Shubh Labh CRM, establishes the customer isolation model, defines the safe Buyer App read contract (`public.get_buyer_my_schemes()`), details the reward correction lifecycle, and presents a zero-regression remediation plan and test suite.

### Key Audit Findings

| Object | Live DB Status | Current Exposure / Vulnerability | Remediation |
| :--- | :--- | :--- | :--- |
| `dealer_schemes` | Live (3 rows) | `Allow all on dealer_schemes FOR ALL USING (true)` allows all users to edit/delete schemes. | Restrict mutations to `is_admin()`; preserve SELECT for all authenticated users. |
| `dealer_scheme_slabs` | Live (6 rows) | Migration 98 allows **any authenticated user** (including Buyers) to INSERT, UPDATE, DELETE reward slabs. | Drop open mutation policies; restrict INSERT/UPDATE/DELETE to `is_admin()`. |
| `dealer_reward_eligibility` | Live (9 rows) | RLS was never enabled. Unauthenticated anon callers get HTTP 200; authenticated buyers can read/write company-wide records if queried. | `ENABLE ROW LEVEL SECURITY`. Add staff/admin management policy and buyer-isolated SELECT policy (`customer_id = get_auth_crm_party_id()`). |
| `dealer_reward_calculation_audit` | Live (128 rows) | RLS was never enabled. Exposes raw calculation audit logs. | `ENABLE ROW LEVEL SECURITY`. Restrict SELECT to staff/admin; write exclusively via `SECURITY DEFINER` trigger. |
| `dealer_targets` | Live (0 rows) | RLS was never enabled. | `ENABLE ROW LEVEL SECURITY`. Restrict to staff/admin + buyer-isolated SELECT. |
| `dealer_reward_ledger` | Live (0 rows) | RLS was never enabled. | `ENABLE ROW LEVEL SECURITY`. Restrict to staff/admin + buyer-isolated SELECT. |
| `dealer_reward_claims` | Live (0 rows) | RLS was never enabled. | `ENABLE ROW LEVEL SECURITY`. Restrict to staff/admin + buyer-isolated SELECT. |
| `requirement_dispatches` | Live (79 rows) | Policy `Allow all on requirement_dispatches FOR ALL USING (true)` allows buyers & anon to view company-wide trucks, drivers, quantities, and alter dispatch logs. | Drop open policy. Enforce staff/admin management policy + buyer-isolated SELECT policy linked through `requirements.party_id`. |
| `get_customer_scheme_performance()` | Live (RPC) | `SECURITY DEFINER` with default `PUBLIC` execution grant. **Anon callers get HTTP 200 with 64 rows** containing all customer names, phone numbers, and net bags! | `REVOKE EXECUTE ... FROM PUBLIC, anon`. Restrict execution inside function to `is_active_user() OR is_admin()`. |
| `recalculate_dealer_scheme_eligibility()` | Live (RPC) | `SECURITY DEFINER` with default `PUBLIC` execution grant. Anyone can trigger recalculations. Also contains **silent reversal bug** on `Approved` rewards. | `REVOKE EXECUTE ... FROM PUBLIC, anon`. Restrict direct RPC call; fix reversal logic so `Approved` rewards are never silently deleted/reversed upon returns. |
| `get_auth_crm_party_id()` | Live (RPC) | Correctly returns caller's `crm_party_id` derived server-side from `auth.uid()`. Tamper-proof. | **Canonical identity anchor** for all Buyer App RLS policies and RPCs. |

---

## PHASE 1 — PRE-CHANGE LIVE AUDIT

### 1. Verification of the 10 Target Database Objects

Through live REST/PostgREST interrogation (`/rest/v1/`) and verification against migration files `72`, `96`, `97`, `98`, `99`, `100`, `101`, `102`, `103`, `104`, and `224`:

#### 1.1 `public.dealer_scheme_slabs`
- **Origin:** Migration `96_sprint_23_dealer_growth_hub.sql` created table; Migration `97_sprint_24_bag_based_rewards.sql` added bag fields (`min_bags`, `max_bags`, `reward_type`, `reward_value`); Migration `98_fix_dealer_scheme_slabs_rls.sql` enabled RLS.
- **Current Live Schema:** `id` (uuid, PK), `scheme_id` (uuid, FK), `slab_name` (varchar), `threshold_value` (numeric), `reward_description` (text), `created_at` (timestamptz), `updated_at` (timestamptz), `min_bags` (numeric), `max_bags` (numeric), `reward_type` (varchar), `reward_value` (numeric).
- **Live State:** 6 slab rows configured in production.
- **Policies in Live DB:**
  - `Enable read access for authenticated users on slabs` (SELECT TO authenticated USING (true))
  - `Enable insert access for authenticated users on slabs` (INSERT TO authenticated WITH CHECK (true))
  - `Enable update access for authenticated users on slabs` (UPDATE TO authenticated USING (true) WITH CHECK (true))
  - `Enable delete access for authenticated users on slabs` (DELETE TO authenticated USING (true))
- **Live Vulnerability:** **CRITICAL.** Any authenticated user, including Buyer App mobile users possessing a valid JWT, can execute INSERT, UPDATE, and DELETE operations directly against `/rest/v1/dealer_scheme_slabs`.

#### 1.2 `public.dealer_reward_eligibility`
- **Origin:** Migration `97_sprint_24_bag_based_rewards.sql` created table; Migration `104_dispatch_based_reward_triggers.sql` added approval/fulfillment columns.
- **Current Live Schema:** `id` (uuid, PK), `customer_id` (uuid, FK to `crm_parties`), `scheme_id` (uuid, FK to `dealer_schemes`), `slab_id` (uuid, FK to `dealer_scheme_slabs`), `qualifying_bags` (numeric), `status` (varchar), `earned_at` (timestamptz), `created_at` (timestamptz), `updated_at` (timestamptz), `approved_by` (uuid), `approved_at` (timestamptz), `fulfilled_by` (uuid), `fulfilled_at` (timestamptz), `fulfillment_notes` (text). Unique constraint on `(customer_id, scheme_id, slab_id)`.
- **Live State:** 9 rows in production (statuses: `Eligible` and `Reversed`).
- **Policies in Live DB:** **NONE.** RLS is currently NOT enabled on this table.
- **Live Vulnerability:** **HIGH.** Because RLS was never enabled, table security relies entirely on default schema grants. Any authenticated user querying `/rest/v1/dealer_reward_eligibility` could read or mutate rewards across all customers.

#### 1.3 `public.dealer_reward_calculation_audit`
- **Origin:** Migration `97_sprint_24_bag_based_rewards.sql`.
- **Current Live Schema:** `id` (uuid, PK), `customer_id` (uuid, FK), `scheme_id` (uuid, FK), `old_bag_total` (numeric), `new_bag_total` (numeric), `trigger_event` (varchar), `transaction_id` (uuid), `created_at` (timestamptz).
- **Live State:** 128 rows in production.
- **Policies in Live DB:** **NONE.** RLS is currently NOT enabled.
- **Live Vulnerability:** **MEDIUM.** Internal trigger audit logs are readable by any client with authenticated access.

#### 1.4 `public.dealer_targets`, `public.dealer_reward_ledger`, `public.dealer_reward_claims`
- **Origin:** Migration `96_sprint_23_dealer_growth_hub.sql`.
- **Live State:** Tables exist in live database; currently 0 rows (these represent the earlier point-based system superseded by bag-based eligibility).
- **Policies in Live DB:** **NONE.** RLS is currently NOT enabled.

#### 1.5 `public.requirement_dispatches`
- **Origin:** Migration `102_dispatch_tracking_schema.sql`.
- **Current Live Schema:** `id` (uuid, PK), `requirement_id` (uuid, FK to `requirements`), `dispatch_date` (date), `quantity` (numeric), `unit` (varchar), `truck_number` (varchar), `driver_name` (varchar), `driver_mobile` (varchar), `transporter_name` (varchar), `lr_bilty_number` (varchar), `invoice_number` (varchar), `invoice_date` (date), `warehouse_location` (varchar), `expected_delivery_date` (date), `freight_amount` (numeric), `remarks` (text), `proof_document_url` (text), `status` (varchar), `actual_delivery_date` (date), `received_by` (varchar), `delivery_proof_url` (text), `shortage_quantity` (numeric), `return_quantity` (numeric), `cancellation_reason` (text), `created_by` (uuid), `created_at` (timestamptz), `updated_at` (timestamptz).
- **Live State:** 79 rows in production.
- **Policies in Live DB:**
  - `Allow all on requirement_dispatches` (ALL TO public USING (true) WITH CHECK (true))
  - `GRANT SELECT ON public.v_requirement_dispatch_summary TO anon;`
- **Live Vulnerability:** **CRITICAL.** Anonymous and authenticated users can view all dispatches across all customers, including confidential vehicle registration numbers, driver phone numbers, freight amounts, and transporter names. Furthermore, any authenticated user can modify or delete dispatches, triggering unauthorized recalculation of reward eligibility.

#### 1.6 `public.get_customer_scheme_performance()`
- **Origin:** Migration `100_sprint_25_customer_scheme_growth_hub.sql`, modified in `101_fix_customer_scheme_performance_rpc.sql` and `103_update_scheme_performance_rpc.sql`.
- **Signature:** `FUNCTION public.get_customer_scheme_performance() RETURNS TABLE (...)`
- **Ownership & Security:** Owned by `postgres`, `SECURITY DEFINER`.
- **Grants:** `GRANT EXECUTE ... TO authenticated;` (plus default PostgreSQL `EXECUTE` grant to `PUBLIC`).
- **Live Test Output:**
  ```http
  POST /rest/v1/rpc/get_customer_scheme_performance
  Headers: apikey: <anon_key>, Authorization: Bearer <anon_key>
  Status: 200 OK
  Body: 64 rows returned containing customer_name, mobile, current_net_bags, achieved_slab_name, etc.
  ```
- **Live Vulnerability:** **CRITICAL LIVE DATA LEAK.** An unauthenticated caller using the public anonymous key can call this RPC and extract customer names, phone numbers, net purchase bags, achieved slab names, and reward statuses across the entire enterprise.

#### 1.7 `public.recalculate_dealer_scheme_eligibility(p_customer_id UUID, p_scheme_id UUID)`
- **Origin:** Migration `97_sprint_24_bag_based_rewards.sql`, updated in Migration `104_dispatch_based_reward_triggers.sql`.
- **Signature:** `FUNCTION public.recalculate_dealer_scheme_eligibility(p_customer_id UUID, p_scheme_id UUID) RETURNS VOID`
- **Ownership & Security:** Owned by `postgres`, `SECURITY DEFINER`.
- **Grants:** Default PostgreSQL `EXECUTE` grant to `PUBLIC`.
- **Live Test Output:** An anonymous invocation reached the internal SQL execution engine (threw FK violation on foreign key `dealer_reward_calculation_audit_customer_id_fkey` when passed dummy UUIDs).
- **Live Vulnerability:** **HIGH.** Any user can invoke mutating recalculation logic for arbitrary customer IDs.
- **Logic Defect:** Automatically executes:
  ```sql
  UPDATE public.dealer_reward_eligibility
  SET status = 'Reversed', updated_at = NOW()
  WHERE customer_id = p_customer_id AND scheme_id = p_scheme_id AND slab_id = v_slab_record.id 
    AND status IN ('Eligible', 'Pending Approval', 'Approved');
  ```
  If a customer with an `Approved` reward experiences a dispatch return or quantity correction, the manager's signoff is silently wiped and the reward is flipped to `Reversed` without manager notification or review.

#### 1.8 `public.get_auth_crm_party_id()`
- **Origin:** Migration `224_sprint_ORDER_01A_buyer_security.sql`.
- **Definition:**
  ```sql
  CREATE OR REPLACE FUNCTION public.get_auth_crm_party_id()
  RETURNS UUID AS $$
    SELECT crm_party_id
    FROM public.app_users
    WHERE id = auth.uid()
      AND is_active = true
      AND role = 'Buyer'
  $$ LANGUAGE sql SECURITY DEFINER;
  ```
- **Security & Integrity:** **VERIFIED SOUND.** Returns `NULL` for anonymous users, `NULL` for Field Staff/Admins, and the exact verified `crm_party_id` for authenticated buyers. Derived entirely from `auth.uid()`, preventing client-side spoofing.

---

## PHASE 2 — SECURITY FIX PLAN (SQL MIGRATION BLUEPRINT)

### Architectural Principles

1. **Permissive Policy Handling in PostgreSQL:** In PostgreSQL, multiple permissive policies for the same role and action are combined with `OR`. Merely adding a new restrictive policy does **not** revoke access if an existing policy has `USING (true)`. Therefore, all existing broad policies (`Allow all on ...`, `Enable insert/update/delete ...`) must be explicitly **DROPPED** before applying role-specific policies.
2. **Clear Separation of Roles:**
   - **Admins:** `public.is_admin() = true` (Full management of schemes, slabs, and overrides).
   - **Internal Staff:** `public.is_active_user() = true` (Field staff, managers, back-office users where `role != 'Buyer'`).
   - **Buyers:** `public.is_buyer() = true` (External buyers; strictly isolated to their own records via `get_auth_crm_party_id()`).
   - **Anonymous / Public:** Strictly denied access to reward tables, customer data, and RPCs.
3. **Difference Between Grants and RLS:** Grants (`GRANT SELECT/UPDATE`) define baseline table-level access; RLS policies filter rows. Both layers must be aligned. Public default grants on functions must be revoked (`REVOKE EXECUTE ... FROM PUBLIC`).
4. **Preservation of Existing CRM Workflows:**
   - CRM Settings (`DealerSchemes.jsx`): Admins can insert, update, and delete schemes and slabs.
   - CRM Dealer Growth Hub (`DealerGrowthHub/index.jsx`): Staff and admins can call `get_customer_scheme_performance()` and query `dealer_reward_eligibility`.
   - CRM Approvals & Fulfillment (`RewardsApprovalList.jsx`, `RewardsFulfillmentList.jsx`): Staff and admins can update eligibility statuses.

### Proposed Migration: `225_secure_reward_architecture_and_buyer_contract.sql`

```sql
-- ============================================================================
-- MIGRATION: 225_secure_reward_architecture_and_buyer_contract.sql
-- SPRINT: SL-REWARD-SECURITY-AND-DATA-CONTRACT-01
--
-- PURPOSE:
-- 1. Restrict scheme and slab modifications to Admins.
-- 2. Lock down requirement_dispatches so buyers only view their own dispatches.
-- 3. Enable RLS on dealer_reward_eligibility, dealer_targets, ledger, claims, and audit.
-- 4. Secure get_customer_scheme_performance() from public/anon/buyer invocation.
-- 5. Fix silent reversal bug in recalculate_dealer_scheme_eligibility().
-- 6. Deploy canonical read-only buyer RPC get_buyer_my_schemes().
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. SECURE DEALER SCHEMES & SLABS
-- ────────────────────────────────────────────────────────────────────────────

-- Drop overly broad development policies
DROP POLICY IF EXISTS "Allow all on dealer_schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Enable read access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable update access for authenticated users on slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users on slabs" ON public.dealer_scheme_slabs;

-- dealer_schemes policies
-- Read: all authenticated users (Staff, Admins, Buyers need to view active schemes)
CREATE POLICY "Authenticated users can view active schemes"
  ON public.dealer_schemes FOR SELECT
  TO authenticated
  USING (status = 'Active' OR public.is_active_user() OR public.is_admin());

-- Mutations: Admins only
CREATE POLICY "Admins can manage schemes"
  ON public.dealer_schemes FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- dealer_scheme_slabs policies
-- Read: all authenticated users
CREATE POLICY "Authenticated users can view scheme slabs"
  ON public.dealer_scheme_slabs FOR SELECT
  TO authenticated
  USING (true);

-- Mutations: Admins only (Fixes critical vulnerability where buyers could alter slabs)
CREATE POLICY "Admins can manage scheme slabs"
  ON public.dealer_scheme_slabs FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 2. SECURE REQUIREMENT DISPATCHES
-- ────────────────────────────────────────────────────────────────────────────

-- Drop broad policy
DROP POLICY IF EXISTS "Allow all on requirement_dispatches" ON public.requirement_dispatches;

-- Revoke anon grant on summary view
REVOKE SELECT ON public.v_requirement_dispatch_summary FROM anon;

-- Staff/Admin: Full management of dispatches
CREATE POLICY "Staff can manage requirement dispatches"
  ON public.requirement_dispatches FOR ALL
  TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

-- Buyer: SELECT ONLY their own requirement dispatches (strictly isolated)
CREATE POLICY "Buyers can view own dispatches"
  ON public.requirement_dispatches FOR SELECT
  TO authenticated
  USING (
    public.is_buyer() AND EXISTS (
      SELECT 1 FROM public.requirements r
      WHERE r.id = requirement_dispatches.requirement_id
        AND r.party_id = public.get_auth_crm_party_id()
    )
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 3. ENABLE RLS ON REWARD ELIGIBILITY & REWARD TABLES
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.dealer_reward_eligibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_calculation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dealer_reward_claims ENABLE ROW LEVEL SECURITY;

-- dealer_reward_eligibility
CREATE POLICY "Staff can manage reward eligibility"
  ON public.dealer_reward_eligibility FOR ALL
  TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward eligibility"
  ON public.dealer_reward_eligibility FOR SELECT
  TO authenticated
  USING (
    public.is_buyer() AND customer_id = public.get_auth_crm_party_id()
  );

-- dealer_reward_calculation_audit (Internal audit only; no buyer access)
CREATE POLICY "Staff can view reward calculation audit"
  ON public.dealer_reward_calculation_audit FOR SELECT
  TO authenticated
  USING (public.is_active_user() OR public.is_admin());

-- dealer_targets
CREATE POLICY "Staff can manage dealer targets"
  ON public.dealer_targets FOR ALL
  TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own dealer targets"
  ON public.dealer_targets FOR SELECT
  TO authenticated
  USING (
    public.is_buyer() AND customer_id = public.get_auth_crm_party_id()
  );

-- dealer_reward_ledger
CREATE POLICY "Staff can manage reward ledger"
  ON public.dealer_reward_ledger FOR ALL
  TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward ledger"
  ON public.dealer_reward_ledger FOR SELECT
  TO authenticated
  USING (
    public.is_buyer() AND customer_id = public.get_auth_crm_party_id()
  );

-- dealer_reward_claims
CREATE POLICY "Staff can manage reward claims"
  ON public.dealer_reward_claims FOR ALL
  TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Buyers can view own reward claims"
  ON public.dealer_reward_claims FOR SELECT
  TO authenticated
  USING (
    public.is_buyer() AND customer_id = public.get_auth_crm_party_id()
  );


-- ────────────────────────────────────────────────────────────────────────────
-- 4. RESTRICT GLOBAL PERFORMANCE RPC
-- ────────────────────────────────────────────────────────────────────────────

-- Revoke default public execution
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM anon;

-- Add authorization check inside get_customer_scheme_performance()
-- (Re-create function with explicit authorization guard at the top)
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
        SELECT 
            ds.id, ds.name, ds.start_date, ds.end_date, 
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


-- ────────────────────────────────────────────────────────────────────────────
-- 5. SECURE RECALCULATION FUNCTION & FIX REVERSAL INTEGRITY
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
    -- Guard: If called directly over RPC by an authenticated user, require Staff or Admin
    IF auth.uid() IS NOT NULL AND NOT (public.is_active_user() OR public.is_admin()) THEN
        RAISE EXCEPTION 'Access denied: internal calculation only' USING ERRCODE = '42501';
    END IF;

    -- Get scheme details
    SELECT start_date, end_date, status 
    INTO v_scheme_start, v_scheme_end, v_scheme_status
    FROM public.dealer_schemes 
    WHERE id = p_scheme_id;
    
    IF v_scheme_status != 'Active' THEN
        RETURN;
    END IF;

    -- Calculate total qualifying bags from dispatches (excluding cancelled and deducting returns)
    SELECT COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) INTO v_total_bags
    FROM public.requirement_dispatches rd
    JOIN public.requirements req ON rd.requirement_id = req.id
    WHERE req.party_id = p_customer_id
      AND rd.status != 'Cancelled'
      AND rd.dispatch_date >= v_scheme_start
      AND rd.dispatch_date <= v_scheme_end;

    -- Log audit trail
    INSERT INTO public.dealer_reward_calculation_audit (customer_id, scheme_id, old_bag_total, new_bag_total, trigger_event)
    VALUES (p_customer_id, p_scheme_id, null, v_total_bags, 'Recalculation Triggered');

    -- Evaluate slabs
    FOR v_slab_record IN 
        SELECT id, min_bags, max_bags 
        FROM public.dealer_scheme_slabs 
        WHERE scheme_id = p_scheme_id 
        ORDER BY min_bags ASC
    LOOP
        -- Check if qualifying threshold is met
        IF v_total_bags >= v_slab_record.min_bags AND (v_slab_record.max_bags IS NULL OR v_total_bags <= v_slab_record.max_bags) THEN
            -- Upsert eligibility
            INSERT INTO public.dealer_reward_eligibility (customer_id, scheme_id, slab_id, qualifying_bags, status)
            VALUES (p_customer_id, p_scheme_id, v_slab_record.id, v_total_bags, 'Eligible')
            ON CONFLICT (customer_id, scheme_id, slab_id) 
            DO UPDATE SET 
                qualifying_bags = EXCLUDED.qualifying_bags,
                -- Only restore to Eligible if it was previously Reversed
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
            -- Log the discrepancy to calculation audit for manager review.
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
```

---

## PHASE 3 — BUYER READ CONTRACT

### 1. RPC Specification: `public.get_buyer_my_schemes()`

The Buyer App must never call `get_customer_scheme_performance()` (which returns all customer records) nor execute manual calculations in client-side JavaScript. Instead, it calls `public.get_buyer_my_schemes()`.

```sql
-- ────────────────────────────────────────────────────────────────────────────
-- 6. BUYER READ CONTRACT: get_buyer_my_schemes()
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
    -- 1. Strictly derive identity server-side; NEVER trust a client argument
    v_customer_id := public.get_auth_crm_party_id();
    
    IF v_customer_id IS NULL THEN
        -- If caller is not an active, mapped buyer, return empty set (safe denial)
        RETURN;
    END IF;

    RETURN QUERY
    WITH buyer_schemes AS (
        SELECT 
            ds.id AS s_id,
            ds.name AS s_name,
            ds.description AS s_desc,
            ds.start_date AS s_start,
            ds.end_date AS s_end,
            GREATEST(0, (ds.end_date - CURRENT_DATE)::INT) AS s_days_rem
        FROM public.dealer_schemes ds
        WHERE ds.status = 'Active'
    ),
    buyer_bags AS (
        SELECT 
            bs.s_id,
            COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0) AS total_bags
        FROM buyer_schemes bs
        LEFT JOIN public.requirements req ON req.party_id = v_customer_id
        LEFT JOIN public.requirement_dispatches rd ON req.id = rd.requirement_id
            AND rd.status != 'Cancelled'
            AND rd.dispatch_date >= bs.s_start
            AND rd.dispatch_date <= bs.s_end
        GROUP BY bs.s_id
    ),
    buyer_slabs AS (
        SELECT 
            dss.scheme_id,
            jsonb_agg(
                jsonb_build_object(
                    'slab_id', dss.id,
                    'slab_name', dss.slab_name,
                    'min_bags', dss.min_bags,
                    'max_bags', dss.max_bags,
                    'reward_description', dss.reward_description,
                    'reward_type', dss.reward_type,
                    'is_achieved', (bb.total_bags >= dss.min_bags)
                ) ORDER BY dss.min_bags ASC
            ) AS slabs_json
        FROM public.dealer_scheme_slabs dss
        JOIN buyer_bags bb ON dss.scheme_id = bb.s_id
        GROUP BY dss.scheme_id
    ),
    achieved_eval AS (
        SELECT 
            bb.s_id,
            bb.total_bags,
            -- Highest achieved slab
            (SELECT dss.id FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags <= bb.total_bags 
             ORDER BY dss.min_bags DESC LIMIT 1) AS cur_slab_id,
            (SELECT dss.slab_name FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags <= bb.total_bags 
             ORDER BY dss.min_bags DESC LIMIT 1) AS cur_slab_name,
            (SELECT dss.reward_description FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags <= bb.total_bags 
             ORDER BY dss.min_bags DESC LIMIT 1) AS cur_reward_desc,
            -- Next milestone slab
            (SELECT dss.id FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY dss.min_bags ASC LIMIT 1) AS nxt_slab_id,
            (SELECT dss.slab_name FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY dss.min_bags ASC LIMIT 1) AS nxt_slab_name,
            (SELECT dss.reward_description FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY dss.min_bags ASC LIMIT 1) AS nxt_reward_desc,
            (SELECT dss.min_bags FROM public.dealer_scheme_slabs dss 
             WHERE dss.scheme_id = bb.s_id AND dss.min_bags > bb.total_bags 
             ORDER BY dss.min_bags ASC LIMIT 1) AS nxt_min_bags
        FROM buyer_bags bb
    )
    SELECT 
        bs.s_id AS scheme_id,
        bs.s_name AS scheme_name,
        bs.s_desc AS description,
        bs.s_start AS start_date,
        bs.s_end AS end_date,
        bs.s_days_rem AS days_remaining,
        ae.total_bags AS current_net_bags,
        ae.cur_slab_id AS achieved_slab_id,
        ae.cur_slab_name AS achieved_slab_name,
        ae.cur_reward_desc AS reward_earned,
        (
            SELECT dre.status 
            FROM public.dealer_reward_eligibility dre 
            WHERE dre.customer_id = v_customer_id 
              AND dre.scheme_id = bs.s_id 
              AND dre.slab_id = ae.cur_slab_id
            LIMIT 1
        ) AS reward_status,
        ae.nxt_slab_id AS next_slab_id,
        ae.nxt_slab_name AS next_slab_name,
        ae.nxt_reward_desc AS potential_next_reward,
        COALESCE(ae.nxt_min_bags - ae.total_bags, 0) AS bags_needed,
        CASE 
            WHEN ae.nxt_min_bags IS NOT NULL AND ae.nxt_min_bags > 0 THEN
                LEAST(100.0, ROUND((ae.total_bags / ae.nxt_min_bags) * 100, 1))
            WHEN ae.cur_slab_id IS NOT NULL THEN 100.0
            ELSE 0.0
        END AS progress_percentage,
        COALESCE(bsl.slabs_json, '[]'::jsonb) AS slabs
    FROM buyer_schemes bs
    JOIN achieved_eval ae ON bs.s_id = ae.s_id
    LEFT JOIN buyer_slabs bsl ON bs.s_id = bsl.scheme_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_buyer_my_schemes() TO authenticated;
```

### 2. Contract Field Specifications

| Return Field | Type | Description | Privacy / Security Safeguard |
| :--- | :--- | :--- | :--- |
| `scheme_id` | `UUID` | Unique identifier of active scheme | Public scheme ID |
| `scheme_name` | `VARCHAR` | Scheme title (e.g. "Diwali Dhamaka") | Non-confidential marketing name |
| `description` | `TEXT` | Terms or marketing message | Marketing content |
| `start_date` | `DATE` | Scheme qualification start date | Scheme duration |
| `end_date` | `DATE` | Scheme qualification end date | Scheme duration |
| `days_remaining` | `INT` | Days until scheme closes (`end_date - TODAY`) | Countdown timer |
| `current_net_bags` | `NUMERIC` | Customer's own net qualifying bags (`dispatched - returns`) | **Strictly scoped to caller's `crm_party_id`** |
| `achieved_slab_id` | `UUID` | Slab ID of highest achieved tier | Scoped to caller |
| `achieved_slab_name`| `VARCHAR` | Display title of achieved tier | Scoped to caller |
| `reward_earned` | `TEXT` | Physical reward description for achieved tier | Scoped to caller |
| `reward_status` | `VARCHAR` | `Eligible`, `Pending Approval`, `Approved`, or `Fulfilled` | Live approval status for caller |
| `next_slab_id` | `UUID` | Next higher target tier | Milestone target |
| `next_slab_name` | `VARCHAR` | Next tier title (e.g. "200 Bags - 2 Iron") | Milestone target |
| `potential_next_reward`| `TEXT` | Next reward item | Motivation incentive |
| `bags_needed` | `NUMERIC` | Net bags remaining to unlock next tier | Simple integer/numeric difference |
| `progress_percentage`| `NUMERIC`| Percentage toward next slab (0.0 to 100.0) | For progress bar display |
| `slabs` | `JSONB` | Full tier ladder with min/max bags and achievement flags | Transparent scheme rules |

**Fields Excluded by Design:**
- **NO** other customer IDs, names, or performance data.
- **NO** customer phone numbers or mobile numbers.
- **NO** internal staff IDs, salesperson names, or employee notes.
- **NO** company-wide purchase totals or rankings.
- **NO** truck numbers, driver names, or transport freight rates.

---

## PHASE 4 — REWARD CORRECTION SAFETY & LIFECYCLE

### 1. Current State vs Proposed Transition Matrix

```
       ┌────────────────┐
       │   Purchases    │
       │ & Dispatches   │
       └───────┬────────┘
               │ (Trigger recalculation)
               ▼
       ┌────────────────┐
       │    Eligible    │
       └───────┬────────┘
               │
        CRM Manager sends for approval
               ▼
       ┌────────────────┐
       │Pending Approval│
       └───────┬────────┘
               ├──────────────────────┐
       Manager approves        Manager rejects
               ▼                      ▼
       ┌────────────────┐     ┌────────────────┐
       │    Approved    │     │    Reversed    │
       └───────┬────────┘     └────────────────┘
               │
        Gifts Dispatched & Notes Added
               ▼
       ┌────────────────┐
       │   Fulfilled    │
       └────────────────┘
```

### 2. Transition Behaviour Under Dispatch Corrections & Returns

| Current Status | Dispatch Correction / Return Event (Bags drop below threshold) | Current Behavior (Defective) | Proposed Safe Behavior |
| :--- | :--- | :--- | :--- |
| **`Eligible`** | Bags drop below `min_bags`. | Sets `status = 'Reversed'`. | **Safe.** No manager has acted. Transitions `status = 'Reversed'`. If new dispatches arrive and threshold is re-met, transitions `Reversed -> Eligible`. |
| **`Pending Approval`** | Bags drop below `min_bags`. | Sets `status = 'Reversed'`. | **Safe.** Approver has not signed off yet. Transitions `status = 'Reversed'`, removing it from the pending approval queue. |
| **`Approved`** | Bags drop below `min_bags` (e.g. customer returned 50 bags). | **BUG:** Silently sets `status = 'Reversed'`. Overwrites approval date, loses approval trail, and removes from fulfillment without manager sign-off. | **PROTECTED:** Trigger **REFUSES** to automatically reverse an `Approved` reward. Status remains `Approved`; logs `DEFICIT_ON_APPROVED_REWARD: Review Required` in audit table. Manager must manually reject or grant waiver in CRM. |
| **`Fulfilled`** | Bags drop below `min_bags`. | Ignored by trigger (status remains `Fulfilled`). | **PRESERVED.** Physical gift has already been handed over. Reversal cannot be automatic. Handled via CRM offline reconciliation. |

---

## PHASE 5 — COMPREHENSIVE TEST PLAN

Before executing the migration or building UI components, execute the following 9 test suites:

### Test Suite 1: Anonymous Access (Zero-Trust Baseline)
1. Execute `POST /rest/v1/rpc/get_customer_scheme_performance` with `anonKey`.  
   **Expected Result:** HTTP 401 Unauthorized or HTTP 403 Forbidden (`Access denied: CRM staff only`).
2. Execute `POST /rest/v1/rpc/recalculate_dealer_scheme_eligibility` with `anonKey`.  
   **Expected Result:** HTTP 401 or HTTP 403.
3. Execute `POST /rest/v1/rpc/get_buyer_my_schemes` with `anonKey`.  
   **Expected Result:** HTTP 401 or HTTP 403 (or empty array if authenticated check fails).
4. Execute `GET /rest/v1/dealer_reward_eligibility` with `anonKey`.  
   **Expected Result:** HTTP 200 with `[]` (0 rows) or HTTP 401.
5. Execute `GET /rest/v1/requirement_dispatches` with `anonKey`.  
   **Expected Result:** HTTP 200 with `[]` (0 rows) or HTTP 401.

### Test Suite 2: Buyer A vs Buyer B Customer Isolation
1. Obtain authenticated JWT for Buyer A (`crm_party_id = Party_A`).
2. Obtain authenticated JWT for Buyer B (`crm_party_id = Party_B`).
3. Call `get_buyer_my_schemes()` as Buyer A.  
   **Expected Result:** Returns only Party A's qualifying bags and slabs.
4. Call `get_buyer_my_schemes()` as Buyer B.  
   **Expected Result:** Returns only Party B's qualifying bags and slabs.
5. Buyer A queries `/rest/v1/dealer_reward_eligibility?customer_id=eq.<Party_B>` directly via REST.  
   **Expected Result:** HTTP 200 with `[]` (0 rows returned; RLS denies visibility).
6. Buyer A queries `/rest/v1/requirement_dispatches` directly via REST.  
   **Expected Result:** HTTP 200 with only dispatches linked to requirements where `party_id = Party_A`. Zero dispatches belonging to Party B.

### Test Suite 3: Buyer Attempts to Execute Administrative Actions
1. As Buyer A, call `get_customer_scheme_performance()`.  
   **Expected Result:** PostgreSQL exception raised: `42501 Access denied: CRM staff only`.
2. As Buyer A, attempt `POST /rest/v1/dealer_scheme_slabs` (create slab).  
   **Expected Result:** HTTP 403 / RLS violation (`with check expression failed`).
3. As Buyer A, attempt `PATCH /rest/v1/dealer_scheme_slabs?id=...` (modify slab threshold).  
   **Expected Result:** HTTP 403 / 0 rows updated.
4. As Buyer A, attempt `DELETE /rest/v1/dealer_scheme_slabs?id=...`.  
   **Expected Result:** HTTP 403 / 0 rows deleted.
5. As Buyer A, attempt `PATCH /rest/v1/dealer_reward_eligibility` to set `status = 'Approved'`.  
   **Expected Result:** HTTP 403 / 0 rows updated.

### Test Suite 4: Authorised CRM Administration (No Regressions)
1. As CRM Admin, navigate to `Settings -> Dealer Schemes`.  
   **Expected Result:** Schemes and slabs load successfully; Admin can create, edit, and delete slabs.
2. As CRM Admin/Staff, navigate to `Dealer Growth Hub`.  
   **Expected Result:** `get_customer_scheme_performance()` succeeds, returning full company-wide list.
3. As CRM Admin/Staff, navigate to `Eligible Rewards -> Send for Approval`.  
   **Expected Result:** Status updates to `Pending Approval`.
4. As CRM Admin/Staff, navigate to `Rewards Approval -> Approve`.  
   **Expected Result:** Status updates to `Approved` with `approved_at` timestamp.
5. As CRM Admin/Staff, navigate to `Rewards Fulfillment -> Fulfill`.  
   **Expected Result:** Status updates to `Fulfilled` with fulfillment date and notes.

### Test Suite 5: Unmapped Buyer Account (Fault Tolerance)
1. Authenticate a user with `role = 'Buyer'` whose `app_users.crm_party_id` is `NULL`.
2. Call `get_buyer_my_schemes()`.  
   **Expected Result:** Clean exit returning 0 rows (no 500 crashes, no unauthorized fall-through).
3. Query `dealer_reward_eligibility` and `requirement_dispatches`.  
   **Expected Result:** 0 rows returned.

### Test Suite 6: Trigger Idempotency & Return Handling
1. Insert a dispatch for 100 bags for Customer A on an active scheme.  
   **Expected Result:** Eligibility upserted with `qualifying_bags = 100`, `status = 'Eligible'`.
2. Insert a return of 30 bags (`return_quantity = 30`).  
   **Expected Result:** Eligibility updated with `qualifying_bags = 70`. If 70 is below 100-bag slab, status becomes `Reversed`.
3. If the 100-bag reward had already been approved by a manager (`status = 'Approved'`) before the return:  
   **Expected Result:** Status **remains** `Approved`; audit entry created with `DEFICIT_ON_APPROVED_REWARD: Review Required`.

---

## PHASE 6 — ROLLBACK STRATEGY

If any unexpected regression occurs after applying migration 225:

1. **Rollback Script:** A standalone rollback script `225_rollback_security.sql` can immediately revert policies to their pre-migration state.
2. **CRM Function Preservation:** The signatures of `get_customer_scheme_performance()` and `recalculate_dealer_scheme_eligibility()` remain 100% backward compatible. No column names or types are altered.
3. **Additive Buyer RPC:** `get_buyer_my_schemes()` is completely additive; dropping it does not affect any existing CRM tables or routines.

---

## HARD STOP NOTICE & RECOMMENDATION

As required by the strict micro-sprint instructions:
- **No SQL code has been executed.**
- **No application code has been modified.**
- **Implementation is paused at this hard stop.**

### Recommended Next Action
Upon user review and written approval of this blueprint, execute:
1. **Migration Execution:** Run `225_secure_reward_architecture_and_buyer_contract.sql` against the Supabase backend.
2. **Security Verification:** Run the Phase 5 automated test suite to confirm complete lockdown.
3. **Buyer App Integration Sprint (`SL-BUYER-REWARD-UI-01`):** Build `MyRewardSchemesScreen.js` consuming `get_buyer_my_schemes()` and add the reward tile in `ProfileScreen.js`.
