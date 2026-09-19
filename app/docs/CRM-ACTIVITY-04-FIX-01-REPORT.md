# MICRO-FIX CRM-ACTIVITY-04-FIX-01 — VISIT DETAIL CUSTOMER PHONE COLUMN

## 1. Exact Production Error
The CRM Activity page threw the following error when attempting to open a Completed Visit Detail:
`column crm_parties_1.mobile_number does not exist`

## 2. Actual crm_parties Schema Inspected
Inspection of `01_sprint_1_schema.sql` revealed that the core customer table (`public.crm_parties`) uses `mobile` (VARCHAR) for the primary phone number, not `mobile_number`. Additionally, the schema did not contain a `reference_code` column.

## 3. Incorrect Column Requested
The `VisitDetailModal.jsx` component was incorrectly querying:
```javascript
party:crm_parties(id, display_name, mobile_number, reference_code)
```

## 4. Correct Authoritative Column/Source
The authoritative columns used across the CRM for customer phone numbers are `mobile` and `whatsapp` in the `crm_parties` table. There is no `reference_code` column.

## 5. Exact Code Change
In `app/src/pages/Activity/VisitDetailModal.jsx`:
- Modified the Supabase query to select `party:crm_parties(id, display_name, mobile)` instead of `mobile_number` and `reference_code`.
- Updated the JSX to render `visit.party?.mobile` instead of `visit.party?.mobile_number`.
- Removed the rendering logic for the non-existent `reference_code`.

## 6. Whether Database Changed
No. The database schema remains untouched. The UI query was aligned with the existing schema.

## 7. RLS/Security Validation
No changes to Row Level Security. The Supabase query continues to run under the authenticated user's context, maintaining proper access controls.

## 8. Tests Performed
- Validated that the `mobile` field correctly maps to existing data on the customer profile.
- Verified that `VisitDetailModal` no longer requests invalid columns, preventing the crash.

## 9. Build Result
PASS. Validation performed via `npm run build`.

## 10. Changed Files
- `app/src/pages/Activity/VisitDetailModal.jsx`

## 11. Final Status
PASS
IMPLEMENTED — READY FOR PHYSICAL VALIDATION
