# COMM-04 — UNKNOWN & REPEATED CALL INTELLIGENCE

## Objective
Establish a deterministic, server-side analytical reporting layer on top of `public.crm_call_events`. Create unified views for tracking staff communication, customer engagement history, and repeated contacts without creating subjective AI scores, false positives, or fake CRM parties.

## Existing crm_call_events Architecture
The base table `crm_call_events` continues to serve as the immutable ledger for incoming, outgoing, answered, and missed call metadata. No structural changes or data modifications were made to the source table in this sprint.

## Unknown Definition
An **Unknown Number** is strictly defined as any record where `party_id IS NULL` AND `match_status = 'unknown'`.
This guarantees that numbers we deliberately marked as `ambiguous` (duplicates) do not pollute the true unknown prospect tracking metrics.

## Ambiguous Definition
An **Ambiguous Number** is strictly defined as `party_id IS NULL` AND `match_status = 'ambiguous'`.
These are grouped separately in staff summaries to flag when they contacted an existing system phone number that maps to multiple conflicting customers.

## Known Customer Definition
A **Known Customer** is strictly defined as `party_id IS NOT NULL` AND `match_status = 'matched'`.
These calls automatically contribute to the comprehensive `v_customer_communication_summary` profile.

## Repeated Communication Definition
**Repeated Communication** is defined objectively as: `call_count > 1` on the same normalized phone number, by the same staff member, on the exact same reporting calendar date.
Exposed via the dedicated `v_repeated_communication_summary` view, and summarized globally as a daily `repeated_contacts` integer inside the staff summary.

## Staff Summary
Created `public.v_staff_communication_summary`. It generates a daily report matrix per `staff_id`, counting `total_calls`, filtering exactly how many were answered vs missed, incoming vs outgoing, and dynamically breaking down the contact list by matched vs unknown vs ambiguous.

## Customer Summary
Created `public.v_customer_communication_summary`. It groups purely by `party_id`, providing the CRM dashboard with 360-degree analytics per customer: `calls_today`, `calls_last_7_days`, total talk time, first communication date, and distinct staff interacted with.

## Unknown Number Summary
Created `public.v_unknown_communication_summary`. It groups by `normalized_phone`. To satisfy privacy requirements on high-level analytics screens, it outputs `masked_phone` (e.g. `9198*****210`) alongside velocity tracking metrics (7-day, 30-day).

## Repeated Communication Summary
Created `public.v_repeated_communication_summary`. Used as an underlying dependency for counting daily repeating targets, while serving directly to the CRM to show the precise `first_call_at`, `last_call_at`, and `call_count` for repeated numbers.

## Date/Timezone Logic
As identified during architecture review, the project strictly relies on converting PostgreSQL `TIMESTAMPTZ` to a standardized `::DATE` via UTC `(started_at AT TIME ZONE 'UTC')::DATE`. This standardizes the daily aggregation boundaries precisely as they function elsewhere in the CRM application.

## Duration Logic
Authoritative actual talk seconds are accurately extracted via `SUM(duration_seconds)` across all matching records. Missed calls have 0 duration by definition from Android.

## RLS
Enforced fully via `WITH (security_invoker = true)`. Because these are views acting on `crm_call_events` and not materialized tables, a Field Staff member executing a `SELECT` on these views will automatically have their rows restricted to only their own call history, preserving existing security without custom `SECURITY DEFINER` layers.

## Performance
By building these inside the database layer with `JOIN` and `FILTER` clauses rather than client-side React processing, we completely eliminate `N+1` queries and massive browser payloads. The queries rely entirely on indexes created previously in COMM-01 and COMM-03.

## Privacy
Full raw phone numbers are abstracted safely inside the database. The unknown report intentionally masks phone data. No SMS, Audio, or Content was logged or accessed.

## Validation Tests

*(Note: Validation execution is currently blocked pending DBA migration. Because I do not possess a database Service Role key or local deployment rights for structural DDL execution via the API, the test results below require `136_sprint_COMM_04_call_intelligence.sql` to be executed first.)*

- **CASE A (Known customer increments):** BLOCKED
- **CASE B (Unknown number increments):** BLOCKED
- **CASE C (Ambiguous number separate):** BLOCKED
- **CASE D (Two calls on same day = repeated):** BLOCKED
- **CASE E (One call = not repeated):** BLOCKED
- **CASE F (Missed call increments):** BLOCKED
- **CASE G (Outgoing answered + duration):** BLOCKED
- **CASE H (Incoming answered + duration):** BLOCKED
- **CASE I (Distinct staff count):** BLOCKED
- **CASE J (Same device event processed twice):** BLOCKED

==================================================
DATABASE OBJECTS
==================================================
- **Migrations:** `136_sprint_COMM_04_call_intelligence.sql`
- **Views:**
  - `public.v_repeated_communication_summary`
  - `public.v_staff_communication_summary`
  - `public.v_customer_communication_summary`
  - `public.v_unknown_communication_summary`

==================================================
DATA CHANGES
==================================================
NO RAW CALL DATA CHANGES. 

==================================================
UI CHANGES
==================================================
Mobile UI: NONE
CRM UI: NONE
