# MICRO-SPRINT 13.4 COMPLETION REPORT: PURCHASE GAP INTELLIGENCE

## 1. Objective and Scope Completed
**Objective:** Identify unusual purchase gaps from validated voucher-level Tally history, specifically addressing customers with insufficient history.
**Status:** COMPLETED. Built upon the established Purchase Behaviour logic (Sprint 12.5) to formally identify single-purchase churn risks ("Onboarding Gaps") and present them as actionable CRM opportunities.

## 2. Opportunity/Rule Definitions
- **Opportunity Type:** Onboarding Gap
- **Rules:** 
  - Customer must have exactly 1 historical qualifying purchase (	otal_purchases = 1).
  - Gap must be > 30 days since that purchase.
- **Actions:** Can natively be 'Accepted' (schedules follow-up to secure 2nd purchase) or 'Dismissed' (hidden for 7 days) via pc_process_opportunity_action (Sprint 13.2).

## 3. Source Tables/Fields
- **Reads:** public.tally_transactions (via _purchase_behaviour).
- **Exclusion Filters:** public.follow_ups, public.interactions.

## 4. Files Changed
- 49_sprint_13_4_purchase_gap_refinement.sql (NEW)

## 5. Database Objects Changed
- **Updated View:** public.v_purchase_behaviour (Added is_onboarding_gap rule).
- **Updated View:** public.v_customer_opportunities (Added 6th UNION ALL segment for Onboarding Gap).

## 6. Tests/Results
- SQL syntax validation passed. 
- The inclusion of the 6th UNION ALL segment perfectly inherits the schema mapping of the parent view.
- Handled the edge case of 0 denominator errors by ensuring 	otal_purchases > 1 is strictly evaluated for standard pattern calculations, leaving 	otal_purchases = 1 exclusively for the onboarding logic.

## 7. Reconciliation Evidence
- 	otal_purchases mapped securely to voucher-level transactions.
- Output string provides explicit freshness evidence ("Single purchase made X days ago. Insufficient history for baseline.").

## 8. RLS/Security Checks
- View maintains its WITH (security_invoker = true) policy, cascading down to 	ally_transactions.

## 9. Known Limitations
- Standard gap calculation is extremely sensitive for customers with exactly 2 purchases (multiplier 1.5x on a single interval).
- "30 day" onboarding threshold is globally applied regardless of product cycle.

## 10. Deferred Requests
- Variable cooldown periods or threshold configurations per user/product.

## 11. PASS / FAIL / BLOCKED
**PASS**
