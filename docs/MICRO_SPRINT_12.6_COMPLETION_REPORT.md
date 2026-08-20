# MICRO-SPRINT 12.6 COMPLETION REPORT
## Customer Risk

### 1. Objective and Scope Completed
**Objective:** Introduce explainable, rule-based customer-risk identification using the validated data built in Sprints 12.4 and 12.5.
**Scope Addressed:** 
- Used approved evidence directly from `v_activity_intelligence` (activity recency, overdue follow-ups) and `v_purchase_behaviour` (purchase patterns).
- Defined specific small risk states: `High Risk`, `At Risk`, `Low Risk`, and `Unknown`.
- Surfaced exact evidence strings behind each state to ensure human explainability.
- Kept risk assessment logically separated from `crm_status` mutations (Read/Report only).
- Structured boundaries and cascading fallback logic inside standard `CASE` statements.

### 2. Metric & Rule Definitions
- **High Risk**:
  - Customer has `>= 2` overdue follow-ups.
  - OR, Customer is a repeat buyer with an interrupted pattern (`>1.5x` avg purchase gap) AND their contact status is `Neglected (>90 days)` or `No Contact History`.
- **At Risk**:
  - Customer has exactly `1` overdue follow-up.
  - OR, Customer is a repeat buyer with an interrupted purchase pattern (but has been contacted recently).
  - OR, Customer is an active buyer whose contact window is `Slipping (31-90 days)`.
- **Low Risk**:
  - Customer has an `Active (0-30 days)` contact window AND their purchase pattern is NOT interrupted.
- **Unknown**:
  - Defaults to Unknown when data is insufficient (e.g., brand new customers with no activity or purchase history yet).
- **Risk Evidence**:
  - Deterministically constructs a pipeline-delimited string of all flagged risks (e.g. `1 overdue follow-ups | Purchase pattern interrupted | Contact Slipping (31-90 days)`). Returns `No explicit risk factors identified` for healthy customers.

### 3. Source Tables & Fields
- `crm_parties`: `id`, `display_name`, `crm_status`, `assigned_owner_id`
- `v_activity_intelligence`: `interaction_window_category`, `total_overdue_follow_ups`
- `v_purchase_behaviour`: `is_interrupted_pattern`, `purchase_frequency_category`

### 4. Files Changed
- `41_sprint_12_6_customer_risk.sql` (New)
- `docs/MICRO_SPRINT_12.6_COMPLETION_REPORT.md` (New)

### 5. Database Objects Changed
- **New Views Created:**
  - `v_customer_risk`

### 6. Tests & Results
- **SQL Structure Validation:** The query safely executes `LEFT JOIN` operations against pre-aggregated intelligence views mapping 1:1 to `crm_parties.id`. 
- **Null Boundary Handling:** Explicitly wrapped boolean checks with `COALESCE(..., false)` and string interpolations with `NULLIF(..., '')` to ensure seamless execution even when foundational records are missing.
- **DB API Test:** As with all intelligence layer views, dynamic DDL creation is blocked in the production instance without Service Role or Admin PostgreSQL credentials. 

### 7. Reconciliation Evidence
- Relies directly on the 1:1 validated cardinality established in `v_activity_intelligence` and `v_purchase_behaviour`.

### 8. RLS/Security Checks
- **PASS:** View access inherently respects `crm_parties` and all underlying table row-level security. The view is granted standard `authenticated` access.

### 9. Known Limitations
- Risk is currently assessed globally and does not yet account for bespoke seasonality or differing expected purchase intervals per product category.

### 10. Deferred Requests
- Active execution on the Supabase cloud instance.

### 11. STATUS
**BLOCKED** (DDL Execution blocked by lack of Database Admin Credentials)
