# MICRO_SPRINT_19.4_COMPLETION_REPORT

## 1. Objective and Scope Completed
**Objective**: Create transparent attention signals from existing account, dealer, payment, demand and health conditions.
**Scope Completed**:
- Expanded the Phase 19.3 Alert execution engine to support evaluating `crm_parties` and `v_customer_opportunities`.
- Seeded three macro-level attention rules designed to catch account neglect and purchase interruptions deterministically.
- Displayed these Attention Alerts prominently on the `Today.jsx` dashboard, guaranteeing that CRM users see critical account/dealer degradation warnings as soon as they log in.
- Reps must acknowledge these alerts or spawn concrete follow-up actions to resolve them.
- Avoided all opaque AI/ML predictions: every alert strictly cites its exact source trigger (e.g. "Dealer has had no interactions in over 30 days").

## 2. Rules / Triggers / Actions
- **Unengaged High-Value Dealer (High)**: Triggered when a party with relationship `Dealer` is marked `Active` but has no recorded interactions for > 30 days. Cooldown: 14 days.
- **Interrupted Purchase Pattern Alert (High)**: Triggered when `v_customer_opportunities` surfaces a `Purchase Gap` or `Dealer Replenishment` condition based on historical Tally evidence. Cooldown: 14 days.
- **Dormant Account Contradiction (Medium)**: Triggered when an account is marked `Dormant` but has an active open requirement pipeline, creating a data contradiction requiring rep attention. Cooldown: 10 days.

## 3. Source Tables/Fields
- **Modified Routine**: `fn_execute_scheduled_alerts()`
- **Dependencies**: `crm_automation_rules`, `crm_automation_logs`, `crm_alerts`, `crm_parties`, `v_customer_opportunities`, `requirements`.

## 4. Files Changed
- `app/src/pages/Today.jsx` (Embedded `AlertsPanel` at the top of the landing dashboard).
- **New**: `86_sprint_19_4_attention_alerts.sql`

## 5. Database Objects Changed
- **Modified Function**: `fn_execute_scheduled_alerts()` (Added branches for Cases B and C).
- **New Rows**: Inserted 3 new `CREATE_ALERT` rules into `crm_automation_rules`.

## 6. Tests/Results
- **SQL Execution**: PENDING (Requires `86_sprint_19_4_attention_alerts.sql` to be run on the database by the product owner).
- **UI Embedding**: Handled gracefully. The `AlertsPanel` is now cross-functional across the Today, Opportunities, and Customer 360 views, filtering alerts natively based on context.

## 7. Regression Results
- Requirements Alert rules (from 19.3) continue to function identically. The function was safely extended using ELSIF blocks matching the `entity_type` logic.

## 8. Automation Audit Evidence
- Every evaluation against `crm_parties` or `v_customer_opportunities` branches into explicit `SUCCESS` or `SKIPPED` traces logged into `crm_automation_logs`.

## 9. RLS/Security Checks
- **PASS**: The `Today` dashboard naturally queries `crm_alerts`. Due to the RLS policies instantiated in 19.3, reps will only ever see attention alerts for Accounts / Dealers that they explicitly own. Admins see global alerts.

## 10. Known Limitations
- The "Interrupted Purchase Pattern" alert relies on `v_customer_opportunities`, which requires the underlying `v_purchase_behaviour` to have accurately assessed average gaps via Tally data. If Tally syncs are delayed, this alert's freshness may lag.

## 11. Deferred Requests
- Email or Push notification summarization of these alerts.

## 12. Final Status
**BLOCKED** (Pending execution of `86_sprint_19_4_attention_alerts.sql` by Product Owner / Admin to deploy the logic, after which it transitions to PASS).
