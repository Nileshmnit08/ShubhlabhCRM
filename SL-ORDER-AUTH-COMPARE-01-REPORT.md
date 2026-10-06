# SL-ORDER-AUTH-COMPARE-01-REPORT

## 1. Working Mobile auth architecture
- **Authentication method:** Email/Password
- **Supabase project:** EXPO_PUBLIC_SUPABASE_URL (fwkjddflpzkowlawkmka)
- **Auth endpoint:** `/auth/v1/token?grant_type=password`
- **User/session creation:** `supabase.auth.signInWithPassword()`
- **Post-auth profile lookup:** Listens to `onAuthStateChange`, calls `fetchUserProfile` from `app_users` filtering by `role = 'Operator'`.
- **Client singleton:** Yes, initialized in `src/lib/supabase.js` using `expo-secure-store`.

## 2. Working Field Assist auth architecture
- **Authentication method:** Email/Password
- **Supabase project:** EXPO_PUBLIC_SUPABASE_URL (fwkjddflpzkowlawkmka)
- **Auth endpoint:** `/auth/v1/token?grant_type=password`
- **User/session creation:** `supabase.auth.signInWithPassword()`
- **Post-auth profile lookup:** Listens to `onAuthStateChange`, calls `resolveFieldStaffIdentity` filtering by `is_active=true` and `role != 'Admin'`.
- **Client singleton:** Yes, initialized in `src/lib/supabase.js` using `expo-secure-store`.

## 3. Shubh Labh Order auth architecture
- **Authentication method:** Email/Password
- **Supabase project:** EXPO_PUBLIC_SUPABASE_URL (fwkjddflpzkowlawkmka)
- **Auth endpoint:** `/auth/v1/token?grant_type=password`
- **User/session creation:** `supabase.auth.signInWithPassword()`
- **Post-auth profile lookup:** Listens to `onAuthStateChange`, calls `fetchBuyerData` filtering by `role = 'Buyer'`.
- **Client singleton:** Yes, initialized in `src/core/api/supabase.js` using `expo-secure-store`.

## 4. Side-by-side comparison

| Area | Working Mobile | Working Field Assist | Shubh Labh Order | Difference |
|------|----------------|---------------------|------------------|------------|
| Supabase URL | `process.env...trim()` | `process.env...trim()` | `process.env` | Negligible (`.env` lacks whitespace) |
| Auth method | `signInWithPassword` | `signInWithPassword` | `signInWithPassword` | None |
| Storage | `expo-secure-store` | `expo-secure-store` | `expo-secure-store` | None |
| AuthContext | `fetchUserProfile` | `resolveFieldStaffIdentity` | `fetchBuyerData` | None (all downstream of auth) |
| Environment | `EXPO_PUBLIC_*` | `EXPO_PUBLIC_*` | `EXPO_PUBLIC_*` | None |

## 5. Supabase configuration comparison
All three apps use the identical target: `https://fwkjddflpzkowlawkmka.supabase.co`. The `.env` files across all three projects contain identical strings without carriage returns that would break request headers.

## 6. Dependency comparison
- Mobile: `@supabase/supabase-js: ^2.115.0`
- Field Assist: `@supabase/supabase-js: ^2.117.2`
- Order: `@supabase/supabase-js: ^2.117.2`
There is no material difference; both versions perfectly support email/password auth.

## 7. Release configuration comparison
All `app.json` configurations are standard and correct. There are no divergent hardcoded release environments. The Order app correctly compiles the environment variables. 

## 8. Customer identity comparison
Based on historical sprint schema analysis:
- **Field Assist Users:** Created via `15_sprint_15_team_and_assignment.sql` which correctly created identities but inserted `NULL` into token columns (`confirmation_token`, etc). This was subsequently repaired in `20_sprint_20_auth_schema_fix.sql` which replaced `NULL` with `''`.
- **Order Users (test@shubhlabh.com):** Created via `224_sprint_ORDER_01A_buyer_security.sql`. This script copied the old broken `NULL` token logic, bypassing the Sprint 20 fix!
- **Conclusion:** The GoTrue engine throws a 500 when it encounters `NULL` tokens on the `auth.users` row. The working users had this repaired; the Order users did not.

## 9. Exact root cause
**F. Customer auth.identity database corruption / Server-side issue**
The HTTP 500 error originates from GoTrue backend failing to query the schema due to `NULL` tokens (and malformed provider_ids) specifically on the `test@shubhlabh.com` user profile. The Shubh Labh Order client application implementation is perfectly correct and identical in standard to the working applications.

## 10. Evidence
Running a raw NodeJS client against `fwkjddflpzkowlawkmka` explicitly returns `{"name":"AuthRetryableFetchError","message":"Database error querying schema","status":500}` for `test@shubhlabh.com`. This proves the failure occurs purely server-side *before* session creation, regardless of the client implementation. 

## 11. Files changed in Shubh Labh Order
**None.** 

## 12. Files NOT changed
All files.

## 13. Physical device result
Client implementation matches working applications. Database identity repair remains required.

## 14. Security result
No secrets exposed.

## 15. Regression result
No changes made; no regressions introduced.

---
**WORKING APPS MODIFIED:**
NO

**TARGET APP MODIFIED:**
NO

**FINAL DECISION:**
Client implementation matches working applications. Database identity repair remains required.
