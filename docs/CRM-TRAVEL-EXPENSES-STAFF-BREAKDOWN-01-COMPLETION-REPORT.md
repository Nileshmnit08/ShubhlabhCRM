# PHASE 1 AUDIT REPORT: Travel Expenses — Staff Breakdown

## 1. Inventory & Data Flow Analysis
The Travel Expenses Staff Breakdown (`/travel-expenses`) relies on the following data flow:
- **UI Component**: `TravelExpenses` in `app/src/pages/TravelExpenses/index.jsx`.
- **Primary Source**: The `daily_travel_expenses` table, queried via `fetchAggregatedExpenses()`.
- **Aggregation Strategy**: The UI fetches all records for the selected date range and performs a client-side aggregation (`reduce/forEach`) to compute `total_km`, `total_amount`, and `expense_days` per staff member.
- **Backend Calculation**: `daily_travel_expenses` records are automatically generated/updated by the PostgreSQL trigger `trg_calc_daily_expense` and the RPC function `calculate_daily_travel_expense` when a `staff_tracking_sessions` row transitions to `status = 'CLOSED'`.

## 2. Field-by-Field Validation Findings

### A. Staff Identity
- **Status**: Passes validation. 
- **Reason**: Properly uses foreign key join `app_users:staff_id (display_name)` which prevents mismatches. The client-side aggregation groups by `staff_id` uniquely.

### B. Session and Attendance Information
- **Status**: Passes validation.
- **Reason**: The breakdown accurately displays "Working Days" based on the number of `daily_travel_expenses` records (1 per day per staff enforced by `UNIQUE(staff_id, business_date)`). Drill-down views correctly fetch array lists of underlying `staff_tracking_sessions`.

### C. Travel Distance (MAJOR DEFECT)
- **Status**: **FAILS validation**.
- **Defect 1 (Stale Data)**: The trigger `trg_calc_daily_expense` only fires when `NEW.status = 'CLOSED' AND OLD.status <> 'CLOSED'`. Since the authoritative `verified_distance_meters` is calculated *after* session closure (or recalculated via background jobs/cron), the `daily_travel_expenses` table misses these updates and remains stuck at `0 KM`.
- **Defect 2 (Wrong Source Column)**: The function `calculate_daily_travel_expense` aggregates `total_distance_km` instead of the new authoritative `verified_distance_meters` source established for the Field Mobility page.

### D. Expense Rate and Calculation (DEFECT)
- **Status**: **FAILS validation**.
- **Defect 3 (Incorrect Base Metric)**: The expense calculation `v_amount := ROUND((v_sum_session_dist * v_rate_per_km)::numeric, 2)` inherits the flawed, stale distance metric from Defect 1 & 2. 

### E. Totals and Summary Cards (DEFECT)
- **Status**: **FAILS validation**.
- **Defect 4 (Blind Aggregation)**: The frontend blindly sums `exp.calculated_amount` and `exp.total_distance_km` for *all* workflow statuses. This means `REJECTED` expenses are actively inflating the "Total Expense" and "Total Verified KM" summary cards, presenting a falsely high liability.

### F. Dates, Filters, and Sorting
- **Status**: Passes validation.
- **Reason**: Date ranges (`gte`, `lte`) correctly use formatted `yyyy-MM-dd` bounds matching the `business_date` (which is a `DATE` column, immune to timezone shift bugs during exact matches).

### G. Status and Approval
- **Status**: Passes validation for mapping, but fails integration (see Defect 4).
- **Reason**: The `workflow_status` (DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID) correctly limits actions based on RBAC (Admins vs Staff).

## 3. Proposed Correction Plan (Pending Approval)

Before coding, I propose the following strict fixes:

**1. Database Update (`218_sprint_TRAVEL_EXPENSES_FIX_01.sql`)**:
- Update `calculate_daily_travel_expense` to use `SUM(COALESCE(verified_distance_meters, 0)) / 1000.0` as the authoritative distance.
- Update the trigger `trigger_calculate_expense_on_session_close()` to also fire when `NEW.verified_distance_meters IS DISTINCT FROM OLD.verified_distance_meters`.
- Relax the mismatch warning threshold from `0.05 KM` to `5.0 KM` to account for valid straight-line fallback distances vs rigid GPS traces.

**2. Frontend Update (`index.jsx`)**:
- Update the client-side `reduce` logic to filter out records where `workflow_status === 'REJECTED'` from the `summaryTotalAmount` and `summaryTotalKm` sums to prevent inflated financials.

Please review and approve this audit report so I can proceed with implementing the SQL migration and frontend fixes.
