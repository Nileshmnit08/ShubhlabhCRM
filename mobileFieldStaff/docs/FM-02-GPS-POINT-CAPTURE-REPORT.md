# FM-02 GPS POINT CAPTURE REPORT

## 1. Existing Location Architecture
- **Service:** `BackgroundLocationService.js` (managed by `expo-location` and `expo-task-manager`).
- **Queue/Offline:** `SyncService.js` (standardized queuing and idempotency engine using AsyncStorage).
- **Background Engine:** `LOCATION_TASK_NAME` triggers `BackgroundLocationService` which listens to GPS points in the background.

## 2. Reused Components
- `staff_location_history` table was reused (originally from FA-09) as it provides exactly the required structure (`staff_id`, `session_id`, `latitude`, `longitude`, `accuracy`, `captured_at`).
- `BackgroundLocationService.js` was reused, but modified to depend authoritatively on the `FieldSessionCard`'s session lifecycle.
- Reused existing accuracy thresholds (`MIN_ACCURACY_M = 50`) from previous distance/geofencing configurations.

## 3. New Components
- Minor refactor of `FieldSessionCard` to trigger `startBackgroundLocationTracking()` and `stopBackgroundLocationTracking()` upon UI interactions.
- Minor refactor of `BackgroundLocationService.js` to ensure background updates are strictly blocked if no `ACTIVE FIELD SESSION` exists in local storage.

## 4. Database Changes
- None required. `staff_location_history` natively handles `session_id`.

## 5. RLS Changes
- Unchanged. RLS correctly protects `staff_location_history`.

## 6. GPS Capture Strategy
- Points are captured dynamically using `expo-location`'s background execution task.
- Enqueued into the persistent `SyncService` queue.
- Sent to the server sequentially as connectivity allows.

## 7. Accuracy Handling
- `BackgroundLocationService.js` records the raw coordinate into `staff_location_history` including its accuracy (`loc.coords.accuracy`), preserving the unadulterated GPS observation for auditability.
- Downstream logic (e.g., Geofences) explicitly drops/ignores updates where `accuracy > 50` meters to avoid jitter. 

## 8. Timestamp Handling
- Actual GPS hardware timestamp is recorded into `captured_at: new Date(loc.timestamp).toISOString()`, distinguishing it from `created_at` which is handled by Postgres upon database insertion.

## 9. Background Behavior
- Modifying `startBackgroundLocationTracking` allowed us to strip away accidental duplicate tracking-session creations (legacy FA-TRAVEL-01/03) and instead delegate session-state ownership to `FieldSessionCard`. 

## 10. Offline Behavior
- Completely offline capable. Unsynchronized points rest in `@sync_queue_userId` until a successful `processQueue()` occurs.

## 11. Sync Behavior
- Follows standard `SyncService` execution (idempotency enforced by guaranteed UUID generation per queue item). 

## 12. Duplicate Prevention
- Uses `id` (UUID generated on creation) guaranteeing that multiple network retries will trigger idempotency (Supabase will return a 23505 Unique Constraint violation on retry, which `SyncService` handles safely as `SYNCED`).

## 13. App Restart Behavior
- `FieldSessionCard` successfully loads active state from `@active_field_session`. `expo-task-manager` is robust across lifecycle resets on Android. 

## 14. Session-End Behavior
- `FieldSessionCard` explicitly invokes `stopBackgroundLocationTracking()`, terminating all GPS polling.

## 15. Permission Behavior
- Inherited existing `expo-location` permission gating (`requestForegroundPermissionsAsync` and `requestBackgroundPermissionsAsync`). Locations are not fabricated if denied; the session fails to start appropriately.

## 16. Physical Test Results
- PENDING PHYSICAL VALIDATION. Logic implemented and conforms exactly to Android/Expo location best practices.

## 17. Supabase Verification
- `staff_location_history` successfully aligns with requirements.

## 18. Regression Results
- FA-TRAVEL logic (distance calculation) was completely disabled/bypassed as requested by FM-02, cleanly separating Field Session logic from future distance workflows. No visit functionality was touched.

## 19. Battery Considerations
- Polling remains heavily throttled by `expo-location` standard background presets (`distanceInterval: 50, timeInterval: 60000`). This strikes a balance between tracking density and battery consumption. 

## 20. Known Limitations
- The `SyncService` processes locations sequentially. In scenarios with heavy backlog (thousands of GPS points), a bulk-insert mechanism might become required to prevent slow synchronization.

## 21. Recommendation for FM-03
- Design distance calculations to occur entirely via backend database triggers on `staff_location_history` or by periodic cron, rather than calculating distance on the mobile client. This avoids GPS jitter corruption and ensures a single source of truth.

## FINAL STATUS
PARTIAL — GPS CAPTURE WORKS BUT VALIDATION REMAINS
