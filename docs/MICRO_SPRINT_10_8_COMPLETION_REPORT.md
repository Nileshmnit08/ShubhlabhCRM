# Micro-Sprint 10.8 Completion Report: Dormant Customer Reactivation Workflow

## 1. Reactivation Workflow Implemented
A dedicated reactivation workflow was implemented via a new Reactivation Queue interface. The workflow strictly enforces the control gate: only candidates that have been explicitly marked as `APPROVED_FOR_REACTIVATION` by a human reviewer are visible and actionable.

## 2. Existing Follow-up Architecture Reused
Instead of creating a parallel tasking or follow-up system (like `reactivation_followups`), the existing `follow_ups` engine was fully reused. Reactivation tasks are created by inserting a standard follow-up with the existing `follow_up_type = 'Reactivation'`. 
This allows the task to naturally appear in the standard "Today's Work" aggregation for the assigned staff member.

## 3. Existing Activity Architecture Reused
When a Reactivation follow-up is marked as "Completed", the staff member is required to select an outcome (reusing Lead-style outcomes: Contacted, No response, Interested, Call later, Not interested). This automatically creates an entry in the `interactions` table, preserving the historical timeline of the customer.

## 4. Reactivation States
Reactivation state is derived organically without mutating `crm_parties`. The database view `v_reactivation_queue` checks the latest Reactivation follow-up:
- **APPROVED**: No follow-up exists yet.
- **IN_PROGRESS**: The latest follow-up is currently `Pending`.
- **COMPLETED**: The latest follow-up was `Completed` or `Cancelled`.

## 5. Duplicate-Protection Logic
Before a new Reactivation follow-up is created from the Reactivation Queue, the system checks `follow_ups` for any open (`Pending`) tasks of type `Reactivation` for that specific `party_id`. If one exists, creation is blocked and the UI alerts the user to go to their existing task.

## 6. Customer-Status Behavior
**CRITICAL**: At no point in this workflow is `crm_parties.crm_status` automatically manipulated. A customer remains 'Active' or whatever their master status is. Reactivation state remains entirely independent.

## 7. Files Changed
- `app/src/pages/Customers/ReactivationQueue.jsx` (New Workspace)
- `app/src/pages/FollowUps/Form.jsx` (Added Reactivation type outcomes and Activity integration)
- `app/src/App.jsx` (Mapped Route)
- `app/src/components/AppShell.jsx` (Added Sidebar Link)

## 8. Database Objects Changed
- **New View:** `public.v_reactivation_queue`
- **Schema File:** `29_sprint_29_reactivation_queue_schema.sql`

## 9. RLS Verification
- View and Queue components respect `assigned_owner_id`. Admin users can see all approved candidates; Operators can only see candidates assigned to them.
- Existing RLS policies on `follow_ups` and `interactions` were left perfectly intact.

## 10. Edge Cases Tested
1. **Candidate approved for reactivation:** Appears in queue.
2. **Candidate not approved:** Does not appear (filtered by view).
3. **Candidate already in progress:** Start form hides and redirects user.
4. **Candidate already completed:** Prompts user that the cycle is complete.
5. **Follow-up completion fails if no outcome selected:** Validation rule prevents empty outcomes.

## 11. Regression Tests
- **Customer module:** Unaffected.
- **Lead / Follow-up / Payment module:** Unaffected; existing conditional logic inside `FollowUps/Form.jsx` remains protected.
- **Today's Work:** Accurately displays the new tasks due to `follow_up_type` being fully supported.
- **Tally Import:** Untouched and separate.

## 12. Known Issues
- Currently, "Start New Reactivation Cycle" functionality is basic; the UI relies on resetting state locally for successive cycles. 

## 13. Deferred Functionality
- Automated WhatsApp templates or sequence sending.
- Automatic transition from 'Reactivated' back to 'Active Purchaser' (this should trigger upon the next successful Tally sales import rather than manual CRM clicks).

### Declarations
- **No WhatsApp automation was implemented.**
- **No automatic Customer Status change was implemented.**
- **No separate Reactivation Follow-up engine was created.**
