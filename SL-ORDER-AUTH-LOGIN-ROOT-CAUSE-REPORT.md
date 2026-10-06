# SL-ORDER-AUTH-LOGIN-ROOT-CAUSE-REPORT.md

## Sprint: SL-ORDER-AUTH-LOGIN-ROOT-CAUSE
## Date: 2026-10-06
## Status: ❌ BLOCKED — Fix SQL created, awaiting deployment

---

## 1. Physical Device

- **Device Serial:** e0d9da95 (status: `device`)
- **Confirmed Connected:** YES — `adb devices` returned `e0d9da95 device`

---

## 2. APK / Build

- **Package:** `com.shubhlabh.order`
- **Build type:** Release
- **Metro:** OFF (release APK does not use Metro)
- **adb reverse:** NOT used

---

## 3. Login Screen Result

- **Login screen displayed:** YES — Login ID + Password fields present
- **Entered credentials:** `babulal@shubhlabh.com` + [password]
- **Result:** App displays alert: `"Error" / "Abhi login nahi ho pa raha."`

---

## 4. Authentication Request Path (Traced)

```
LoginScreen.js
  → handleLogin()
  → supabase.auth.signInWithPassword({ email, password })
  → @supabase/supabase-js client
  → POST https://fwkjddflpzkowlawkmka.supabase.co/auth/v1/token?grant_type=password
  → Supabase GoTrue Auth Server
  → Looks up auth.users by email
  → Looks up auth.identities by user_id + provider
  ← HTTP 500: "Database error querying schema"
```

---

## 5. Exact Root Cause

**Classification: F — Malformed Auth User Record**

The account `babulal@shubhlabh.com` **exists** in `auth.users`, but the corresponding `auth.identities` row is **malformed**.

### Evidence

| Test | HTTP Status | Response |
|------|-------------|----------|
| `babulal@shubhlabh.com` + correct password | **500** | `Database error querying schema` |
| Nonexistent user login | **400** | `invalid_credentials` (normal) |
| Fresh signup user login | **400** | `email_not_confirmed` (normal) |

A `400` for a missing user is correct. A `500` means the user EXISTS but causes a database crash on lookup — confirming a **malformed row**.

### Root Cause Detail

`admin_create_buyer()` in `224_sprint_ORDER_01A_buyer_security.sql` inserts into `auth.identities` with:

```sql
-- WRONG (causes 500 on login)
INSERT INTO auth.identities (
    id, user_id,
    provider_id,           -- ← SET TO UUID (new_user_id::text)
    identity_data,
    provider, ...
) VALUES (
    new_user_id, new_user_id,
    new_user_id::text,     -- ← BUG: GoTrue v2 expects EMAIL here for email provider
    ...
);
```

**Supabase GoTrue v2 requires** for the email provider:

```sql
provider_id = 'babulal@shubhlabh.com'  -- the email address
```

When GoTrue tries to authenticate by looking up `auth.identities WHERE provider_id = email`, it finds a UUID instead of an email and crashes with a schema/constraint violation → HTTP 500.

---

## 6. Supabase Auth Status

| Field | Status |
|-------|--------|
| Auth user exists | **YES** (HTTP 500 proves it exists) |
| Auth user email | `babulal@shubhlabh.com` |
| Auth account disabled/banned | NO (would return 400, not 500) |
| email_confirmed_at | Set by admin_create_buyer (correct) |
| auth.identities.provider_id | **WRONG** — UUID instead of email |

---

## 7. app_users Status

- Could not verify directly (requires Admin session to read)
- Migration `224` `admin_create_buyer()` relies on `handle_new_user` trigger to auto-create the `app_users` row on `auth.users` INSERT, then UPDATEs it with `role = 'Buyer'` and `crm_party_id`
- Fix migration `226` includes a verification step that reports/fixes `app_users` status

---

## 8. Buyer Role Status

- Cannot be confirmed until login works
- Expected: `role = 'Buyer'`, `is_active = true`, `crm_party_id = [babulal's party UUID]`

---

## 9. crm_party_id Status

- Cannot be confirmed until login works
- Must be set to the correct `crm_parties.id` for Babulal's customer record

---

## 10. RLS Result

- RLS is functioning: anon reads of `app_users` return 0 rows ✓
- `is_buyer()`, `get_auth_crm_party_id()` functions deployed ✓
- Cannot test Buyer RLS until login succeeds

---

## 11. Files Inspected

| File | Purpose |
|------|---------|
| `shubhlabh-order/src/features/auth/LoginScreen.js` | Login UI + `signInWithPassword` call |
| `shubhlabh-order/src/features/auth/AuthContext.js` | Session management, `fetchBuyerData()` |
| `shubhlabh-order/src/core/api/supabase.js` | Supabase client (URL from `.env`) |
| `shubhlabh-order/src/core/config/env.js` | Env config |
| `shubhlabh-order/app.json` | No `extra` env — confirmed `.env` file used |
| `shubhlabh-order/.env` | Supabase URL + anon key confirmed correct |
| `224_sprint_ORDER_01A_buyer_security.sql` | Contains the buggy `admin_create_buyer()` |
| `08_sprint_8_fixes_schema.sql` | `handle_new_user` trigger definition |

---

## 12. Exact Fix

### File Created

**`226_sprint_ORDER_01B_fix_admin_create_buyer.sql`**

### Changes

**Step 1 — Fix `admin_create_buyer()` for all future accounts:**
```sql
-- BEFORE (BUG):
provider_id = new_user_id::text   -- UUID string ← causes HTTP 500 on login

-- AFTER (FIX):
provider_id = new_email           -- email address ← correct for GoTrue v2
```

Also added:
- Duplicate email check (prevents creating duplicate accounts)
- Duplicate customer check (prevents double-provisioning)
- Fallback `INSERT INTO app_users` if trigger doesn't fire

**Step 2 — Remediate existing babulal account:**
```sql
UPDATE auth.identities
SET provider_id = 'babulal@shubhlabh.com',    -- fix the malformed UUID
    identity_data = jsonb_build_object('sub', user_id::text, 'email', 'babulal@shubhlabh.com'),
    updated_at = now()
WHERE user_id = [babulal_user_id] AND provider = 'email';
```

**Step 3 — Verify/create app_users record:**
Checks `app_users` for the Babulal account and creates it if missing.

---

## 13. Release Build Result

> **PENDING** — fix migration must be applied to Supabase first.
> After migration is applied, a new release APK build and physical test will confirm.

---

## 14. Physical Login Result

> **PENDING** — blocked by the malformed `auth.identities` row.
> Once `226_sprint_ORDER_01B_fix_admin_create_buyer.sql` is applied, retry login.

---

## 15. Post-Login Result

> **PENDING**

---

## 16. Customer Isolation Result

> **PENDING**

---

## 17. Remaining Issues / Next Steps

### IMMEDIATE ACTION REQUIRED (by human Admin)

**Apply this SQL migration in the Supabase Dashboard:**

```
D:\ShubhLabhCRM\226_sprint_ORDER_01B_fix_admin_create_buyer.sql
```

Go to:  
`https://supabase.com/dashboard → SQL Editor → New query → paste the file → Run`

### After Migration Applied

1. Re-test login: `babulal@shubhlabh.com` + password
2. If login succeeds → verify `crm_party_id` is mapped correctly
3. If `crm_party_id` is NULL → use the CRM **App Access** tab to re-provision (or update directly via dashboard)
4. Run release build and physical device test
5. Verify post-login screens (Home, Products, Orders, Profile)
6. Verify customer data isolation

### Code Change Status

| File | Status |
|------|--------|
| `226_sprint_ORDER_01B_fix_admin_create_buyer.sql` | ✅ Created — ready to apply |
| `LoginScreen.js` | ✅ No change needed — code is correct |
| `AuthContext.js` | ✅ No change needed — code is correct |
| `supabase.js` | ✅ No change needed — URL/key correct |
| `224_sprint_ORDER_01A_buyer_security.sql` | Source SQL only — deployed version fixed by migration 226 |

---

## Overall Result

### ❌ BLOCKED — Database Fix Required

The mobile app login code is **correct**. The Supabase configuration is **correct**. The authentication failure is caused by a **malformed `auth.identities` row** created by the `admin_create_buyer()` function using an incorrect `provider_id` format for Supabase GoTrue v2.

**Required action:** Apply `226_sprint_ORDER_01B_fix_admin_create_buyer.sql` in the Supabase Dashboard.

No code changes to the mobile app are required.
