# INTELLIGENCE READINESS & KPI REGISTRY
**Project:** Shubh Labh CRM
**Phase:** 19.9

This registry defines the core metrics of the CRM, explicitly separating deterministic observed data from future estimates, and documents the data gaps and freshness limitations to ensure trustworthy intelligence.

---

## 1. Validated CRM KPIs (Observed Metrics)

These metrics are derived directly from immutable or heavily audited CRM/Tally structures. They are strictly deterministic.

### A. Customer & Dealer Health
- **Active Dealer Coverage**: 
  - *Formula*: Count of `crm_parties` (where `relationship_type = 'Dealer'` AND `crm_status = 'Active'`) grouped by `territory_id`.
  - *Source*: `public.v_dealership_network`
- **Dormancy Rate**: 
  - *Formula*: (Count of accounts in `Dormant` status / Total Active + Dormant accounts) * 100.
  - *Source*: `public.crm_parties.crm_status`
- **Overdue Task Ratio**:
  - *Formula*: Count of `follow_ups` (status='Pending' & due_at < NOW()) / Total 'Pending' `follow_ups`.
  - *Source*: `public.follow_ups`

### B. Demand & Sales Pipeline
- **Open Pipeline Value (Estimated)**:
  - *Formula*: SUM(`requirements.quantity` * [Standard Item Price]) for all Open Requirements.
  - *Source*: `public.requirements`, `public.products`.
  - *Note*: Value is estimated because exact pricing is negotiated in Tally.
- **Conversion Velocity**:
  - *Formula*: Average days between `requirement.created_at` and linked `tally_transaction` date.
  - *Source*: `public.requirement_signals` (linking `requirements` to `tally_transactions`).
- **Product Demand Heatmap**:
  - *Formula*: SUM(`quantity`) grouped by `product_type` and `territory_id`.
  - *Source*: `public.v_territory_demand_heatmap`

### C. Financial & Tally Signals
- **Purchase Cycle Gap**:
  - *Formula*: Current Date - `last_transaction_date`. If Gap > `avg_cycle_days`, flag as 'Purchase Gap'.
  - *Source*: `public.v_customer_opportunities` (aggregates `tally_transactions`).
- **Realized Tally Revenue**:
  - *Formula*: SUM(Amount) from `tally_transactions` for Sales Vouchers in the current period.
  - *Source*: `public.tally_transactions`

---

## 2. Freshness Expectations & Limitations

| Data Domain | Freshness | Limitations / Risks |
| :--- | :--- | :--- |
| **CRM Party Data** | Real-time | Dependent on human entry. Prone to missing mobile numbers or owners. |
| **Follow-ups & Alerts** | Real-time | Can become stale if users ignore notifications (mitigated by Sprint 19.6 Rules). |
| **Tally Transactions**| Batch / Periodic | Dependent on the Tally Sync frequency (e.g., hourly/daily). Financial metrics observed mid-day may be incomplete until the EOD sync. |
| **Purchase Gaps** | Next-Sync | A customer may have ordered via Tally directly, but the CRM won't clear the "Purchase Gap" alert until the sync executes. |

---

## 3. Identified Data Gaps
1. **Financial Margins**: Tally syncs gross amounts and items, but exact per-order profit margins are not currently modeled in the CRM, preventing "Most Profitable Customer" rankings.
2. **Communication Sentiments**: We track *that* a WhatsApp draft was sent, but we do not track the customer's *reply* or the sentiment of the conversation.
3. **Geospatial Precision**: Territories are mapped logically (City/State), but missing precise Lat/Long coordinates, preventing strict visual map routing.

---

## 4. Future AI & Predictive Candidates (DO NOT IMPLEMENT YET)

The data architecture is now clean and deterministic enough to support predictive models in Phase 20+. These are the approved candidates:

- **Predictive Churn Scoring (AI)**:
  - *Concept*: Analyze interaction history, purchase cycle variance, and follow-up delays to score the probability of an Active customer slipping to Dormant *before* it happens.
- **Dynamic Replenishment Forecasting (AI)**:
  - *Concept*: Move beyond the deterministic `avg_cycle_days` math and use seasonality/weather/crop cycles to predict exactly when a Feed Dealer needs broiler starter vs. finisher.
- **Lead Quality Scoring (AI)**:
  - *Concept*: Score incoming Leads (from IndiaMART / JustDial) based on historical conversion patterns of similar geographic or business profiles.
- **Route / Visit Optimization (Heuristic/AI)**:
  - *Concept*: Suggest the optimal daily travel path for a field rep based on the highest-priority overdue follow-ups and geographic density.
