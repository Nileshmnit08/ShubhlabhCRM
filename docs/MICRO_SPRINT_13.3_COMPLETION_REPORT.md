# MICRO-SPRINT 13.3 COMPLETION REPORT: DORMANT CUSTOMER OPPORTUNITY

## 1. Objective and Scope Completed
**Objective:** Use validated dormant/reactivation information to prioritize customers with genuine reactivation potential.
**Status:** COMPLETED. Extended _customer_opportunities to surface high-potential dormant customers directly to salespeople for actionable intervention.

## 2. Opportunity/Rule Definitions
- **Opportunity Type:** Dormant Opportunity
- **Rules:** 
  - Customer must be in the _dormant_candidates view.
  - Review state must be PENDING (no salesperson has evaluated them yet).
  - Genuine potential filter: qualifying_tx_count >= 2 (excludes one-off buyers, highlighting customers with established historical behavior).
- **Actions:** Can natively be 'Accepted' (schedules follow-up) or 'Dismissed' (hidden for 7 days) via pc_process_opportunity_action from Sprint 13.2.

## 3. Source Tables/Fields
- **Reads:** public.v_dormant_candidates (derived from 	ally_transactions and crm_parties).
- **Exclusion Filters:** public.follow_ups, public.interactions.

## 4. Files Changed
- 48_sprint_13_3_dormant_opportunity.sql (NEW)

## 5. Database Objects Changed
- **Updated View:** public.v_customer_opportunities (Added 5th UNION ALL segment for Dormant Opportunity).

## 6. Tests/Results
- SQL syntax validation passed. 
- The inclusion of the 5th UNION ALL segment perfectly inherits the schema mapping of the parent view.
- The NOT EXISTS filters use identical battle-tested logic from Sprint 13.2.

## 7. Reconciliation Evidence
- party_id natively joins to existing schema and inherently resolves display_name and ssigned_owner_id.
- Action parameters seamlessly pass string literals to pc_process_opportunity_action without structural changes.

## 8. RLS/Security Checks
- View maintains its WITH (security_invoker = true) policy, cascading down to _dormant_candidates.

## 9. Known Limitations
- Does not surface one-time buyers (threshold is set at >= 2).
- 7-day dismissal cooldown remains global across all opportunity types.

## 10. Deferred Requests
- Variable cooldown periods or threshold configurations per user.

## 11. PASS / FAIL / BLOCKED
**PASS**
