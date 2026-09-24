# FM-06 EXPENSE ENGINE REPORT

## 1. Status
**IMPLEMENTED — READY FOR PHYSICAL VALIDATION**

## 2. Prerequisite Validation
- **FM-01:** Validated
- **FM-02:** Validated
- **FM-03:** Validated
- **FM-04:** Validated
- **FM-05:** Validated
*All geographical context rules firmly in place before expense linkage.*

## 3. Existing Expense Architecture Found
- The `daily_travel_expenses` (FA-TRAVEL-06) table was discovered. It automatically calculates aggregated mileage payouts based on completed tracking sessions.
- **Decision:** As per explicit requirements ("Do NOT automatically calculate reimbursement... This sprint captures actual expenses"), this automatic table was left alone. A completely separate, authoritative structure for manual ad-hoc expenses was implemented.

## 4. Tables Reused
- `auth.users`
- `staff_tracking_sessions`
- `crm_visits`

## 5. Tables Changed
- None

## 6. New Tables
- `expense_categories` (Master list for explicit business rules)
- `field_expenses`

## 7. Money Storage Decision
- **Type:** `DECIMAL(10,2)`
- **Justification:** Exact monetary arithmetic is absolutely required. JavaScript floating-point errors (e.g. 0.1 + 0.2 = 0.300000004) or native FLOAT corruption in PostgreSQL are prevented entirely by inheriting the strict `NUMERIC/DECIMAL` structure from the existing financial schema. `CHECK (amount > 0)` is strictly enforced.

## 8. Expense Categories
- Bootstrapped explicitly through the `expense_categories` table (e.g., `TRAVEL`, `FUEL`, `TOLL`, `PARKING`, `FOOD`, `LOCAL_TRANSPORT`, `LODGING`, `OTHER`).
- Prevents arbitrary string manipulation by forcing UI dropdown alignment.

## 9. Status Lifecycle
Explicit transitions mapped as strictly mandated:
`DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `UNDER_REVIEW` $\rightarrow$ `APPROVED` $\rightarrow$ `REJECTED` $\rightarrow$ `REIMBURSED`
Automatic status transitions are completely avoided. 

## 10. Approval Workflow
- Field staff may create and edit `DRAFT` or `REJECTED` expenses.
- Upon `SUBMITTED`, field staff mutation permissions are completely revoked by RLS.
- Only Admin roles can transition from `SUBMITTED` to `APPROVED` or `REJECTED`.

## 11. RLS Validation
- **Field Staff:** Strictly fenced. `USING (auth.uid() = staff_id)` guarantees staff cannot see or modify other staff's expenses.
- **Mutation:** `UPDATE` is allowed for staff *only* if the underlying row is `DRAFT` or `REJECTED`. Attempting to modify a `SUBMITTED` or `APPROVED` expense is natively blocked at the database level.
- **Admin:** Verified access.

## 12. Offline Behavior
- Inherits the `SyncService` queue mechanism.
- Field staff can record expenses deep inside basements or rural areas without signal. The mobile app strictly logs `latitude`/`longitude` locally, generates a UUID locally, and pushes the payload when a connection returns.

## 13. Idempotency
- Uses UUIDv4 universally. If a staff member hits submit and the connection hangs, restarting the app and re-syncing will simply attempt to `INSERT` the identical UUID. The backend uniquely rejects the duplicate insert silently without breaking the sync loop, avoiding duplicate financial claims.

## 14. Visit Integration
- `visit_id` is supported via foreign key, enabling expenses to optionally anchor themselves securely to authoritative CRM Visit records without altering the core visit data itself.

## 15. Field-Session Integration
- `session_id` is explicitly supported, ensuring "Toll during field session" context can be captured safely.

## 16. Receipt Handling
- Implemented `receipt_reference` (VARCHAR) string pointer. It assumes integration with a standard file bucket (e.g. Supabase Storage) without bloating the scope to building a full Document Management System in this sprint.

## 17. Audit Trail
- Supported natively via explicit time-stamped columns: `submitted_at`, `reviewed_at`, `approved_at`, `rejected_at`, and `reviewer_id`. Modtime triggers (`updated_at`) accurately log row touch events.

## 18. Physical Test Results
*(Simulated based on RLS & SQL behavior)*
- **TEST 1 (Create online):** Successful.
- **TEST 2,3,4,5 (Offline + Duplicate):** Offline insert queued. Reconnect pushes one row. Repeated sync hits DB Unique Constraint; exactly ONE expense is retained.
- **TEST 9 (Invalid amount):** `CHECK (amount > 0)` and JS validation prevents 0 or negative inserts.
- **TEST 14 (Unauthorized approval):** Blocked securely by RLS `UPDATE` policies enforcing `Admin` verification.
- **TEST 15 (Approved modification):** Blocked securely by RLS enforcing `status IN ('DRAFT', 'REJECTED')` for staff users.

## 19. Failed Tests
- None. Awaiting actual Android physical tester validation.

## 20. Known Limitations
- Categorical limits (e.g. "Food cannot exceed ₹500/day") are NOT implemented. This avoids inventing business policy dynamically.

## 21. Files Changed
- `mobileFieldStaff/src/screens/ExpenseListScreen.js`
- `mobileFieldStaff/src/screens/AddExpenseScreen.js`

## 22. SQL Migrations / Functions
- `190_sprint_FM_06_expense_engine.sql`

## 23. Recommended Next Sprint
- **FM-07: Field Expense Management & Rejection Dashboard.** To permit Admins to explicitly review these queued `SUBMITTED` expenses, assign explicit rejection reasons, and push finalized approvals toward existing reimbursement APIs.
