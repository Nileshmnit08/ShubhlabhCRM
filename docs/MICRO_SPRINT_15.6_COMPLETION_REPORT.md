# MICRO-SPRINT 15.6 COMPLETION REPORT: RETENTION & REPEAT-BUY WORKFLOW

## 1. Objective and Scope Completed
**Objective:** Help salespeople manage repeat-buy customers using transparent historical patterns.
**Status:** COMPLETED.

## 2. State/Rule Definitions
- **Retention Opportunity Types:** `Purchase Gap` (Established interrupted pattern) and `Onboarding Gap` (Insufficient history).
- **Workflow Trigger:** When a repeat-buy opportunity is identified, a distinct yellow "Retention & Repeat-Buy" banner appears on the customer profile.
- **Evidence Visibility:** The banner explicitly displays the rationale (e.g., "Avg purchase gap is X days..." or "Insufficient history for baseline").
- **Controlled Communication:** Clicking "Start Retention Workflow" primes a follow-up task with the dedicated `Retention` type.
- **Outcomes Tracking:** The `FollowUps/Form.jsx` enforces retention-specific outcomes (`Order placed`, `Not ready yet`, `Follow-up later`, `No response`, `Lost to competitor`).

## 3. Source Tables/Fields
- **Table:** `public.follow_ups` (Field: `follow_up_type = 'Retention'`)
- **View:** `public.v_customer_opportunities` (Fetches `Purchase Gap` and `Onboarding Gap`)

## 4. Files Changed
- `app/src/pages/Customers/View.jsx` (Added Retention Banner and workflow initiation)
- `app/src/pages/FollowUps/Form.jsx` (Added Retention task outcomes and next-action scheduling)

## 5. Database Objects Changed
- None required. Leveraged the existing Phase 13 Opportunity definitions.

## 6. Tests/Results
- **Rules documented:** Passed. Purchase gaps vs. Onboarding gaps are handled differently and explicitly labeled.
- **Evidence visible:** Passed. The UI directly outputs the SQL intelligence string to the salesperson.
- **Insufficient history handled:** Passed. `Onboarding Gap` clearly denotes lack of baseline data.
- **Action created:** Passed. Clicking the button opens the Follow-up form correctly typed to `Retention`.
- **Outcome recorded:** Passed. Handled natively via `FollowUps/Form.jsx`.

## 7. Regression Results
- Normal `Lead` and `General` follow-up scheduling from the customer profile remains intact.

## 8. Tally Reconciliation Evidence
- Tally data acts as the ultimate truth for purchase history (via Phase 12 `v_purchase_behaviour`). The CRM uses this to suggest follow-ups without altering financial records.

## 9. RLS/Security Checks
- Operator views respect standard `party_id` RLS filters.

## 10. Known Limitations
- The system relies on Tally voucher syncs. If Tally sync is delayed, the purchase gap calculation may be artificially prolonged.

## 11. Deferred Requests
- None.

## 12. PASS / FAIL / BLOCKED
**PASS**
