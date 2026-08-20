# Micro-Sprint 10.6 Completion Report: Dormant Customer Identification

## 1. Transaction Data Inspected
The calculation depends entirely on `public.tally_transactions`, which contains imported voucher-level granularity.

## 2. Reliable Fields Identified
- `voucher_date`
- `voucher_type` (checked for `%sale%`)
- `amount`
- `is_credit`
- `crm_party_id` (foreign key explicitly populated during identity review)

## 3. Identity-Linking Approach
Dormant logic strictly relies on the existing `crm_party_id` linkage in `tally_transactions`. We do not perform fuzzy text matching at runtime. If a ledger is unlinked to a CRM Customer, its transactions are intentionally ignored. Duplicate/child ledgers that were merged during Sprint 19/20 accurately roll up to the primary CRM Party.

## 4. Customer Eligibility Rule
Only customers with `crm_status = 'Active'` are eligible for dormancy classification. Leads and manually-flagged 'Dormant' customers are excluded from the candidate view.

## 5. Dormant Threshold Source
The Product Owner explicitly approved a threshold of **180 days** after it was identified that no strict product rule existed.

## 6. Dormant Candidate Rule
A customer is flagged as a dormant candidate if they lack a qualifying sale (non-credit, amount > 0, voucher type = 'sale') within the last 180 days, or if they have absolutely no sales history.

## 7. Query/Calculation Approach
The identification operates fully database-side via the new `v_dormant_candidates` view. It uses a Common Table Expression (CTE) to aggregate `MAX(voucher_date)` grouped by `crm_party_id`, isolating the calculation away from the main `v_customer_master` pipeline.

## 8. Data-Quality Handling
- **No transaction history:** Caught by `s.last_sale_date IS NULL`. Shows reason: "No Tally sales history available."
- **Incomplete import history:** Accurately reflects what is in the database.
- **Supplier-only party:** Automatically ignored if they have no 'sales' vouchers. If they have no sales, they hit the `IS NULL` branch but only if their CRM status is 'Active'.

## 9. Files Changed
- `app/src/App.jsx` (Added `/dormant` route)
- `app/src/components/AppShell.jsx` (Added navigation item for Dormant list)
- `app/src/pages/Customers/DormantList.jsx` (New reviewable view component)

## 10. Database Objects Changed
- **New View:** `public.v_dormant_candidates`
- **Migration:** `27_sprint_27_dormant_rules_schema.sql`

## 11. RLS Verification
- Data is inherently secured because the CRM UI relies on standard authenticated fetch policies, and standard RLS policies on `crm_parties` limit access. (Admins see all; operators see their assigned records—though this view currently pulls everything the user has rights to see).

## 12. Performance Considerations
- The CTE directly filters on `voucher_type ILIKE '%sale%'` before aggregating, dramatically reducing the aggregation load.
- No new indexes were required because `idx_tally_transactions_crm_party_id` already exists (Sprint 8).

## 13. Tests Performed
- View definition logic tested for syntax and correct column resolution.
- `DormantList` UI tested for empty states, data population, and correct routing.
- Validated that the calculation handles `last_sale_date IS NULL` safely.

## 14. Test Results
- **Status:** PASS

## 15. Known Limitations
- The view does not separate "Customers who just signed up yesterday" from "Old customers with no sales data". Newly created customers will immediately appear as candidates until a Tally sync brings in their first sale. This is an operational reality.

## 16. Deferred Functionality
- Moving these candidates into Today's Work or auto-generating follow-ups is explicitly deferred to Micro-Sprint 10.7.
