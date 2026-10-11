# Sprint Completion Report: SL-ORDER-REWARDS-DETAILS-HISTORY-01
## BUYER APP: REWARD DETAILS & MILESTONE HISTORY EXPERIENCE

**Date:** 11 October 2026  
**Project:** Shubh Labh Buyer App (`shubhlabh-order`)  
**Status:** `STATUS: PASS — READY FOR USER REVIEW`

---

## 1. Previous Sprint Verification

A strict inspection was performed across the repository and previous reports:
- **`SL-ORDER-REWARDS-UI-01`:** Completed. Verified that `MyRewardSchemesScreen.js`, `rewardService.js`, and navigation from `ProfileScreen.js` were implemented with 3 category tabs (Active, Upcoming, Completed), multi-milestone ladder, and 4 passing unit tests.
- **`SL-ORDER-REWARDS-DATA-INTEGRATION-01`:** Verified that no separate report or merged changes exist for this sprint name. Live backend inspection confirmed that Migration 225 has **not yet been executed** on production, and `get_buyer_my_schemes` returns `PGRST202` (function not in schema cache).
- **Outcome:** Proceeded with implementing the Reward Details & Milestone History experience on top of the verified `SL-ORDER-REWARDS-UI-01` foundation without recreating existing modules or inventing client-side calculations.

---

## 2. Files Changed & Created

| File Path | Action | Description |
|---|---|---|
| `shubhlabh-order/src/navigation/ProfileStackNavigator.js` | **Modified** | Registered `RewardDetailScreen` (`RewardDetail`) in `ProfileStack`. |
| `shubhlabh-order/src/features/rewards/MyRewardSchemesScreen.js` | **Modified** | Added "View Details & History" (`विवरण एवं इतिहास देखें`) action on scheme cards that navigates to `RewardDetailScreen`. |
| `shubhlabh-order/src/features/rewards/rewardService.js` | **Modified** | Added `fetchSchemeDetails(schemeId)`, `fetchSchemeQualifyingActivity(schemeId)`, `getDevActivityFixtures(schemeId)`, and new error codes (`ACTIVITY_RPC_NOT_DEPLOYED`, `SCHEME_NOT_FOUND`). |
| `shubhlabh-order/src/features/rewards/RewardDetailScreen.js` | **Created** | Implemented full Reward Details screen featuring Scheme Overview, Milestone History timeline, and Qualifying Activity chronological list. |
| `shubhlabh-order/src/shared/localization/en.js` | **Modified** | Added 20 English localization strings for scheme details, qualification rules, milestone history, and qualifying activity. |
| `shubhlabh-order/src/shared/localization/hi.js` | **Modified** | Added 20 Hindi localization strings for scheme details, qualification rules, milestone history, and qualifying activity. |
| `shubhlabh-order/src/features/rewards/__tests__/rewardService.test.js` | **Modified** | Added unit tests verifying milestone history truth (`Approved != Fulfilled`, `Reversed != Active`) and qualifying activity security boundary. |

---

## 3. Screen and Navigation Behaviour

### 3.1. Navigation Entry
1. Buyer navigates from **Profile** -> **My Reward Schemes**.
2. Each scheme card in Active, Upcoming, and Completed lists now includes a dedicated **View Details & History** (`विवरण एवं इतिहास देखें`) button with a `ChevronRight` icon.
3. Tapping the CTA navigates to `RewardDetail` in `ProfileStackNavigator`, passing `{ scheme, schemeId, isDevPreview }`.

### 3.2. Android Back Navigation
- `RewardDetailScreen` registers a hardware back button listener (`BackHandler.addEventListener('hardwareBackPress')`).
- Pressing the hardware back button or the `SLHeader` back chevron triggers `navigation.goBack()`, returning cleanly to `MyRewardSchemesScreen` with the active tab and scroll position preserved.

---

## 4. Data Fields Used and Source Truth

The details screen strictly surfaces canonical CRM fields without client-side derivation:

### 4.1. Scheme Overview
- `scheme_name`: Authoritative scheme title (`public.dealer_schemes.name`).
- `start_date` & `end_date`: Validity date range.
- `days_remaining`: Calculated days to scheme closure.
- `description`: CRM-configured qualification rules & terms (`public.dealer_schemes.description`).
- `current_net_bags`: Net qualifying dispatched bags (deducting returns) for the buyer during the active window.
- `next_slab_name`: Next target milestone slab.
- `bags_needed_for_next`: Net bags remaining to reach next slab.

### 4.2. Milestone History (Phase 3)
For each milestone configured under `dealer_scheme_slabs`:
- `slab_name`: Slab title (e.g., "Silver Slab", "Gold Slab", "Platinum Slab").
- `min_bags` & `max_bags`: Threshold range for eligibility.
- `reward_description`: Configured physical gift or reward (e.g., "Silver Coin (10 Grams)", "Smart LED TV 43-inch").
- `reward_type`: Reward category (e.g., "Physical Gift", "Home Appliance", "Vehicle").
- `milestone_status`: Authoritative status from `dealer_reward_eligibility`:
  - `In Progress`
  - `Eligible`
  - `Pending Approval`
  - `Approved`
  - `Review Required`
  - `Fulfilled`
  - `Reversed`
- `earned_at`, `approved_at`, `fulfilled_at`: Actual timestamps displayed **only when returned by source data**.

> [!IMPORTANT]
> **Strict Truth Rules Enforced:**
> - `Approved` is never interpreted as `Fulfilled`. A distinct badge and visual indicator differentiate approved rewards awaiting delivery from physically handed-over rewards.
> - `Reversed` milestones display an alert banner and are never presented as active or earned rewards.
> - `Review Required` milestones display a warning callout informing the buyer of a return-induced bag deficit requiring review.

### 4.3. Qualifying Activity (Phase 4)
When provided by the backend contract:
- `dispatch_date`: Date the dispatch was recorded.
- `order_number`: Demand reference / Order header ID.
- `dispatched_bags`: Positive qualifying bag quantity (`+X Bags`).
- `returned_bags`: Subtracted returned bag quantity (`-Y Bags`).
- `net_qualifying_bags`: Net contribution (`= Z Bags`).

---

## 5. Security & Boundary Rules

1. **Zero Client-Side Customer ID:** No client-provided customer ID is trusted or passed. The session `auth.uid()` resolves to `crm_party_id` server-side.
2. **No Direct Staff Queries:** The client never queries `sales_invoices`, `requirement_dispatches`, or `dealer_reward_eligibility` with unauthorized client filters.
3. **No Frontend Calculation Drift:** Milestones and eligibility are derived strictly from database contracts.
4. **Header-Level Dispatch Limitation Respected:** Preserved the known constraint that dispatches are associated with order headers rather than SKU line items.

---

## 6. Tests & Build Results

### 6.1. Unit Tests (`node --test`)
Executed updated test suite in `shubhlabh-order/src/features/rewards/__tests__/rewardService.test.js`:
```text
✔ Security Boundary: Service must ONLY invoke get_buyer_my_schemes with ZERO client-supplied ID parameters (0.99ms)
✔ Error Handling: Gracefully captures PGRST202 (missing RPC) when migration 225 is not yet deployed (0.25ms)
✔ Scheme Categorization: Splits schemes by dates without marking active as completed on milestone achievement (1.08ms)
✔ Status Mapping: Accurately maps all seven lifecycle statuses to theme and localization tokens (0.25ms)
✔ Milestone History Truth: Approved is NOT Fulfilled and Reversed is NOT Active (0.15ms)
✔ Qualifying Activity Security: Safely prevents direct queries to staff-only tables (0.13ms)

ℹ tests 6
ℹ pass 6
ℹ fail 0
ℹ duration_ms 177ms
```

### 6.2. Localization Verification
Verified that all 53 reward-related localization tokens exist in both `en.js` and `hi.js` with zero missing keys.

### 6.3. Babel Compilation Check
All modified and created files transpiled cleanly with `babel-preset-expo`:
- `RewardDetailScreen.js`: 27,222 bytes
- `MyRewardSchemesScreen.js`: 22,092 bytes
- `rewardService.js`: 11,922 bytes
- `ProfileStackNavigator.js`: 2,817 bytes

### 6.4. Expo Metro Bundler Android Validation
Executed complete Metro Android export build (`npx expo export -p android --no-bytecode`):
```text
Android Bundled 2162ms index.js (3284 modules)
› android bundles (1):
_expo/static/js/android/index-224fae605ea43330012af8031ffe098a.js (4MB)
Exported successfully with exit code 0.
```

---

## 7. Remaining Backend Dependencies

| Dependency | Purpose | Status |
|---|---|---|
| `public.get_buyer_my_schemes()` | Buyer-safe read contract for schemes & milestones | Defined in Migration 225 (Lines 404–574); pending execution on live database. |
| Buyer Dispatch History Policy / RPC | Buyer-safe chronological qualifying dispatch & return list | `requirement_dispatches` RLS policy in Migration 225 (Lines 60–65) or dedicated RPC pending deployment. |

---

STATUS: PASS — READY FOR USER REVIEW

STOP — WAIT FOR USER APPROVAL
