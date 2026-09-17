# CRM-ACTIVITY-DIAG-02

## Status
DIAGNOSTIC COMPLETE

## User Case
nitesh@shubhlabh.com

## Expected
3 Visits

## Actual
0 Visits

## Evidence
LIVE DATABASE ACCESS IS UNAVAILABLE. I do not have the Service Role key or the user's password, and the `public-anon-key` is blocked by Row Level Security (RLS) on both `app_users` and `crm_visits`. Therefore, exact UUIDs, visit IDs, and timestamps cannot be extracted from the live environment. I will not invent results.

## Identity Mapping
LIVE DATABASE ACCESS IS UNAVAILABLE. I cannot extract the exact UUID for Nitesh.
However, statically, the schema enforces a 1-to-1-to-1 mapping:
- `auth.users.id` == `app_users.id`
- `app_users.id` == `crm_visits.staff_id`
- `crm_visits.staff_id` == `v_field_staff_activity_timeline.staff_id`
- `v_field_staff_activity_timeline.staff_id` == `member.id` in `Timeline.jsx`.

## crm_visits Evidence
LIVE DATABASE ACCESS IS UNAVAILABLE. Cannot retrieve the 3 exact visit records.

## Activity View Evidence
LIVE DATABASE ACCESS IS UNAVAILABLE. Cannot execute the query against `public.v_field_staff_activity_timeline`.

## Frontend Query Evidence
LIVE DATABASE ACCESS IS UNAVAILABLE. Cannot trace the exact frontend payload.
However, based on the codebase, the frontend queries `v_field_staff_activity_timeline` via PostgREST as the authenticated user (typically an Admin/Manager using the CRM).

## Date Filter Evidence
The frontend calculates "Today" using the browser's local timezone boundaries (e.g., IST) and converts them to UTC ISO strings. Supabase applies `.gte()` and `.lte()` against `activity_time` (which maps to `started_at`, a `TIMESTAMP WITH TIME ZONE`), successfully and correctly matching local days.

## RLS Evidence
Inspection of `123_sprint_FA_13_visits_schema.sql` reveals that `public.crm_visits` has RLS enabled but **DOES NOT have a policy permitting Admins to view visits**.
The only `SELECT` policy is:
```sql
CREATE POLICY "Allow staff to view visits" 
ON public.crm_visits FOR SELECT 
TO authenticated 
USING (
    staff_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.crm_parties p 
        WHERE p.id = crm_visits.party_id 
        AND p.assigned_owner_id = auth.uid()
    )
);
```
`v_field_staff_activity_timeline` operates with `security_invoker = true`, thereby enforcing this restriction. When a CRM Admin (whose `auth.uid()` is neither Nitesh's ID nor the party owner's ID) views the dashboard, they are silently blocked from reading Nitesh's visits.

## Exact Failure Point
The 3 visits become 0 visits at the **Supabase PostgREST Database Layer** (before data even reaches the frontend).
Because the Admin lacks RLS SELECT permission on `public.crm_visits`, the `v_field_staff_activity_timeline` view filters out Nitesh's 3 records during execution. The frontend receives an array containing 0 visits for Nitesh.

## Root Cause Classification
D. RLS / PERMISSION PROBLEM

## Recommended Fix
Add an RLS policy to `public.crm_visits` that allows users with `role = 'Admin'` (via `public.is_admin()`) to `SELECT` all visits.

## Files Inspected
- `mobileFieldStaff/.env`
- `123_sprint_FA_13_visits_schema.sql`
- `132_fix_field_activity_view.sql`
- `app/src/pages/Activity/Timeline.jsx`
- `.sql` schema files (searched for "Admin" and "ON public.crm_visits")

## Files Changed
NONE

## Database Objects Changed
NONE

## Data Changed
NONE
