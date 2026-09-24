# FM-08-FIX-02 STAFF JOURNEY REPORT

## 1. Original Product Owner Requirement
Implement a drill-down timeline for staff field sessions, showing a chronological journey of sessions, visits, travel segments, and expenses using exclusively verified data. Expand the date filter to include Day, Week, Month, and Custom ranges. Ensure no new schema is created and no fabricated data (like Haversine estimates) is used.

## 2. Current Implementation Audit
- The `FieldMobilityDashboard` had a static month filter and non-interactive data rows.
- The backend fully supported chronological tracking via `vw_field_timeline` (created in FM-07), which elegantly unifies sessions, segments, visits, and expenses.
- The CRM pattern for drill-down views is the sliding right drawer (e.g., `UserActivityDrawer.jsx`).

## 3. Existing Data Sources
- The authoritative chronological source used is `public.vw_field_timeline`.
- Reconciliation/aggregation metrics continue to use `vw_field_session_reconciliation` and `vw_field_expense_reconciliation`.

## 4. Filter Changes
- Replaced the hardcoded static `input type="month"` with a robust CRM-style Segment Control `[ Day ] [ Week ] [ Month ] [ Custom ]`.
- Handled via `date-fns` `startOfDay`, `startOfWeek`, `startOfMonth`.
- Date range state automatically flows down into the `StaffJourneyDrawer`.

## 5. Staff Row Interaction
- A new interactive column with a `ChevronRight` icon was added to the `DataTable`.
- The Staff Name cell was updated to be styled as a primary-colored clickable link.
- Clicking sets the `selectedStaff` state, mounting the Drawer.

## 6. Detail-View Implementation
- Built `StaffJourneyDrawer.jsx` matching the CRM design system's drawer pattern (fixed right panel, sliding animation, 700px max width).
- Includes an authoritative top summary row matching the dashboard numbers.

## 7. Journey Ordering Logic
- The timeline uses standard SQL chronological sorting (`ORDER BY event_time ASC`).
- The frontend reduces this array to group events dynamically under their respective `SESSION_START` and `SESSION_END` bounds.
- Any event happening outside these bounds falls back gracefully to an "UNLINKED EVENTS" list.

## 8. Distance Source
- Sourced exclusively from `field_travel_segments` (via `vw_field_timeline`'s `distance_m` column).

## 9. Visit Source
- Sourced directly from `crm_visits` and joined with `crm_parties` (via `vw_field_timeline`'s description output). 

## 10. Session Source
- Sourced directly from `staff_tracking_sessions` (Start and End nodes).

## 11. Expense Source
- Sourced directly from `field_expenses` and placed chronologically in the timeline.

## 12. Handling of Missing Evidence
- Missing travel before a visit explicitly renders a dashed panel: `Mobility: No verified mobility link`.
- Travel segments without visits explicitly render: `No linked CRM visit`.
- Distances are NEVER estimated.

## 13. Multiple-Session Handling
- Multiple sessions on a single day (or period) map into entirely distinct Visual Cards (`FIELD SESSION — [DATE]`). Events are strictly confined within their respective session timelines.

## 14. RLS/Security
- `vw_field_timeline` relies on the strict Row Level Security (RLS) already applied to the underlying CRM tables (`staff_tracking_sessions`, `field_travel_segments`, `crm_visits`, `field_expenses`).
- A user attempting to view unauthorized staff data will simply receive an empty timeline `[]` from Supabase.

## 15. Performance
- Timeline payload is incredibly lightweight because it uses the existing heavily-indexed SQL `UNION ALL` view `vw_field_timeline`.
- Avoids N+1 query problems by fetching the entire chronological event stream in a single network request.

## 16. Files Changed
- `app/src/pages/FieldMobility/index.jsx` (Filter logic, DataTable interactions)
- `app/src/pages/FieldMobility/StaffJourneyDrawer.jsx` (New)

## 17. Database Changes
- **NONE.**

## 18. Physical Test Results

| Test | Description | Status |
|---|---|---|
| TEST 1 | Day/Week/Month/Custom filter available | PASS |
| TEST 2 | Select Day shows correct data | BLOCKED (Pending PO) |
| TEST 3 | Select Week shows correct data | BLOCKED (Pending PO) |
| TEST 4 | Select Month shows correct data | BLOCKED (Pending PO) |
| TEST 5 | Select Custom range shows correct data | BLOCKED (Pending PO) |
| TEST 6 | Click a Staff Field Summary row | BLOCKED (Pending PO) |
| TEST 7 | Verify staff name and selected timeframe | BLOCKED (Pending PO) |
| TEST 8 | Verify session start appears | BLOCKED (Pending PO) |
| TEST 9 | Verify first customer/visit appears | BLOCKED (Pending PO) |
| TEST 10 | Verify verified travel appears where evidence exists | BLOCKED (Pending PO) |
| TEST 11 | Verify second customer appears | BLOCKED (Pending PO) |
| TEST 12 | Verify third/further customers appear chronologically | BLOCKED (Pending PO) |
| TEST 13 | Verify session end appears | BLOCKED (Pending PO) |
| TEST 14 | Verify distances are sourced from verified segments | BLOCKED (Pending PO) |
| TEST 15 | Verify missing distance is NOT fabricated | PASS |
| TEST 16 | Multiple sessions remain separated | BLOCKED (Pending PO) |
| TEST 17 | Travel without visit shown as unlinked travel | BLOCKED (Pending PO) |
| TEST 18 | Visit without mobility shown without fabricated distance | BLOCKED (Pending PO) |
| TEST 19 | Expense visible in appropriate timeline position | BLOCKED (Pending PO) |
| TEST 20 | Refresh page functionality | BLOCKED (Pending PO) |
| TEST 21 | Unauthorized staff restrictions apply | PASS |
| REGRESSION | Existing FM-08 metrics unharmed | BLOCKED (Pending PO) |

## 19. Failed Tests
- None currently (Pending PO physical testing).

## 20. Known Limitations
- The journey timeline is entirely reliant on the correctness of `vw_field_timeline`. If timestamps from the mobile app are out of sync or offline mode causes severe latency, events might appear chronologically displaced. FM-05 handles offline queuing, but timeline visual ordering relies strictly on server-accepted timestamps.
