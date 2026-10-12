# SPRINT REPORT: SL-ORDER-REWARDS-LIVE-DATA-01

**Sprint**: SL-ORDER-REWARDS-LIVE-DATA-01  
**Project**: Shubh Labh Buyer App (`D:\ShubhLabhCRM\shubhlabh-order`) & CRM (`D:\ShubhLabhCRM\app`)  
**Target Supabase Instance**: `https://fwkjddflpzkowlawkmka.supabase.co`  
**Execution Timestamp**: 2026-10-12T09:55:00+05:30  
**Overall Sprint Status**: `STATUS: PARTIAL — BACKEND DEPENDENCY REQUIRED`  

---

## 1. OBJECTIVE & SCOPE ENFORCEMENT

The objective of this micro-sprint is to replace dummy/mock reward data in the Shubh Labh Buyer App with real, authenticated data from the existing CRM reward system, while:
1. Preserving the existing Buyer App UI and user experience.
2. Respecting strict buyer data isolation boundaries (server-side authentication only; never passing `customer_id` from client).
3. Never calling staff-only reward endpoints (`public.get_customer_scheme_performance()`).
4. Never executing unapproved production migrations or modifying production RLS policies.
5. Verifying the deployed existence of the canonical buyer RPC `public.get_buyer_my_schemes()`.
6. Safely removing mock-data fallbacks so that requests never silently fall back to fake rewards.

---

## 2. PHASE 1 — AUDIT OF MOCK DATA SOURCES

Every hardcoded, fixture, and placeholder data source in the Buyer App was audited:

| Component / File | Identified Mock Data Source | Purpose / Previous Behavior | Status in Sprint |
| :--- | :--- | :--- | :--- |
| `src/features/rewards/rewardService.js` | `getDevLayoutFixtures()` | 4 hardcoded fake scheme objects (`fix-scheme-001` through `004`) with mocked milestones, reward gifts, and fake bag numbers. | **Production fallback removed**. Functions remain exported strictly for unit tests. |
| `src/features/rewards/rewardService.js` | `fetchSchemeDetails(schemeId)` | Automatically returned `getDevLayoutFixtures()` whenever live data was absent or failed. | **Removed silent fallback**. Now returns legitimate not-found or backend error status. |
| `src/features/rewards/rewardService.js` | `getDevActivityFixtures(schemeId)` | 4 hardcoded fake dispatch/return records (`act-001` to `act-004`). | **Production fallback removed**. Isolated to test fixtures. |
| `src/features/rewards/MyRewardSchemesScreen.js` | `loadSchemes()` automatic fallback | Automatically loaded `getDevLayoutFixtures()` on `RPC_NOT_DEPLOYED`. | **Removed**. Screen now displays honest error state with Retry button; preview is restricted to `__DEV__`. |
| `src/features/rewards/RewardDetailScreen.js` | `loadData()` activity loader | Automatically loaded `getDevActivityFixtures()` into `activityRecords`. | **Removed**. Screen displays clear missing-dependency notice and empty activity state. |
| `src/features/rewards/rewardNotificationService.js` | `getDevRewardNotificationFixtures()` | 6 mock reward notifications (`notif-fix-001` to `006`). | Retained strictly for unit test coverage; live queries use `business_updates`. |

---

## 3. PHASE 2 — BACKEND CONTRACT & DEPLOYMENT VERIFICATION

Direct probes were executed against the active target database (`https://fwkjddflpzkowlawkmka.supabase.co`):

### 1. Canonical Buyer RPC: `public.get_buyer_my_schemes()`
- **Probe**: `supabase.rpc('get_buyer_my_schemes')`
- **Result**:
  ```json
  {
    "status": 404,
    "statusText": "Not Found",
    "error": {
      "code": "PGRST202",
      "details": "Searched for the function public.get_buyer_my_schemes without parameters or with a single unnamed json/jsonb parameter, but no matches were found in the schema cache.",
      "hint": "Perhaps you meant to call the function public.get_customer_scheme_performance",
      "message": "Could not find the function public.get_buyer_my_schemes without parameters in the schema cache"
    }
  }
  ```
- **Finding**: **`public.get_buyer_my_schemes()` is NOT deployed on the target database**. Migration 225 remains local under review (`supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql`).

### 2. Security Boundary Enforcement
- PostgREST suggested: `"Perhaps you meant to call the function public.get_customer_scheme_performance"`.
- In strict adherence to Sprint Rule 1:
  > **Rule 1: Never call `public.get_customer_scheme_performance()` from the Buyer App.**
  `get_customer_scheme_performance()` is an internal company-wide staff tool that exposes all dealers across all territories without buyer isolation. Under no circumstances was it wired to the Buyer App.
- Direct table queries to `dealer_reward_eligibility` were likewise NOT substituted for the RPC, adhering to:
  > **"If the buyer-safe RPC is missing, insecure, or unavailable, stop the live integration at that boundary and report the exact backend dependency. Do not bypass security with direct table queries."**

---

## 4. PHASE 3 & 4 — IMPLEMENTATION & SAFE MOCK REMOVAL

### Files Changed in Buyer App (`shubhlabh-order`)

1. **`src/features/rewards/rewardService.js`**:
   - `fetchSchemeDetails(schemeId)`: Removed silent fallback to `getDevLayoutFixtures()`. Returns genuine database result or error code (`SCHEME_NOT_FOUND`, `RPC_NOT_DEPLOYED`).
   - Retained canonical error mappings (`REWARD_ERROR_CODES.RPC_NOT_DEPLOYED`, `UNAUTHENTICATED`, `NETWORK_ERROR`).

2. **`src/features/rewards/MyRewardSchemesScreen.js`**:
   - Removed automatic fallback to `getDevLayoutFixtures()` when backend RPC is missing.
   - Live query errors now render the explicit error banner (`rewards.errorTitle`, message, and `<RefreshCw>` Retry CTA).
   - Preview mode is strictly gated behind `__DEV__`.

3. **`src/features/rewards/RewardDetailScreen.js`**:
   - Removed injection of `getDevActivityFixtures` into `activityRecords`.
   - On missing activity backend dependency, shows empty activity state and clean notification banner:
     `"Qualifying activity history requires backend dispatch contract deployment (Migration 225)."`

4. **`src/features/rewards/__tests__/rewardService.test.js`**:
   - Added unit tests verifying that failed live calls never silently inject mock fixtures and that empty live arrays render genuine empty states.

---

## 5. AUTOMATED TEST VALIDATION

Ran test suite via Node test runner:
```bash
node --test src/features/rewards/__tests__/*.test.js
```

**Results**:
- **Total Tests**: 22
- **Passed**: 22
- **Failed**: 0
- **Suites**:
  - `rewardService.test.js`: 8/8 passed (Security boundary, PGRST202 capture, date categorization, 7-lifecycle status token mappings, status truth, mock fallback removal, empty state truth).
  - `rewardNotificationService.test.js`: 4/4 passed (6 lifecycle events, sanitization of internal notes/margins, deduplication of recalculation events, buyer boundary safety).
  - `rewardEndToEnd.test.js`: 10/10 passed (Empty bucket rendering, network retry, auth expiry, multi-milestone monotonicity, null safety, back navigation contracts).

---

## 6. BUILD & PHYSICAL ANDROID DEVICE TESTING

### Android Release Build
- Executed: `cmd.exe /c "gradlew.bat assembleRelease"` in `D:\ShubhLabhCRM\shubhlabh-order\android`
- JS Bundle created: `index.android.bundle` (3,284 modules bundled in 48.3s)
- Output APK: `D:\ShubhLabhCRM\shubhlabh-order\android\app\build\outputs\apk\release\app-release.apk` (93,496,285 bytes)
- Result: **BUILD SUCCESSFUL**

### Device Installation & Verification
- Target Device: `e0d9da95`
- Command: `adb -s e0d9da95 install -r app-release.apk`
- Status: `Performing Streamed Install -> Success`
- App Launch: `com.shubhlabh.order/.MainActivity` started successfully.
- Behavior Verified:
  1. Profile, Home, Orders, and Navigation stacks remain fully operational.
  2. Reward service respects server-side session authentication; unauthenticated access displays the appropriate login requirement.
  3. Live RPC call returns `PGRST202` (RPC not deployed); app halts gracefully at the security boundary and presents the clear error state with Retry CTA.
  4. App **does NOT silently display dummy/mock rewards**.
  5. Back navigation works smoothly without UI freezes.

---

## 7. ROOT CAUSE & MISSING BACKEND DEPENDENCY

The live rewards integration boundary is stopped at the deployment of:
- **Missing Dependency**: `public.get_buyer_my_schemes()`
- **Migration Source**: `D:\ShubhLabhCRM\supabase\migrations\225_secure_reward_architecture_and_buyer_contract.sql`
- **Action Required for Production Activation**: The system administrator must review and apply Migration 225 to the target Supabase instance. Once applied, `public.get_buyer_my_schemes()` will resolve buyer identity via `get_auth_crm_party_id()`, calculate multi-milestone progress, and return live data to `MyRewardSchemesScreen` without requiring any further mobile code changes.

---

## 8. DEFINITION OF DONE & FINAL STATUS

STATUS: PARTIAL — BACKEND DEPENDENCY REQUIRED

STOP — WAIT FOR USER APPROVAL
