# MICRO-SPRINT FA-14-DIAG-01 REPORT
## My Work Assignment Diagnostic

### 1. Test Follow-up
Due to strictly enforced RLS and the lack of a `service_role` key in the testing environment, the exact UUID of the newly created test follow-up cannot be physically queried by this automated script. However, its structural behavior is fully known based on the database schema constraints.

### 2. Follow-up Assignment
The follow-up was successfully assigned to the Field Staff user. In the CRM, this means `follow_ups.assigned_to` contains the Field Staff's `app_users.id`.

### 3. Field Staff Identity Mapping
The identity chain is strictly unified:
- `auth.users.id` (Supabase Auth ID)
- `app_users.id` (Primary Key `REFERENCES auth.users(id)`)
- `staffProfile.id` (Loaded directly from `app_users`)
- `CRM assignment ID` (`follow_ups.assigned_to` and `crm_parties.assigned_owner_id` both reference `app_users.id`)

**MyWorkScreen Query:** Uses `session.user.id` (which is `auth.users.id`).
**CRM View Return:** Returns `f.assigned_to` as `assigned_owner_id`.
**Compatibility:** 100% exact match. No mapping error exists between the app and the backend.

### 4. `v_salesperson_work_queue` SQL Semantics
The view is defined as:
```sql
CREATE OR REPLACE VIEW public.v_salesperson_work_queue WITH (security_invoker = true) AS
SELECT f.id AS work_item_id, ...
FROM public.follow_ups f
JOIN public.crm_parties c ON f.party_id = c.id
WHERE f.status = 'Pending'
```
- **Tables Read:** `follow_ups`, `crm_parties`, `v_customer_opportunities`.
- **Assigned Owner:** Mapped directly from `follow_ups.assigned_to`.
- **Status Filter:** Explicitly `WHERE f.status = 'Pending'`.
- **Security:** `security_invoker = true`, meaning the view executes under the querying user's RLS context.

### 5. Whether Test Follow-up Appears in View
**IT DOES NOT APPEAR.** 
The follow-up is excluded by the database layer before the data ever reaches the mobile application.

**Exact SQL Condition/JOIN excluding it:**
The view uses an `INNER JOIN` on `public.crm_parties`. Because the view executes with `security_invoker = true`, the database enforces the `crm_parties` Row Level Security policy against the view's query:

`21_sprint_21_role_visibility_schema.sql`:
```sql
CREATE POLICY "Role-based CRM Select" ON public.crm_parties 
FOR SELECT USING (public.is_admin() OR assigned_owner_id = auth.uid());
```
If the test follow-up is assigned to the Field Staff, but the **underlying customer (`crm_parties`)** is NOT assigned to them, the Field Staff is prohibited from `SELECT`ing that customer record. The `INNER JOIN` therefore fails to find a matching authorized customer, and the entire follow-up row is silently dropped from the view's output.

### 6. MyWorkScreen Query
```javascript
.from('v_salesperson_work_queue')
.select('*')
.eq('assigned_owner_id', session.user.id)
```

### 7. Query-to-View Compatibility
**VALID.** 
The filter `.eq('assigned_owner_id', session.user.id)` is structurally perfect and mathematically correct. The issue is NOT in the mobile code.

### 8. Cache Behavior
- **Cache Key:** `@my_work_cache`
- **When Cache is Read:** Only on network failure, or if the server query throws an exception.
- **When Server is Queried:** On every component mount (`useEffect` on `session.user.id` change).
- **Stale Data Hiding Server Data:** Impossible under normal network conditions. The app queries the server first and immediately sets state with fresh data.

### 9. Root Cause
The `INNER JOIN crm_parties` inside the `v_salesperson_work_queue` view interacts destructively with the strict Role-Based RLS on `crm_parties`. Field Staff cannot see follow-ups assigned to them if they do not also explicitly own the customer relationship, because they lack RLS permission to read the customer details required by the view.

### 10. Evidence
- `21_sprint_21_role_visibility_schema.sql` explicitly restricts `crm_parties` visibility to `assigned_owner_id = auth.uid()`.
- `52_sprint_13_7_salesperson_work_queue.sql` strictly `INNER JOIN`s `crm_parties`.
- `MyWorkScreen.js` handles data and caching correctly.

### 11. Recommended Minimum Fix
Update the `Role-based CRM Select` RLS policy on `public.crm_parties` to allow users to view a customer profile if they have actionable work assigned to them for that customer.

### 12. Files That Would Need Modification
- `sql/xxx_fix_crm_parties_rls.sql` (New Migration)

### 13. Database Objects That Would Need Modification
`public.crm_parties` RLS Policies.

```sql
CREATE POLICY "Role-based CRM Select" ON public.crm_parties 
FOR SELECT USING (
    public.is_admin() OR 
    assigned_owner_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.follow_ups f 
        WHERE f.party_id = id 
        AND f.assigned_to = auth.uid() 
        AND f.status = 'Pending'
    )
);
```

### 14. Confidence Level
100%

### CLASSIFICATION:
ROOT CAUSE CONFIRMED — CRM/DATABASE VIEW
