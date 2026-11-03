# SEC-EXPOSURE-01 — Public Credential Incident Remediation

**Date:** 2026-10-24
**Severity:** Critical — production database credentials publicly exposed
**Status:** Source cleanup done locally (uncommitted). **Rotation, log review and history cleanup BLOCKED pending the project owner.** The incident is **not resolved** until credentials are rotated.

This report contains **no secret values**. Detection and replacement were done by a script that prints only file paths, line numbers, categories and counts.

---

## 1. Exposure summary

| Fact | Evidence | Status |
|---|---|---|
| GitHub repo `Nileshmnit08/ShubhlabhCRM` is publicly readable | Anonymous `git -c credential.helper= ls-remote` succeeded, prompts disabled | VERIFIED |
| Secrets present in history since | First commit adding a service_role key: `03d9640` (2026-10-06) | VERIFIED |
| Branches carrying the secrets in history | `main`, `localWork`, `feature/fa-attendance-01` (local); `origin/main`, `origin/localWork` (public) | VERIFIED |
| Whether each credential is still active | Requires the Supabase dashboard; not checked, and exposed credentials were **not** used to test | BLOCKED |

### Inventory (tracked files, before cleanup)
| Category | Occurrences | Files |
|---|---|---|
| Supabase **service_role** JWT | 22 | `app/check_customer_tables.cjs`, `app/diagnostic.mjs`, `app/insert_new_materials.cjs`, `app/query_sessions.cjs`, `app/run_migration.cjs`, `app/run_migration2.cjs`, `app/test_buyer.cjs`, `app/test_crash.cjs`, `app/test_cumulative.cjs`, `app/test_desc.cjs`, `app/test_expense.cjs`, `app/test_func.cjs`, `app/test_locs.cjs`, `app/test_mismatch.cjs`, `app/test_publish_price.cjs`, `app/test_rpc.cjs`, `app/test_rpc_names.cjs`, `app/test_segs.cjs`, `app/test_supa_err.cjs`, `app/test_table_exists.cjs`, `app/test_tables.cjs`, `app/test_unified.cjs` |
| **Production** Postgres URL with password | 9 | `app/apply_fix.cjs`, `app/apply_migration_pg.cjs`, `app/test_apply_ddl.cjs`, `app/test_pg_schema.cjs`, `app/test_pg_sql.cjs`, `audit_crm.js`, `audit_products.js`, `check_schema.js`, `mobileFieldStaff/check.js` (hosts: `db.fwkjddflpzkowlawkmka.supabase.co`, `aws-0-ap-south-1.pooler.supabase.com`) |
| Local Postgres URL with password | 1 | `docs/SL-REWARD-LOCAL-STAGING-BOOTSTRAP-01-REPORT.md` (`127.0.0.1`) |
| Literal login passwords | 45 in 40 files | diagnostic/test scripts in `app/`, `app/scripts/`, `mobileFieldStaff/`, `shubhlabh-order/`, root `test_buyer_rls.js` |
| Supabase **anon** key | 41 files | Public by design; becomes stale if the JWT secret is rotated |
| Tracked `.env` files | 0 | — |

### Accounts referenced in files that contained passwords (reset/review these)
Real-looking accounts: **`admin@shubhlabh.com` (highest priority)**, `test@shubhlabh.com`, `babulal@shubhlabh.com`, `nitesh@shubhlabh.com`, `vishnu@shubhlabh.com`, `nilesh@shubhlabh.com`, `pradeep@shubhlabh.com`, `buyer_a@test.com`, `buyer_b@test.com`, `staff@test.com`, `test@test.com`, `admin@shubhlabh.local`.
Apparently test/non-existent: `diagnosetest_xyz_delete@shubhlabh.local`, `sl_diagnose_xyz_99@gmail.com`, `fakeuser12345@`, `nonexistent_xyz_999@`, `random12345@`, `test_nonexistent_check@nowhere.invalid`.
(Association = email appears in a file that held a password literal; the exact pairing was not inspected to avoid reading secrets.)

---

## 2. Dependency checklist

| Credential | Used by production apps/deployments? | Where it must be updated after rotation |
|---|---|---|
| service_role key | **No app uses it.** Supabase Edge Functions read `SUPABASE_SERVICE_ROLE_KEY` (platform-provided) | Verify Edge Functions (`notify-incoming-call`, `whatsapp-webhook`, `whatsapp-notifier`) still work after rotation; local scripts via env var `SUPABASE_SERVICE_ROLE_KEY` (untracked) |
| Database password | **No app uses it** | Local scripts via env var `DATABASE_URL` (untracked) |
| anon key (changes too if the legacy JWT secret is regenerated) | **Yes, all clients** | `app/.env` `VITE_SUPABASE_ANON_KEY`; **Vercel** project env `VITE_SUPABASE_ANON_KEY`; hardcoded fallback in `app/src/lib/supabase.js:5`; `mobileFieldStaff/.env`, `mobile/.env`, `shubhlabh-order/.env` `EXPO_PUBLIC_SUPABASE_ANON_KEY`; **GitHub Actions secret** `EXPO_PUBLIC_SUPABASE_ANON_KEY`; **rebuild and reinstall** Field Assist and Buyer APKs (installed apps keep the old key and stop working) |
| Test-account passwords | Accounts listed in §1 | Supabase Auth → Users (reset), then local env vars `CRM_TEST_PASSWORD`, `FIELD_STAFF_TEST_PASSWORD`, `BUYER_TEST_PASSWORD` for the scripts |

---

## 3. Actions and status

### Phase 1 — Inventory and containment plan
| Action | Status |
|---|---|
| Inventory of tracked secrets (by location only) | **PASS** |
| Deployment dependency checklist | **PASS** (§2) |
| Confirm which credentials are still active | **BLOCKED** — needs Supabase dashboard |

### Phase 2 — Owner-led rotation (agent cannot perform)
| # | Action (owner) | Status |
|---|---|---|
| 0 | **Immediate containment:** GitHub → repo **Settings → General → Danger Zone → Change visibility → Private** (stops new anonymous access; does not undo past exposure) | BLOCKED (owner) |
| 1 | Supabase → **Project Settings → API keys**: rotate the service_role credential. Confirm the key type first: legacy JWT keys require regenerating the JWT secret (rotates anon too, so plan §2 updates and APK rebuilds in the same window); if the newer publishable/secret keys are available, create new keys, move clients to the publishable key, then disable the legacy keys | BLOCKED (owner) |
| 2 | Supabase → **Project Settings → Database → Reset database password** | BLOCKED (owner) |
| 3 | Supabase → **Authentication → Users**: reset passwords for the §1 accounts; confirm `admin@shubhlabh.com` and other admins are expected; remove leftover test accounts | BLOCKED (owner) |
| 4 | Update Vercel env, GitHub Actions secrets and local `.env` files with the new anon key via their own UIs (never in code or chat) | BLOCKED (depends on 1) |

### Phase 3 — Remove exposure from current source
| Action | Status |
|---|---|
| Replace all 77 literals with env references: `process.env.SUPABASE_SERVICE_ROLE_KEY` ×22, `process.env.DATABASE_URL` ×9, `process.env.CRM_TEST_PASSWORD` ×21, `process.env.FIELD_STAFF_TEST_PASSWORD` ×14, `process.env.BUYER_TEST_PASSWORD` ×10; doc URL masked as `<DB_PASSWORD>` ×1 | **PASS** (71 files, 77 lines; uncommitted) |
| Syntax check of the 70 modified scripts (`node --check`) | **PASS** (0 failures) |
| Re-scan of tracked files | **PASS** — only remaining hit is the masked doc placeholder |
| Shipped application source changed | None (0 files under any `src/`) |
| Known side effect | Scripts now need the env vars set; `shubhlabh-order/test_login_wrong.js` and similar "wrong password" tests now read the env var and must be adjusted if reused |
| Commit/push of the cleanup | **NOT DONE** — awaiting owner decision |
| Git history cleanup | **NOT APPROVED** — plan below |

**History cleanup plan (requires explicit approval; do only after rotation):**
1. Freeze pushes; tell all collaborators.
2. On a fresh mirror clone, run `git filter-repo --replace-text <local-replacements-file>` (file kept outside the repo, never committed) over all refs.
3. Verify with the scanner that no secret remains in any commit.
4. Force-push `main` and `localWork` (and any other remote branches); delete stale remote branches.
5. All collaborators re-clone; delete old local clones, including `feature/fa-attendance-01`.
6. Ask GitHub Support to purge cached views and pull-request refs. Forks and existing clones cannot be recalled, which is why rotation is the real fix.

### Phase 4 — Incident review
| Action | Status |
|---|---|
| Review Supabase logs from 2026-10-06 | **BLOCKED** — needs dashboard |

Owner steps (Supabase → **Logs & Analytics**):
- **API / Edge logs:** requests authenticated with the service role from unfamiliar IPs or user agents; bulk reads (`select=*` on `crm_parties`, `app_users`, `tally_transactions`, `requirements`), deletes or updates.
- **Postgres logs:** connections as `postgres` from unexpected IPs; DDL (`CREATE TABLE`, `ALTER`, `DROP`, `CREATE POLICY`), including the unexplained creation of `staff_attendance` / `staff_leave_requests`.
- **Auth logs:** sign-ins to the §1 accounts, especially `admin@shubhlabh.com`, from unknown locations.
Classify findings as *confirmed unauthorized*, *unexplained*, or *explained*. If anything is confirmed: export data-change evidence, restore from backup if needed, and treat customer data as compromised (notification obligations may apply).

### Phase 5 — Validation
| Action | Status |
|---|---|
| Attendance unit tests | **PASS** (17/17) |
| Offline-queue tests | **PASS** (13/13) |
| Apps authenticate with replacement credentials | **NOT TESTED** — no rotation yet |
| No exposed credentials in current tracked source (working tree) | **PASS** locally; **FAIL** on GitHub until the cleanup is committed and pushed |
| Historical Git objects still contain secrets | **YES** — cleanup not approved |

---

## 4. Remaining risks
- Until rotation, anyone who copied the repository has full database access (service_role, DB password) and admin CRM access (`admin@shubhlabh.com` password).
- Attendance schema verification stays **BLOCKED** until rotation is done and authorized read-only access is available.
