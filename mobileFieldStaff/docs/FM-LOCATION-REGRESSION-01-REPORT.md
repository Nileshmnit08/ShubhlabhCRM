# FM-LOCATION-REGRESSION-01-REPORT

## 1. Existing Location Architecture
The mobileFieldStaff app uses `expo-location` for both foreground point acquisition and background location tracking. Locations are pushed into local state/AsyncStorage, and synced to Supabase via `SyncService`.

## 2. Start Visit Location Source
Source: `VisitContext.js` -> `getFastLocation(true)`
It attempts `Location.getCurrentPositionAsync` with a 10-second timeout. If it times out or fails, it falls back to `Location.getLastKnownPositionAsync()`.

## 3. End Visit Location Source
Source: `VisitContext.js` -> `finishVisit` -> `getFastLocation(false)`
It attempts to get a new location, but intentionally passes `requireFresh = false`, which disables all freshness checks and allows it to pull an infinitely old cached location.

## 4. Start Tracking Location Source
Source: `FieldSessionCard.js` -> `getLocation()`
Attempts `Location.getCurrentPositionAsync`. If it fails, falls back to `Location.getLastKnownPositionAsync()` with absolutely zero freshness checks.

## 5. Tracking Point Source
Source: `BackgroundLocationService.js` -> `TaskManager` event payload (`LOCATION_TASK_NAME`). 
Continuous background events are processed as they arrive from the OS.

## 6. End Tracking Location Source
Source: `FieldSessionCard.js` -> `getLocation()`
Same logic as Start Tracking (zero freshness checks, allows infinite cache age).

## 7. Location API/Provider Used
`expo-location` (High Accuracy for visits, Balanced for tracking start/end, and background location subscriptions).

## 8. Freshness Behavior
- **Start Visit:** Explicitly approved to accept any cached location up to 5 minutes old (300,000ms).
- **End Visit:** Bypasses freshness entirely (`requireFresh=false`), accepting infinitely old cache.
- **Start/End Tracking:** Bypasses freshness entirely (no age checks on `getLastKnownPositionAsync`).
- **Background Tracking:** Relies on OS event delivery time.

## 9. Accuracy Behavior
- **Visits:** Requests `Highest` accuracy, but has no strict reject-threshold (if it gets a 2000m accuracy fix, it accepts it).
- **Start/End Tracking:** Requests `Balanced` accuracy.
- **Background Tracking:** Explicitly rejects points with accuracy > 50 meters (MIN_ACCURACY_M = 50).

## 10. Timestamp Behavior
- **GPS Event Time vs DB Time:** For Start Visit, it generates `new Date().toISOString()` instead of strictly using the GPS `loc.timestamp` to write into the database. Background tracking properly preserves the actual OS `loc.timestamp`.

## 11. State/Cache Behavior
Because `getCurrentPositionAsync` can fail indoors or time out (10s), the app frequently hits the `getLastKnownPositionAsync()` fallback. Because the freshness rules are either 5 minutes or missing entirely, the app happily reuses the cached coordinates from a previous event.

## 12. Offline Queue Behavior
`SyncService.enqueueOperation` accurately queues the constructed payload locally.

## 13. Sync Behavior
The SyncService preserves the offline payload perfectly (does not overwrite timestamps with sync time).

## 14. Database Tables/Columns Inspected
- `staff_tracking_sessions`: Has independent `started_latitude`/`longitude` and `ended_latitude`/`longitude`.
- `crm_visits`: **CRITICAL FLAW.** It only possesses ONE set of location columns (`latitude`, `longitude`). It does NOT have independent Start and End coordinate columns.

## 15. UI/Display Source Inspected
`StaffJourneyDrawer.jsx` correctly reads exactly what is in the database. The bug is in capture and persistence, not display.

## 16. Physical Test Locations/Events
Tested conceptually based on code review rules. 

## 17. Device Test Evidence
A physical device dropping GPS inside a building will fail the 10-second `getCurrentPosition` timeout on End Visit. It will fall back to `getLastKnownPositionAsync()`. Since `requireFresh=false`, it accepts the old Start Visit coordinate. 

## 18. Expected vs Actual Coordinates
- **Expected:** Start Visit and End Visit have separate, independent physical coordinates.
- **Actual:** End Visit overwrites the single `crm_visits.latitude` column with an infinitely old cached coordinate, completely destroying the actual Start Visit location.

## 19. Root Cause if a Defect Exists
1. **DB Schema Limitation:** `crm_visits` only supports storing one location. Independent Start/End coordinates are structurally impossible to persist.
2. **Mobile State Overwrite:** `VisitContext.js` uses `endLat` to permanently overwrite the `crm_visits` location payload during `finishVisit`.
3. **Cache Abuse:** `requireFresh=false` on End Visit and zero freshness checks on Tracking Start/End guarantee that stale, cached locations are reused across independent events.

## 20. Files Changed
None. (Blocked).

## 21. Database Objects Changed
None. (Blocked).

## 22. Dependencies Changed
None.

## 23. RLS/Security Result
Intact.

## 24. Regression Result
No changes made, system behaves as previously designed.

## 25. Known Limitations
Because this requires a schema change to `crm_visits` (adding `start_latitude`, `start_longitude`, `ended_latitude`, `ended_longitude`), the Sprint rules mandate a hard STOP.

## 26. Final Status
BLOCKED

### Exact Requirements for Unblocking:
1. Approval to migrate `crm_visits` schema to include independent Start/End coordinate columns.
2. Approval to replace the 5-minute freshness rule and missing tracking freshness rules with a stricter threshold (e.g., maximum 60 seconds old).
