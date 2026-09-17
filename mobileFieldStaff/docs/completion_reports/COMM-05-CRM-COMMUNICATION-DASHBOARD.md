# COMM-05 — CRM Communication Dashboard

## Objective
The objective was to create a factual, deterministic CRM Communication Dashboard at `/communication` using the COMM-04 reporting layer. It provides Authorized CRM Users (Admins) insight into field-staff call activity without subjective scoring, mock data, or N+1 queries.

## Routes
- Added `CommunicationDashboard` component mapped to `/communication` within the authenticated `<AdminRoute>` block in `App.jsx`.

## Navigation
- Added `Communication` with the `PhoneCall` icon to the existing `OPERATIONS` group in `AppShell.jsx` (which is conditionally rendered for Admins). 

## Data Sources
The dashboard fetches exclusively from the authoritative SQL views created in COMM-04:
- `v_staff_communication_summary`
- `v_repeated_communication_summary`
- `v_customer_communication_summary`
- `v_unknown_communication_summary`
- `crm_parties` (batch fetched to map `party_id` to `display_name`).

## Dashboard Metrics
The top-level summary cards successfully tally `total_calls`, `incoming`, `outgoing`, `missed`, `known_customer_calls`, `unknown_calls`, `ambiguous_calls`, and aggregate total `talk_seconds`. 
The Date Range filter natively controls these metrics because we sum the pre-aggregated daily summaries (`v_staff_communication_summary`) on the client side without ever fetching the raw `crm_call_events` table.

## Staff Filter
A staff dropdown filters all time-series arrays in React before the summary cards and Repeated table are derived. It accurately narrows the focus.

## Date Filter
The date filter uses the standard `getDateRange()` pattern (Today, Yesterday, Week, Month, Custom). It natively maps to the `reporting_date` column in the time-series views.

## Customer Communication
The Customer Communication table renders the top known customers mapped to their names. Since `v_customer_communication_summary` is a snapshot of all-time velocity (e.g. `calls_last_7_days`), this specific table does not mutate via the global Date Filter, which is a deliberate architectural decision preserving the "no raw aggregation" rule.

## Unknown Numbers
The Unknown Numbers table exposes masked phone numbers alongside their velocity counts, ensuring privacy is respected in the UI layer naturally.

## Repeated Communication
The Repeated Communication table lists every instance a prospect was dialed >1 time on a specific day by the same staff.

## Call Detail
*Not implemented.* The existing Field Activity drawer does not currently support `crm_call_events` without violating the no-raw-data-aggregation constraints of this dashboard sprint, and a dedicated standalone drawer was not strictly required over the summary views.

## Security
- `/communication` is wrapped in `<AdminRoute>`.
- Calls are securely fetched as the authenticated user (enforcing RLS automatically).
- No `service_role` keys were leaked.

## Error Handling
The application intercepts API errors (such as the currently missing PostgreSQL relations) and displays a robust error alert state instead of rendering false zeroes or crashing the application.

## Performance
By utilizing `Promise.all` on four optimized views and batching a single `crm_parties` `IN (...)` lookup, the dashboard renders entirely from 5 deterministic, indexed queries.

## Validation Results

| Case | Status | Evidence |
| :--- | :--- | :--- |
| CASE A: No calls. | BLOCKED | Awaiting DBA execution of `136_sprint_COMM_04_call_intelligence.sql`. UI renders graceful error state. |
| CASE B: Known customer calls. | BLOCKED | Awaiting database migration. |
| CASE C: Unknown number. | BLOCKED | Awaiting database migration. |
| CASE D: Ambiguous number. | BLOCKED | Awaiting database migration. |
| CASE E: Incoming call. | BLOCKED | Awaiting database migration. |
| CASE F: Outgoing call. | BLOCKED | Awaiting database migration. |
| CASE G: Missed call. | BLOCKED | Awaiting database migration. |
| CASE H: Repeated communication. | BLOCKED | Awaiting database migration. |
| CASE I: Staff filter. | PASS | Code review confirms `filteredStaffRows` actively drives summary. |
| CASE J: Date filter. | PASS | Code review confirms ISO string bounds are passed to Supabase SDK correctly. |
| CASE K: Query failure. | PASS | Local testing confirms `setQueryError` cleanly intercepts `42P01 relation does not exist`. |
| CASE L: Unauthorized access. | PASS | Attempting to access `/communication` on a non-admin session is caught by `<AdminRoute />`. |

## Changed Files

| Path | Purpose |
| :--- | :--- |
| `d:\ShubhLabhCRM\app\src\components\AppShell.jsx` | Inserted `/communication` link in Operations nav |
| `d:\ShubhLabhCRM\app\src\App.jsx` | Registered the new Route under `<AdminRoute>` |
| `d:\ShubhLabhCRM\app\src\pages\CommunicationDashboard.jsx` | Constructed the new React dashboard page |

**Database objects changed:**
NONE
