# AUTH-01: Global Login Diagnostic Report

## 1. Exact Login Flow
The current login execution path is:
`email/password` → `LoginScreen.handleLogin()` → `AuthContext.login()` → `supabase.auth.signInWithPassword()`

Execution stops exactly at `signInWithPassword()`. The function throws an exception before a session is ever created or returned to the app. The subsequent `app_users` lookup and RLS validations are never reached.

## 2. Current Supabase Hostname / Project Reference
- **URL**: `https://fwkjddflpzkowlawkmka.supabase.co`
- Verified from the environment file `mobileFieldStaff/.env` used for the build. It is not localhost or faked.

## 3. Auth Error Code
`undefined`

## 4. Auth HTTP Status
`500` (Internal Server Error)

## 5. Auth Result
`FAILURE`
**Error Name:** `AuthRetryableFetchError`
**Error Message:** `Database error querying schema`

## 6. app_users Query Result
`N/A` (Blocked by Auth failure. However, a manual REST API test confirmed that the public database is online, not paused, and responds to queries.)

## 7. RLS Result
`N/A` (Blocked by Auth failure)

## 8. Role / Status Result
`N/A` (Blocked by Auth failure)

## 9. Session Result
`N/A` (Session is NOT created)

## 10. Second-User Comparison
Tested with a secondary account (`nilesh@shubhlabh.com`) using identical parameters.
**Result:** Exact same failure.
- Status: `500`
- Name: `AuthRetryableFetchError`
- Message: `Database error querying schema`

## 11. Exact Root Cause
This is a **backend configuration/database error** within Supabase. The Supabase GoTrue service (which handles authentication) is unable to query its own internal `auth` schema when processing the login request. 

Because the standard REST API (PostgREST) is functioning properly (verified via a direct `app_users` query), the database itself is online and not paused. The specific `Database error querying schema` error during sign-in almost universally indicates that a custom Postgres trigger or Postgres function attached to the `auth.users` table (or an authentication hook) is failing and crashing the GoTrue execution, or that the internal `auth` schema permissions were inadvertently altered.

## 12. Recommended Minimal Fix
1. Inspect the Supabase dashboard (Database -> Triggers / Functions).
2. Look for any triggers attached to the `auth.users` table (e.g., a trigger designed to automatically sync new users to `public.app_users`).
3. Temporarily disable any custom triggers on `auth.users` to confirm if the login proceeds successfully.
4. If a trigger is at fault, fix the SQL syntax or RLS violation within the trigger's execution block.

## FINAL STATUS
**BLOCKED — ADDITIONAL EVIDENCE REQUIRED**
(Requires access to the Supabase dashboard or a `service_role` key to inspect internal `auth.users` triggers/schema configurations.)
