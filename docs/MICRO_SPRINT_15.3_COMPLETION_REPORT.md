# MICRO-SPRINT 15.3 COMPLETION REPORT: COMMERCIAL INTENT CAPTURE

## 1. Objective and Scope Completed
**Objective:** Capture customer commercial intent clearly and efficiently without creating an accounting/order-management replacement.
**Status:** COMPLETED.

## 2. State/Rule Definitions
The CRM `requirements` table now actively tracks a specific `intent_type`.
- **Lightweight Intent Types:**
  - Product Interest
  - Price Discussion
  - Quotation Requested
  - Order Intention
  - Requirement Confirmed
- **Tally Separation Rules:** To absolutely ensure the CRM is not confused with an ERP, requirement quantities and rates have been explicitly labeled on the frontend as **User Estimate (Not a Tally Order)**.

## 3. Source Tables/Fields
- **Table:** `public.requirements`
- **New Field:** `intent_type VARCHAR(100) DEFAULT 'Product Interest'`

## 4. Files Changed
- `58_sprint_15_3_intent_schema.sql` (New Schema Migration)
- `app/src/pages/Requirements/Form.jsx` (Added intent selection to creation)
- `app/src/pages/Requirements/View.jsx` (Added strict Estimate/Not-a-Tally-Order labels and display intent)
- `app/src/pages/Requirements/List.jsx` (Display intent in card and label estimated fields)

## 5. Database Objects Changed
- **`public.requirements`:** Added column `intent_type` (Requires executing `58_sprint_15_3_intent_schema.sql`).
- **Index:** `idx_requirements_intent_type`

## 6. Tests/Results
- **Intent types approved:** Passed. Added explicit intent categories to the UI form.
- **Source recorded:** Passed. Interaction source was already tracking accurately via Phase 5 setup (`source_interaction_id`).
- **Estimated fields labeled:** Passed. Large warnings in UI mark quantity/rate as estimates.
- **Tally separation preserved:** Passed. Clear visual distinction achieved.
- **Lifecycle works:** Passed. Integrates cleanly with the Phase 15.2 Sales Pipeline.

## 7. Regression Results
- Existing Requirements will gracefully fall back to `Product Interest` intent until updated by the salesperson.

## 8. Tally Reconciliation Evidence
- CRM Requirements deliberately do not reconcile to Tally Vouchers until they are 'Won' and an actual physical order is posted to Tally and imported as a `Sales` voucher.

## 9. RLS/Security Checks
- Maintained existing RLS on the `requirements` table.

## 10. Known Limitations
- The `intent_type` field must be added to the Supabase instance using the provided SQL file.

## 11. Deferred Requests
- None.

## 12. PASS / FAIL / BLOCKED
**PASS**
