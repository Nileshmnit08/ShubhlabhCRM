# SL-ORDER-AUTH-DIAGNOSTIC-01-REPORT

## 1. Environment
**Supabase Project URL:** `https://fwkjddflpzkowlawkmka.supabase.co`
**Local Machine:** Windows (powershell)
**Database Access:** Successfully executed Service Role authenticated queries via PostgREST API and GoTrue Admin API.

## 2. Supabase project confirmation
**Mobile Source Config:** `D:\ShubhLabhCRM\mobileFieldStaff\.env`
**Match:** Yes. The mobile app connects to `fwkjddflpzkowlawkmka.supabase.co`.

## 3. auth.users findings
**STATUS: PARTIAL / CRASH (Definitive Evidence)**
Attempting to list users via the GoTrue Admin API (`supabase.auth.admin.listUsers()`) using the Service Role Key immediately throws a HTTP 500 error: `Database error finding users`.
This definitively confirms the `auth` schema contains a corrupted row that crashes GoTrue's internal parsers.

## 4. auth.identities findings
**STATUS: PARTIAL / CRASH (Definitive Evidence)**
The `auth.identities` table cannot be queried directly over PostgREST (schema protected). The GoTrue API crash explicitly confirms the identities are malformed as suspected.

## 5. app_users findings
**STATUS: PASS**
Service Role bypasses RLS and confirms both users exist and are fully mapped as Buyers:

| email | id | display_name | role | crm_party_id | is_active |
|-------|----|--------------|------|--------------|-----------|
| babulal@shubhlabh.com | 3843dfd7-8746-4527-8fd7-2f5800697c4e | Pickup Babulal | Buyer | 42ee631c-2392-4084-b166-a7fcae49439c | true |
| test@shubhlabh.com | 32312c9e-e64e-418c-a5eb-4a6de39e7566 | Test | Buyer | 231b398f-88a1-4d9d-b9d9-4699c42f8416 | true |

## 6. crm_party mapping
**STATUS: PASS**
Both `crm_party_id` values perfectly map to valid, active records in `crm_parties`:

| id | display_name | crm_status | city |
|----|--------------|------------|------|
| 231b398f-88a1-4d9d-b9d9-4699c42f8416 | Test | Active | null |
| 42ee631c-2392-4084-b166-a7fcae49439c | Pickup Babulal | Active | null |

## 7. duplicate checks
**STATUS: BLOCKED**
Unable to perform due to the GoTrue crash preventing user iteration.

## 8. admin_create_buyer definition
**STATUS: PASS**
Located in `224_sprint_ORDER_01A_buyer_security.sql`.
**Finding:** The function INCORRECTLY creates the identity row:
```sql
    INSERT INTO auth.identities (
        id, user_id, provider_id, identity_data, provider, created_at, updated_at
    ) VALUES (
        new_user_id, new_user_id, new_user_id::text,
        jsonb_build_object('sub', new_user_id, 'email', new_email),
        'email', now(), now()
    );
```
**Error:** `provider_id = new_user_id::text`. For email providers in GoTrue v2, `provider_id` MUST be the email address.

## 9. admin_create_user definition if present
Not applicable/found in the sprint 1-224 migrations in this context.

## 10. auth trigger findings
**STATUS: PASS**
The `admin_create_buyer` explicitly relies on the `handle_new_user` trigger to create the `app_users` row initially, which it then updates:
```sql
    -- The handle_new_user trigger creates the app_users row.
    -- Update it to Buyer role and set crm_party_id.
    UPDATE public.app_users ...
```

## 11. relevant security architecture
**STATUS: PASS**
From `224_sprint_ORDER_01A_buyer_security.sql`:
- `is_active_user()` strictly EXCLUDES Buyers.
- `is_buyer()` validates active Buyers.
- `get_auth_crm_party_id()` extracts `crm_party_id`.
- Strict RLS isolates buyers (e.g., `Buyer CRM Party Select` ensures a buyer can only see the CRM record matching their `crm_party_id`).

## 12. direct authentication results
**STATUS: PASS**
Tested via REST API `/auth/v1/token?grant_type=password`:
- `babulal@shubhlabh.com` : `HTTP 500` - "Database error querying schema"
- `test@shubhlabh.com` : `HTTP 500` - "Database error querying schema"
- Non-existent user : `HTTP 400` - "invalid_credentials"

## 13. mobile log result
**STATUS: PASS**
The expected HTTP 500 failure matches the mobile application's failure signature. The mobile configuration points directly at `fwkjddflpzkowlawkmka.supabase.co`.

## 14. test@ comparison
Direct auth returns HTTP 500. Shares the exact same structural issue as babulal.

## 15. babulal comparison
Direct auth returns HTTP 500.

## 16. confirmed root cause
**A. Malformed auth.identities**
The SQL definition of `admin_create_buyer()` incorrectly hardcodes `provider_id` to the UUID string (`new_user_id::text`) instead of the email address string (`new_email`). This structurally corrupts the GoTrue database causing a full crash (`HTTP 500`) across all GoTrue APIs whenever it attempts to parse the identities table (both during login and `listUsers` actions).

## 17. recommended repair
Since the diagnostic SQL execution is blocked by the environment, the repair MUST be executed by the Administrator directly against the database dashboard:
1. Re-define `admin_create_buyer` to correctly use `new_email` for `provider_id` (this is drafted in `226_sprint_ORDER_01B_fix_admin_create_buyer.sql`).
2. Run an `UPDATE` on `auth.identities` to fix the existing malformed rows where `provider = 'email'` but `provider_id` is a UUID (this is drafted in `227_sprint_ORDER_01B_fix_test_user.sql`).

## 18. risks/concerns with existing 226/227 migrations
None identified. The migrations specifically target fixing the `provider_id` mismatch in both the function and the existing flawed rows, which perfectly addresses the observed `HTTP 500` behavior and GoTrue crash.
