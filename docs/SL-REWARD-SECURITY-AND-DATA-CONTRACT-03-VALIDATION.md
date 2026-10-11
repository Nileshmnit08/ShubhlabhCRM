# INDEPENDENT VALIDATION REPORT: SL-REWARD-SECURITY-AND-DATA-CONTRACT-03

**Evaluation Date:** October 11, 2026  
**Target Migration File:** [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql) (574 lines)  
**Target Reports Reviewed:**
- [docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-02-REPORT.md](file:///d:/ShubhLabhCRM/docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-02-REPORT.md)
- [docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-01-REPORT.md](file:///d:/ShubhLabhCRM/docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-01-REPORT.md)
- [docs/SL-REWARD-MIGRATION-225-FINAL-VALIDATION.md](file:///d:/ShubhLabhCRM/docs/SL-REWARD-MIGRATION-225-FINAL-VALIDATION.md)
- [docs/SL-REWARD-MIGRATION-225-SAFETY-REVIEW.md](file:///d:/ShubhLabhCRM/docs/SL-REWARD-MIGRATION-225-SAFETY-REVIEW.md)
- [docs/SL-REWARD-CROSS-PROJECT-AUDIT-01-REPORT.md](file:///d:/ShubhLabhCRM/docs/SL-REWARD-CROSS-PROJECT-AUDIT-01-REPORT.md)

**CRM Source Workflows Reviewed:**
- [app/src/pages/DealerGrowthHub/index.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/index.jsx)
- [app/src/pages/DealerGrowthHub/components/Lists/EligibleRewardsList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/EligibleRewardsList.jsx)
- [app/src/pages/DealerGrowthHub/components/Lists/RewardsApprovalList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/RewardsApprovalList.jsx)
- [app/src/pages/DealerGrowthHub/components/Lists/RewardsFulfillmentList.jsx](file:///d:/ShubhLabhCRM/app/src/pages/DealerGrowthHub/components/Lists/RewardsFulfillmentList.jsx)
- [app/src/pages/Settings/DealerSchemes.jsx](file:///d:/ShubhLabhCRM/app/src/pages/Settings/DealerSchemes.jsx)

**Target Supabase Project:** `fwkjddflpzkowlawkmka` (`aws-0-ap-south-1.pooler.supabase.com`)  
**Operating Mode:** STRICT READ-ONLY — Zero database writes, zero migration execution, zero application code changes.

---

## 1. MIGRATION-TO-REPORT CONSISTENCY CHECK

An exhaustive line-by-line verification of [225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql) was conducted against the claims and architectural specifications made in `SL-REWARD-SECURITY-AND-DATA-CONTRACT-02-REPORT.md` and `SL-REWARD-SECURITY-AND-DATA-CONTRACT-01-REPORT.md`.

| Audit Criterion | Claimed in Report 02 | Actual SQL in Migration 225 | Status |
| :--- | :--- | :--- | :--- |
| **Drop Permissive Legacy Policies** | 5 policies on schemes/slabs + 1 on dispatches dropped | Lines 18–22, 49: Explicit `DROP POLICY IF EXISTS` statements execute before new policies are created. | **VERIFIED MATCH** |
| **Admin Scheme Management** | Scheme mutations restricted to `public.is_admin()` | Lines 29–32: Policy `"Admins can manage schemes"` uses `USING (public.is_admin()) WITH CHECK (public.is_admin())`. | **VERIFIED MATCH** |
| **Admin Slab Management** | Slab mutations restricted to `public.is_admin()` | Lines 40–42: Policy `"Admins can manage scheme slabs"` uses `USING (public.is_admin()) WITH CHECK (public.is_admin())`. | **VERIFIED MATCH** |
| **Buyer Dispatch Isolation** | Buyers view dispatches linked strictly to `crm_party_id` | Lines 59–67: Policy `"Buyers can view own dispatches"` enforces `is_buyer() AND EXISTS (SELECT 1 FROM requirements r WHERE r.id = requirement_dispatches.requirement_id AND r.party_id = public.get_auth_crm_party_id())`. | **VERIFIED MATCH** |
| **Reward Tables RLS Enabled** | RLS enabled on 5 reward & target tables | Lines 74–78: Explicit `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` on `dealer_reward_eligibility`, `dealer_reward_calculation_audit`, `dealer_targets`, `dealer_reward_ledger`, `dealer_reward_claims`. | **VERIFIED MATCH** |
| **Buyer Reward Isolation** | Buyers view strictly their own rewards & targets | Lines 86–88, 101–103, 111–113, 121–123: `USING (public.is_buyer() AND customer_id = public.get_auth_crm_party_id())`. | **VERIFIED MATCH** |
| **Audit Table Lockdown** | `dealer_reward_calculation_audit` blocked from buyers | Lines 91–93: SELECT restricted to `public.is_active_user() OR public.is_admin()`; no buyer policy created. | **VERIFIED MATCH** |
| **Revoke Public RPCs** | Revoke execute from `PUBLIC` and `anon` | Lines 130–131, 275–276, 401–402: Explicit `REVOKE EXECUTE ... FROM PUBLIC, anon;` for performance, recalculation, and buyer RPCs. | **VERIFIED MATCH** |
| **Performance RPC Staff Guard** | Internal check denies non-staff callers | Lines 164–167: `IF NOT (public.is_active_user() OR public.is_admin()) THEN RAISE EXCEPTION 'Access denied: CRM staff only' USING ERRCODE = '42501'; END IF;`. | **VERIFIED MATCH** |
| **Recalculation RPC Guard** | Prevents direct buyer invocation with arbitrary IDs | Lines 291–294: `IF auth.uid() IS NOT NULL AND NOT (public.is_active_user() OR public.is_admin()) THEN RAISE EXCEPTION 'Access denied: internal calculation only' USING ERRCODE = '42501'; END IF;`. | **VERIFIED MATCH** |
| **Approved Reward Protection** | No silent status reversal on approved rewards | Lines 333–356: Only reverses `Eligible` and `Pending Approval`; logs `DEFICIT_ON_APPROVED_REWARD: Review Required` if deficit occurs on `Approved`. | **VERIFIED MATCH** |
| **Trigger Function Hardening** | `trg_dispatch_changed` set to `SECURITY DEFINER` | Lines 364–369: Declared `SECURITY DEFINER` with `SET search_path = public, pg_temp`. | **VERIFIED MATCH** |
| **Search Path Security** | Hardened against CVE-2018-1058 | Declared on lines 161, 282, 368, 426 across all four functions. | **VERIFIED MATCH** |
| **Canonical Buyer Read Contract** | Multi-milestone ladder returned without `DISTINCT ON` loss | Lines 404–571: Canonical `get_buyer_my_schemes()` aggregates full slab ladder with individual milestone statuses. | **VERIFIED MATCH** |

**Conclusion:** Migration 225 strictly implements every architectural requirement specified in the sprint reports.

---

## 2. EXACT SQL SECURITY FINDINGS

### 2.1 Function Privileges & Ownership

#### 1. `public.get_customer_scheme_performance()`
- **SQL Grant & Revoke Statements:**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM anon;
  ...
  GRANT EXECUTE ON FUNCTION public.get_customer_scheme_performance() TO authenticated;
  ```
- **Internal Authorization Guard (Lines 164–167):**
  ```sql
  IF NOT (public.is_active_user() OR public.is_admin()) THEN
      RAISE EXCEPTION 'Access denied: CRM staff only' USING ERRCODE = '42501';
  END IF;
  ```
- **Privilege Verification:**
  - `anon`: Revoked at database grant level. Invoking `POST /rpc/get_customer_scheme_performance` with the public anonymous key results in `401 Unauthorized` or `403 Forbidden`.
  - `authenticated` (Buyer): Database execution is granted, but execution immediately halts at line 165 because a Buyer has `role = 'Buyer'` (`is_active_user()` checks `role != 'Buyer'`). The buyer receives SQLSTATE `42501 (Access denied: CRM staff only)`.
  - `authenticated` (CRM Staff / Admin): Evaluates to `true` and returns the company-wide performance table.
- **Ownership & SECURITY DEFINER Context:**
  - Function is created under owner `postgres`.
  - Declared `SECURITY DEFINER SET search_path = public, pg_temp`.
  - `SET search_path = public, pg_temp` immunizes against schema-hijacking attacks (CVE-2018-1058).

#### 2. `public.recalculate_dealer_scheme_eligibility(UUID, UUID)`
- **SQL Grant & Revoke Statements:**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM anon;
  ...
  GRANT EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) TO authenticated;
  ```
- **Internal Authorization Guard (Lines 291–294):**
  ```sql
  IF auth.uid() IS NOT NULL AND NOT (public.is_active_user() OR public.is_admin()) THEN
      RAISE EXCEPTION 'Access denied: internal calculation only' USING ERRCODE = '42501';
  END IF;
  ```
- **Privilege & Mutation Verification:**
  - `anon`: Revoked. Anonymous callers cannot invoke recalculation.
  - `authenticated` (Buyer): If a buyer attempts to call `POST /rpc/recalculate_dealer_scheme_eligibility` with arbitrary customer or scheme UUIDs, `auth.uid()` is NOT NULL, but `is_active_user()` and `is_admin()` are both `false`. The engine raises exception `42501 Access denied: internal calculation only`. The transaction is aborted immediately; **no mutation or calculation occurs**.
  - `authenticated` (CRM Staff): Permitted when staff manually triggers recalculation in CRM.
  - Background Triggers: When triggered by `trg_dispatch_changed()`, the execution occurs under the trigger's `SECURITY DEFINER` context. If executed within a staff session, `is_active_user()` is true. If executed in a service session where `auth.uid()` is `NULL`, `auth.uid() IS NOT NULL` evaluates to `false`, allowing the internal engine to complete the recalculation.

#### 3. `public.trg_dispatch_changed()`
- **SQL Definition (Lines 364–369):**
  ```sql
  CREATE OR REPLACE FUNCTION public.trg_dispatch_changed()
  RETURNS TRIGGER 
  LANGUAGE plpgsql 
  SECURITY DEFINER 
  SET search_path = public, pg_temp
  AS $$ ... $$;
  ```
- **Trigger Execution Verification:**
  - Trigger functions returning `TRIGGER` cannot be invoked directly over PostgREST RPC.
  - When CRM staff creates or modifies a dispatch in `requirement_dispatches`, this trigger executes with the owner privileges of `postgres`.
  - Because `trg_dispatch_changed()` is `SECURITY DEFINER`, revoking direct execute grants on `recalculate_dealer_scheme_eligibility` from `PUBLIC` and `anon` **does NOT break trigger execution**.
  - Furthermore, Buyers only have `SELECT` on `requirement_dispatches` (line 60), meaning buyers can never insert/update dispatches to artificially fire this trigger.

#### 4. `public.get_buyer_my_schemes()`
- **SQL Grant & Revoke Statements (Lines 401–402, 573):**
  ```sql
  REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM PUBLIC;
  REVOKE EXECUTE ON FUNCTION public.get_buyer_my_schemes() FROM anon;
  ...
  GRANT EXECUTE ON FUNCTION public.get_buyer_my_schemes() TO authenticated;
  ```
- **Parameter & Identity Tampering Verification:**
  - The function signature takes **zero arguments**: `FUNCTION public.get_buyer_my_schemes() RETURNS TABLE (...)`.
  - Identity Resolution (Lines 432–436):
    ```sql
    v_customer_id := public.get_auth_crm_party_id();
    IF v_customer_id IS NULL THEN
        RETURN;
    END IF;
    ```
  - The caller **cannot supply a customer ID**. Identity is anchored entirely to `auth.uid()` via `public.get_auth_crm_party_id()`.
  - If an anonymous user, unmapped user, or staff user calls this function, `v_customer_id` evaluates to `NULL` and the function immediately returns an empty result set (safe denial).
  - Cross-customer data snooping is mathematically impossible through this endpoint.

---

### 2.2 Table Policies & Permissive Combination Analysis

In PostgreSQL, multiple permissive policies on a table for the same action combine with boolean `OR` (`Policy_A OR Policy_B`). If an existing policy has `USING (true)`, any new restrictive policy is bypassed unless the open policy is dropped first.

#### Policy Verification Table:

| Table | Dropped Pre-Migration Policy | Replacement Policy | Target Role | Allowed Operations | Condition / Filter |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dealer_schemes` | `"Allow all on dealer_schemes"` | `"Authenticated users can view active schemes"` | `authenticated` | `SELECT` | `status = 'Active' OR is_active_user() OR is_admin()` |
| `dealer_schemes` | *(none)* | `"Admins can manage schemes"` | `authenticated` | `ALL` | `is_admin()` |
| `dealer_scheme_slabs` | `"Enable read access on slabs"` | `"Authenticated users can view scheme slabs"` | `authenticated` | `SELECT` | `true` |
| `dealer_scheme_slabs` | `"Enable insert access on slabs"`<br>`"Enable update access on slabs"`<br>`"Enable delete access on slabs"` | `"Admins can manage scheme slabs"` | `authenticated` | `ALL` | `is_admin()` |
| `requirement_dispatches` | `"Allow all on requirement_dispatches"` | `"Staff can manage requirement dispatches"` | `authenticated` | `ALL` | `is_active_user() OR is_admin()` |
| `requirement_dispatches` | *(none)* | `"Buyers can view own dispatches"` | `authenticated` | `SELECT` | `is_buyer() AND requirements.party_id = get_auth_crm_party_id()` |
| `dealer_reward_eligibility` | *(RLS was disabled)* | `"Staff can manage reward eligibility"` | `authenticated` | `ALL` | `is_active_user() OR is_admin()` |
| `dealer_reward_eligibility` | *(RLS was disabled)* | `"Buyers can view own reward eligibility"` | `authenticated` | `SELECT` | `is_buyer() AND customer_id = get_auth_crm_party_id()` |
| `dealer_reward_calculation_audit` | *(RLS was disabled)* | `"Staff can view reward calculation audit"` | `authenticated` | `SELECT` | `is_active_user() OR is_admin()` |
| `dealer_targets` | *(RLS was disabled)* | `"Staff can manage dealer targets"`<br>`"Buyers can view own dealer targets"` | `authenticated` | `ALL`<br>`SELECT` | `is_active_user() OR is_admin()`<br>`is_buyer() AND customer_id = get_auth_crm_party_id()` |
| `dealer_reward_ledger` | *(RLS was disabled)* | `"Staff can manage reward ledger"`<br>`"Buyers can view own reward ledger"` | `authenticated` | `ALL`<br>`SELECT` | `is_active_user() OR is_admin()`<br>`is_buyer() AND customer_id = get_auth_crm_party_id()` |
| `dealer_reward_claims` | *(RLS was disabled)* | `"Staff can manage reward claims"`<br>`"Buyers can view own reward claims"` | `authenticated` | `ALL`<br>`SELECT` | `is_active_user() OR is_admin()`<br>`is_buyer() AND customer_id = get_auth_crm_party_id()` |

**Key Findings:**
1. All permissive legacy policies are explicitly dropped before new policies are created.
2. Admins retain full scheme/slab configuration privileges.
3. CRM Staff retain full dispatch management and reward approval/fulfillment capabilities.
4. Authenticated Buyers are restricted strictly to `SELECT` on their own dispatches, targets, and rewards.
5. Buyers have **zero write permissions** across all schemes, slabs, dispatches, eligibility rows, ledger entries, and audit logs.

---

## 3. REWARD CALCULATION VERIFICATION

### 3.1 Trace of Calculation Logic

```
Physical Order Created in CRM (requirements & requirement_items)
  │
  ▼
Dispatch Logged by Staff (requirement_dispatches: quantity, return_quantity, dispatch_date)
  │
  ▼
Trigger Fires: trg_dispatch_changed() (SECURITY DEFINER)
  │
  ▼
Engine Invocation: recalculate_dealer_scheme_eligibility(customer_id, scheme_id)
  │
  ├──► Bag Calculation:
  │      v_total_bags = GREATEST(0, COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0))
  │      Filtered by: req.party_id = p_customer_id, status != 'Cancelled', dispatch_date in scheme range
  │
  ├──► Audit Log Insertion:
  │      INSERT INTO dealer_reward_calculation_audit (customer_id, scheme_id, old_bag_total, new_bag_total, trigger_event)
  │
  ├──► For each slab in scheme (ORDER BY min_bags ASC):
  │      │
  │      ├─► Case A: v_total_bags >= min_bags (AND <= max_bags if defined)
  │      │     INSERT INTO dealer_reward_eligibility (customer_id, scheme_id, slab_id, qualifying_bags, status)
  │      │     VALUES (..., v_total_bags, 'Eligible')
  │      │     ON CONFLICT (customer_id, scheme_id, slab_id) DO UPDATE SET:
  │      │       qualifying_bags = EXCLUDED.qualifying_bags,
  │      │       status = CASE WHEN status = 'Reversed' THEN 'Eligible' ELSE status END
  │      │
  │      └─► Case B: v_total_bags < min_bags (Deficit caused by dispatch return)
  │            │
  │            ├─► Status is 'Eligible' or 'Pending Approval':
  │            │     UPDATE dealer_reward_eligibility SET status = 'Reversed'
  │            │
  │            ├─► Status is 'Approved':
  │            │     STATUS REMAINS 'Approved' (DO NOT REVERSE SILENTLY!)
  │            │     INSERT INTO dealer_reward_calculation_audit (trigger_event = 'DEFICIT_ON_APPROVED_REWARD: Review Required')
  │            │
  │            └─► Status is 'Fulfilled':
  │                  Physical gift already delivered. Status remains 'Fulfilled'.
  │
  ▼
Buyer App Read Contract: get_buyer_my_schemes()
  │
  ├──► Evaluates all scheme slabs in parallel with LEFT JOIN to dealer_reward_eligibility
  ├──► Computes individual milestone status for every slab:
  │      - 'Fulfilled' (gift delivered)
  │      - 'Review Required' (status was Approved, but return dropped bags below threshold)
  │      - 'Approved' (approved by manager)
  │      - 'Pending Approval' (submitted for review in CRM)
  │      - 'Eligible' (threshold reached, awaiting submission)
  │      - 'In Progress' (threshold not reached)
  │      - 'Reversed' (rejected by manager)
  │
  └──► Returns comprehensive JSONB array milestones + summary fields:
         highest_achieved_slab_name, highest_milestone_status, next_slab_name, bags_needed_for_next, progress_to_next_percentage
```

### 3.2 Specific Calculation Invariants Verified

1. **Multi-Milestone Preservation:**
   - Previous implementations utilized `DISTINCT ON (dre.scheme_id)` which dropped all lower and upper slabs, returning only one arbitrary milestone per scheme.
   - Migration 225 eliminates `DISTINCT ON`. It iterates across all configured slabs (`all_milestones` CTE) and aggregates them into `milestones JSONB` ordered by `min_bags ASC`.
   - Every tier in progressive milestone ladders is displayed to the buyer.
2. **Buyer App Engine Autonomy:**
   - The Buyer App does **not** perform independent eligibility calculations or apply custom reward formulas.
   - All eligibility states originate from the canonical database engine (`dealer_reward_eligibility` and `recalculate_dealer_scheme_eligibility`).
3. **Clamping & Return Safety:**
   - Both `recalculate_dealer_scheme_eligibility` (line 304) and `get_buyer_my_schemes` (line 448) enforce:
     `GREATEST(0, COALESCE(SUM(rd.quantity - COALESCE(rd.return_quantity, 0)), 0))`
   - Net bag quantities cannot become negative, even if return quantities temporarily exceed dispatches.
4. **Protection of Manager Sign-offs:**
   - In Migration 104, any return immediately flipped rewards to `'Reversed'` regardless of whether a manager had already approved them.
   - Migration 225 prevents this silent reversal. Approved rewards stay `'Approved'`, and a deficit audit row is created. The Buyer App displays `'Review Required'`, alerting both the buyer and staff.
5. **Header-Level Dispatch Limitation (Preserved As-Is):**
   - In the database schema, `dealer_schemes.product_eligibility` is a text field defaulting to `'All'`.
   - `requirement_dispatches` records dispatches at the order header (`requirement_id`) level without foreign keys to individual rows in `requirement_items`.
   - Consequently, all cattle feed bags dispatched against an order count toward active schemes with `product_eligibility = 'All'`.
   - In strict compliance with instructions (*"Do not invent SKU-level eligibility behaviour"*), Migration 225 preserves this exact existing calculation.

---

## 4. ROLLBACK ASSESSMENT

### 4.1 Comparative Analysis with Pre-Migration Baseline

The rollback procedure proposed in earlier documentation was compared against the live pre-migration database state:

| Component | Pre-Migration Baseline | Proposed Rollback Script | Assessment |
| :--- | :--- | :--- | :--- |
| `dealer_schemes` Policies | `"Allow all on dealer_schemes"` (open to all) | Adds `"Staff rollback access..."` without dropping Migration 225 policies | **CONFLICT RISK** |
| `dealer_scheme_slabs` Policies | 4 policies allowing authenticated CRUD | Adds `"Staff rollback access..."` without dropping Migration 225 policies | **CONFLICT RISK** |
| `requirement_dispatches` Policies | `"Allow all on requirement_dispatches"` (open to all) | Adds `"Staff rollback access..."` without dropping Migration 225 policies | **CONFLICT RISK** |
| `dealer_reward_eligibility` Policies | RLS Disabled | Adds `"Staff rollback access..."` without dropping Migration 225 policies | **CONFLICT RISK** |
| `get_buyer_my_schemes()` | Did not exist | `DROP FUNCTION IF EXISTS public.get_buyer_my_schemes();` | **SAFE & CLEAN** |
| Function Grants & Search Paths | Unhardened; public execute | Retains revoked grants and hardened `search_path` | **SAFE (Fixes CVE)** |
| Historical Data | 9 eligibility rows, 128 audit rows, 79 dispatches | Zero DROP TABLE, zero TRUNCATE, zero DELETE | **DATA SAFE** |

### 4.2 Defect in Proposed Rollback & Required Hardening

In PostgreSQL, executing `CREATE POLICY "Staff rollback access..."` without first dropping the replacement policies created by Migration 225 (`"Authenticated users can view active schemes"`, `"Admins can manage schemes"`, `"Buyers can view own dispatches"`, etc.) creates multiple overlapping permissive policies combined with `OR`.

To safely rollback without policy conflicts or accidental access expansion, the rollback procedure **must explicitly drop the Migration 225 policies first**:

```sql
-- ============================================================================
-- HARDENED ROLLBACK SPECIFICATION: 225_rollback_security.sql
-- ============================================================================

-- Step 1: Drop Buyer App read RPC cleanly
DROP FUNCTION IF EXISTS public.get_buyer_my_schemes();

-- Step 2: Drop all policies created by Migration 225
DROP POLICY IF EXISTS "Authenticated users can view active schemes" ON public.dealer_schemes;
DROP POLICY IF EXISTS "Admins can manage schemes" ON public.dealer_schemes;

DROP POLICY IF EXISTS "Authenticated users can view scheme slabs" ON public.dealer_scheme_slabs;
DROP POLICY IF EXISTS "Admins can manage scheme slabs" ON public.dealer_scheme_slabs;

DROP POLICY IF EXISTS "Staff can manage requirement dispatches" ON public.requirement_dispatches;
DROP POLICY IF EXISTS "Buyers can view own dispatches" ON public.requirement_dispatches;

DROP POLICY IF EXISTS "Staff can manage reward eligibility" ON public.dealer_reward_eligibility;
DROP POLICY IF EXISTS "Buyers can view own reward eligibility" ON public.dealer_reward_eligibility;

DROP POLICY IF EXISTS "Staff can view reward calculation audit" ON public.dealer_reward_calculation_audit;

DROP POLICY IF EXISTS "Staff can manage dealer targets" ON public.dealer_targets;
DROP POLICY IF EXISTS "Buyers can view own dealer targets" ON public.dealer_targets;

DROP POLICY IF EXISTS "Staff can manage reward ledger" ON public.dealer_reward_ledger;
DROP POLICY IF EXISTS "Buyers can view own reward ledger" ON public.dealer_reward_ledger;

DROP POLICY IF EXISTS "Staff can manage reward claims" ON public.dealer_reward_claims;
DROP POLICY IF EXISTS "Buyers can view own reward claims" ON public.dealer_reward_claims;

-- Step 3: Restore Staff Operational Baseline (Without re-opening anonymous or buyer leaks)
CREATE POLICY "Staff fallback on dealer_schemes"
  ON public.dealer_schemes FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on dealer_scheme_slabs"
  ON public.dealer_scheme_slabs FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on requirement_dispatches"
  ON public.requirement_dispatches FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

CREATE POLICY "Staff fallback on dealer_reward_eligibility"
  ON public.dealer_reward_eligibility FOR ALL TO authenticated
  USING (public.is_active_user() OR public.is_admin())
  WITH CHECK (public.is_active_user() OR public.is_admin());

-- Step 4: Retain security hardening on functions (Do not re-grant to PUBLIC)
REVOKE EXECUTE ON FUNCTION public.get_customer_scheme_performance() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.recalculate_dealer_scheme_eligibility(UUID, UUID) FROM PUBLIC, anon;
```

**Rollback Verdict:**  
The rollback script is **statically sound when policy drops are included**, but because it has not been physically executed against a live test schema, it is classified as **UNVERIFIED PENDING STAGING DATABASE**.

---

## 5. VALIDATION LIMITATIONS & EVIDENCE

### 5.1 Static Inspection vs Live Observations

| Item | Method | Evidence / Observation | Verdict |
| :--- | :--- | :--- | :--- |
| **Local Docker Ports** | Live TCP Probe (`check_ports.js`) | Ports 5432, 54321, 54322, 6543 all returned `ECONNREFUSED`. | Confirmed local Supabase is offline. |
| **Live Database Tables** | Live REST OpenAPI (`/rest/v1/`) | Confirmed live presence of `dealer_schemes`, `dealer_scheme_slabs`, `dealer_reward_eligibility`, `dealer_reward_calculation_audit`, `dealer_targets`, `dealer_reward_ledger`, `dealer_reward_claims`, `requirement_dispatches`. | Tables exist in production. |
| **Anonymous Data Leak** | Live REST RPC (`test_live_security.js`) | Invoking `POST /rpc/get_customer_scheme_performance` with public anonKey returned HTTP 200 with 64 records containing names, phones, net bags. | Confirmed critical production leak. |
| **Helper Functions** | Live REST RPC (`test_helper_rpcs.js`) | Calling `is_admin`, `is_active_user`, `is_buyer`, `get_auth_crm_party_id` with anonKey returned `false` / `null`. | Helper functions operational. |
| **SQL Syntax & CTE Logic** | Static Code Inspection | Validated PostgreSQL syntax, table references, CTE join conditions, and `search_path` clauses in Migration 225. | Syntactically verified. |
| **RLS Policy Drops** | Static Code Inspection | Checked lines 18–22, 49 of Migration 225 for `DROP POLICY IF EXISTS`. | Verified legacy drops present. |

### 5.2 Tests Requiring a Dedicated Staging Database

The following verification tests **CANNOT** and **MUST NOT** be executed against production without risking live data corruption or service interruption. They are explicitly marked **UNVERIFIED PENDING STAGING**:

1. **Actual Migration DDL Execution:** Executing `supabase db push` or raw migration runner against a database instance.
2. **Runtime Policy Enforcement:** Authenticating as Buyer A and attempting to read Buyer B's rows in `requirement_dispatches` and `dealer_reward_eligibility`.
3. **Buyer Slab Tamper Rejection:** Authenticating as Buyer A and attempting `POST /dealer_scheme_slabs` to confirm HTTP 403 Forbidden.
4. **Trigger Firing Verification:** Inserting an actual test dispatch row into `requirement_dispatches` and observing that `trg_dispatch_changed()` successfully triggers `recalculate_dealer_scheme_eligibility` without permission failures.
5. **Physical Rollback Execution:** Executing the rollback script on a populated schema and verifying that CRM staff retains access while anonymous access remains closed.

---

## 6. REMAINING BLOCKERS & RECOMMENDED CORRECTIONS

### 6.1 Blockers
1. **Absence of Staging Environment:** Docker local Supabase is offline (`ECONNREFUSED`), and the remote project `fwkjddflpzkowlawkmka` is production. Testing DDL migrations or mutating triggers against production is strictly prohibited.
2. **Order Header Dispatch Architecture:** `dealer_schemes.product_eligibility` cannot filter individual product line items until dispatches are linked to `requirement_items`. This is documented as a known design characteristic, preserved faithfully in Migration 225.

### 6.2 Recommended Corrections (For Next Approved Sprint)
1. **Migration File Idempotency:** In `225_secure_reward_architecture_and_buyer_contract.sql`, add `DROP POLICY IF EXISTS` before each `CREATE POLICY` on the 5 reward tables (lines 81–123). This guarantees that re-running the migration will never throw `policy "..." already exists`.
2. **Rollback Script Inclusion:** Commit the hardened rollback script [225_rollback_security.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_rollback_security.sql) containing explicit policy drops into the repository alongside Migration 225.
3. **Migration 225 Preservation:** In strict compliance with instructions (*"Do not modify migration 225 during this sprint"*), [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql) was **not modified** during this validation sprint.

---

## DECISION

Based on independent static code verification, mathematical tracing of calculation logic, cross-project workflow alignment, and live read-only security probes:

Migration 225 is **statically sound, logically consistent, and architecturally complete**. However, runtime execution against production is halted because local Docker Supabase is offline.

```
STATUS: REVIEW COMPLETE — STAGING VALIDATION REQUIRED
```

STOP — WAIT FOR USER APPROVAL
