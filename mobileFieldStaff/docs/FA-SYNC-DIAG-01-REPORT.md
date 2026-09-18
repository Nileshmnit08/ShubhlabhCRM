# MICRO-SPRINT FA-SYNC-DIAG-01-REPORT.md

## 1. Objective
Diagnose the synchronization failure where the Profile page's manual Sync action flashes and fails to process pending items, leaving the Sync Status as Idle.

## 2. Current Sync Architecture
- **Queue Storage**: `AsyncStorage` under `@sync_queue_${userId}`
- **Queue Processor**: `SyncService.processQueue()`
- **UI State Manager**: `SyncContext.js` maintains `isSyncing` and `pendingCount`.

## 3. Manual Sync Execution Path
ProfileScreen (`Sync Now` button) → `triggerSync()` in `SyncContext` → sets `isSyncing = true` → calls `SyncService.processQueue()` → resets `isSyncing = false` and updates counts.

## 4. Physical Reproduction
Confirmed via live ADB logs. When the background sync is triggered, the app rapidly outputs identical sync failures:
```
[DIAGNOSTIC] CALL_SYNC_FAILURE: local_id=... msg=Error: fetch failed: Call to function 'NativeRequest.start' has been rejected.
```
This failure repeats multiple times per second indefinitely.

## 5. Actual Pending Queue State
The queue contains at least one item stuck with `status = 'FAILED'`. (Initially caused by the previous GitHub Actions APK lacking the Supabase URL, which triggered the fetch rejection).

## 6. Sync Status State Transitions Observed
When the user taps "Sync Now", the UI flashes to `SYNCING...` and immediately reverts to `IDLE`.

## 7. Pending Count Behavior
The count does not decrease because the failed item is never successfully synced or removed from the queue.

## 8. Network/Internet Verification
The device is online, but the underlying Supabase URL was previously missing in the CI build, triggering the first rejection.

## 9. Supabase Request Results
No network request actually reaches Supabase. It fails at the React Native networking layer (`NativeRequest.start` rejected) due to the missing URL.

## 10. Queue Processing Results
The queue processor gets permanently trapped in an infinite `while (true)` loop.

## 11. Exact Failure Point
Inside `SyncService.processQueue()`:
```javascript
pendingOp = queue.find(op => op.status !== 'SYNCED' && op.status !== 'SYNCING');
```
Because a failed item is marked as `'FAILED'`, it matches this condition. It is picked up, attempted, fails instantly, marked as `'FAILED'`, and the loop repeats immediately. This permanently locks `SyncService._isProcessing = true`.

When the user manually clicks "Sync Now", `processQueue()` is called again but immediately aborts because `if (this._isProcessing) return;` evaluates to true. `triggerSync` then immediately sets `isSyncing` back to `false`, causing the UI flash.

## 12. Primary Root Cause
**Infinite Loop in Queue Processing:** The `while (true)` loop in `SyncService.js` repeatedly selects `FAILED` items without backoff or status isolation. This creates an infinite synchronous loop that locks the processor flag (`_isProcessing = true`), silently aborting all subsequent manual sync attempts.

## 13. Secondary Issues
**CI Secrets Missing:** The initial `fetch failed` error was triggered because the GitHub Actions build pipeline compiled the release APK without the `EXPO_PUBLIC_SUPABASE_URL`, causing all requests to fail natively.

## 14. Minimal Fix Plan
- **File**: `mobileFieldStaff/src/services/SyncService.js`
- **Function**: `processQueue()`
- **Logic to Change**: 
  1. Change the queue lookup to strictly select `PENDING` items:
     `pendingOp = queue.find(op => op.status === 'PENDING');`
  2. Add a targeted reset in `triggerSync()` or at the start of `processQueue()` to transition all `FAILED` items back to `PENDING` before processing begins, ensuring manual sync acts as a true retry mechanism without causing an infinite loop.
- **Database changes required**: None.
- **APK rebuild required**: Yes, a new APK will be needed after applying the JavaScript fix.

## 15. Files Changed
NONE.

## 16. Database Objects Changed
NONE.

## 17. Test Evidence
ADB logcat trace confirms the infinite loop locking the thread, and code inspection of `SyncService.js` confirms the faulty `.find()` logic.

## 18. Final Status
**PASS — ROOT CAUSE IDENTIFIED**
