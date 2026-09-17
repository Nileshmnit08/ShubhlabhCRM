# COMM-06B — CALL CAPTURE & SYNC DIAGNOSTIC

## Existing Pipeline
**PASS**
The pipeline was successfully traced:
1. **Android Call Log** generates system call metadata.
2. **CallLogService** wakes up when AppState transitions to `active`.
3. It filters out previously processed calls using a persistent timestamp (`@last_processed_call_timestamp`).
4. It normalizes phone numbers and dynamically generates a unique `device_event_id`.
5. It delegates the payload to **SyncService**, which stores it in local `AsyncStorage` under a user-specific queue.
6. **SyncService** iterates over pending queue items when the network is online, submitting HTTP POST/UPDATE requests to **Supabase**.
7. Supabase checks the **RLS INSERT Policy** to verify identity.
8. If successful, the event is securely committed to **public.crm_call_events**.

## CallLogService
**PASS**
- **Initialization:** Hooked into React Native `AppState` change listeners (`App.js` / internal `initAppStateListener`).
- **Reading:** Uses `react-native-call-log` to load the most recent 100 calls, stopping early if it reaches the `lastTimestamp`.
- **Deduplication:** A strict check on the call timestamp against `maxTimestampProcessed`.
- **Event ID:** `device_event_id = android_call_${callTimestamp}_${normalizedPhone}`

## Local Processing
**PASS**
The offline-first queue behaves correctly. Calls are pushed to `AsyncStorage` BEFORE network submission via `SyncService.enqueueOperation()`. It cleanly survives app restarts.

## SyncService
**PASS**
- Uses a local `AsyncStorage` queue.
- Automatically captures unique constraints (`23505`) as safe `SYNCED` statuses to protect idempotency without polluting the queue.
- Correctly iterates and pauses on `FAILED` items.

## Authentication
**PASS**
`staff_id` is robustly derived directly from `supabase.auth.getSession()` inside `CallLogService.initAppStateListener`. No hard-coded keys or dangerous `service_role` tokens exist in the mobile codebase.

## Payload Contract
**PASS**
The generated JS object precisely mirrors the PostgreSQL table schema:
- `staff_id`, `party_id` (null default), `phone_number`, `normalized_phone`, `direction`, `call_type`, `started_at`, `ended_at`, `duration_seconds`, `device_event_id`, `source`.

## Supabase Contract
**PASS**
The live `crm_call_events` table matches the payload precisely. All nullability constraints and data types align.

## RLS Contract
**PASS**
The established policy `(auth.uid() = staff_id)` explicitly permits Field Staff to INSERT events directly via the REST API. No back-end overrides are needed.

## Diagnostic Logging
**PASS**
Sufficient development logging was injected safely into the codebase:
- `[DIAGNOSTIC] CALL_DETECTED: dir=OUTGOING type=ANSWERED event=android_call_... phone=+9198*****210`
- `[DIAGNOSTIC] CALL_QUEUED: event=android_call_...`
- `[DIAGNOSTIC] CALL_SYNC_ATTEMPT: table=crm_call_events local_id=...`
- `[DIAGNOSTIC] CALL_SYNC_SUCCESS: local_id=...`
- `[DIAGNOSTIC] CALL_SYNC_FAILURE: local_id=... code=23505 msg=...`
All logs strictly mask PII (only the first 4 and last 3 digits of phone numbers are visible).

## Privacy Audit
**PASS**
Confirmed NO logging of full phone numbers, passwords, JWTs, SMS contents, WhatsApp texts, or audio recordings. `AndroidManifest.xml` natively blocks arbitrary microphone/SMS access.

## Physical Test Procedure
**PASS**
Here is the strict protocol for the Human QA tester to obtain the first authentic pipeline trace:
1. Open the standalone Field Assistant APK on an Android device.
2. Login as authorized Field Staff.
3. Accept the `READ_CALL_LOG` permission prompt.
4. Place **ONE** real phone call to an existing CRM customer (or external test number).
5. End the call.
6. Return to the Field Assistant app (forcing AppState to `active`).
7. Open a terminal attached to the device (or view Metro logs if debugging).
8. Look for the sequential `[DIAGNOSTIC]` flags (`CALL_DETECTED` → `CALL_QUEUED` → `CALL_SYNC_ATTEMPT` → `CALL_SYNC_SUCCESS`).
9. Query `crm_call_events` to verify the single row insertion.
10. Open `/communication` on the CRM web portal and confirm the dashboard ingested the call.

## Physical Test Result
**BLOCKED — HUMAN DEVICE TEST REQUIRED**
An AI cannot physically operate cellular hardware to place a test call.

## Failure Point
*N/A — Statically Verified.*

## Fixes
*N/A*

## Regression
**PASS**
Diagnostic logging changes do not impact React Navigation, State Management, or UI rendering.

## Changed Files
- `d:\ShubhLabhCRM\mobileFieldStaff\src\services\CallLogService.js` (Added masked `CALL_DETECTED`/`CALL_QUEUED` logs)
- `d:\ShubhLabhCRM\mobileFieldStaff\src\services\SyncService.js` (Added HTTP/Status diagnostic wrappers to `processQueue`)

## Database Objects Changed
NONE

---

### Final Classification
**BLOCKED**

The diagnostic preparation is 100% complete and PASSES all architectural, privacy, and schema contracts. The pipeline is fully armed with observability. The final end-to-end execution classification remains **BLOCKED — HUMAN DEVICE TEST REQUIRED** until a QA tester runs the Physical Test Procedure.
