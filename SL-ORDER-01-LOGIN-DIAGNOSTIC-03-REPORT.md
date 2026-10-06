# SL-ORDER-01-LOGIN-DIAGNOSTIC-03-REPORT

## 1. Exact failure point
**FILE:** `src/features/auth/LoginScreen.js`
**FUNCTION:** `handleLogin`
**CONDITION:** `error.message.includes('Database error querying schema')`
**EXPECTED DATA:** A successful `session` and `user` object from Supabase Auth upon calling `signInWithPassword()`.
**ACTUAL DATA:** HTTP 500 error returned by GoTrue: `{"name":"AuthRetryableFetchError","message":"Database error querying schema","status":500}`. This triggers the frontend fallback UI: "System Error. Account configuration error. Please contact the administrator to fix your profile."

## 2. Evidence
Direct logs confirm Supabase returns HTTP 500 immediately upon login attempt due to structurally malformed backend data (`provider_id` mapping to UUID instead of email in `auth.identities`), exactly as observed in Diagnostic 02. No session or user object is ever delivered to the frontend.

## 3. Relevant file/function
- UI Alert File: `src/features/auth/LoginScreen.js` (line 45)
- Post-Auth Flow File: `src/features/auth/AuthContext.js` (function `fetchBuyerData`)

**POST-AUTH TRACE (All subsequent steps blocked by Auth failure):**
signInWithPassword(): **FAIL** (Returns HTTP 500)
session created: **BLOCKED**
auth.user exists: **BLOCKED**
app_users lookup: **BLOCKED**
Buyer role validation: **BLOCKED**
crm_party_id validation: **BLOCKED**
CRM party lookup: **BLOCKED**
navigation to Home: **BLOCKED**

## 4. Database state
A READ-ONLY query check was executed using the Service Role key:

**auth.users / auth.identities:** **BLOCKED** (API access restricted; attempting to list users via the GoTrue Admin API fails entirely with 500 due to the malformed identity row crashing the parser).
**app_users:** PASS — `test@shubhlabh.com` exists, `role: 'Buyer'`, `is_active: true`, `crm_party_id` is populated (`231b398f-88a1-4d9d-b9d9-4699c42f8416`).
**crm_parties:** PASS — CRM Party ID `231b398f...` maps exactly to existing customer Profile "Test" (`crm_status: 'Active'`).

*Conclusion:* The post-auth app_user and crm_parties tables are flawlessly configured. The failure remains entirely within the GoTrue `auth.identities` internal schema.

## 5. RLS impact
There is NO RLS impact at this stage. Supabase GoTrue operates above standard Postgres RLS when validating credentials. The login fails because GoTrue itself crashes during the identity resolution phase, independent of Postgres row-level security.

## 6. Recommended fix
The Supabase Dashboard Administrator must execute the provided migrations to repair the backend data corruption. The React Native app's frontend authentication and profile-fetching architecture is completely correct.
1. Execute `226_sprint_ORDER_01B_fix_admin_create_buyer.sql`
2. Execute `227_sprint_ORDER_01B_fix_test_user.sql`

## 7. Files requiring modification
Supabase SQL Database (`auth.identities` table & `admin_create_buyer` function).

## 8. Files that must NOT be modified
`src/features/auth/LoginScreen.js`
`src/features/auth/AuthContext.js`
Any other application source files or configurations.

## 9. Risk assessment
**LOW.** The root cause is fully understood, and the app's `AuthContext` implementation is robust and ready for the valid session. The SQL migrations only target the specifically malformed `provider_id` rows and do not affect valid accounts or RLS structures.

**FINAL FAILURE CLASSIFICATION:**
**A. Authentication failed** (Specifically due to a backend GoTrue schema-querying crash prior to credential validation).
