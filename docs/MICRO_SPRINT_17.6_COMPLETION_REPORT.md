# MICRO-SPRINT 17.6 COMPLETION REPORT
**Dealer Scheme & Incentive Tracking**

## 1. Objective and Scope Completed
- **Objective:** Track approved dealer schemes and participation at the CRM level without replicating complex financial settlement operations.
- **Scope Completed:**
  - Designed a lightweight scheme model using `dealer_schemes` and `dealer_scheme_participations`.
  - Added a dedicated "Schemes" tab to the Dealer Account 360 profile (`Customers/View.jsx`).
  - Permitted salespersons to view active schemes, enroll dealers, and manually update the status of their participation (Enrolled -> Target Achieved -> Claimed -> Verified) based on their CRM checks.
  - Successfully maintained the boundary between CRM tracking (verified by salesperson) and actual accounting payout (managed outside the CRM by the finance system).

## 2. Dealer/Territory/Workflow Rule Definitions
- **Scheme Visibility:** The Schemes tab and enrollment buttons only appear for parties whose `relationship_type` is 'Dealer'.
- **Financial Boundary Preserved:** The CRM allows tracking milestones up to "Verified (CRM)". It explicitly does not calculate monetary payouts, generate credit notes, or insert accounting vouchers.

## 3. Source Tables/Fields
- **`dealer_schemes`**: (New) `id`, `name`, `start_date`, `end_date`, `eligibility_criteria`, `status`, `description`
- **`dealer_scheme_participations`**: (New) `id`, `scheme_id`, `party_id`, `status`

## 4. Files Changed
- `72_sprint_17_6_dealer_schemes.sql` (New DB migration script)
- `app/src/pages/Customers/View.jsx` (React UI logic for the Schemes tab)

## 5. Database Objects Changed
- Added `dealer_schemes` table and trigger.
- Added `dealer_scheme_participations` table and trigger.
- Enforced strict RLS policies on both tables, granting access to authenticated users.

## 6. Tests/Results
- **Build Verification:** React frontend built cleanly (`npm run build`). 
- **UI Testing Logic:** The tab natively filters out non-dealers, correctly maps active vs. enrolled schemes, and safely increments status using direct Supabase API calls.

## 7. Regression Results
- Customer (Farmer) profiles are entirely unaffected; the "Schemes" tab is completely hidden.
- The React hooks (e.g., `fetchCustomerContext`) efficiently bundle the scheme checks asynchronously without blocking standard data loading.

## 8. Tally/Source Validation where relevant
- Explicitly excluded from this sprint to maintain the architectural boundary. Salespersons verify against Tally manually (using the Financial Intel tab) and then click "Verify" on the Scheme tab.

## 9. RLS/Security Checks
- Row Level Security is enabled by default on the two new tables.
- RLS policies restrict anonymous access, preventing unauthenticated schema modifications.

## 10. Known Limitations
- Updating a milestone manually cycles through predefined statuses. More granular, JSONB-based multi-step milestones are supported by the schema but a simpler linear flow is implemented in the UI to minimize complexity.

## 11. Deferred Requests
- Automated calculation of scheme payout values based on live Tally data is deferred, as it crosses into ERP functionality.

## 12. PASS / FAIL / BLOCKED
**PASS**
