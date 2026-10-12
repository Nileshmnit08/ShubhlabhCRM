# MICRO-SPRINT REPORT: SL-ORDER-REWARDS-LIVE-DATA-FIX-01

**Project:** Shubh Labh Buyer App (`shubhlabh-order`) & Shubh Labh CRM (`app`)  
**Target Migration:** [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///D:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql)  
**Rollback Script:** [supabase/migrations/225_rollback_security.sql](file:///D:/ShubhLabhCRM/supabase/migrations/225_rollback_security.sql)  
**Target Supabase Instance:** `https://fwkjddflpzkowlawkmka.supabase.co`  
**Execution Mode:** STRICT READ-ONLY BACKEND — Zero unapproved production SQL executed, zero schema tampering, safe user-facing error state.  
**Date:** October 12, 2026  

---

## 1. CONFIRMED ROOT CAUSE INVESTIGATION (PHASE 1)

### 1.1 Buyer App Service Inspection
The Buyer App service was inspected in [shubhlabh-order/src/features/rewards/rewardService.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/rewards/rewardService.js).
- **Service Call Signature:** The Buyer App calls `supabase.rpc('get_buyer_my_schemes')`.
- **Parameter Check:** Zero client arguments are passed. The client never supplies `customer_id`, `party_id`, or query filters.
- **Environment Matching:** The app initializes Supabase via `src/core/api/supabase.js`, reading from `.env`:
  `EXPO_PUBLIC_SUPABASE_URL=https://fwkjddflpzkowlawkmka.supabase.co`.
  This connects to the live production Supabase instance (`fwkjddflpzkowlawkmka`).

### 1.2 Live Database Probe Results
A direct probe against `https://fwkjddflpzkowlawkmka.supabase.co` was conducted:
1. **RPC Invocation Probe:**
   - Call: `POST https://fwkjddflpzkowlawkmka.supabase.co/rest/v1/rpc/get_buyer_my_schemes`
   - Response: `HTTP 404 Not Found`
   - Error Body:
     ```json
     {
       "code": "PGRST202",
       "details": null,
       "hint": null,
       "message": "Could not find the function public.get_buyer_my_schemes without parameters in the schema cache"
     }
     ```
2. **Database Object Existence Check:**
   - Table `public.dealer_schemes`: **EXISTS** (Contains live active schemes such as `Q3 Monsoon Bonanza 2026`, `Diwali Dhamaka Advance 2026`).
   - Table `public.dealer_scheme_slabs`: **EXISTS** (Contains milestone slab configurations).
   - Table `public.dealer_reward_eligibility`: **EXISTS** (Contains calculated achievement records).
   - Auth Helper `public.get_auth_crm_party_id()`: **EXISTS** (Resolved server-side from `auth.uid()`).
   - Security Helpers `public.is_admin()`, `public.is_active_user()`, `public.is_buyer()`: **EXISTS**.
3. **Root Cause Confirmation:**
   - The RPC `public.get_buyer_my_schemes()` is **genuinely missing from the remote database schema cache** because Migration 225 has not yet been deployed to project `fwkjddflpzkowlawkmka`.
   - The failure is **not** caused by network disconnection, incorrect client signature, invalid parameter passing, or response mapping errors.
   - The error previously observed on device (`public.get_buyer_my_schemes() is not deployed on this Supabase project (pending Migration 225)`) was the service's internal diagnostic message leaking directly to the user interface.

---

## 2. REVIEW OF REQUIRED BACKEND CHANGE (PHASE 2)

An exhaustive review of Migration 225 ([supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///D:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql)) and the prerequisite audit reports ([SL-REWARD-SECURITY-AND-DATA-CONTRACT-02-REPORT.md](file:///D:/ShubhLabhCRM/docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-02-REPORT.md), [SL-REWARD-SECURITY-AND-DATA-CONTRACT-03-VALIDATION.md](file:///D:/ShubhLabhCRM/docs/SL-REWARD-SECURITY-AND-DATA-CONTRACT-03-VALIDATION.md), [SL-REWARD-STAGING-ENVIRONMENT-01-REPORT.md](file:///D:/ShubhLabhCRM/docs/SL-REWARD-STAGING-ENVIRONMENT-01-REPORT.md)) was conducted.

### 2.1 Verification of 6 Critical Security & Contract Invariants

| Invariant | Requirement | Migration 225 Implementation | Status |
| :--- | :--- | :--- | :--- |
| **1. Session-Derived Identity** | Buyer identity must be derived strictly from authenticated session | Line 434: `v_party_id := public.get_auth_crm_party_id();`. Reads `auth.uid()` -> `app_users.crm_party_id`. | **VERIFIED** |
| **2. Zero Parameter Spoofing** | A buyer cannot supply another customer's ID | `get_buyer_my_schemes()` declares zero arguments (`()`). No client-supplied parameter is accepted or evaluated. | **VERIFIED** |
| **3. Staff-Only Performance Isolation** | Company-wide performance data must never be exposed to buyers | `get_customer_scheme_performance()` explicitly executes: `IF NOT (public.is_active_user() OR public.is_admin()) THEN RAISE EXCEPTION 'Access denied: CRM staff only' USING ERRCODE = '42501'; END IF;`. | **VERIFIED** |
| **4. Multi-Milestone Ladder Preservation** | All milestones must be returned without row dropping | Full join on `dealer_scheme_slabs` with `COALESCE(jsonb_agg(...))` returns every slab with progress and status; eliminates legacy `DISTINCT ON` row loss. | **VERIFIED** |
| **5. Approved & Fulfilled Reward Protection** | Approved and fulfilled rewards must never be silently reversed on dispatch returns | In `recalculate_dealer_scheme_eligibility()`, status reversal occurs strictly for `status IN ('Eligible', 'Pending Approval')`. Deficits on `Approved` log `DEFICIT_ON_APPROVED_REWARD: Review Required` for CRM staff review. `Fulfilled` records are never modified. | **VERIFIED** |
| **6. CRM Compatibility** | CRM scheme, slab, and fulfillment workflows remain fully compatible | RLS policies grant `is_active_user() OR is_admin()` full operational access across `dealer_schemes`, `dealer_scheme_slabs`, `dealer_reward_eligibility`, and dispatches. Staff operations in `DealerGrowthHub` remain uninterrupted. | **VERIFIED** |

### 2.2 Clarification of Identity Link Architecture
- `public.party_identity_links` is strictly utilized for Tally ERP ledger imports (`crm_party_id` -> `tally_raw_party_id`), not for authentication.
- Application authentication is linked through `public.app_users.crm_party_id`, which is canonically resolved by `public.get_auth_crm_party_id()`.

---

## 3. IMPLEMENTATION DECISION & DEPLOYMENT PLAN (PHASE 3)

### 3.1 Environmental Constraint
- The local staging container environment is currently **offline** (Docker daemon is not installed on the Windows workstation host; `podman` also not detected).
- The only available remote Supabase project is the **active production database** (`fwkjddflpzkowlawkmka`).

### 3.2 Strict Deployment Guardrails
1. **Zero Unapproved Production SQL:** In strict compliance with sprint instructions, Migration 225 was **NOT** executed against production during this micro-sprint.
2. **Zero Partial Deployment:** The RPC `get_buyer_my_schemes()` was **NOT** deployed independently or without its accompanying RLS security policies, grants, and triggers. A partial deployment would expose un-gated reward endpoints or create policy race conditions.
3. **Smallest Safe Deployment Path:** When the user explicitly approves deployment, the complete migration must be executed in a single atomic transaction.

### 3.3 Atomic Deployment Procedure (Ready for User Execution)
1. **Pre-Deployment Check:** Run pre-check probe to confirm live connections and verify prerequisite tables (`app_users`, `dealer_schemes`, `requirements`, etc.).
2. **Execute Migration:** Apply [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///D:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql) via Supabase Console SQL Editor or authorized migration runner.
3. **Reload Schema Cache:** Issue PostgREST cache reload:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
4. **Post-Deployment Verification:**
   - Probe `POST /rest/v1/rpc/get_buyer_my_schemes` with authenticated buyer JWT to verify HTTP 200 and valid JSON schema.
   - Probe `POST /rest/v1/rpc/get_buyer_my_schemes` with anonymous key to verify access denial (HTTP 401 / 403).
   - Probe `POST /rest/v1/rpc/get_customer_scheme_performance` with buyer JWT to verify SQLSTATE 42501 (Access Denied).
5. **Rollback Plan:** If any regression occurs, execute [supabase/migrations/225_rollback_security.sql](file:///D:/ShubhLabhCRM/supabase/migrations/225_rollback_security.sql) to cleanly drop buyer RPCs/policies while preserving staff access.

### 3.4 Migration 225 SQL Correction (PostgreSQL 42883 Fix)
- **Observed Error:**
  `Failed to run sql query: ERROR: 42883: function public.get_buyer_my_schemes() does not exist`
- **Cause:**
  In PostgreSQL, `REVOKE EXECUTE ON FUNCTION ...` aborts with `42883` if the target function does not exist yet. The initial draft placed `REVOKE` before `CREATE OR REPLACE FUNCTION public.get_buyer_my_schemes()`. Because this function is brand new in Migration 225, calling `REVOKE` before creation resulted in an immediate abort.
- **Correction Applied in Migration 225:**
  Moved `REVOKE EXECUTE ... FROM PUBLIC, anon;` to immediately **after** the `CREATE OR REPLACE FUNCTION ... END; $$;` block across all three security functions (`get_customer_scheme_performance`, `recalculate_dealer_scheme_eligibility`, and `get_buyer_my_schemes`). The corrected migration file now creates the function first, then cleanly revokes public execution, and finally grants execute to `authenticated`.

---

## 4. BUYER APP ERROR HANDLING ENHANCEMENTS (PHASE 4)

In accordance with Phase 4 guidelines (*"Keep the existing safe error state. Improve the message if necessary so it does not expose internal database function names to ordinary buyers. Show a user-friendly message such as: 'Reward schemes are temporarily unavailable. Please try again later.' Keep the Retry button functional. Do not silently show dummy rewards or treat a backend failure as an empty scheme list"*):

### 4.1 Modifications Made

1. **`rewardService.js` Sanitization:**
   - Replaced internal error message `'Backend canonical RPC public.get_buyer_my_schemes() is not deployed on this Supabase project (pending Migration 225).'` with user-friendly string:
     `'Reward schemes are temporarily unavailable. Please try again later.'`
   - Replaced raw activity message with:
     `'Qualifying activity history is temporarily unavailable. Please try again later.'`
   - Preserved `errorCode: REWARD_ERROR_CODES.RPC_NOT_DEPLOYED` and `missingDependency: 'public.get_buyer_my_schemes()'` for telemetry, diagnostics, and testing.
   - Retained raw network/database errors under `rawError` property rather than displaying them to end users.

2. **Localization Integration (`en.js` & `hi.js`):**
   - Added `'rewards.unavailable'`:
     - **EN:** `"Reward schemes are temporarily unavailable. Please try again later."`
     - **HI:** `"रिवॉर्ड योजनाएं अभी उपलब्ध नहीं हैं। कृपया कुछ समय बाद पुनः प्रयास करें।"`
   - Updated `'rewards.activityPending'` to remove raw migration references:
     - **EN:** `"Qualifying activity history is temporarily unavailable. Please try again later."`
     - **HI:** `"मान्य गतिविधि इतिहास अभी उपलब्ध नहीं है। कृपया कुछ समय बाद पुनः प्रयास करें।"`

3. **Screen Error Rendering (`MyRewardSchemesScreen.js` & `RewardDetailScreen.js`):**
   - Standardized error message resolution:
     ```javascript
     {errorInfo.errorCode === REWARD_ERROR_CODES.UNAUTHENTICATED
       ? (t('rewards.unauthenticated') || errorInfo.message)
       : (t('rewards.unavailable') || errorInfo.message || 'Reward schemes are temporarily unavailable. Please try again later.')}
     ```
   - Maintained functional **Retry** button connecting directly to `loadSchemes(false)` and `loadData(false)`.
   - Maintained strict truth: Zero fallback to mock data; backend failure is never disguised as an empty scheme list.

---

## 5. TEST & VALIDATION RESULTS (PHASE 5)

### 5.1 Unit Test Suite Execution
The automated test suite in [shubhlabh-order/src/features/rewards/__tests__/rewardService.test.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/rewards/__tests__/rewardService.test.js) was executed via Node.js test runner:

```text
node --test src/features/rewards/__tests__/rewardService.test.js
✔ Security Boundary: Service must ONLY invoke get_buyer_my_schemes with ZERO client-supplied ID parameters (2.0819ms)
✔ Error Handling: Gracefully captures PGRST202 (missing RPC) when migration 225 is not yet deployed (0.8682ms)
✔ Scheme Categorization: Splits schemes by dates without marking active as completed on milestone achievement (10.5461ms)
✔ Status Mapping: Accurately maps all seven lifecycle statuses to theme and localization tokens (0.3122ms)
✔ Milestone History Truth: Approved is NOT Fulfilled and Reversed is NOT Active (0.1925ms)
✔ Qualifying Activity Security: Safely prevents direct queries to staff-only tables (1.0771ms)
✔ Mock Fallback Removal: Failed live requests must NOT silently return mock fixtures (0.6362ms)
✔ Error Sanitization: Ensures ordinary buyers never see internal RPC names or migration numbers (0.2898ms)
✔ Empty State Truth: Legitimate empty active schemes must not fall back to fixtures (0.2957ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ duration_ms 192.6495
```

### 5.2 Device UI Verification
- Hardware Device: Android phone `e0d9da95`.
- On launch and navigation to "My Reward Schemes":
  - Clean error card is rendered with warning icon.
  - Heading: "Unable to load reward schemes"
  - Body Text: **"Reward schemes are temporarily unavailable. Please try again later."** (or Hindi equivalent if Hindi language is selected).
  - No internal SQL function name (`public.get_buyer_my_schemes`) or migration reference (`Migration 225`) is visible to the buyer.
  - "Retry" button triggers live probe against backend.
  - Safe error state remains active until backend deployment is completed.

---

## 6. DEPLOYMENT BLOCKERS & REMAINING PREREQUISITES

| Item | Status | Action Required |
| :--- | :--- | :--- |
| **Buyer App Client Code** | **COMPLETE & TESTED** | Sanitized error handling and secure RPC call ready in `shubhlabh-order`. |
| **Migration 225 SQL** | **REVIEWED & READY** | Complete, hardened SQL ready in `supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql`. |
| **Rollback Script SQL** | **READY** | Hardened rollback script ready in `supabase/migrations/225_rollback_security.sql`. |
| **Local Staging Environment** | **UNAVAILABLE** | Docker is not installed on host machine; cannot run local Supabase test instance. |
| **Live Database Deployment** | **PENDING USER APPROVAL** | Production Supabase database requires explicit user sign-off to execute Migration 225. |

---

## 7. CONCLUSION & STATUS

All client-side error sanitization, security reviews, contract validations, and rollback preparations are complete. Live deployment of Migration 225 to the production Supabase database awaits user authorization.

STATUS: BLOCKED — BACKEND DEPLOYMENT REQUIRED

STOP — WAIT FOR USER APPROVAL
