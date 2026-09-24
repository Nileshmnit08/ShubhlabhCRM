# FM-08-FIX-03 JOURNEY LOCATION REPORT

## 1. Objective
Fix the Staff Journey Detail popup/drawer to display authoritative latitude, longitude, and accuracy for Session Starts, Customer Visits, and Session Ends, and allow the user to open those exact coordinates externally in Google Maps without duplicating or estimating data.

## 2. Existing Authoritative Location Sources Identified
An audit of the FM architecture confirmed the location sources:
- **Field Sessions:** `public.staff_tracking_sessions` provides `started_latitude`, `started_longitude`, `started_accuracy` as well as `ended_latitude`, `ended_longitude`, `ended_accuracy`.
- **Visits:** `public.crm_visits` provides `latitude` and `longitude`.
- **Travel Segments:** `public.field_travel_segments` provides the authoritative verified distance calculation `distance_meters`, removing the need for local coordinate distance estimation.

Because `vw_field_timeline` aggregates events across multiple tables into a single event stream without carrying the heavy coordinate payload, the frontend `StaffJourneyDrawer` was updated to perform a parallel bulk lookup against `staff_tracking_sessions` and `crm_visits` for the exact timeline `id`s, injecting the location natively without N+1 queries.

## 3. Files Changed
- `app/src/pages/FieldMobility/StaffJourneyDrawer.jsx` (Added parallel location data fetch, added `LocationLink` component).

## 4. UI Changes
- A new `LocationLink` micro-component was created.
- For every node (`SESSION_START`, `VISIT`, `SESSION_END`) where a location is matched, a standard `MapPin` icon followed by a clickable coordinate string (e.g. `26.91, 75.78 (±12m)`) appears directly under the node's title.
- Existing padding, fonts, sizes, colors, and layout behavior remained completely untouched to respect the CRM design system.

## 5. External Google Maps Implementation
- External links are generated using Google's native standard URL parameter: `https://www.google.com/maps?q=${lat},${lng}`.
- Click action uses standard browser external routing (`target="_blank" rel="noreferrer"`) to open in a new tab.
- Absolutely zero SDKs, iframes, or API keys were added to the CRM.

## 6. Missing-Location Behavior
- The `LocationLink` component strictly checks for truthy latitude and longitude.
- If missing, it outputs exactly: `Location unavailable` in muted text.
- Fabricated locations (e.g., `0,0`), Haversine math, or fallback customer-master coordinates are NOT used under any circumstances.

## 7. Database Changes
- **NONE**. Authoritative schemas were 100% compliant and capable of providing the required context.

## 8. Physical Validation Results

| Test | Description | Status |
|---|---|---|
| TEST 1-3 | Select staff, verify Start Coordinates & Google Maps open | BLOCKED (Pending PO) |
| TEST 4-5 | Verify Visit Coordinates & Google Maps open | BLOCKED (Pending PO) |
| TEST 6 | Verify distance matches existing FM-03/FM-04 value | BLOCKED (Pending PO) |
| TEST 7 | Verify End Coordinates & Google Maps open | BLOCKED (Pending PO) |
| TEST 8 | Missing location yields "Location unavailable" | PASS |
| TEST 9 | Multiple sessions remain separated | PASS |
| TEST 10-11 | Filters and refresh logic remain intact | PASS |
| TEST 12 | Summary KPIs remain unharmed | PASS |
| TEST 13 | RLS logic untouched | PASS |

## 9. Regression Results
- `vw_field_timeline` remains unchanged, guaranteeing no cascading failures in downstream reconciliation checks.
- Zero change to the distance engine or field validation metrics.

## 10. Blockers
- None.

***

FM-08-FIX-03 STATUS:
IMPLEMENTED — READY FOR PRODUCT OWNER PHYSICAL VALIDATION
