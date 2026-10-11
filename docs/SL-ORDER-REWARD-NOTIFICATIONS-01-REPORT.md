# Sprint Completion Report: SL-ORDER-REWARD-NOTIFICATIONS-01
## BUYER APP: BUYER-SPECIFIC REWARD NOTIFICATIONS & DELIVERY SAFETY

**Date:** 11 October 2026  
**Project:** Shubh Labh Buyer App (`shubhlabh-order`) & CRM (`app`)  
**Status:** `STATUS: PASS — READY FOR USER REVIEW`

---

## 1. Previous Sprint Verification

A strict inspection was conducted across the codebase and sprint documentation:

- **`SL-ORDER-REWARDS-UI-01`:** Completed. Verified that `MyRewardSchemesScreen.js`, `rewardService.js`, and navigation from `ProfileScreen.js` exist with 3 category tabs (Active, Upcoming, Completed) and lifecycle status badges.
- **`SL-ORDER-REWARDS-DATA-INTEGRATION-01`:** Completed. Verified that migration 225 has **not yet been executed on production**. Graceful fallback patterns (`getDevRewardFixtures()`, `RPC_NOT_DEPLOYED` error handling) are active and safe.
- **`SL-ORDER-REWARDS-DETAILS-HISTORY-01`:** Completed. Verified that `RewardDetailScreen.js` exists with Scheme Overview, Milestone History timeline, and Qualifying Activity ledger, with navigation from `ProfileStackNavigator`.

---

## 2. Existing Notification Infrastructure Reused

Rather than inventing a parallel notification pipeline, the sprint reused the canonical CRM communication stack:

1. **Database Tables & RLS Policies:**
   - `public.business_updates`: Reused for reward and scheme updates. RLS policy (`229_sprint_COMM_01_business_updates.sql`) guarantees that updates are only visible if `audience_type = 'ALL'` or `customer_id` is present in `business_update_recipients` linked to the authenticated buyer's `app_users.id = auth.uid()`.
   - `public.business_update_recipients`: Reused for targeted buyer delivery, tracking `read_at` and `delivered_at` timestamps.
   - `public.user_push_tokens`: Existing push device registration table for FCM/APNs delivery.
2. **Screens and UI Components:**
   - `BusinessUpdatesListScreen.js`: Reused existing inbox list screen; added branded styling, `Award` icon rendering, and reward-specific empty states.
   - `BusinessUpdateDetailScreen.js`: Reused existing update detail view; added context-aware deep linking to scheme and reward detail screens.
3. **Security Boundary Enforcement:**
   - No client-side eligibility calculation is performed in the Buyer App.
   - No staff-only RPCs (`get_customer_scheme_performance`) or private audit tables (`dealer_reward_calculation_audit`) are queried by the client.
   - Service-role keys and private secrets remain strictly server-side.

---

## 3. Supported Reward Events

All 6 canonical reward lifecycle events are supported and mapped to farmer-friendly bilingual messages (English & Hindi):

| Canonical Status | Event Identifier | Farmer-Friendly Title (EN / HI) | Description / Trigger |
|---|---|---|---|
| **Eligible** | `REWARD_MILESTONE_ELIGIBLE` | Milestone Achieved! / माइलस्टोन पूरा हुआ! | Dispatched bags satisfy slab threshold; reward is unlocked. |
| **Pending Approval** | `REWARD_SUBMITTED_FOR_APPROVAL` | Reward Claim in Verification / रिवॉर्ड सत्यापन जारी | Milestone claim submitted to management for verification. |
| **Approved** | `REWARD_APPROVED` | Reward Approved! / रिवॉर्ड स्वीकृत! | Management has formally approved the reward claim. |
| **Fulfilled** | `REWARD_FULFILLED` | Reward Delivered! / रिवॉर्ड प्राप्त हुआ! | Physical reward has been handed over or disbursed. |
| **Review Required** | `REWARD_REVIEW_REQUIRED` | Reward Review Required / रिवॉर्ड समीक्षा आवश्यक | Dispatch return or deficit reduces qualifying bags below threshold. |
| **Reversed** | `REWARD_REVERSED` | Reward Milestone Reversed / रिवॉर्ड निरस्त किया गया | Order cancellation or correction reverses milestone. |

Internal staff notes, wholesale profit margins, and backend audit identifiers are strictly stripped before reaching the presentation layer.

---

## 4. Files Changed & Created

| File Path | Action | Description |
|---|---|---|
| `shubhlabh-order/src/features/rewards/rewardNotificationService.js` | **Created** | Core service managing reward notification event mapping, data sanitization, deduplication, fetching via `business_updates`, and read receipt tracking. |
| `shubhlabh-order/src/features/businessUpdates/BusinessUpdateDetailScreen.js` | **Modified** | Added deep-linking CTA button ("View Scheme & Rewards" / "योजना एवं रिवॉर्ड देखें") navigating to `RewardDetail` or `MyRewardSchemes`. |
| `shubhlabh-order/src/features/businessUpdates/BusinessUpdatesListScreen.js` | **Modified** | Added `Award` icon and primary branded border for reward updates; updated `ListEmptyComponent` for reward filter. |
| `shubhlabh-order/src/shared/localization/en.js` | **Modified** | Added English localization tokens for reward notification titles, descriptions, and CTA actions. |
| `shubhlabh-order/src/shared/localization/hi.js` | **Modified** | Added Hindi localization tokens for reward notification titles, descriptions, and CTA actions. |
| `shubhlabh-order/src/features/rewards/__tests__/rewardNotificationService.test.js` | **Created** | Unit test suite covering event mapping, sanitization, deduplication, and buyer boundary safety. |

---

## 5. Recipient Isolation & Deduplication Approach

### 5.1. Recipient Isolation
- The Buyer App relies strictly on Supabase Auth session identity (`auth.uid()`).
- Data access is mediated through PostgreSQL Row Level Security (RLS) on `business_updates` and `business_update_recipients`:
  ```sql
  -- Verified from migration 229:
  EXISTS (
    SELECT 1 FROM public.business_update_recipients bur
    JOIN public.app_users au ON au.crm_party_id = bur.customer_id
    WHERE bur.update_id = business_updates.id AND au.id = auth.uid()
  )
  ```
- Buyer A cannot read or receive Buyer B's reward notifications under any circumstance.

### 5.2. Delivery Safety & Deduplication
To prevent duplicate alerts when dispatches are edited or when backend recalculation jobs re-evaluate eligibility:
- A stable signature is computed:
  $$\text{Key} = \text{customerId} : \text{schemeId} : \text{slabId} : \text{status}$$
- Notifications matching an existing key in the current batch or recent history are deduplicated, ensuring the buyer only sees one notification per discrete status transition.
- Distinct milestones within the same scheme, or subsequent status transitions (e.g. `Eligible` $\rightarrow$ `Approved`), have distinct keys and are preserved.

### 5.3. Data Sanitization
The service runs incoming notifications through `sanitizeNotification()`:
- Allowed: `id`, `title`, `message`, `type`, `published_at`, `scheme_id`, `slab_id`, `reward_status`, `event_type`, `is_read`, `read_at`.
- Stripped: `internal_staff_notes`, `margin_rate`, `profit_margin_pct`, `wholesale_unit_cost`, `created_by_staff_id`, `audit_log_reference`.

---

## 6. Tests Performed & Results

### 6.1. Unit Tests (`node --test`)
Executed both test suites in `src/features/rewards/__tests__/`:

```
✔ Event Mapping: Correctly maps all 6 canonical reward lifecycle events (1.14ms)
✔ Security & Sanitization: Strips internal staff notes, margin calculations, and private audit details (0.55ms)
✔ Delivery Safety & Deduplication: Prevents duplicate notification cards on dispatch edits or recalculations (0.48ms)
✔ Buyer Boundary Safety: Queries must enforce customer_id filter or rely on existing business_updates RLS (1.74ms)
✔ Security Boundary: Service must ONLY invoke get_buyer_my_schemes with ZERO client-supplied ID parameters (1.16ms)
✔ Error Handling: Gracefully captures PGRST202 (missing RPC) when migration 225 is not yet deployed (0.37ms)
✔ Scheme Categorization: Splits schemes by dates without marking active as completed on milestone achievement (1.20ms)
✔ Status Mapping: Accurately maps all seven lifecycle statuses to theme and localization tokens (0.40ms)
✔ Milestone History Truth: Approved is NOT Fulfilled and Reversed is NOT Active (0.26ms)
✔ Qualifying Activity Security: Safely prevents direct queries to staff-only tables (0.16ms)

Total: 10 tests passed, 0 failed.
```

### 6.2. Production Build & Transpilation Validation
Ran Metro bundler export (`npx expo export -p android --no-bytecode`):
- **Modules Bundled:** 3,284 modules.
- **Errors/Warnings:** 0 bundling or syntax errors.
- **Output:** Clean JavaScript bundle generated in staging artifact directory.

### 6.3. Push Delivery Distinction Note
- **Simulated / In-App Notification Tests:** Passed. Data parsing, sanitization, deep linking, read receipts, and deduplication verified.
- **Physical Push Notification Delivery:** Push notifications via FCM/APNs rely on device tokens registered in `public.user_push_tokens`. Real remote push delivery requires a physical Android/iOS device registration and server-side Edge Function invocation. No unverified claims of physical push delivery are made.

---

## 7. Missing Backend Dependency & Proposed Smallest Safe Change

### Current Backend Gap
While `public.business_updates` and `public.business_update_recipients` exist and provide secure buyer isolation, **no automated PostgreSQL trigger or CRM queue currently exists on `public.dealer_reward_eligibility`** to automatically create records in `public.business_updates` when reward milestones transition status.

### Recommended Smallest Safe Backend Change (For Separately Approved Sprint)
1. Add an idempotent trigger on `public.dealer_reward_eligibility`:
   ```sql
   CREATE OR REPLACE FUNCTION trg_notify_reward_eligibility_change()
   RETURNS trigger AS $$
   DECLARE
     v_update_id uuid;
     v_scheme_name text;
     v_slab_name text;
     v_gift_name text;
   BEGIN
     -- Only trigger on meaningful status transitions
     IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
       RETURN NEW;
     END IF;

     -- Fetch scheme and slab names
     SELECT ds.name, dss.slab_name, dss.gift_name
     INTO v_scheme_name, v_slab_name, v_gift_name
     FROM dealer_schemes ds
     JOIN dealer_scheme_slabs dss ON dss.id = NEW.slab_id
     WHERE ds.id = NEW.scheme_id;

     -- Insert into business_updates
     INSERT INTO business_updates (
       title, message, type, audience_type, status, published_at, scheme_id, slab_id
     ) VALUES (
       CASE NEW.status
         WHEN 'Eligible' THEN 'Milestone Achieved!'
         WHEN 'Pending Approval' THEN 'Reward Claim in Verification'
         WHEN 'Approved' THEN 'Reward Approved!'
         WHEN 'Fulfilled' THEN 'Reward Delivered!'
         WHEN 'Review Required' THEN 'Reward Review Required'
         WHEN 'Reversed' THEN 'Reward Milestone Reversed'
         ELSE 'Reward Status Update'
       END,
       'Your reward status for ' || coalesce(v_slab_name, 'milestone') || ' in ' || coalesce(v_scheme_name, 'scheme') || ' is now ' || NEW.status,
       'REWARD',
       'SPECIFIC',
       'PUBLISHED',
       now(),
       NEW.scheme_id,
       NEW.slab_id
     ) RETURNING id INTO v_update_id;

     -- Insert into business_update_recipients
     INSERT INTO business_update_recipients (update_id, customer_id)
     VALUES (v_update_id, NEW.customer_id);

     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```
2. This approach avoids modifying production RLS policies and requires zero client-side schema alterations.

---

STATUS: PASS — READY FOR USER REVIEW

STOP — WAIT FOR USER APPROVAL
