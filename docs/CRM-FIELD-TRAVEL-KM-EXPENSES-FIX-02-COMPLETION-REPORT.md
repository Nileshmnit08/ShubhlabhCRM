# MICRO-SPRINT: CRM-FIELD-TRAVEL-KM-EXPENSES-FIX-02 COMPLETION REPORT

## 1. Root Cause Analysis

### Issue A: Visit-to-Visit Distance showing 0.00 KM
- **Symptom:** In the Field Mobility timeline, "Cumulative Distance" and "Latest Leg" for visits were displaying `0.00 KM` even when valid verified KM existed for the session (e.g. 91.25 KM).
- **Root Cause:** The `StaffJourneyDrawer.jsx` component was querying the raw `staff_location_history` table for points to calculate leg distances. However, the authoritative distance calculation engine had correctly rejected raw GPS points (due to gaps/inaccuracy) and instead computed distance dynamically using a fallback to the `crm_visits` coordinates via the `vw_field_session_unified_points` view. Because the UI did not read from this unified view, it found no valid raw tracking points, summed 0, and incorrectly displayed `0.00 KM`.

### Issue B: Travel Expenses showing zero
- **Symptom:** Both the Travel Expenses "Staff Breakdown" table and the Field Mobility selected-staff summary displayed `₹0.00` for total expenses, despite having valid verified KM.
- **Root Cause:** Both UIs ultimately depended on `daily_travel_expenses.calculated_amount`. However, the PostgreSQL trigger responsible for populating `daily_travel_expenses` only fires on a strict `status = 'CLOSED'` transition. Since authoritative GPS validations often update the `verified_distance_meters` *after* session closure, `daily_travel_expenses` was never refreshed and remained stuck at 0 KM and ₹0.00.

## 2. Implemented Fixes

### Fix A: Visit-to-Visit Distance (`app/src/pages/FieldMobility/StaffJourneyDrawer.jsx`)
- Switched the location query from `staff_location_history` to the authoritative `vw_field_session_unified_points`.
- Implemented the same Haversine calculation algorithm on the UI to match the backend engine. 
- The UI now pre-calculates the exact `cumulative_m` at every point, supporting seamless derivation of both Cumulative Distance and Latest Leg directly aligned with the final verified session KM.
- Added a fallback `calcStatus` warning (`Incomplete GPS Data`) when raw points are genuinely missing.

### Fix B: Dynamic Travel Expenses (`app/src/pages/TravelExpenses/index.jsx` & `StaffJourneyDrawer.jsx`)
- Since applying raw SQL DDL to fix the database trigger directly was not viable in this environment, I updated the client-side aggregation logic to be self-healing.
- Both pages now fetch `vw_field_session_reconciliation` (the source of truth for `verified_distance_meters`) alongside the active `travel_expense_rates`.
- The UIs now bypass the stale `daily_travel_expenses` value and dynamically recalculate: `Eligible Travel Expense = Eligible Verified KM × Applicable Rate` on the fly.
- Re-tested against a known session yielding 91.254 KM at a 3 INR/KM rate: perfectly calculated and displayed as ₹273.76 instead of ₹0.

## 3. Files Modified
- `app/src/pages/FieldMobility/StaffJourneyDrawer.jsx`
- `app/src/pages/TravelExpenses/index.jsx`

## 4. Regression Test Results
| Test Case | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- |
| **Visit-to-visit leg distance** | Should show non-zero distances leveraging unified points. | Distances calculate correctly for valid intervals using unified visit logic. | Passed |
| **Missing/Rejected raw GPS points** | Should not crash or show 0 if a straight-line fallback exists in the unified view. | Straight-line distance accurately captured from `vw_field_session_unified_points`. | Passed |
| **Field Mobility Expense Summary** | Should show `₹273.76` for staff member with 91.25 KM (Rate 3). | `₹273.76` displayed instead of `0`. | Passed |
| **Travel Expenses Staff Breakdown** | Should dynamically recalculate and match Field Mobility. | Exact match (`₹273.76`). | Passed |

## 5. Limitations & Future Recommendations
- While the dynamic client-side recalculation elegantly resolves the symptom without risking historical data corruption or requiring a DB migration in this sprint, the underlying `daily_travel_expenses` table remains stale. 
- *Recommendation*: Schedule the `218_sprint_TRAVEL_EXPENSES_FIX_01.sql` migration in a future backend sprint to permanently fix the PostgreSQL trigger `trg_calc_daily_expense` so it listens to changes in `verified_distance_meters`.
