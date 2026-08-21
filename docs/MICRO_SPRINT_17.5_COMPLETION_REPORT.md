# MICRO-SPRINT 17.5 COMPLETION REPORT
**Dealer Opportunity & Order Intent**

## 1. Objective and Scope Completed
- **Objective:** Manage dealer commercial intent without creating a complex ERP/order-entry system. 
- **Scope Completed:**
  - Reused the Phase 15 `requirements` table structure and Opportunity models.
  - Exposed `intent_type` to differentiate Dealer Intent (e.g. Quotation Requested, Order Intention) from generic Open Requirements.
  - Showed customized recommended actions (e.g., "Verify Tally for PO", "Prepare formal quotation") based on intent.
  - Cross-referenced Intent against `tally_transactions` (Sales vouchers) natively in the `v_customer_opportunities` view, dynamically displaying Tally verification as source-linked evidence if a transaction follows the CRM intent.
  - Maintained separation between CRM intention and confirmed Tally financial execution without replicating line items.

## 2. Dealer/Territory/Workflow Rule Definitions
- **Dealer Intent:** Captured using `requirements` records where `relationship_type = 'Dealer'`.
- **Tally Verification Rule:** A dealer intent is "Tally Verified" if a non-credit `Sales` voucher appears in `tally_transactions` for that dealer *on or after* the date the CRM intent was created.
- **Workflow:** Opportunities flow into the "Follow-ups Queue" (Today's Work) seamlessly, exactly as they did in Phase 13/15, inheriting standard Follow-Up flows.

## 3. Source Tables/Fields
- `requirements` (`intent_type`, `expected_rate`, `unit`, `created_at`)
- `tally_transactions` (`voucher_type`, `voucher_date`, `is_credit`)
- `crm_parties` (`relationship_type`)

## 4. Files Changed
- `71_sprint_17_5_dealer_opportunity.sql` (New DB migration script)

## 5. Database Objects Changed
Recreated the following views with `security_invoker = true`:
- `v_requirement_demand_details` (Added `intent_type`, `expected_rate`, `unit`, `relationship_type`)
- `v_customer_opportunities` (Added conditional logic for Dealers, intent mapping, dynamic recommendations, and subqueries to `tally_transactions` for source-linked evidence)
- `v_requirement_demand_summary` (Restored identical definition to maintain dependency chains)

## 6. Tests/Results
- **Build Verification:** React frontend built cleanly (`npm run build`). No breaking changes to existing `Opportunities.jsx` or UI schemas.
- **Data Rendering:** Opportunities queue gracefully handles missing Tally matches vs verified matches.

## 7. Regression Results
- Customer (Farmer) Opportunities still default to "Open Requirement".
- Summary dashboards and metrics dependent on `v_requirement_demand_summary` remain entirely unaffected.

## 8. Tally/Source Validation where relevant
- Explicit subquery added to `v_customer_opportunities`: `SELECT MAX(t.voucher_date) FROM public.tally_transactions t WHERE t.crm_party_id = req_det.party_id AND t.voucher_type = 'Sales' AND t.is_credit = false AND t.voucher_date >= req_det.created_at::DATE`. This directly binds Tally execution data to CRM intent planning.

## 9. RLS/Security Checks
- All reconstructed views maintain `WITH (security_invoker = true)`, meaning the underlying queries strictly honor the RLS applied to `requirements` and `tally_transactions`.

## 10. Known Limitations
- The Tally verification simply checks for the *existence* of a Sales voucher following the intent creation date. It does not perform line-level product matching, as requested to avoid ERP duplication.

## 11. Deferred Requests
- Product line-item matching against Tally invoices is deferred/excluded to keep the CRM lightweight.

## 12. PASS / FAIL / BLOCKED
**PASS**
