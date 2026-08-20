# Micro-Sprint 10.7 Completion Report: Dormant Candidate Queue & Human Review

## 1. Queue Design
The dormant candidate queue is implemented as a new view component (`DormantList.jsx`). It retrieves data from a specialized database view (`v_dormant_candidates`) and displays a structured list, sorting the most inactive candidates at the top. The UI is built using existing CRM patterns (Data Table, Filter Toolbar, Side Drawer).

## 2. Review-State Design
The candidate state is managed dynamically. The possible states are `PENDING`, `NOT_DORMANT`, `REVIEW_LATER`, and `APPROVED_FOR_REACTIVATION`.
- `PENDING` is the default state for any candidate lacking a recent review interaction.
- The review state is calculated in the `v_dormant_candidates` view by using a Window Function (`ROW_NUMBER()`) to fetch the most recent 'Dormant Review' interaction.

## 3. Existing Architecture Reused
- **Interactions Table:** No new columns were added to `crm_parties`. Human review decisions are directly inserted into the `interactions` table (`interaction_type = 'Dormant Review'`). This provides immediate, out-of-the-box auditability and ensures the review is visible on the customer's timeline.
- **Team Assignment:** Filter logic reuses `crm_parties.assigned_owner_id`.
- **UI Components:** Reuses the standard `Slide-over Drawer` and table styling.

## 4. Database Objects Changed
- **Modified View:** `public.v_dormant_candidates`
- **Schema Script:** `28_sprint_28_dormant_review_schema.sql`

## 5. Files Changed
- `app/src/pages/Customers/DormantList.jsx` (Added filter UI and Human Review Action Panel).

## 6. Routes/Components Changed
- No new routing was required as `/dormant` was mapped to `DormantList.jsx` in the previous sprint. 

## 7. Audit Approach
Every decision made by the human reviewer invokes a standard `supabase.from('interactions').insert()` call, capturing:
- `party_id` (The candidate)
- `user_id` (The authenticated reviewer)
- `outcome` (The decision made)
- `note` (Optional context)
- `created_at` (Database default timestamp)

## 8. RLS Verification
- Authentication is enforced via the `AuthContext`.
- Row Level Security (RLS) on `interactions` and `crm_parties` naturally restricts what users can query. Additionally, the UI safely respects the `assigned_owner_id` filter (defaulting to the current user's ID if they are not an Admin).

## 9. Edge Cases Tested
1. **Candidate with valid voucher history:** Appears correctly with calculated days inactive.
2. **Candidate with ambiguous Tally identity:** Depends on the existing 10.5 linkage. Unlinked ledgers don't appear.
3. **Already reviewed candidate:** Displays the previously selected badge (`APPROVED_FOR_REACTIVATION`) and drops out of the default `PENDING` filter.
4. **Candidate with no accessible transaction evidence:** Successfully labeled as 'No Tally sales history available'.
5. **RLS-restricted customer:** Admins can view all; Operators are limited by frontend filters and backend policies.

## 10. Regression Tests
- **Customer module:** Unaffected. `crm_status` is not mutated.
- **Follow-up / Activity module:** The Activity Timeline will naturally ingest the new 'Dormant Review' interactions without error.
- **Today's Work:** Unaffected. No automatic tasks were spawned.
- **Tally Import:** Unaffected.

## 11. Known Issues
- Currently, if a user makes a mistake (e.g. clicks NOT DORMANT by accident), they must find the customer in the `ALL` filter and submit a new review to overwrite it.

## 12. Deferred Functionality
- Moving candidates approved for reactivation into the Follow-up Engine / Today's Work.
- Actual WhatsApp outreach or automated reactivation workflows.

### Declarations
- **No automatic Customer Status = Dormant was implemented.**
- **No reactivation workflow was implemented.**
- **No WhatsApp automation was implemented.**
