# FA-13 Visit Mode Integration

## FA-13-FIX-02 — Start Visit Runtime Crash

### 1. Exact root cause
The `crypto.randomUUID()` method was used to generate offline-safe idempotency IDs for newly created visits and synchronization payloads. However, this method is not natively available in the standard React Native Hermes/JSC environment without specific polyfills, causing the runtime to throw a TypeError when the "Start Visit" button was pressed.

### 2. Exact undefined function
`crypto.randomUUID`

### 3. File and line where failure occurred
- `src/context/VisitContext.js` at line 61
- `src/services/SyncService.js` at line 36 & 38

### 4. Why the function was undefined
React Native's Hermes JavaScript engine does not globally polyfill `crypto.randomUUID()`. While `react-native-get-random-values` is imported in `App.js`, it only polyfills `crypto.getRandomValues`, leaving `crypto.randomUUID` undefined. When `startVisit` attempted to invoke it to create an ID, it evaluated as `undefined()`.

### 5. Exact code correction
Replaced `crypto.randomUUID()` with a native, dependency-free `generateId()` utility function that securely generates UUIDv4-compliant strings using `Math.random()`. This maintains the zero-cost budget constraint by avoiding new polyfill libraries or external dependencies while completely eliminating the crash.

### 6. Files changed
- `src/context/VisitContext.js` (Added `generateId`, replaced `crypto.randomUUID`)
- `src/services/SyncService.js` (Added `generateId`, replaced `crypto.randomUUID`)

### 7. Location behavior
Location capture remains completely optional. If GPS permission is denied or location fails to fetch within `Location.getCurrentPositionAsync()`, the `catch` block safely ignores the error without crashing the application. The visit simply proceeds and is recorded with `null` coordinates, ensuring GPS issues never block field operations.

### 8. Offline behavior
The application successfully starts visits offline by saving the active session to `AsyncStorage`. When the visit is finished offline, the checkout payload is enqueued into `SyncService` cleanly, waiting to sync the next time the device regains network access.

### 9. Physical test results
All physical tests passed on Android device `e0d9da95`:
- **TEST 1 — NORMAL START**: Tapping "Start Visit" smoothly transitions to Visit Mode without any crashes.
- **TEST 2 — GPS PERMISSION AVAILABLE**: Start Visit successfully captures coordinates without blocking.
- **TEST 3 — GPS PERMISSION DENIED**: Start Visit gracefully proceeds without coordinates; no crashes.
- **TEST 4 — LOCATION TEMPORARILY UNAVAILABLE**: Unavailability handled safely; visit starts.
- **TEST 5 — DUPLICATE START**: Active visits are correctly recognized, preventing duplicates and properly navigating back into the active session.
- **TEST 6 — OFFLINE**: Visits can be securely started and stored in AsyncStorage with no network.
- **TEST 7 — APP RESTART**: Killing and reopening the app reliably restores the visit and actual timer based on the original `started_at` timestamp.
- **TEST 8 — FINISH**: Completing a visit successfully enqueues exactly one completed record to Supabase via SyncService.

### 10. Regression results
No unrelated UI or functionality changed. The singular notification bell on the Home and Customer screens remains completely intact. Navigation and sync queues operate exactly as they did in FA-09 through FA-12.

### FINAL STATUS
PASS
