# SL-ORDER-AUTH-REPAIR-02-REPORT

## 1. Sprint-20 repair identified
- **FILE:** `20_sprint_20_auth_schema_fix.sql`
- **FUNCTION/MIGRATION:** Sprint 20 Fix GoTrue "Database error querying schema"
- **DATE/SPRINT:** Sprint 20
- **PURPOSE:** Resolved HTTP 500 crashes caused by manually inserted `auth.users` rows lacking empty strings (`''`) for specific token columns. GoTrue requires these columns to be non-NULL.

## 2. Working user structure
A known working user from the Field Assist application (created during Sprint 15) possesses:
- **confirmation_token:** `''` (Repaired in Sprint 20)
- **recovery_token:** `''` (Repaired in Sprint 20)
- **email_change_token_new:** `''` (Repaired in Sprint 20)
- **email_change:** `''` (Repaired in Sprint 20)
- **auth.identities.provider_id:** `UUID` string (`new_user_id::text`)

## 3. Broken user structure
`test@shubhlabh.com` (created after Sprint 20 via `admin_create_buyer`) possesses:
- **confirmation_token:** `NULL`
- **recovery_token:** `NULL`
- **email_change_token_new:** `NULL`
- **email_change:** `NULL`
- **auth.identities.provider_id:** `UUID` string (`new_user_id::text`)

## 4. Exact differences

| Field | Working User | test@shubhlabh.com | Difference |
|------|--------------|--------------------|------------|
| confirmation_token | `''` | `NULL` | Broken (Causes HTTP 500) |
| recovery_token | `''` | `NULL` | Broken (Causes HTTP 500) |
| email_change_token_new | `''` | `NULL` | Broken (Causes HTTP 500) |
| email_change | `''` | `NULL` | Broken (Causes HTTP 500) |
| provider_id (auth.identities) | UUID String | UUID String | **NONE (Valid)** |
| identity_data | `sub`: UUID, `email`: email | `sub`: UUID, `email`: email | **NONE** |
| provider | `'email'` | `'email'` | **NONE** |

## 5. 226 analysis
**Does 226 repair:**
- provider_id: YES (But changes it unnecessarily from UUID to email, deviating from Field Assist norm)
- identity_data: YES
- email confirmation: YES
- confirmation token state: YES (Included `''`)
- recovery token state: YES (Included `''`)
- email-change token state: YES (Included `''`)

## 6. 227 analysis
**Does 227 repair the same required fields?**
YES. However, `227` also unnecessarily updates `provider_id` to the email string format. While acceptable to GoTrue, it is NOT the cause of the crash (as proven by Field Assist working users) and deviates from the original Sprint 15/20 data patterns.

## 7. admin_create_buyer analysis
**CAN CURRENT admin_create_buyer CREATE THE SAME CORRUPTION AGAIN?**
**YES.**
**Evidence:** The current function definition (in `224_sprint_ORDER_01A_buyer_security.sql`) executes an `INSERT INTO auth.users` that completely omits the four critical token columns, causing Postgres to default them to `NULL`. Any new Buyer created today will instantly experience the exact same HTTP 500 crash.

## 8. Proposed repair
A safe repair script has been generated:
[SL-ORDER-AUTH-REPAIR-02-PROPOSED.sql](file:///D:/ShubhLabhCRM/SL-ORDER-AUTH-REPAIR-02-PROPOSED.sql)
It targets exclusively the missing token columns for Buyer accounts, preserving all UUIDs, mapped identities, passwords, and aligning perfectly with the proven Sprint 20 pattern.

## 9. Future-account protection
A future-protection script has been generated to overwrite the broken `admin_create_buyer` function:
[SL-ORDER-AUTH-REPAIR-02-FUTURE-PROTECTION.sql](file:///D:/ShubhLabhCRM/SL-ORDER-AUTH-REPAIR-02-FUTURE-PROTECTION.sql)
It safely integrates the empty strings (`''`) into the `INSERT` clause.

## 10. Security impact
- No encrypted passwords changed.
- No user UUIDs recreated.
- No RLS bypass required beyond normal RPC execution.
- No unrelated application configurations or users touched.

## 11. Execution instructions for human administrator
1. Log into the Supabase Dashboard SQL Editor for `fwkjddflpzkowlawkmka`.
2. Review and execute `SL-ORDER-AUTH-REPAIR-02-PROPOSED.sql`.
3. Review and execute `SL-ORDER-AUTH-REPAIR-02-FUTURE-PROTECTION.sql`.
4. Ignore `226_sprint` and `227_sprint` as they unnecessarily modify `auth.identities`.

**STATUS:** READY FOR HUMAN DATABASE REVIEW
