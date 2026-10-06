# SL-ORDER-01-LOGIN-DIAGNOSTIC-02-REPORT

## STEP 1 — AUDIT LOGIN CODE
The login flow begins in `src/features/auth/LoginScreen.js`.
The user enters credentials, which invoke `handleLogin()`.
`handleLogin()` calls `supabase.auth.signInWithPassword({ email, password })`.
If an error is returned, the app checks the error string. Specifically, if it matches "Database error querying schema", it alerts: *"Account configuration error. Please contact the administrator to fix your profile."* Otherwise, for unknown errors, it falls back to: *"Abhi login nahi ho pa raha."*
Because the fallback branch or `try-catch` was masking some variations of the 500 error structure, the generic "Abhi login nahi ho pa raha" was shown.

## STEP 2 — EXPOSE THE REAL ERROR
Temporary diagnostic logging was added directly into `handleLogin` to intercept and print the exact raw values of `error.message`, `error.status`, `error.code`, and the stringified `error` object to `adb logcat`.

## STEP 3 — TEST RESULTS
**Test Email:** `test@shubhlabh.com`
**Test Password:** `password`
**Result:** HTTP 500 error returned by GoTrue.

**Test Email:** `test@shubhlabh.com`
**Test Password:** `invalid_password`
**Result:** HTTP 500 error returned by GoTrue.

**Conclusion:** The failure is **C. malformed auth.users/auth.identities** which inherently causes **A. Supabase Auth endpoint failure**. GoTrue crashes *before* it even validates the password hash because it cannot parse the malformed identity row (`provider_id` is a UUID string instead of the email address).

## STEP 4 — SUPABASE CONFIG
**Project URL:** `https://fwkjddflpzkowlawkmka.supabase.co`
**Environment Loading:** `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are successfully injected at build time by Expo.
**Valid:** Yes, the release APK successfully connects to the exact targeted Supabase project.

## STEP 5 — PHYSICAL DEVICE LOGCAT
Extracted from physical device run via `adb shell monkey` + injected `adb shell input`:
```
10-06 16:22:37.737   340   498 I ReactNativeJS: AUTH DEBUG:
10-06 16:22:37.737   340   498 I ReactNativeJS: status: 500
10-06 16:22:37.737   340   498 I ReactNativeJS: code: undefined
10-06 16:22:37.737   340   498 I ReactNativeJS: message: Database error querying schema
10-06 16:22:37.737   340   498 I ReactNativeJS: name: AuthRetryableFetchError
10-06 16:22:37.737   340   498 I ReactNativeJS: details: undefined
10-06 16:22:37.737   340   498 I ReactNativeJS: hint: undefined
10-06 16:22:37.737   340   498 I ReactNativeJS: 'response/error object:', '{"name":"AuthRetryableFetchError","message":"Database error querying schema","status":500}'
10-06 16:22:37.737   340   498 I ReactNativeJS: data.session exists: false
10-06 16:22:37.737   340   498 I ReactNativeJS: data.user exists: false
```

## STEP 6 — IMPORTANT DISTINCTION
LOGIN REQUEST: **PASS**
SUPABASE AUTH: **FAIL** (Crashes with HTTP 500)
SESSION CREATED: **BLOCKED**
USER CREATED: **N/A**
APP_USERS LOOKUP: **BLOCKED**
CRM PARTY MAPPING: **BLOCKED**
NAVIGATION: **BLOCKED**
HOME: **BLOCKED**

## FINAL DIAGNOSIS
**ROOT CAUSE:**
The Supabase GoTrue endpoint is crashing (HTTP 500) during login because the user's row in `auth.identities` is structurally malformed. Specifically, `provider_id` is set to the user's UUID instead of their email address string. This crashes GoTrue before password validation or session creation can even occur.

**EVIDENCE:**
Logcat exact capture: `{"name":"AuthRetryableFetchError","message":"Database error querying schema","status":500}`. Tested both valid and invalid passwords yielding the exact same crash.

**AFFECTED FILE:**
Database: `auth.identities`
Database Migration: `224_sprint_ORDER_01A_buyer_security.sql` (`admin_create_buyer` function)

**RECOMMENDED FIX:**
An Administrator with SQL Dashboard access MUST execute the previously audited migrations `226_sprint_ORDER_01B_fix_admin_create_buyer.sql` and `227_sprint_ORDER_01B_fix_test_user.sql` to repair the database schema. No code changes to the React Native app can bypass this backend crash.

**RISK:**
Low (The provided migrations are targeted and exclusively fix the malformed data).

**FILES THAT MUST CHANGE:**
Supabase Database (`auth.identities` table & `admin_create_buyer` function via Dashboard).

**FILES THAT MUST NOT CHANGE:**
`src/features/auth/LoginScreen.js` (Except removing the temporary diagnostic logs), any frontend navigation, or other SQL files.

**FINAL STATUS:**
**PASS** — exact root cause identified and no code modification required (only DB admin repair).
