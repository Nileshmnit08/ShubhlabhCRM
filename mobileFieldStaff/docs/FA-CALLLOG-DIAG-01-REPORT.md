# MICRO-SPRINT FA-CALLLOG-DIAG-01-REPORT.md

## 1. Call-Log Library
The Field Assistant application utilizes the `react-native-call-log` library to interface with Android's native call log provider.

## 2. Android Native Source
Android's `CallLog.Calls` provider exposes the call type as an integer field `type` (e.g., `1` for Incoming, `2` for Outgoing, `3` for Missed).

## 3. JS Normalization Source
The parsing and synchronization occur in `mobileFieldStaff/src/services/CallLogService.js`. Specifically, the `syncCallLogs()` function retrieves the calls and `mapCallType()` normalizes them.

## 4. Database Source
The records are synced directly into `public.crm_call_events` via the `SyncService.enqueueOperation()` method.

## 5. Native Call-Type Values
The `react-native-call-log` library (`node_modules/react-native-call-log/src/index.ts`) abstracts the raw Android integer and returns two separate fields for each call:
- `rawType: number` (e.g., `1`, `2`, `3`)
- `type: string` (e.g., `"INCOMING"`, `"OUTGOING"`, `"MISSED"`)

## 6. Current Mapping
`CallLogService.js` currently attempts to map the call type using a `switch` statement:
```javascript
const mapCallType = (typeRaw) => {
  const type = typeRaw.toString();
  switch (type) {
    case '1': return { direction: 'INCOMING', call_type: 'ANSWERED' };
    case '2': return { direction: 'OUTGOING', call_type: 'ANSWERED' };
    // ...
```
However, on line 105, the application passes `call.type` to this function:
```javascript
const { direction, call_type } = mapCallType(call.type);
```

## 7. UNKNOWN Fallback Locations
In `CallLogService.js` at line 40, the `switch` statement has a fallback:
```javascript
default: return { direction: 'UNKNOWN', call_type: 'UNKNOWN' };
```
Because the application passes the string `"INCOMING"` into the switch statement which is exclusively checking for `"1"`, it ALWAYS hits this default fallback.

## 8. Database Value Contract
The `public.crm_call_events` table accepts strings for `direction` and `call_type`. The CRM dashboard expects `INCOMING`, `OUTGOING`, and `MISSED`. The database accepted `UNKNOWN` safely, but this crippled the CRM metrics.

## 9. Missed-Call Logic
The application has logic to define Missed Calls in two ways:
1. Native missed calls (Type `3`) are theoretically mapped to `MISSED`.
2. Any `OUTGOING` call with a `duration === 0` is manually forced to `MISSED` (line 109).
However, neither of these currently work because the type mapping completely fails upstream.

## 10. Permission Findings
The `READ_CALL_LOG` permission is correctly requested and validated. Permission failure is not the root cause (if permissions failed, `0` calls would be synced, not `100` UNKNOWN calls).

## 11. Production Evidence
Production data explicitly showed 100 calls synced, and all 100 were marked `UNKNOWN`. This is the direct result of the `default:` fallback executing 100% of the time due to the type mismatch between the library payload and the mapping logic.

## 12. Exact Root Cause
**ROOT CAUSE:** The `react-native-call-log` library returns the string representation of the call type in the `call.type` field (e.g., `"INCOMING"`). The `CallLogService.js` script passes this string into `mapCallType()`, which was incorrectly programmed to look for the raw Android numeric strings (e.g., `"1"`, `"2"`). Since `"INCOMING"` does not equal `"1"`, every single call event triggered the `default` fallback, resulting in `direction: 'UNKNOWN'` and `call_type: 'UNKNOWN'` being saved to the database.

## 13. Minimal Fix Plan
The safest and most minimal fix is to pass the correct field from the library payload to the mapping function. The library provides `rawType` which contains the numeric integer the switch statement expects.

In `mobileFieldStaff/src/services/CallLogService.js` (Line 105):
**Change:**
```javascript
const { direction, call_type } = mapCallType(call.type);
```
**To:**
```javascript
const { direction, call_type } = mapCallType(call.rawType);
```

## 14. Files Requiring Modification
- `mobileFieldStaff/src/services/CallLogService.js`

## 15. Database Changes Required
NO.

## 16. APK Rebuild Requirement
YES. (Any changes to React Native JS files require bundling a new OTA update or compiling a new APK).

## 17. Physical Validation Requirement
YES. A physical device with active call logs is required to verify that the newly mapped values correctly hit the Supabase database as INCOMING / OUTGOING / MISSED.

## 18. Final Status
**PASS** — exact root cause identified and minimal fix specified.

END
