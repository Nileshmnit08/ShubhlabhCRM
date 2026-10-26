# FA-ATTENDANCE-MULTISESSION-PROPOSAL-01: multiple attendance sessions per day

**Status:** proposal for review. Nothing has been applied, built or distributed.

**Files:**
- `supabase/proposals/245_sprint_FA_ATTENDANCE_MULTISESSION_01.sql`
- `supabase/proposals/245_rollback_sprint_FA_ATTENDANCE_MULTISESSION_01.sql`

Items marked **[ASSUMPTION]** have not been verified against the live database or a device.

---

## 1. The current system

| Item | Current behaviour | Source |
|---|---|---|
| Daily record | One `staff_attendance` row per `(staff_id, business_date)`, enforced by `staff_attendance_staff_date_key UNIQUE`. | proposal 242 |
| Writes | Field Assist sends `upsert … ON CONFLICT (staff_id, business_date)` through the offline SyncService queue. Check-out resends the whole row. | `AttendanceService.js`, `utils/attendance.js` |
| Trigger | `fa_attendance_enforce()`: the first check-in and first check-out win, the first location of each wins, and check-in must fall within +5 min / −72 h with no approved leave that day. | 242 → 243 |
| Location | 10 location columns on the daily row. | 243 |
| Coordinate privacy | Employees lose SELECT on the 4 coordinate columns; admins read them through `admin_attendance_locations()`. Proposed, not applied. | 244 |
| Readers | The CRM Attendance Register reads explicit daily columns plus the 244 function. The Field Assist history screen and Home card read explicit columns with no coordinates. | `AttendanceRegister.jsx`, `ATTENDANCE_READ_COLUMNS` |
| Sync queue | Supports only `insert`, `update`, `upsert` and `delete`, with no RPC calls. `23514` and `42501` count as permanent failures; `23505` counts as idempotent success. | `SyncService.js` |

**Why the current model can't support a second session:** reopening the day would mean clearing `check_out_at`. The trigger refuses that, and doing it would destroy the first check-out time and its location.

## 2. Design

### 2.1 `staff_attendance_sessions`
Each row is one check-in/check-out pair, stored with:
- **Identity and linkage:** `id`, `attendance_id`, `staff_id`, `business_date`, `session_no`.
- **Origin:** `source`, one of APP, LEGACY_APP or BACKFILL.
- **Times:** device check-in and check-out times, plus the server receipt time for each.
- **Location:** for each event, the same 5 fields used in 243.

Guarantees:
- **Never deleted:** employees have no DELETE right and there is no DELETE policy.
- **Fixed once written:** a session's check-in fields, and its check-out once set, can't be changed. A second trigger, `fa_attendance_session_enforce`, enforces this even for server code.
- **One open session per employee per day:** enforced by a partial unique index.
- **At most 10 sessions per day:** a sanity limit.

### 2.2 Session lifecycle
```
           check_in RPC (new id)                     check_out RPC (same id)
 (none) ─────────────────────────▶ CHECKED_IN ───────────────────────────▶ CHECKED_OUT
                                       │  replay with same id → no-op            │ replay → no-op
                                       │  new id while open → OPEN_SESSION_EXISTS │ (first check-out wins)
                                       ▼                                          ▼
                              (summary: CHECKED_IN)               (summary: CHECKED_OUT, unless another
                                                                   session is opened later)
```
**Check-in:** `fa_attendance_check_in(p_session_id, p_check_in_at, location…)`
1. Checks the caller is signed in and active.
2. Takes a per-employee-day advisory lock.
3. Returns the existing session unchanged if this ID was already processed.
4. Rejects the request if any of these apply:
   - The time is outside +5 min / −72 h.
   - There's approved leave that day.
   - A session is already open.
   - The check-in is earlier than the previous check-out.
   - The day already has 10 sessions.
5. Creates the daily summary row if it's the first session of the day.
6. Inserts the session and recalculates the summary.

**Check-out:** `fa_attendance_check_out(p_session_id, p_check_out_at, location…)`
1. Finds the employee's own session; if it doesn't exist, returns `P0002`, which the queue retries.
2. Takes the lock and row-locks the session.
3. Returns the session unchanged if it's already checked out (the first check-out wins).
4. Rejects the request if the time is in the future or not after check-in.
5. Saves the check-out and recalculates the summary.

**Day boundary:** the business date comes from the check-in time in IST. A session left open on an earlier day stays open and shows as **Incomplete** in history (same as today), and doesn't block the next day's check-in. Auto-closing it isn't part of this proposal.

### 2.3 Identity and idempotency
| Risk | Protection |
|---|---|
| Double tap on Check in | The button is disabled while processing (existing). The session UUID is created once per tap and saved locally **before** queuing. A second tap with a new UUID is rejected (`OPEN_SESSION_EXISTS`, 23514) and the client refreshes. |
| Network retry or app restart | The same queued op carries the same `p_session_id`, so the RPC returns `duplicate: true`. |
| Two requests at once (two devices, or a retry racing the original) | The advisory lock serialises them, and the partial unique index `uq_sas_one_open_per_day` is the final backstop. |
| Delayed check-out arriving after a new session | The check-out names its own `session_id`, so it can only close that session. It can't close the new one. |
| Check-out arriving before its check-in | Returns `P0002`, which is retried. The queue is first-in, first-out per device **[ASSUMPTION: confirm SyncService processes ops in order]**. |
| Delayed check-in older than the last check-out | Rejected (`SESSION_OVERLAP`), so overlapping sessions can't exist. |

### 2.4 Daily summary rules (`staff_attendance`)
| Field | Rule |
|---|---|
| `check_in_at` and check-in location | First session; set once and never changed (unchanged 242/243 rule). |
| `check_out_at` and check-out location | Last closed session; **NULL while any session is open**. |
| `status` | CHECKED_IN while a session is open, otherwise CHECKED_OUT. |
| `session_count` | Number of sessions (new). |
| `worked_seconds` | Sum of closed session durations, excluding breaks (new). |

- **Who maintains it:** only `fa_attendance_recompute_day()`, inside the same transaction as the session write. The trigger lets the check-out fields change only when a transaction-local flag is set **and** the code isn't running as an API role. Employees can't set the flag, and their direct writes can't touch the new columns.
- **No double counting:** every report keeps reading the **daily row only**, one row per employee-day as now. Sessions are detail and are never summed alongside daily rows.
- **What changes for reports:**
  - A multi-session day shows first-in → last-out. That span includes breaks, so screens that show duration should switch to `worked_seconds` when it's set.
  - `check_out_at` is no longer guaranteed to be the *first* check-out. The original first check-out is kept in `staff_attendance_sessions`.

### 2.5 Older APKs (direct upserts)
The trigger `trg_fa_attendance_mirror_legacy` (AFTER INSERT/UPDATE, server-side) copies every direct write into sessions:
- **New day with no session:** creates a `LEGACY_APP` session from the row.
- **Check-out while a session is open:** closes that session, then recalculates the summary.

Older APKs still can't re-check-in, because their own client logic blocks it. They keep working as before.

### 2.6 Backfill
One `BACKFILL` session is created for each existing day, copying its times and location exactly. Only `session_count` and `worked_seconds` are set on the daily rows; existing check-in and check-out values are not touched.

## 3. Security analysis
| Requirement | How it's met |
|---|---|
| Employees can't read GPS coordinates | Column-level grants on sessions leave out the 4 coordinate columns. Employees have no direct write rights on sessions, so the open 244 question about upserts needing read access doesn't apply. The RPCs return no coordinates. |
| Employees see only their own sessions | RLS policy: `staff_id = auth.uid() AND is_active_user()`. |
| Admin access | RLS lets admins read all sessions; coordinates come only through `admin_attendance_session_locations()`, which checks `is_admin()` and a 0–92 day window. It mirrors the 244 function. |
| Can't act as another employee | The RPCs take the employee from `auth.uid()`, never from a parameter. A replay with another employee's session ID returns 42501. |
| Server functions bypass RLS | Every one sets a fixed `search_path`. The internal helpers are revoked from API roles. Only the two employee RPCs and the admin RPC are callable. |
| Summary can't be tampered with | Employees can't write the derived columns. Check-out fields still follow first-wins for direct writes; only the trusted recalculation can change them. |
| Daily-row coordinates (existing exposure) | Unchanged by this proposal. They remain readable by the employee until **244** is applied. **Recommend applying 244 before or with 245.** |
| Anonymous users | No grants. |

**Remaining risks:**
- The trusted-flag check depends on `current_user` inside SECURITY DEFINER being the owner, and the owner bypassing RLS **[ASSUMPTION P4: verify the owner role on staging]**.
- The advisory lock can deadlock in a rare case: an older APK and a newer APK writing for the same employee-day at the same moment, taking locks in opposite order. Postgres aborts one of them and the queue retries it.

## 4. Client and API changes (after approval; not implemented)
**Field Assist**
1. **Feature flag:** `probeSessionSupport()`, a GET on `staff_attendance_sessions` using non-coordinate columns, cached for offline use. If the table is missing, the app keeps the **current legacy path unchanged**. That lets the APK ship before the migration and survive a rollback.
2. **SyncService:** add an `rpc` action (`supabase.rpc(name, params)`). Treat the response field `duplicate: true` as success. Classify `P0002` as retryable and `23514` (OPEN_SESSION_EXISTS, SESSION_OVERLAP) as permanent with clear messages. This needs a full regression of the queue.
3. **AttendanceService:**
   - Check-in creates the `session_id`, saves `{sessionId, checkInOpId}` locally, and queues `fa_attendance_check_in`.
   - Check-out queues `fa_attendance_check_out` with the **open session's ID** read from local or server state.
   - `loadToday` reads today's sessions (without coordinates) plus the summary row.
   - Local state is keyed by session, not by day.
4. **`deriveAttendanceView`:** when the day is CHECKED_OUT and sessions are supported, allow **Check in** again. Show today's sessions and their total worked time. Location capture stays the same one-shot reading per event, sent as RPC parameters, with no background tracking.
5. **History screen:** one row per day, showing worked time and session count, with the sessions listed on tap.

**CRM**
- Attendance Register: add Sessions and Worked columns.
- Session detail drawer: reads `staff_attendance_sessions` without coordinates, plus `admin_attendance_session_locations()` for the map links.
- Duration should use `worked_seconds` when it's set.

## 5. Test plan
**Database tests**, run on staging as employee A, employee B and an admin:
1. Check-in → check-out → check-in → check-out. Expect sessions 1 and 2; summary `check_out_at` = session 2's check-out; worked time = sum of both; session 1's check-out is unchanged.
2. Five sessions in one day: count, worked time and status stay correct. The 11th check-in is rejected.
3. Same check-in ID sent 5 times, including in parallel: one session is created and four replies are `duplicate: true`. A check-out replay keeps the first time.
4. Two different check-in IDs sent at the same moment: exactly one succeeds and the other gets OPEN_SESSION_EXISTS.
5. Delayed check-out for session 1 arriving after session 2 started: it only closes session 1, which was already closed, so nothing changes.
6. Check-out before check-in, or with an unknown ID: P0002. A check-in earlier than the previous check-out: SESSION_OVERLAP.
7. Location saved as CAPTURED, LOW_ACCURACY, PERMISSION_DENIED, SERVICES_DISABLED and UNAVAILABLE. Rejected when the status and coordinates don't match. Never rejected just because location is missing.
8. Times and evidence preserved: every session's check-in and first check-out values stay the same after later sessions and replays, and backfilled rows match their original daily rows.
9. Summary consistency: the consistency query in the SQL footer returns 0 rows after every scenario.
10. Older APK upsert check-in and check-out: a LEGACY_APP session is mirrored and the summary stays consistent. An older-APK check-out while a newer session is open closes it.
11. Privacy:
    - Employees selecting coordinates from sessions get 42501. They can't insert, update or delete sessions directly, can't call the admin RPC, and can't see employee B's rows.
    - Admins can call the admin RPC.
    - Requests with no session get 42501.
12. Employee direct update of `session_count` or `worked_seconds`: the change is ignored.

**Client tests**, after approval:
- Unit tests for the new view logic and the RPC sync action.
- Device tests: check-in → out → in → out with location granted, denied and GPS off; flight-mode check-in followed by a check-out queued offline; force-quit during sync.
- CRM register: daily rows unchanged for single-session days; session drawer; coordinates for admins only.
- APK compatibility: older APK against the migrated database; newer APK against the old database (falls back to legacy); newer APK across a rollback.

## 6. Staged rollout
| Stage | Action | Older APK | Newer APK |
|---|---|---|---|
| 0 | Run the preflight queries; confirm 243 is live and check ownership. | — | — |
| 1 | Apply 244 (recommended), after every device has the build that doesn't read coordinates. | Must already be updated (244 requirement) | — |
| 2 | Ship the newer APK with session support behind the probe. | Works | Legacy path (table missing) |
| 3 | Apply 245 on **staging**; run section 5 against it. | Works, mirrored | Session path |
| 4 | Apply 245 to production outside working hours (not mid-shift). | Works, mirrored; no re-check-in | Re-check-in available |
| 5 | Optional, separate approval: once every device is updated, revoke direct INSERT/UPDATE on `staff_attendance` so only the RPCs write. | Would break, so this is gated on full adoption | — |

**Rollback:** run the 245 rollback script; its limitations (L1–L5) are listed in the header. Session history is archived, not dropped. The newer APK falls back to the legacy path on its own once the probe fails.

## 7. Assumptions and open questions
1. **[ASSUMPTION]** 243 is applied and the live `fa_attendance_enforce()` matches it exactly. 245 replaces that function, so any difference must be merged first.
2. **[ASSUMPTION]** The migration runs as the table owner, which bypasses RLS and isn't `authenticated`.
3. **[ASSUMPTION]** SyncService processes queued ops for a user in order.
4. **[ASSUMPTION]** No report other than the CRM Attendance Register and the Field Assist screens reads `staff_attendance`. Found by searching the repo; external tools not checked.
5. **[DECISION NEEDED]** Is a limit of 10 sessions per day acceptable?
6. **[DECISION NEEDED]** Should open sessions from earlier days be auto-closed, or left as Incomplete (proposed)?
7. **[DECISION NEEDED]** Should a check-in after approved leave is granted be blocked on every session (proposed) or only the first?
8. **[DECISION NEEDED]** Should the summary's `check_out_at` mean "last check-out" (proposed, so older APKs and reports show the correct current state) rather than "first check-out"?
