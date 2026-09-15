# FA-01-FA-13-COMPLETE-FORENSIC-AUDIT

# EXECUTIVE SUMMARY
## Read-Only Guarantee
This audit was performed in STRICT READ-ONLY mode. No code, dependencies, UI files, or DB migrations were added, modified, or deleted.

# CORE ARCHITECTURE
## 1. Expo Configuration
- **Version**: SDK 57.0.22
- **Prebuild Status**: `app.json` lacks explicit Android location permission arrays, but the permissions `FOREGROUND_SERVICE` and `FOREGROUND_SERVICE_LOCATION` were injected into the Android manifest during the previous prebuild attempt to resolve tracking exceptions.
- **Background Location Setup**: Uses `expo-location` and `expo-task-manager`.

## 2. Dependencies
- React Native v0.86.3
- Supabase-js v2.116.0
- React Navigation v7
- Offline Sync is handled via `AsyncStorage` and a custom `SyncService`.

## 3. Database Sync Flow
- Offline writes are pushed to a JSON queue in `AsyncStorage`.
- `SyncService.enqueueOperation` saves the operation locally as `PENDING` and immediately fires an async background process to sync with Supabase.
- Network connection check determines if sync proceeds.

# SPRINT FORENSIC AUDIT (FA-01 → FA-13)

## FA-05 / FA-06: Authentication & Security
### 4. JWT & PGRST303 Handling
- The issue where JWT is issued in the future `PGRST303` is NOT fixed. A brutal workaround exists in `AuthContext.js` where the app traps `PGRST303` (and other 3xx codes) and simply forces a silent `logout()`. 
- **Security Check**: This prevents a crash but kicks the user offline, destroying active un-synced sessions if not handled properly.

## FA-09 / FA-10 / FA-11: Background Tracking & Geofencing
### 5. `ExpoTaskManager` Defect
- **Status**: IMPLEMENTED + VALIDATED.
- The `Cannot find native module 'ExpoTaskManager'` bug is physically resolved in the native bundle.

### 6. Android Location Permissions
- **Status**: IMPLEMENTED + VALIDATED.
- The foreground service permissions missing in the manifest have been resolved. Tracking activates properly.

### 7. Dummy GPS Data
- **Status**: CLEANED.
- No dummy/mock location data is injected into the pipeline. Native `Location` API is being polled natively.

### 8. Geofencing Evaluation (FA-10)
- **Status**: IMPLEMENTED + VALIDATED.
- Implemented natively within the background task. Uses a strict state machine `UNKNOWN -> INSIDE/OUTSIDE -> INSIDE -> OUTSIDE`.
- Enqueues `ENTER` and `EXIT` events locally to `geofence_events` which are then synced to the DB.

### 9. Duplicate Background Watchers
- **Status**: NONE.
- The app uses a single background location pipeline (`background-location-task`). Geofencing evaluation is performed *inside* the background location ping.

## FA-13: Visit Mode & Activities
### 10. `useVisit` Context
- Maintains idempotent states using `ACTIVE_VISIT_KEY`. Hydrates the visit from cache on reload.
- **Bug identified**: Failsafe timeout is implemented in `getFastLocation` if the location module hangs on `startVisit` or `finishVisit`.

### 11. Customer Recent Activity Not Updating (Exact Break)
- **Status**: BROKEN.
- **The Exact Break**: When a visit is finished, `VisitContext` pushes an `activity_logs` entry to the `SyncService`. `SyncService` puts it in `PENDING` and *immediately* changes its status to `SYNCING` to upload to Supabase.
- The app instantly navigates back to the `CustomerProfileScreen` which runs `fetchCustomerProfile`.
- The offline reader `SyncService.getQueue` actively filters **OUT** operations marked `SYNCING`. 
- The Supabase read does not return the record yet because the async insert hasn't finished. 
- The record effectively "vanishes" from the UI until the user fully refreshes the screen later. It is a race condition between local cache filtering and network propagation.

### 12. Quick Requirement (Demand) Sheet
- **Status**: IMPLEMENTED.
- Enqueues local `requirements` operation on submit via `SyncService` and assigns it to the offline visit context.
- UI explicitly warns "Catalog Not Connected" and uses hardcoded payloads `Feed (BAGS)` instead of a live catalog. 

### 13. Operational Radar Bento Matrix
- **Status**: BROKEN (UI Placeholder).
- Completely inert UI element. Just says "No Active Tasks" with a hardcoded `EmptyState`.

### 14. Activity Outcomes
- Saves boolean outcomes to `metadata: { outcomes: { metCustomer: true, ... } }`.
- Synced to the backend `activity_logs` correctly.

### 15. The "Photo" Button
- **Status**: INERT / DISABLED.
- **Root Cause**: The `onPress` handler triggers `handlePhotoProof()` which strictly shows an `Alert`: "Photo/Proof storage requires a paid AWS/Supabase bucket... This feature is disabled to maintain zero budget."
- Camera permissions are missing, and no native image libraries are installed.

## FA-09A: Production Data & Hardcoding Cleanup
### 16. Dummy/Mock Business Data
- **Status**: PARTIALLY CLEANED.
- `src/fixtures/data.js` remains full of dummy customers and work items, but it is **not imported** or used in the active UI flows (`CustomersScreen.js` and `CustomerProfileScreen.js`).
- However, some hardcoded UI elements remain in `CustomersScreen.js` that give the illusion of data:
  - `FilterTabs`: `All 42`, `Overdue: 3`
  - `LocationContext`: "Loha Mandi, Beat Sector 4", "8 clients within 2.5 km"

### 17. Cash Collection
- **Status**: INERT / UI MOCKUP.
- The "Record ₹" button on `VisitModeScreen` is completely inert (no `onPress` handler). There is no financial tracking architecture.

### 18. FA-17 Follow Up Architecture
- **Status**: ABSENT.
- Implemented merely as a boolean checkbox in the Visit outcome list. No date-picker or calendar integration exists.

## Future Push Notification / FA-12
### 19. Expo Notifications & Firebase
- **Status**: CLEAN.
- There are no traces of `expo-notifications` or `firebase` in `package.json` or `src/`. No background push listeners are active.

# SUMMARY OF DEFECTS / DEBT
1. **Activity Sync Vanishing**: The `SYNCING` state race condition causes newly completed visits to disappear from the Customer Profile timeline immediately after finish.
2. **PGRST303 Bruteforce Workaround**: JWT issues forcefully log the user out instead of handling token refreshes smoothly.
3. **Hardcoded UI Illusions**: Badges and location strings in `CustomersScreen.js` are still completely hardcoded and misleading.
4. **Inert Buttons**: Photo and Cash Collection buttons are either disabled via Alert or lack handlers.
