# SL-CRM-ATTENDANCE-DB-AUDIT-02 — Authorized Live Schema Verification

**Date:** 2026-10-24
**Status:** **BLOCKED — waiting for the project owner's Query 1 output.** Credential exposure assessment complete (**critical**).
**Changes made:** none to the database, application code or Git history. This report is the only new file.

---

## 1. Pre-checks

| Check | Result |
|---|---|
| Supabase project reference used by all clients | **PASS** — `mobileFieldStaff/.env`, `shubhlabh-order/.env`, `mobile/.env`, `app/.env` and the fallback in `app/src/lib/supabase.js` all point to project ref `fwkjddflpzkowlawkmka` (public URL host only; no keys read or printed) |
| Query 1 in `SL-CRM-ATTENDANCE-DB-AUDIT-01-REPORT.md` §8 is read-only | **PASS** — single `WITH … SELECT … UNION ALL` statement; no INSERT/UPDATE/DELETE/MERGE/CREATE/ALTER/DROP/TRUNCATE/GRANT/REVOKE/COPY/DO/SET/LOCK/NOTIFY; functions used: `pg_get_constraintdef`, `pg_get_functiondef`, `array_to_string`, `string_agg`, `lpad`, `COALESCE` (catalog/format functions only) |
| Authenticated Supabase dashboard session available to the agent | **NO** — the agent has no dashboard login, CLI or `psql`; anon access returns `401`/`42501` |
| Query 1 output supplied | **NO** — no CSV export found; none provided |

---

## 2. Live schema verification

| Risk / item (from AUDIT-01 §4) | Status |
|---|---|
| `staff_attendance` and `staff_leave_requests` exist | **PASS** (anon probe returns `42501`, not `PGRST205`) |
| Required columns and data types | **BLOCKED** |
| UNIQUE `(staff_id, business_date)` (required by the app's upsert) | **BLOCKED** |
| Foreign keys to `app_users(id)`; status CHECK values | **BLOCKED** |
| `fa_attendance_enforce` trigger incl. FA-02 "skip when row exists" fix; first check-in/check-out wins | **BLOCKED** |
| `fa_leave_enforce` trigger; leave overlap; self-review prevention | **BLOCKED** |
| RLS enabled; staff-own / admin policies; Buyer exclusion; no DELETE | **BLOCKED** |
| Grants: anon none; authenticated SELECT/INSERT/UPDATE only (no TRUNCATE/DELETE) | anon refused **PASS**; remainder **BLOCKED** |
| Attendance location columns | **BLOCKED** (live). Proposal has none and the app writes none (verified in AUDIT-01) |
| Provenance of the live tables | **UNKNOWN** |
| Corrective SQL proposal | **NOT PREPARED** — no verified discrepancy yet |

---

## 3. Credential exposure assessment — CRITICAL

Detection was by pattern and file name only. **No secret value was read into the report, decoded, printed, tested or used.**

### 3.1 Repository visibility
`git -c credential.helper= ls-remote https://github.com/Nileshmnit08/ShubhlabhCRM` with terminal prompts disabled **succeeded anonymously** (exit 0, returned `refs/heads/main`). **The repository is publicly readable.** Every credential below is therefore exposed to anyone on the internet, and remains in Git history even if the files are deleted.

### 3.2 Findings

| # | Credential type | Tracked files | On `origin/main` | Impact if valid |
|---|---|---|---|---|
| C1 | Supabase **service_role** JWT (detected by the base64 fragment of `"service_role"`) | 22: `app/check_customer_tables.cjs`, `app/diagnostic.mjs`, `app/insert_new_materials.cjs`, `app/query_sessions.cjs`, `app/run_migration.cjs`, `app/run_migration2.cjs`, `app/test_buyer.cjs`, `app/test_crash.cjs`, `app/test_cumulative.cjs`, `app/test_desc.cjs`, `app/test_expense.cjs`, `app/test_func.cjs`, `app/test_locs.cjs`, `app/test_mismatch.cjs`, `app/test_publish_price.cjs`, `app/test_rpc.cjs`, `app/test_rpc_names.cjs`, `app/test_segs.cjs`, `app/test_supa_err.cjs`, `app/test_table_exists.cjs`, `app/test_tables.cjs`, `app/test_unified.cjs` | **22/22**; earliest commit `03d9640` (2026-10-06) | Full read/write of every table, bypassing all RLS, including attendance, customers, buyers, finance |
| C2 | Postgres connection string with password, **production** | 9: `app/apply_fix.cjs`, `app/test_apply_ddl.cjs`, `app/test_pg_sql.cjs`, `mobileFieldStaff/check.js` (host `db.fwkjddflpzkowlawkmka.supabase.co`); `app/apply_migration_pg.cjs`, `app/test_pg_schema.cjs`, `audit_crm.js`, `audit_products.js`, `check_schema.js` (host `aws-0-ap-south-1.pooler.supabase.com`) | yes | Direct superuser-level DB access: DDL, data export, deletion |
| C3 | Postgres connection string, local only | 1: `docs/SL-REWARD-LOCAL-STAGING-BOOTSTRAP-01-REPORT.md` (host `127.0.0.1`) | yes | Low (local development database) |
| C4 | Literal CRM login passwords typed by test scripts | 6: `app/scripts/test-cms-release-prep.cjs`, `app/scripts/test-cms-supabase-migration.cjs`, `app/scripts/test_crm_leads_inbox_sprint.cjs`, `app/scripts/test_live_login.cjs`, `app/scripts/verify_admin_login.cjs`, `app/test_ui_crash.cjs` | yes | Takeover of those CRM accounts (names suggest an admin account) |
| — | Tracked `.env` files | 0 | — | — |
| — | Supabase **anon** key (in `app/src/lib/supabase.js` and built apps) | — | yes | Public by design; safe only if RLS is correct |

### 3.3 Required owner-led actions (do in this order)
1. **Rotate the Supabase service_role key** (Supabase dashboard → Project Settings → API keys). For legacy JWT keys this means regenerating the JWT secret, which **also changes the anon key**: update `.env` files, Vercel environment variables, the GitHub Actions secrets `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`, and rebuild the mobile apps. If the project offers the newer publishable/secret API keys, migrating to them and disabling the legacy keys is the alternative.
2. **Reset the database password** (Project Settings → Database). Update any local, untracked config that uses it.
3. **Change the passwords** of the CRM accounts used in the C4 scripts.
4. **Review the logs** (Supabase API/Postgres logs) since 2026-10-06 for unexpected service_role or direct-connection activity. This may also explain the unknown origin of the attendance tables.
5. Afterwards, separately approved: replace hardcoded values in the scripts with environment variables, and consider purging history (needs a force-push and coordination; rotation is what actually removes the risk).

The agent did not rotate, test or revoke anything. These require the project owner.

---

## 4. Manual steps to unblock the live verification

1. Open **https://supabase.com/dashboard**, sign in as the project owner, and select project **`fwkjddflpzkowlawkmka`**.
2. Left sidebar → **SQL Editor** → **New query**.
3. Paste **Query 1** exactly from `mobileFieldStaff/docs/SL-CRM-ATTENDANCE-DB-AUDIT-01-REPORT.md` §8 and click **Run**. It is read-only and returns definitions, not employee data.
4. In the results panel, use **Export → CSV** (or copy the results).
5. Save the file, e.g. to `C:\Users\dell\Downloads\attendance_schema.csv`, and give the agent the path (or paste the output).
6. Optional: run **Query 2** (migration history) and check **SQL Editor → History** for the statement that created `staff_attendance`.
