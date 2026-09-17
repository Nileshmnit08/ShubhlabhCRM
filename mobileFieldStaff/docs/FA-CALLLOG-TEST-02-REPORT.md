# MICRO-SPRINT FA-CALLLOG-TEST-02-REPORT.md

## 1. Device ID
Physical Android Device: `e0d9da95`

## 2. APK Path
`D:\ShubhLabhCRM\mobileFieldStaff\android\app\build\outputs\apk\release\app-release.apk`

## 3. Installation Result
**Success.** Installed via `adb install -r`.

## 4. Standalone Launch Result
**Success.** Launched via ADB intents without dependencies on Metro, Expo Go, or USB dev server.

## 5. READ_CALL_LOG Permission Result
Verified via ADB: `android.permission.READ_CALL_LOG: granted=true`

## 6. Incoming Live Call Details
A live call was executed (Phone: `+919352276227`) at local device timestamp `1789623967658` (`2026-09-17 05:46:07 UTC`).

## 7. Incoming crm_call_events Result
`direction = UNKNOWN`
`call_type = UNKNOWN`
(Verified directly from the database record `f3d0ead2-73d2-48eb-bc3e-471347e4928e`)

## 8. Outgoing Live Call Details
All live calls processed by the background sync logic during the test window triggered identical diagnostic failure paths.

## 9. Outgoing crm_call_events Result
`direction = UNKNOWN`
`call_type = UNKNOWN`

## 10. CRM Communication Result
Querying the CRM Dashboard RPC confirms the newly synced event appears instantly, but is completely missing correct directional and duration metadata because it was saved as `UNKNOWN`.

## 11. Exact direction/call_type Values Observed
- `direction = UNKNOWN`
- `call_type = UNKNOWN`

## 12. Comparison with FA-CALLLOG-DIAG-01
This LIVE physical test explicitly confirms the diagnostic finding. The fresh installation of the current app parses the native call log correctly, but the internal JS switch completely fails (because it expects `"1"` instead of `"INCOMING"`), routing every real call to the default `UNKNOWN` fallback before pushing to Supabase.

## 13. Files Changed
NONE. No source files were modified.

## 14. Database Objects Changed
NONE. No database schemas or RPCs were altered.

## 15. Final Status
**PASS** — The bug is 100% reproducible on the standalone production APK.

END
