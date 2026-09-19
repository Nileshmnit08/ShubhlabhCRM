# MICRO-SPRINT FA-TRAVEL-08 REPORT: STAFF-WISE EXPENSE DETAIL & MANAGEMENT VIEW

## 1. Objective
To extend the Travel Expenses UI with a comprehensive staff-wise expense management view, allowing Administrators to drill down from high-level periods into specific days, tracking sessions, travel segments, and CRM visits, strictly using the existing authoritative data sources without recalculating financial values.

## 2. Existing Architecture Reused
- `app_users` (for Staff List and Display Names)
- `staff_tracking_sessions` (for the Daily Session Summary drill-down)
- `staff_travel_segments` (for the granular segment-by-segment GPS path)
- `daily_travel_expenses` (for the authoritative Daily Expenses summary table)
- `travel_expense_rates` (for the historic Rate settings)
- `crm_visits` and `crm_parties` (for linking travel segments with the visited customer destinations)
- Built on top of the FA-TRAVEL-07 `TravelExpenses/index.jsx` page structure.

## 3. Staff Filtering
Implemented a `Staff` dropdown for Admins. 
- When "All Staff" is selected, the UI aggregates daily expenses to show staff-level totals (matching FA-TRAVEL-07 logic).
- When a specific "Employee" is selected, the UI morphs to display an Employee Summary at the top, followed by a chronological list of their daily expenses for the period.

## 4. Date Filtering
Restructured the period filters to cleanly accommodate:
- Today
- This Week
- This Month
- **Custom Range**: Added a new mode exposing native `Start Date` and `End Date` inputs, allowing arbitrary historical lookups. All totals and fetch operations respect the selected boundaries.

## 5. Summary Logic
When a single staff member is selected, four cards are rendered at the top of the UI displaying the aggregated `Total GPS KM`, `Total Expense`, `Expense Days`, and the overall `Calculation Status`. The values are 100% derived by dynamically summing the underlying authoritative `daily_travel_expenses` records on the client side.

## 6. Daily Detail
When viewing a specific employee, the Daily Expenses table displays individual rows per business date. Clicking a row dynamically retrieves and expands the Tracking Session summary for that day, including the start time, end time, validated GPS distance, and the number of segments. 

## 7. Travel Segment Detail
Inside the expanded Daily Detail panel, a localized chronologically sorted table renders every `staff_travel_segment` associated with the fetched tracking session, exposing the `From`, `To`, `Start Time`, `End Time`, and `Distance`. 

## 8. Visit Linkage
If a segment's `from_type` or `to_type` equals `VISIT`, the UI crosses-references the `reference_id` against the `crm_visits` and `crm_parties` tables. The resulting customer `company_name` is seamlessly injected into the segment row (e.g., `Visit: Acme Corp`).

## 9. Status Handling
Retained and expanded the visual status color-coding. Uncalculated or problematic states like `REVIEW_REQUIRED`, `DISTANCE_UNAVAILABLE`, and `RATE_ALLOCATION_REQUIRES_REVIEW` are explicitly colored red (`#d32f2f`) to clearly flag discrepancies to the Admin.

## 10. Security/RLS
The solution relies purely on the existing database RLS policies. Additionally, if the logged-in user is a `Field Assistant` (non-Admin), the `selectedStaff` state is permanently locked to their own User ID, preventing them from accessing or querying other employees' expenses.

## 11. Performance Approach
Implemented aggressive lazy-loading for the Drill-Down panel.
The UI only retrieves the base `daily_travel_expenses` during navigation. The granular session, segments, and linked visits are exclusively fetched when the Admin explicitly clicks on a day to expand it, preventing massive payloads.

## 12. CRM UI Changes
Combined the previously disparate "Daily", "Weekly", and "Monthly" tabs into a unified **"Expenses"** tab with robust Dropdown filters for Period and Staff, significantly streamlining the UX. Added a `Custom` period selector.

## 13. Tests
- **TEST 1-3 (Staff Filtering)**: Selecting "All Staff" shows aggregates; selecting a specific staff shows only their daily rows. Switching staff updates immediately.
- **TEST 4-6 (Date Filtering)**: Today, This Week, and This Month flawlessly pull authoritative records via `business_date`.
- **TEST 7 (Daily Detail)**: Clicking a day row successfully expands the session data.
- **TEST 8-9 (Segments & Visits)**: Segments correctly populate inside the drill-down panel and automatically resolve Visit IDs to Customer Names via `crm_parties`.
- **TEST 10-11 (Status & Rates)**: Anomalies appear in bold red; rates correctly display the historically stored values.
- **TEST 12 (Security)**: `Field Assistant` role restricts the Staff dropdown entirely.
- **TEST 13-14 (Performance & Duplication)**: Client-side aggregation prevents double-counting; caching prevents repeated fetches for the same expanded day.

## 14. Database Objects Changed
None. Fully utilized the existing FA-TRAVEL structures.

## 15. Files Changed
- `app/src/pages/TravelExpenses/index.jsx`

## 16. Known Limitations
- The "Expanded Day" logic currently only supports viewing one day's details at a time to preserve UI real estate and prevent performance bloat. Opening a new day automatically collapses the previously opened day.

## 17. Final Status
IMPLEMENTED — READY FOR PHYSICAL VALIDATION
