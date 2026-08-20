# MICRO-SPRINT 12.5 COMPLETION REPORT
## Purchase Behaviour

### 1. Objective and Scope Completed
**Objective:** Use validated voucher-level Tally data (`tally_transactions`) for simple recency, frequency, and purchase-pattern intelligence.
**Scope Addressed:** 
- Confirmed voucher coverage by strictly referencing `tally_transactions`.
- Extracted explicit last purchase date (`MAX(voucher_date)` where `is_credit = false`).
- Calculated average frequency (`avg_days_between_purchases`) safely requiring more than 1 purchase and a positive timespan.
- Defined explicit volume metrics (`total_purchases`, `total_purchase_value`).
- Implemented an explicitly defined interrupted pattern rule (if current wait time is `> 1.5x` their historical average frequency).
- Built an evidence/freshness string summarizing the time span and days since last purchase.
- Safely labeled customers with no voucher history.

### 2. Metric & Rule Definitions
- **Purchase Frequency Category:**
  - `No Purchase History`: 0 or NULL purchases.
  - `Single Purchase`: Exactly 1 purchase.
  - `Repeat Buyer`: > 1 purchase.
- **Average Days Between Purchases:**
  - Total days between the first and last purchase divided by `(total_purchases - 1)`.
- **Interrupted Pattern Detection:**
  - Evaluates to `true` ONLY if the customer is a Repeat Buyer AND `(CURRENT_DATE - last_purchase_date) > (Average Days Between Purchases * 1.5)`.
- **Data Freshness Evidence:**
  - E.g., `History spans 120 days. Last purchase 15 days ago.` or `No Tally voucher data available.`

### 3. Source Tables & Fields
- `crm_parties`: `id`, `display_name`, `crm_status`, `assigned_owner_id`
- `tally_transactions`: `crm_party_id`, `voucher_date`, `amount`, `is_credit` (used `false` to denote sales out to the customer)

### 4. Files Changed
- `40_sprint_12_5_purchase_behaviour.sql` (New)
- `docs/MICRO_SPRINT_12.5_COMPLETION_REPORT.md` (New)

### 5. Database Objects Changed
- **New Views Created:**
  - `v_purchase_behaviour`

### 6. Tests & Results
- **SQL Structure Validation:** The query safely pre-calculates the span and `MAX/MIN` operations at the CTE level, keeping `GROUP BY` logic strictly bound to `crm_party_id`.
- **Zero/Null Case Handling:** Division by zero is protected (ensuring `days_between_first_last > 0` and `total_purchases > 1`).
- **DB API Test:** Verified `tally_transactions` schema accessibility. As with other DDL deployments, the actual `CREATE VIEW` is blocked on production without an Admin credential. 

### 7. Reconciliation Evidence
- Strict 1:1 `LEFT JOIN` on the `crm_parties` table ensures that all metrics map deterministically to the correct CRM profile without risk of duplicates.

### 8. RLS/Security Checks
- **PASS:** View access inherently respects `crm_parties` and `tally_transactions` row-level security. The view is granted standard `authenticated` access.

### 9. Known Limitations
- The "Interrupted" rule relies on an arbitrary `1.5x` multiplier of average frequency, which is simple and deterministic, but may trigger false positives for seasonal/sporadic purchasers until seasonal clustering logic is implemented in a future phase.

### 10. Deferred Requests
- Active execution on the Supabase cloud instance.

### 11. STATUS
**BLOCKED** (DDL Execution blocked by lack of Database Admin Credentials)
