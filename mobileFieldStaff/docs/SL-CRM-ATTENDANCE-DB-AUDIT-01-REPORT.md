# SL-CRM-ATTENDANCE-DB-AUDIT-01 — Live Attendance Schema Verification

**Date:** 2026-10-24
**Type:** Read-only audit. No SQL executed against the database, no attendance or leave records read or written, no application code changed.
**Overall status:** **BLOCKED — live schema metadata not accessible with authorized tooling.** Repository audit complete.

---

## 0. Access attempted and limitations

| Access path | Result |
|---|---|
| Public anon key (app's `.env`), `GET /rest/v1/staff_attendance?select=id&limit=1` | HTTP 401, `42501` permission denied → the table **exists** and anon is refused |
| Same for `staff_leave_requests` | HTTP 401, `42501` → **exists**, anon refused |
| PostgREST OpenAPI schema (`GET /rest/v1/`) with anon key | HTTP 401 → column metadata not available to anon |
| Supabase CLI / `psql` / GitHub CLI | Not installed |
| Signed-in admin or staff session | Not available to the audit |
| Committed service-role key / DB password in repo | **Deliberately not used** (leaked credentials; see Phase 0 audit P0 findings) |

Before FA-ATTENDANCE-02 (same day), both tables returned `404 PGRST205` (missing). They were created between then and this audit. **Who created them and with which SQL is unknown.** No tracked migration or commit creates them.

**Minimum authorized access needed:** the project owner runs the read-only query in §8 in the Supabase dashboard **SQL Editor** and shares the result (CSV export or pasted text). It returns definitions only, no employee data.

---

## 1. Repository schema (tracked files)

The **only** tracked SQL defining these tables is the proposal. No file under `supabase/migrations/` or the root migration series mentions attendance or leave.

File: `supabase/proposals/242_sprint_FA_ATTENDANCE_01.sql` (marked *PROPOSED — NOT APPLIED*). Rollback: `supabase/proposals/242_rollback_sprint_FA_ATTENDANCE_01.sql`.

### `staff_attendance` (lines 34–61)
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK, default `gen_random_uuid()` | L35 |
| `staff_id` | uuid NOT NULL → `app_users(id)` ON DELETE RESTRICT | L36 |
| `business_date` | date NOT NULL | set server-side from `check_in_at` in Asia/Kolkata (L120) |
| `check_in_at` | timestamptz NOT NULL | device time |
| `check_out_at` | timestamptz NULL | |
| `status` | text NOT NULL default `'CHECKED_IN'` | CHECK `CHECKED_IN`/`CHECKED_OUT` (L45) |
| `check_in_server_received_at`, `check_out_server_received_at` | timestamptz | server receipt times |
| `created_at`, `updated_at` | timestamptz | |

Constraints: check-out after check-in (L47); status ⇔ `check_out_at` consistency (L49); **UNIQUE `(staff_id, business_date)`** `staff_attendance_staff_date_key` (L52). Index `idx_staff_attendance_staff_date` (L60).

Trigger `trg_fa_attendance_enforce` → `fa_attendance_enforce()` (L109–193), BEFORE INSERT OR UPDATE:
- INSERT: derives `business_date`; **skips insert-only validation when the day's row already exists** (FA-ATTENDANCE-02 fix, L124–134); 72 h / +5 min window (L137); blocks check-in on approved leave (L144).
- UPDATE: first check-in and first check-out win (immutable id/staff/date/check-in; existing check-out kept).
- Validation errors use `ERRCODE 23514` (permanent in the app's queue).

### `staff_leave_requests` (lines 69–101)
Columns: `id` uuid PK (client-generated idempotency key), `staff_id` → `app_users`, `leave_type` CHECK `CASUAL`/`SICK`/`OTHER` (L82), `start_date`, `end_date` (CHECK order L86, span ≤ 30 L88), `reason` (5–500 chars L90), `status` CHECK `Pending`/`Approved`/`Rejected` (L84), `reviewed_by` → `app_users` ON DELETE SET NULL, `reviewed_at`, `review_note`, `created_at`, `updated_at`. CHECK no self-review (L93); Pending ⇒ unreviewed (L96). Index `idx_staff_leave_staff_dates` (L100).

Trigger `trg_fa_leave_enforce` → `fa_leave_enforce()` (L199–257): new rows forced to `Pending`; per-staff advisory lock (L216) and overlap check against Pending/Approved (L226); on review the request fields are immutable, re-review blocked, `reviewed_by := auth.uid()`.

### RLS and grants (lines 265–327)
| Policy | Table | Command | Rule |
|---|---|---|---|
| Staff can view own attendance (L279) | attendance | SELECT | `staff_id = auth.uid() AND is_active_user()` |
| Staff can check in for themselves (L283) | attendance | INSERT | same (WITH CHECK) |
| Staff can check out own attendance (L287) | attendance | UPDATE | same (USING + WITH CHECK) |
| Admins can view all attendance (L293) | attendance | SELECT | `is_admin()` |
| Staff can view own leave requests (L298) | leave | SELECT | own + `is_active_user()` |
| Staff can apply for own leave (L302) | leave | INSERT | own, `status='Pending'`, `reviewed_by IS NULL` |
| Admins can view all leave requests (L312) | leave | SELECT | `is_admin()` |
| Admins can review others leave requests (L316) | leave | UPDATE | `is_admin() AND staff_id <> auth.uid()` |

Grants: SELECT/INSERT/UPDATE to `authenticated` (L321–322); ALL revoked from `anon` (L323–324); DELETE/TRUNCATE/REFERENCES/TRIGGER revoked from `authenticated` (L326–327). No DELETE policies.

Role model: `is_active_user()` = active and not `Buyer` (migration `224`); `is_admin()` = active `Admin` (migration `08_sprint_8_fixes_schema.sql`). No other manager role exists in SQL.

---

## 2. Field Assist implementation (what the app requires)

| Operation | Code | Requirement on the live schema |
|---|---|---|
| Availability probe | `src/services/AttendanceService.js:77-81` — `select('id').eq('staff_id', uid).limit(1)` (GET) | table + `id`, `staff_id`; SELECT allowed for staff |
| Today's record | `AttendanceService.js:97-102` — `select('*')` by `staff_id`, `business_date`, `maybeSingle()` | ≤ 1 row per staff/date |
| History | `AttendanceService.js:117-122` — order by `business_date` | `business_date` column |
| Check-in | `AttendanceService.js:234` — queued **upsert**, `onConflict: 'staff_id,business_date'`; payload `src/utils/attendance.js:169-178` `{id, staff_id, business_date, check_in_at, status:'CHECKED_IN'}` | a **unique constraint exactly on `(staff_id, business_date)`**; INSERT + UPDATE + SELECT policies for own rows |
| Check-out | `AttendanceService.js:267` — same upsert; payload `attendance.js:186-201` adds `check_out_at`, `status:'CHECKED_OUT'`, fresh `id` | server must **keep the original `id` and `check_in_at` and the first `check_out_at`** (trigger) |
| Leave list | `AttendanceService.js:107-112` | `start_date`, `status`, `review_note` (read by `LeaveRequestsScreen.js`) |
| Leave apply | `AttendanceService.js:303` — queued **insert** with client `id`; payload `attendance.js:155-165` | `id` accepts client UUID; retry → `23505` treated as success by the queue |
| Status values | `attendance.js:18-22`, `LeaveRequestsScreen.js` | exactly `CASUAL`/`SICK`/`OTHER`; `Pending`/`Approved`/`Rejected` (case-sensitive) |

Offline/sync: writes go through `SyncService` (durable AsyncStorage queue). Committed `SyncService` (on `localWork` `c8409e2`) classifies `23514`, `23503`, `42501`, `22P02` as permanent (FAILED, shown to staff); `23505` as idempotent success. The UI shows "synced" only after re-reading the server row.

Tests: `__tests__/attendance.test.mjs` **17/17 PASS**; `__tests__/sync_recovery.test.js` **13/13 PASS** (run 2026-10-24 during this audit). These test app logic only, not the database.

---

## 3. Differences: repository vs live

**BLOCKED.** No live definitions could be read. Existence of both tables and refusal of anon access are the only verified facts.

---

## 4. Mobile compatibility (to be confirmed against live metadata)

| Risk | What to check in the live schema | Failure if missing | Status |
|---|---|---|---|
| Check-in fails | UNIQUE constraint exactly `(staff_id, business_date)` | upsert error `42P10` → check-in FAILED (visible) | BLOCKED |
| Check-in/out RLS errors | INSERT, UPDATE **and** SELECT policies for own rows; `authenticated` has INSERT/UPDATE/SELECT | `42501` → FAILED | BLOCKED |
| Duplicate check-out overwrites first time | `fa_attendance_enforce` UPDATE branch keeps existing `check_out_at` | later retry/duplicate silently overwrites the first check-out | BLOCKED |
| Check-out rejected after leave approval or >72 h | INSERT branch contains the FA-02 **skip when row exists** block | valid check-outs FAIL | BLOCKED — the pre-FA-02 version of the proposal lacked this |
| Wrong business date | trigger sets `business_date` from `check_in_at AT TIME ZONE 'Asia/Kolkata'` | conflicts on wrong day | BLOCKED |
| Duplicate days | UNIQUE `(staff_id, business_date)` | two records per day; `maybeSingle()` errors | BLOCKED |
| Leave insert fails | `id` uuid without forced default override, CHECK values match app | FAILED | BLOCKED |
| Leave status display | status values capitalized exactly `Pending`/`Approved`/`Rejected` | pending/approved shown wrongly | BLOCKED |
| Self-approval | CHECK `reviewed_by <> staff_id` and admin UPDATE policy excluding own rows | admin could approve own leave | BLOCKED |
| Buyer access | policies use `is_active_user()` (excludes Buyers) | customers could see staff attendance | BLOCKED |

Live attendance transactions were **not** performed.

---

## 5. Location readiness

| Item | Status |
|---|---|
| Location columns in the repository proposal (`check_in_latitude`, `_longitude`, `_accuracy`, capture time; same for check-out) | **None — VERIFIED** (no latitude/longitude/accuracy/location/address in the file) |
| Location captured by Field Assist at check-in/out | **No — VERIFIED.** No `expo-location`, coordinates or position calls in `AttendanceService.js`, `useAttendance.js`, `utils/attendance.js`, or the attendance screens; enforced by the test *"staff-facing attendance UI contains no location, map or GPS code"* |
| Location columns in the live schema | **BLOCKED** (cannot read metadata). Even if present, **no client writes them**, so no attendance location data can exist from the app. |

The CRM attendance map therefore has no data source until location capture is approved and implemented.

---

## 6. Security assessment

| Finding | Status |
|---|---|
| Anonymous access to `staff_attendance` / `staff_leave_requests` refused (`42501`) | **PASS** (verified by probe) |
| RLS enabled, staff-own and admin policies, Buyer exclusion, no DELETE, TRUNCATE revoked | **BLOCKED** (needs §8 output) |
| Leaked service-role key / DB password in tracked scripts (Phase 0 P0) | **Open risk.** If still valid, they bypass every policy above. Rotation recommended before relying on attendance RLS. |
| Provenance of the live tables | **Unknown.** No tracked migration, commit or file timestamp explains the deployment. Check the dashboard SQL Editor history / project logs. |

---

## 7. Recommended next sprint

**SL-CRM-ATTENDANCE-DB-AUDIT-02 — Complete live verification (read-only)**
1. Project owner runs §8 query 1 (and query 2 if available) in the Supabase SQL Editor and shares the CSV.
2. Compare every row with §1 and §4; mark each risk PASS/FAIL.
3. If anything differs, prepare a corrective migration **proposal** (not applied) aligning live with the app contract.

Only after that passes:
- **SL-FA-ATTENDANCE-LOCATION-01** (needs explicit approval of location capture + staff notice/consent): one foreground fix at check-in/out, eight location columns, admin-restricted access.
- **SL-CRM-ATTENDANCE-PORTAL-01**: admin-only attendance register, leave approval (currently missing, so leave requests can only stay Pending), then the location map once data exists. Map provider decision required (OpenStreetMap/Leaflet vs Google Maps key).

---

## 8. Read-only metadata queries (for the project owner)

Run in **Supabase dashboard → SQL Editor**. Both are `SELECT`-only and return definitions, not employee data. Use **Export → CSV** for the result.

### Query 1 — attendance schema metadata
```sql
-- SL-CRM-ATTENDANCE-DB-AUDIT-01 · READ-ONLY · returns metadata only
WITH t AS (
  SELECT c.oid, c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname IN ('staff_attendance', 'staff_leave_requests')
)
SELECT '1_table' AS section, c.relname::text AS object,
       'rls=' || c.relrowsecurity || ' force_rls=' || c.relforcerowsecurity AS detail
FROM pg_class c WHERE c.oid IN (SELECT oid FROM t)
UNION ALL
SELECT '2_column', table_name::text,
       lpad(ordinal_position::text, 2, '0') || ' ' || column_name || ' ' || data_type
       || ' null=' || is_nullable || ' default=' || COALESCE(column_default, '')
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name IN ('staff_attendance', 'staff_leave_requests')
UNION ALL
SELECT '3_constraint', t.relname::text, con.conname || ': ' || pg_get_constraintdef(con.oid)
FROM pg_constraint con JOIN t ON t.oid = con.conrelid
UNION ALL
SELECT '4_index', tablename::text, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename IN ('staff_attendance', 'staff_leave_requests')
UNION ALL
SELECT '5_trigger', t.relname::text, tg.tgname || ' -> ' || p.proname || ' enabled=' || tg.tgenabled
FROM pg_trigger tg JOIN t ON t.oid = tg.tgrelid JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE NOT tg.tgisinternal
UNION ALL
SELECT DISTINCT '6_trigger_fn', p.proname::text, pg_get_functiondef(p.oid)
FROM pg_trigger tg JOIN t ON t.oid = tg.tgrelid JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE NOT tg.tgisinternal
UNION ALL
SELECT '7_policy', tablename::text,
       policyname || ' | ' || cmd || ' | roles=' || array_to_string(roles, ',')
       || ' | permissive=' || permissive || ' | using=' || COALESCE(qual, '')
       || ' | check=' || COALESCE(with_check, '')
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('staff_attendance', 'staff_leave_requests')
UNION ALL
SELECT '8_grant', table_name::text, grantee || ': ' || string_agg(privilege_type, ',' ORDER BY privilege_type)
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name IN ('staff_attendance', 'staff_leave_requests')
  AND grantee IN ('anon', 'authenticated', 'service_role')
GROUP BY table_name, grantee
UNION ALL
SELECT '9_related_table', tablename::text, 'exists'
FROM pg_tables
WHERE schemaname = 'public' AND (tablename ILIKE '%attend%' OR tablename ILIKE '%leave%')
ORDER BY 1, 2, 3;
```

### Query 2 — migration provenance (only if the Supabase migrations table exists)
```sql
-- READ-ONLY · errors harmlessly if the schema does not exist
SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 20;
```
Also check **SQL Editor → History** for a recent run creating `staff_attendance`.
