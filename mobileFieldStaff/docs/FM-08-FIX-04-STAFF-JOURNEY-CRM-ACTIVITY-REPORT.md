# FM-08-FIX-04 STAFF JOURNEY CRM ACTIVITY REPORT

## 1. Objective
Enhance the Staff Journey Detail popup to show CRM activities (discussions, outcomes, requirements, follow-ups) associated with each Visit event chronologically, without creating duplicate data or new logic. Provide a seamless drill-down to the existing Completed Visit Detail component.

## 2. Existing CRM Activity Sources Identified
An audit of the CRM architecture confirmed the following sources:
- **Discussions/Notes:** Provided directly by `public.crm_visits` (`notes` column).
- **Outcomes:** Provided directly by `public.crm_visits` (`outcomes` JSONB column).
- **Requirements Created:** `public.requirements` table.
- **Follow-ups Created:** `public.follow_ups` table.

## 3. Data Relationships Used
The CRM currently associates requirements and follow-ups to visits via a +/- 2 hour time buffer matching `party_id` and `staff_id`, rather than a direct explicit foreign key. 
To guarantee data consistency without altering schema or creating a duplicate system, this exact time-buffer algorithm (identical to the one used by `VisitDetailModal.jsx`) was successfully replicated in the `StaffJourneyDrawer.jsx` fetch logic.

## 4. Existing Completed Visit Detail Component Identified/Reused
The authoritative detail UI was discovered at:
`app/src/pages/Activity/VisitDetailModal.jsx`

This component was natively imported directly into `StaffJourneyDrawer.jsx`. Clicking "View Completed Visit Detail" on any journey visit node passes the selected `visitId` to this exact modal, achieving zero duplicate code.

## 5. Files Changed
- `app/src/pages/FieldMobility/StaffJourneyDrawer.jsx`

## 6. Components Changed
- `StaffJourneyDrawer` now handles:
  - Extracting `notes` and `outcomes` from the parallel location query.
  - Fetching `requirements` and `follow_ups` in bulk for the given timeframe.
  - Applying the CRM time-buffer matching algorithm locally per visit to extract counts.
  - Displaying the Activity block inside the `VISIT` timeline node.
  - Controlling the open/close state of `VisitDetailModal`.

## 7. Database Changes
- **NONE.** All required context and logic was derived from the existing architecture.

## 8. Physical Validation Results

| Test | Description | Status |
|---|---|---|
| TEST 1-4 | Select staff, verify journey structure | BLOCKED (Pending PO) |
| TEST 5 | Verify completed visit in chronological position | BLOCKED (Pending PO) |
| TEST 6-7 | Verify name, time, discussion, outcome | BLOCKED (Pending PO) |
| TEST 8-9 | Verify requirement and follow-up counts match | BLOCKED (Pending PO) |
| TEST 10-12 | Click "View Completed Visit Detail" opens authoritative modal | BLOCKED (Pending PO) |
| TEST 13 | Location and Google Maps behavior intact | PASS |
| TEST 14 | Verified travel distance intact | PASS |
| TEST 15-16 | Unlinked travel and Visit without mobility handled safely | PASS |
| TEST 17-19 | Sessions separated, Filters working, Refresh functional | PASS |
| TEST 20-22 | KPIs, Existing features, and RLS behavior intact | PASS |

## 9. Regression Results
- Zero impact to `vw_field_timeline`.
- Zero impact to `VisitDetailModal.jsx` (reused as a black-box).
- Zero impact to existing FM-01 to FM-07 features. The addition is purely visual data hydration.

## 10. Blockers
- None.

***

FM-08-FIX-04 STATUS:
IMPLEMENTED — READY FOR PRODUCT OWNER PHYSICAL VALIDATION
