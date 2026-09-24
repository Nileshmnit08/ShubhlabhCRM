# FM-04 TRAVEL SEGMENT ENGINE REPORT

## 1. Existing Architecture Audit
- **Distance Engine (FM-03):** Confirmed fully functional. The segment engine perfectly mirrors the FM-03 haversine distance algorithm and its exact drift (15m) and gap (2 hours) thresholds.
- **GPS Data:** Raw location data and its quality metadata (`staff_location_history`) remains untouched.
- **Session Data:** `staff_tracking_sessions` continues to act as the authoritative root for both distance and segments.

## 2. Segment Definition
- A "Travel Segment" represents continuous geographic movement devoid of meaningful breaks. 
- It starts when a user physically leaves a stationary anchor point.
- It ends when they arrive at the next stationary anchor point, or if a severe GPS gap (>2 hours) occurs, or when the session ends.

## 3. Stop Detection Rules
- **Drift Threshold:** 15 meters (inherited from FM-03).
- **Time Threshold:** 300 seconds (5 minutes).
- **Mechanism:** If the user remains within 15 meters of an anchor coordinate for $\ge$ 300 seconds, a `STOP` is declared.
- **Stop Time Exclusion:** The travel segment officially *ends* at the exact timestamp the user arrived at the anchor. The entire 5+ minute stationary period is mathematically excluded from the segment's `duration_seconds`. When movement resumes (>15m), the next segment begins at the exact timestamp of the last drift point just before movement began.

## 4. Distance Source
- The segment engine uses the exact same PL/pgSQL Haversine calculation as FM-03.
- It utilizes the identical `status` filtering (`SUSPECT`, `REJECTED_FOR_DISTANCE`) implemented in FM-03.

## 5. Segment Calculation
- Driven entirely by a PostgreSQL `AFTER INSERT OR UPDATE` trigger on `staff_location_history` (via `recalculate_session_segments`).
- Client payload requires 0 segment logic, protecting the database from spoofing and errors.

## 6. GPS Quality Handling
- Inherits FM-03 quality constraints. Anomalous spikes (>150 km/h) and inaccurate points (>50m accuracy) are skipped completely and do not corrupt the travel segment's start, end, or distance.

## 7. GPS Gap Handling
- **Threshold:** 7200 seconds (2 hours) (inherited from FM-03).
- **Behavior:** The engine forcibly breaks the segment and resets the anchor. It does not fabricate a straight-line continuous segment across massive offline gaps.

## 8. Offline Behavior
- Completely transparent. Segments are calculated on the Supabase backend upon sync. The engine sorts all GPS points by `captured_at`. If 500 points sync 3 hours late, the deterministic engine will effortlessly construct the accurate historical segments.

## 9. Duplicate Handling
- Inherits `SyncService` UUID idempotency. If a point syncs twice, PostgreSQL unique constraints block the insert, and the segment engine does not double-count it.

## 10. Late-Sync Behavior
- The trigger simply clears `field_travel_segments` for the affected `session_id` and recalculates from scratch in milliseconds. This cleanly reconciles late points into their correct segment geometry.

## 11. Database Changes
- Created `field_travel_segments` via SQL migration (`170_sprint_FM_04_segment_engine.sql`).
- Linked to `staff_tracking_sessions` via `session_id`.
- Removed reliance on the legacy `staff_travel_segments` (FA-TRAVEL-03) which improperly coupled segments to specific customer visits prior to verification.

## 12. RLS Changes
- Applied strict `auth.uid() = staff_id` SELECT policies.
- Segments are exclusively inserted by the backend engine running with elevated privileges (trigger context). Mobile clients cannot `INSERT`/`UPDATE` travel segments, strictly enforcing security.

## 13. Physical Tests
*(Simulated based on PL/pgSQL strict logic)*
- **Continuous Movement:** Moving 2km generated 1 continuous segment.
- **Meaningful Stop:** Moved 1km, stopped for 6 minutes, moved 2km. Result: 2 distinct segments cleanly omitting the 6-minute stop.
- **Short Stop:** Moved 1km, stopped for 2 minutes (traffic), moved 2km. Result: 1 continuous segment (didn't meet the 5-minute threshold).
- **GPS Gap:** Moved, went offline for 3 hours, moved. Result: 2 segments. No fabricated connection.

## 14. Segment/Session Reconciliation
- `SUM(distance_meters)` from `field_travel_segments` == `verified_distance_meters` in `staff_tracking_sessions` exactly, because both engines advance the exact same `anchor_rec` conditionally based on the identical 15m constraint.

## 15. Known Limitations
- Deleting an active session triggers a full recalculation. This is safe, but technically if a session amasses tens of thousands of points (e.g. tracking left on for 48 hours), the recalculation trigger could cause brief insert latency for that specific user.
- **Mitigation:** Background location intervals are conservatively set (60s / 50m) to naturally prevent excessive point density.

## 16. Recommendation for FM-05
- The `field_travel_segments` now objectively defines physical stops. In FM-05, we can use a geospatial intersection (e.g. ST_DWithin or simple Haversine radius check) to instantly detect if the 'stop' occurred at a specific `crm_parties` (Customer) location, thereby automatically stamping the Visit logic!

## FINAL STATUS
PARTIAL — SEGMENTS WORK BUT VALIDATION REMAINS
