## Root cause / findings
1. **Scrolling & Layout (Req A)**: The `StaffJourneyDrawer` is currently implemented as an absolute overlay (`position: 'fixed'`), which covers the Staff List and prevents side-by-side interaction. The page does not use a split-pane layout with independent scrolling.
2. **Visit & Session Distances (Req B & C)**: The timeline view (`vw_field_timeline`) returns `TRAVEL_SEGMENT` records representing large continuous travel blocks, but it does not cleanly break down travel by exact Visit boundaries.
3. **Refresh Flow (Req E)**: The dashboard only fetches data on mount or date change. It does not subscribe to Supabase Realtime for automatic updates when a visit or session is completed on the mobile app.

## Existing data flow and distance calculation
- Distance is mathematically calculated on the backend via `recalculate_session_distance` (fixed in TRAVEL-01) which populates `segment_distance_m` for each point in `staff_location_history`.
- `StaffJourneyDrawer` pulls timeline events (`vw_field_timeline`), aggregates total session distances from `vw_field_session_reconciliation`, but currently does not calculate or display "Cumulative Distance" or "Latest Leg" per visit.
- Final session distance is retrieved from `verified_distance_meters` in `staff_tracking_sessions`.

## Exact files and database objects requiring changes
1. **`app/src/pages/FieldMobility/index.jsx`**:
   - Modify layout to display the selected staff summary side-by-side with the staff list (e.g., using `display: grid` with independently scrollable panes).
   - Add Supabase Realtime subscription on `crm_visits` and `staff_tracking_sessions` to trigger data refresh.
2. **`app/src/pages/FieldMobility/StaffJourneyDrawer.jsx`**:
   - Remove `position: fixed` to act as a normal panel.
   - Fetch the raw `segment_distance_m` points for the selected session to precisely calculate Cumulative and Latest Leg distances based on visit timestamps.
   - Add the new "Completed Session Summary" block for ended sessions.
3. **Database Changes**:
   - A minor SQL RPC function `get_session_timeline_metrics(session_id)` or a modified view may be proposed to cleanly return cumulative and leg distances per visit directly from the backend, avoiding heavy JS-side processing.

## Proposed minimal implementation
1. **UI Layout**: Wrap the staff list and staff summary in a flex/grid container where both have `overflow-y: auto`, ensuring full-screen scrolling and independent scrolling.
2. **Realtime**: Implement `supabase.channel('public:crm_visits').on(...)` to re-fetch timeline data instantly.
3. **Distance Calculation**: 
   - Instead of modifying massive DB logic, use a simple query fetching `captured_at` and `segment_distance_m` from `staff_location_history` alongside the timeline events.
   - **Cumulative KM** = Sum of `segment_distance_m` where `captured_at <= visit.ended_at`.
   - **Leg KM** = Sum of `segment_distance_m` where `captured_at > prev_visit.ended_at AND captured_at <= current_visit.ended_at`.
   - **Session End KM** = Final `total_distance_km`.

## Data-quality limitations and risks
- GPS gaps or disabled tracking will correctly result in 0 Leg KM. The UI must tag this as "GPS data incomplete" if the time gap exceeds bounds, as per the existing distance engine rules.
- Offline mode uploads: If a mobile device uploads a visit late, the realtime refresh might fire before the locations arrive. The system relies on the trigger (fixed in TRAVEL-01) to recalculate when locations finally arrive, but the UI may temporarily show provisional distances until refreshed again.

## Test plan
1. Load dashboard on desktop/mobile and verify independent scrolling of list and summary.
2. Select Staff A. In another window (or DB), simulate `VISIT_END`. Verify the UI updates without reload and shows accurate Leg and Cumulative KM.
3. Simulate `SESSION_END`. Verify the final summary block appears with total KM (including post-visit travel).
4. Verify GPS incomplete warnings when data points are missing or rejected.
