# SL-CRM-ATTENDANCE-DB-AUDIT-03 — Read-Only Live Schema Verification

**Date:** 2026-10-24
**Status:** **BLOCKED** — no authorized read-only access to live database metadata, and no owner-supplied query output.
**Changes:** none to the database, application code, schema, RLS or Git history. This report is the only new file.

---

## 1. Access check (evidence)

| Path | Result |
|---|---|
| Authorized Supabase dashboard session available to the agent | None |
| Supabase CLI / CLI access token / `psql` / GitHub CLI | Not installed / not present |
| Owner-supplied Query 1 output (CSV/JSON in Downloads, Desktop, Documents, last 2 days) | None found |
| Anon probe `GET /rest/v1/staff_attendance?select=id&limit=1` (public anon key) | HTTP 401, `42501` permission denied |
| Same for `staff_leave_requests` | HTTP 401, `42501` |
| Service-role key / DB password in repository | **Not used** (exposed credentials; see `docs/SEC-EXPOSURE-01-INCIDENT-REPORT.md`) |
| GitHub repository visibility | Still **public** (anonymous `ls-remote` exit 0) — containment from SEC-EXPOSURE-01 not yet done |

The anon result proves only that both tables **exist** (a missing table returns `404 PGRST205`, as it did before FA-ATTENDANCE-02) and that anon is refused. No column, constraint, trigger, policy or grant metadata is visible to anon.

---

## 2. Repository inspection (inputs re-confirmed)

All expected files exist at the documented paths: `src/utils/attendance.js`, `src/services/AttendanceService.js`, `src/hooks/useAttendance.js`, `src/screens/{Attendance,AttendanceHistory,LeaveRequests,LeaveApplication}Screen.js`, `supabase/proposals/242_sprint_FA_ATTENDANCE_01.sql` and its rollback. They are unchanged since AUDIT-01, which holds the full repository schema and app-contract analysis with line references:
- Proposed schema: AUDIT-01 §1
- App operations and requirements: AUDIT-01 §2
- Compatibility risk list: AUDIT-01 §4

The proposal is the **only** tracked SQL defining these tables. It is **not** evidence of the deployed schema.

---

## 3. Deliverables

| # | Deliverable | Result |
|---|---|---|
| 1 | Live tables and columns | Tables exist **(VERIFIED)**; columns, types, nullability, defaults **BLOCKED** |
| 2 | Constraints, triggers, indexes, RLS, grants | **BLOCKED** (anon denied: VERIFIED) |
| 3 | Comparison with the mobile implementation | **BLOCKED** |
| 4 | Missing or incompatible requirements | **BLOCKED** — the 10 risks in AUDIT-01 §4 stay open (key ones: UNIQUE `(staff_id, business_date)` for the upsert; FA-02 trigger fix; first check-out wins; own-row INSERT/UPDATE/SELECT policies; exact status values) |
| 5 | Location fields exist | Live: **BLOCKED**. Proposal: none. App: captures none (VERIFIED in AUDIT-01) — so no attendance location data exists from the app regardless |
| 6 | Ready for CRM attendance register | **NOT READY / BLOCKED** — schema unverified; no admin leave-approval path; credentials exposed |
| 7 | Owner actions | See §4 |
| 8 | Evidence | §1 table; no secrets or employee data used |

---

## 4. Owner action required before the next sprint

1. **Contain the credential exposure first** (SEC-EXPOSURE-01 §3): make the repo private, rotate the Supabase service_role key and DB password, reset the exposed account passwords. Until then, attendance RLS can be bypassed by anyone holding the leaked key, so verifying it is of limited value.
2. **Supply the live metadata (read-only):**
   - Supabase dashboard → project `fwkjddflpzkowlawkmka` → **SQL Editor** → New query.
   - Paste **Query 1** from `SL-CRM-ATTENDANCE-DB-AUDIT-01-REPORT.md` §8 (verified read-only in AUDIT-02 §1) → **Run** → **Export → CSV**.
   - Save it, e.g. `C:\Users\dell\Downloads\attendance_schema.csv`, and give the path to the agent. Optional: Query 2 and SQL Editor history for provenance.
3. Alternatively, provide an approved read-only database role connection through a local, untracked environment variable. Never paste credentials into chat or files.

---

## 5. Recommended next micro-sprint

**SL-CRM-ATTENDANCE-DB-AUDIT-04 — Compare supplied live metadata** (read-only): parse the Query 1 CSV, verify each AUDIT-01 §4 risk as PASS/FAIL, and draft a corrective SQL **proposal** only for verified discrepancies. Start only after step 2 above (and preferably step 1).
