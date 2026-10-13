# MICRO-SPRINT: SL-REQ-DISPATCH-STATUS-FIX-01 — AUDIT REPORT
**Target System:** Shubh Labh CRM Requirements Board (`https://shubhlabh-crm.vercel.app/requirements`)  
**Investigation Date:** 2026-10-13  
**Status:** DIAGNOSIS COMPLETE (ROOT CAUSE PROVEN)

---

## 1. Executive Summary & Objective
A regression was reported on the CRM Requirements page (`https://shubhlabh-crm.vercel.app/requirements`):
> Requirements marked as dispatched are displayed in a way that does not match previously working behavior.

This audit investigates the end-to-end data fetching, database view definitions, status update workflows, status mapping, filter execution, and UI rendering to diagnose the exact root causes behind why dispatched requirements appear improperly on the board and lack distinguishing visual presentation.

---

## 2. Affected Files & Code Locations

| File Path | Role in Workflow | Specific Issue / Defect Found |
| :--- | :--- | :--- |
| `app/src/pages/Requirements/List.jsx` | Main Requirements Board UI, data-fetching query, filters, cards, and table | 1. **Overly broad active query:** Replaced `query.eq('is_pending', true)` with `query.not('status', 'in', '("Closed","Fulfilled","Completed","Cancelled","Lost","Won")')` in commit `a90d51e`. Dispatched requirements (persisted as `Dispatched` or legacy `New` with 0 pending balance) are returned on the active pipeline.<br>2. **Missing status filter:** `Pipeline Stage` dropdown omits `Dispatched`, preventing staff from filtering for dispatched records.<br>3. **Generic styling:** `getStatusBadge` maps `'Dispatched'` to generic `'badge badge-success'`, identical to `Won` and `Completed`. Rows have no distinct border, contrast, or badge styling.<br>4. **Hidden dispatch metadata:** Dispatched cards and table rows omit dispatch date, vehicle/truck number, driver, and transporter details.<br>5. **Status update mutation bug:** In `executeDispatch()`, marks requirements as `status: 'Closed'` instead of canonical `status: 'Dispatched'`.<br>6. **Counter distortion:** Counts dispatched items in "Active requirements" and group active quantity totals. |
| `app/src/pages/Requirements/CreateDispatchModal.jsx` | Modal dialog for creating dispatches from Requirement Detail view | When fully dispatched (`isFullyDispatched`), sets `status: 'Closed'` in `requirements` table instead of `status: 'Dispatched'`. |
| `app/src/pages/Requirements/View.jsx` | Detail screen for a requirement | Canonical progression defines `'Won': ['Dispatched']` and `STATUS_OPTIONS` includes `Dispatched`. Updating to `Dispatched` persists `Dispatched` to DB, exposing the mismatch with `List.jsx`'s `Closed` update. |
| `105_pending_requirements_view.sql` / `supabase/migrations/232_restore_customer_and_requirement_views.sql` | `public.v_board_requirements` view | The database view joins `requirements`, `crm_parties`, `app_users`, and `v_requirement_dispatch_summary`. Correctly computes `is_pending = false` when `COALESCE(s.pending_quantity, r.quantity) <= 0`. However, the frontend stopped relying on this column for filtering. |
| `102_dispatch_tracking_schema.sql` / `v_requirement_dispatch_summary` | Dispatch summary aggregation view | Computes `total_dispatched_quantity`, `pending_quantity`, `dispatch_progress` (`Not Dispatched`, `Partially Dispatched`, `Fully Dispatched`), `latest_dispatch_date`, `latest_truck_number`, `latest_driver_mobile`. |

---

## 3. Database Evidence & Schema Verification

A direct database inspection using the Supabase API against `public.requirements` and `public.v_board_requirements` reveals the following exact state:

```json
Requirement Status Counts: { "Closed": 58, "New": 40 }
```

When cross-referenced with `dispatch_progress` and `is_pending` from `v_board_requirements`:

| Persisted DB `status` | `dispatch_progress` | `is_pending` in View | Count | Actual State |
| :--- | :--- | :--- | :--- | :--- |
| `Closed` | `Fully Dispatched` | `false` | 57 | Fully fulfilled & archived |
| `New` | `Fully Dispatched` | `false` | 20 | **Fulfilled via Dispatch, but `status` remained `New`** |
| `New` | `Not Dispatched` | `true` | 20 | **True pending requirements** |
| `Closed` | `Not Dispatched` | `false` | 1 | Cancelled / manually closed |

### Proven Database Insights:
1. **20 legacy requirements** have `dispatch_progress: 'Fully Dispatched'`, `total_dispatched_quantity > 0`, `pending_quantity: 0`, and `is_pending: false`, but their `requirements.status` remains `'New'`.
2. When the board previously used `query.eq('is_pending', true)` (commit `f825059`), these 20 completed requirements were correctly filtered out of the default active view.
3. In commit `a90d51e`, the query was switched to `query.not('status', 'in', '("Closed","Fulfilled","Completed","Cancelled","Lost","Won")')`. Because `'New'` is not in the excluded list, all 20 fully dispatched requirements reappeared on the active Requirements Board under the "New" badge, with 0 visual clue that they had already been dispatched.
4. When new dispatches are marked from the Requirements Board (`List.jsx`), `executeDispatch` previously updated `requirements.status` to `'Closed'`, bypassing the canonical `'Dispatched'` pipeline status defined in `View.jsx`.

---

## 4. Root Causes Breakdown

### Root Cause 1: Premature Abandonment of `is_pending` Filter in Frontend Query
In commit `a90d51e`, `List.jsx` modified the Supabase fetch query:
```diff
- query = query.eq('is_pending', true);
+ query = query.not('status', 'in', '("Closed","Fulfilled","Completed","Cancelled","Lost","Won")');
```
*Impact:* This bypassed the database's enforcer logic (`is_pending = false` when `pending_quantity <= 0`). Requirements whose quantities were 100% dispatched but had a persisted status of `New` or `Dispatched` were pulled into the default "Active Pipeline" (`statusFilter === 'All Open'`).

### Root Cause 2: Inconsistent Status Lifecycle Between `List.jsx`, `CreateDispatchModal.jsx`, and `View.jsx`
- In `View.jsx`, the CRM requirement stage progression is:
  `Identified -> Engaged -> Qualified -> Commercial Intent -> Won -> Dispatched`.
  Selecting `Dispatched` in `View.jsx` persists `status: 'Dispatched'`.
- In `List.jsx` (`executeDispatch`) and `CreateDispatchModal.jsx` (`handleSubmit`), clicking "Mark as Dispatched" persisted `status: 'Closed'`.
- This created two parallel, conflicting notions of dispatched state: some rows became `Closed` (and disappeared or showed as Closed), while others were `Dispatched` or `New` with dispatch summary.

### Root Cause 3: Undifferentiated Status Styling & Missing Badge
- `getStatusBadge()` grouped `Dispatched` with `Won`, `Fulfilled`, `Completed`, `Confirmed`, and `Closed` into the generic `.badge-success` green class.
- The badge had no distinct background, no border, and no contrasting typography.
- In both Customer View (grouped table) and Flat List (cards), a dispatched requirement had identical styling to any generic completed/won item.

### Root Cause 4: Missing Dispatch Logistics Presentation
- The database view `v_board_requirements` already joins `v_requirement_dispatch_summary`, providing:
  - `total_dispatched_quantity`
  - `pending_quantity`
  - `dispatch_progress`
  - `latest_dispatch_date`
  - `latest_truck_number`
  - `latest_driver_mobile`
- Neither the table rows in Customer View nor the cards in Flat List displayed `latest_dispatch_date`, `latest_truck_number`, transporter, or dispatched quantity when an item was fully dispatched. The partial-dispatch banner only appeared when `actualPending > 0`.

### Root Cause 5: Missing `Dispatched` in Pipeline Filter Controls
- The `Pipeline Stage` dropdown in `List.jsx` contained:
  `Active Pipeline`, `Overdue`, `Identified`, `Engaged`, `Qualified`, `Commercial Intent`, `On Hold`, `All Statuses`.
- `Dispatched` was completely absent. Users who specifically needed to view, audit, or filter dispatched requirements had no way to do so via the UI controls.

---

## 5. Expected vs. Actual Behavior

| Area | Prior / Expected Working Behavior | Actual Behavior in Defect State |
| :--- | :--- | :--- |
| **Default Active View** | Shows only unfulfilled/in-progress requirements (`pending_quantity > 0`). Fully dispatched records do not clutter active pipeline. | Fully dispatched requirements with `status = 'New'` or `status = 'Dispatched'` appear on the active pipeline board with 0 pending quantity. |
| **Dispatched Badge** | Prominent, visually distinct `DISPATCHED` badge with unique background, border, and clear contrast. | Generic green `.badge-success` pill identical to "Won" or "Closed". |
| **Pipeline Stage Filter** | Explicit option to select and filter by `Dispatched` stage. | `Dispatched` is missing from the filter dropdown entirely. |
| **Logistics Information** | Dispatched rows display dispatch date, vehicle/truck number, and dispatched quantity. | No dispatch date or vehicle details rendered; partial box is absent for fully dispatched items. |
| **"Mark as Dispatched" Action** | Transitions the requirement to persisted `Dispatched` status with a linked dispatch record. | Updated status to `Closed`, erasing visibility of the `Dispatched` stage in the database. |
| **Active Counts** | "Active requirements" count only includes genuinely active requirements with pending work. | Inflated by fully dispatched requirements. |
| **Overdue Highlighting** | Overdue flags only apply to active pending requirements past their date. | Fully dispatched requirements past their expected date were flagged as `OVERDUE` in red. |

---

## 6. Targeted Resolution Plan (Phases 2 & 3)

1. **Phase 2 — Fix Status & Data-Fetching Queries:**
   - In `fetchRequirements()` in `List.jsx`:
     - When `statusFilter === 'All Open'` and `!includeCompleted`: Query for active requirements where `is_pending = true` OR status is actively open, ensuring fully dispatched requirements do not masquerade as active pipeline items.
     - When `statusFilter === 'Dispatched'`: Explicitly fetch requirements with `status = 'Dispatched'` or `dispatch_progress = 'Fully Dispatched'`.
     - When `includeCompleted` is enabled or `statusFilter === 'All'`: Display all records without excluding completed/dispatched records.
   - In `executeDispatch()` (`List.jsx`) and `CreateDispatchModal.jsx`:
     - Update requirement status to `'Dispatched'` (preserving canonical CRM status progression), NOT `'Closed'`.
     - Insert status history log with `new_status: 'Dispatched'`.

2. **Phase 3 — Prominent Visual Treatment & Dispatch Metadata:**
   - Introduce dedicated `DISPATCHED` badge with bold styling: distinct background (`#EFF6FF` / `#DBEAFE` or dark mode equivalent), sharp border (`#3B82F6` / `#2563EB`), vibrant text (`#1D4ED8`), and bold uppercase typography.
   - For all dispatched rows/cards, display:
     - Prominent `DISPATCHED` badge in the Status column / card header.
     - Dispatch summary chip showing: Dispatched quantity, dispatch date (`latest_dispatch_date`), vehicle/truck (`latest_truck_number`), and transporter if available.
   - Add `<option value="Dispatched">Dispatched</option>` to the `Pipeline Stage` dropdown filter.
   - Ensure counts and grouping reflect genuine pending vs dispatched records.
