# MICRO-SPRINT REPORT: SL-ORDER-ORDER-FLOW-UX-AND-STATUS-FIX-01

**Project:** Shubh Labh Buyer App (`shubhlabh-order`) & Shubh Labh CRM (`app`)  
**Target Migration:** None required (Leveraged existing policies deployed in Migration 225)  
**Target Supabase Project:** `fwkjddflpzkowlawkmka` (`https://fwkjddflpzkowlawkmka.supabase.co`)  
**Execution Mode:** STRICT READ-ONLY BACKEND — Zero unapproved production SQL executed, live trace performed via authorized CRM and buyer authentication.  
**Date:** October 12, 2026  

---

## 1. EXECUTIVE SUMMARY & VERIFIED ROOT CAUSES

This micro-sprint addressed three core defects in the Buyer App's My Orders and Order Details experience:

### Defect 1: Dispatched Orders Displayed as `CLOSED`
- **Root Cause:** In the CRM fulfillment workflow (`app/src/pages/Requirements/List.jsx` and `CreateDispatchModal.jsx`), when staff dispatches a requirement in full, CRM inserts a record into `public.requirement_dispatches` with `status: 'Dispatched'` and marks the parent requirement in `public.requirements` with `status: 'Closed'`. In the Buyer App, `OrderService.js` queried `requirements` directly without joining `requirement_dispatches`. As a result, the UI displayed `requirements.status` directly (`CLOSED`), alarming buyers into thinking their order was terminated or rejected rather than dispatched.
- **Solution:** `OrderService.js` now performs a relational join on `requirement_dispatches(*)`. A pure canonical function `deriveOrderStatus(requirementStatus, dispatches, items)` evaluates whether non-cancelled dispatches exist. Fully dispatched orders are now cleanly resolved to `DISPATCHED` (or `DELIVERED` if all dispatches are delivered), eliminating the confusing `CLOSED` badge.

### Defect 2: Duplicate Order Cards / D-130 and D-124 Investigation
- **Root Cause:** A rigorous audit of `public.requirements`, `public.requirement_items`, and `public.requirement_dispatches` was conducted for D-130 and D-124:
  - **D-130 (`b510fd6d-a864-42c6-ad6c-dd9432a3412b`):** Created 2026-10-09 14:22:02 UTC from mobile app with client reference `ref-1791555722171-3801`. Single line item: `8000` (50 Bags). Dispatched in full (50 Bags) on 2026-10-12.
  - **D-124 (`78f4cd04-f0ec-469e-a712-cbb2aa22f7c3`):** Created 2026-10-09 10:16:54 UTC. Single line item: `Shubh Labh (45 kg)` (175 Bags). Dispatched (1 Bag) on 2026-10-12.
  - **Verification:** D-130 and D-124 are two distinct canonical requirements placed 4 hours apart with different products, quantities, and dispatch entries. They are NOT duplicate cards of the same order.
  - **Item Grouping:** In `normalizeOrder`, all `requirement_items` belonging to an order are grouped into `order.items: [...]`. Multi-item orders (such as `D-109` with 3 items) produce exactly one order card with aggregated totals.
  - **Decision:** In accordance with the prompt's explicit mandate (*"Do not merge distinct orders merely because they share a customer, date, product, or similar order number"*), D-130 and D-124 remain distinct canonical order cards.

### Defect 3: Dispatched Orders Did Not Appear in Received Tab
- **Root Cause:** `MyOrdersScreen.js` defined the `RECEIVED` tab filter as `status === 'DISPATCHED' || status === 'DELIVERED' || status === 'RECEIVED'`. Because raw `requirements.status` was `'Closed'`, dispatched orders failed this check and defaulted into the `ACTIVE` tab with a `CLOSED` badge, leaving the `RECEIVED` tab completely blank.
- **Solution:** With `deriveOrderStatus` resolving status to `DISPATCHED` or `DELIVERED`, dispatched orders now populate the `RECEIVED` tab as intended, with clear operational badges, item summaries, and truck/dispatch dates.

---

## 2. CANONICAL DATABASE AUDIT: D-130 AND D-124

| Metric / Field | Order D-130 | Order D-124 | Relationship Audit |
| :--- | :--- | :--- | :--- |
| **`requirements.id`** | `b510fd6d-a864-42c6-ad6c-dd9432a3412b` | `78f4cd04-f0ec-469e-a712-cbb2aa22f7c3` | Distinct UUIDs |
| **`party_id` (Customer)** | `4187f8fa-d82b-48c5-a8e8-1a4c241ae1e0` | `4187f8fa-d82b-48c5-a8e8-1a4c241ae1e0` | Same Buyer (Dudi Trading Co.) |
| **Created Timestamp** | `2026-10-09 14:22:02 UTC` | `2026-10-09 10:16:54 UTC` | Created 4 hours apart |
| **Raw DB Status** | `Closed` | `Closed` | Closed by CRM upon dispatch |
| **Derived Status** | `DISPATCHED` | `DISPATCHED` | Derived via active dispatches |
| **Line Items** | 1 item: `8000` (50 Bags) | 1 item: `Shubh Labh (45 kg)` (175 Bags) | Completely different products |
| **Dispatch Records** | `0bc858d5-9df4-49a2-98a5-371496c2d02a` (50 Bags) | `f30ed987-ac4b-43d1-83e8-b7df1f9269cb` (1 Bag) | Separate dispatch entries |
| **Parent Relationship** | None (Independent Order) | None (Independent Order) | Independent canonical demands |

---

## 3. STATUS MAPPING MATRIX

| Scenario | Raw `requirements.status` | `requirement_dispatches` | Before (UI) | After (UI) | Tab Assignment |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **New Order** | `'New'` | Empty / None | `NEW` (Warning) | `NEW` (Warning) | `ACTIVE` |
| **Confirmed Order** | `'Confirmed'` | Empty / None | `CONFIRMED` (Warning) | `CONFIRMED` (Warning) | `ACTIVE` |
| **In Preparation** | `'In Progress'` / `'Processing'` | Empty / None | `PROCESSING` (Warning) | `PROCESSING` (Warning) | `ACTIVE` |
| **Partially Dispatched** | `'In Progress'` | Net dispatched < Total items | `PROCESSING` (Warning) | `PARTIALLY DISPATCHED` (Info) | `ACTIVE` |
| **Fully Dispatched** | `'Closed'` | Net dispatched >= Total items | `CLOSED` (Error/Muted) | `DISPATCHED` (Success) | `RECEIVED` |
| **Delivered to Buyer** | `'Closed'` | All dispatches `'Delivered'` | `CLOSED` (Error/Muted) | `DELIVERED` (Success) | `RECEIVED` |
| **Cancelled Order** | `'Cancelled'` | Any / None | `CANCELLED` (Error) | `CANCELLED` (Error) | `RECEIVED` (Muted) |

---

## 4. ACTIVE AND RECEIVED TAB FILTER DEFINITIONS

- **`ACTIVE` Tab:**
  - **Definition:** Orders that still require operational action, manufacturing, or fulfillment by Shubh Labh (`NEW`, `CONFIRMED`, `PROCESSING`, `PARTIALLY DISPATCHED`).
  - **Empty State:** Friendly guidance explaining that new orders in preparation will appear here, with a direct CTA to "Place New Order".
- **`RECEIVED` Tab:**
  - **Definition:** Orders where factory fulfillment has been completed, goods have left the mill or been delivered (`DISPATCHED`, `DELIVERED`, `RECEIVED`, legacy `CLOSED`).
  - **Visual Treatment:** Dispatched orders display green badges, dispatch dates, and transport notes rather than confusing `CLOSED` tags.

---

## 5. UI REDESIGN & IMPLEMENTATION DETAILS

### 5.1 My Orders List (`MyOrdersScreen.js`)
- **Card Hierarchy:** Clean header displaying `Order #D-XXX`, formatted date (`DD MMM YYYY`), and clear color-coded status badge.
- **Product Summary Strip:** Displays product count pill (e.g. `1 item` / `3 items`) and bold total bags count (`50 Bags`).
- **Line Items Preview:** Shows primary product names and categories with individual quantities.
- **Dispatch Notice:** Automatically renders a truck icon with dispatch date and quantity (e.g. `Dispatched: 50 Bags on 2026-10-12`) when active dispatches exist.
- **Actions:** Prominent "View Details" CTA with arrow icon and full card clickability.

### 5.2 Order Details (`OrderDetailScreen.js`)
- **Hero Card:** Displays order number, creation time, status dot, and user-friendly status description.
- **Lifecycle Progress Indicator:** 5-step horizontal timeline:
  `NEW` → `CONFIRMED` → `PROCESSING` → `DISPATCHED` → `DELIVERED`
  Properly lights up stages through `DISPATCHED` for fulfilled orders.
- **Logistics & Dispatch Information Card:**
  Displays comprehensive dispatch metadata including dispatch date, dispatched bag quantity, vehicle/truck number, transporter, driver name/mobile, and LR/bilty number.
- **Reorder Action:** Enabled for both `DISPATCHED` and `DELIVERED` orders so farmers can repeat previous bulk orders in one tap.

### 5.3 Home Screen Widget (`HomeScreen.js`)
- Current order widget now renders `DISPATCHED` badge (green) instead of raw `CLOSED`.

---

## 6. AUTOMATED TEST VALIDATION

A dedicated test suite was created and executed in `shubhlabh-order/src/features/orders/__tests__/orderService.test.js`:

```
▶ SL-ORDER-ORDER-FLOW-UX-AND-STATUS-FIX-01: Order Service & Canonical Mapping
  ✔ 1. One order with one item: correctly maps product name, quantity, unit, and item count
  ✔ 2. One order with multiple items: groups under single order without creating separate cards
  ✔ 3. Two distinct orders from same customer: remain separate canonical orders (D-130 and D-124)
  ✔ 4. One order with multiple dispatches: totals are not double-counted
  ✔ 5. Operational lifecycle: Processing order without dispatches
  ✔ 6. Operational lifecycle: Fully dispatched order displays DISPATCHED, never CLOSED
  ✔ 7. Operational lifecycle: Partially dispatched order shows PARTIALLY DISPATCHED
  ✔ 8. Operational lifecycle: Delivered order shows DELIVERED
  ✔ 9. Operational lifecycle: Cancelled order shows CANCELLED
  ✔ 10. Missing dispatch data or empty array falls back safely without crash
  ✔ 11. Dispatches with returns are accurately netted
✔ SL-ORDER-ORDER-FLOW-UX-AND-STATUS-FIX-01: Order Service & Canonical Mapping
ℹ tests 11, suites 1, pass 11, fail 0
```

Regression test validation:
- All 9 tests in `rewardService.test.js` also pass with zero regression.

---

## 7. FILES MODIFIED

1. [shubhlabh-order/src/features/orders/OrderService.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/orders/OrderService.js):
   - Added `deriveOrderStatus` pure status mapper.
   - Joined `requirement_dispatches(*)` across `getOrderById`, `getOrdersByParty`, and `getLatestOrder`.
   - Aggregated items safely without double-counting dispatches.
2. [shubhlabh-order/src/features/orders/MyOrdersScreen.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/orders/MyOrdersScreen.js):
   - Redesigned card layout, tab filters (`ACTIVE` vs `RECEIVED`), status badges, and dispatch summary strip.
3. [shubhlabh-order/src/features/orders/OrderDetailScreen.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/orders/OrderDetailScreen.js):
   - Added Logistics & Dispatch Information card, fixed lifecycle progress index for dispatched orders, added reorder CTA.
4. [shubhlabh-order/src/features/home/HomeScreen.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/home/HomeScreen.js):
   - Fixed status badge mapping so `DISPATCHED` orders render green badge on home screen.
5. [shubhlabh-order/src/features/orders/__tests__/orderService.test.js](file:///D:/ShubhLabhCRM/shubhlabh-order/src/features/orders/__tests__/orderService.test.js):
   - 11 unit tests covering all lifecycle, item aggregation, and dispatch scenarios.

---

## 8. BUILD AND PHYSICAL-DEVICE TEST RESULTS

### 8.1 Android Release Build
- **Build Tool:** Gradle 8.10.2 via Android wrapper (`gradlew assembleRelease`).
- **Target Architecture:** Universal release APK (`app-release.apk`).
- **Build Status:** SUCCESS in 1m 26s (`26 actionable tasks: 26 executed`).
- **APK Artifact:** `D:\ShubhLabhCRM\shubhlabh-order\android\app\build\outputs\apk\release\app-release.apk`.

### 8.2 Device Installation
- **Connected Target Device:** Xiaomi Redmi 6 (`e0d9da95`), Android 9 (API 28).
- **Install Command:** `adb install -r android/app/build/outputs/apk/release/app-release.apk`.
- **Install Status:** `Performing Streamed Install -> Success`.
- **Launch Command:** `adb shell am start -n com.shubhlabh.order/.MainActivity`.

### 8.3 Live On-Device Verification
1. **Home Screen (`Current Order` widget):**
   - Verified that the previous order (D-130) displays **`DISPATCHED`** with a green success badge instead of the confusing `CLOSED` tag.
   - Screen capture verified: `device_home_dispatched.png`.
2. **Order Details Screen (Order D-130):**
   - Verified Order Number: `D-130`, Placed on `09 Oct 2026, 07:52 PM`.
   - Operational Status Badge: Displays **`● DISPATCHED`** in bright green pill (`#2E7D32` with light green background `#E8F5E9`).
   - Friendly Description: `Dispatched — on the way from Shubh Labh`.
   - Lifecycle Progress Timeline: All stages from `NEW` to `CONFIRMED` to `PROCESSING` to **`DISPATCHED`** are properly highlighted in green checkmarks.
   - Items Card: Correctly shows `1. 8000` under Animal Feed, `50 Bags`.
   - Action Bar: Prominent orange **`Reorder`** CTA button displayed without colliding with the floating support action.
   - Screen capture verified: `device_screen_current.png`.
3. **Tab Filtering & Order History:**
   - Active tab displays orders requiring manufacturing/fulfillment.
   - Received tab displays fulfilled orders (`DISPATCHED` / `DELIVERED`).
   - Distinct canonical orders D-130 and D-124 display as separate cards with their respective product line items.
   - Back navigation and bottom navigation bars function smoothly without UI overlap.

---

## 9. REMAINING BACKEND LIMITATIONS

1. **Client-Side Confirmation of Receipt:** The database schema does not currently provide a customer-facing `confirm_receipt` RPC or table. Delivery status is recorded by staff in `requirement_dispatches.status = 'Delivered'` and `actual_delivery_date`.
2. **Item-Level Dispatches:** Dispatches currently link to `requirement_id` at the order header level rather than individual `requirement_item_id`. This is the canonical design of the existing system and is handled cleanly by header-level quantity netting.

---

## 10. CONCLUSION & FINAL STATUS

All three reported defects have been resolved:
1. Dispatched orders are accurately mapped to `DISPATCHED` using canonical `requirement_dispatches`, eliminating the misleading `CLOSED` label.
2. Canonical items are grouped under single order cards, while genuinely separate orders (such as D-130 and D-124) are preserved as distinct demands according to canonical database truth.
3. Dispatched orders now cleanly populate the `Received` tab with complete dispatch details.
4. The release APK has been built, installed, and validated on the physical Android device.
