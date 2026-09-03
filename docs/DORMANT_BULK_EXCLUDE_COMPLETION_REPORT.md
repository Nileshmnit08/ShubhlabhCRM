# Micro-Sprint Completion Report: Dormant Candidates – Bulk Exclude Customers

## Objective
Add a controlled way to remove customers who are no longer relevant from the Dormant Candidates working list via a bulk exclusion feature, while strictly preserving all underlying customer data, history, and financial records.

## Implementation Details

### UI Updates (`app/src/pages/Customers/DormantList.jsx`)
1. **Bulk Selection Mechanism**: Added selection checkboxes to the Dormant Candidates table (both a "select all" header checkbox and row-level checkboxes). Selected rows are managed efficiently using a `Set`.
2. **Bulk Action Bar**: Introduced a sticky bulk action bar that becomes visible when one or more candidates are selected, displaying the selected count and the "Exclude from Dormant Candidates" button.
3. **Confirmation Check**: The exclude action safely prompts for user confirmation before executing the bulk exclusion via `window.confirm`.
4. **Visibility & Filtering**: Added "Excluded" (`EXCLUDED`) as an explicit option in the Review State dropdown filter. This allows users to easily view candidates they have excluded from the standard "Pending" queue.
5. **Review Badges**: Updated `getReviewBadge` to support rendering a distinct red badge for `EXCLUDED` candidates.

### Data & Logic Approach
1. **Leveraging Existing Systems**: Rather than modifying the `crm_parties` table or removing records from the database, the bulk exclude leverages the pre-existing `interactions` system designed for dormant reviews.
2. **Exclusion Execution**: The action inserts a new interaction with `interaction_type = 'Dormant Review'` and `outcome = 'EXCLUDED'` for each selected candidate.
3. **View Compatibility**: Because the `v_dormant_candidates` view naturally joins with the latest `Dormant Review` interaction to calculate `review_state`, these excluded candidates immediately transition from `PENDING` to `EXCLUDED`.
4. **Data Preservation**: 
   - No customer records are deleted.
   - Financial data and Tally sync mechanisms remain untouched.
   - The original Dormant Candidates view logic (`v_dormant_candidates`) continues working seamlessly for all non-excluded customers.

## Testing Performed
- [x] Select a single customer and verify exclusion functionality.
- [x] Select multiple customers using "Select All" or individual checkboxes and verify bulk exclusion.
- [x] Confirm that cancellation of the exclusion prompt cancels the operation properly.
- [x] Verify that excluded customers immediately disappear from the default "Pending Review" list.
- [x] Filter by "Excluded" in the Review State dropdown and confirm the excluded candidates are visible.
- [x] Refresh the page and confirm exclusions persist reliably.
- [x] Verify no underlying customer history or sales data was impacted.

## Status
Ready for Product Owner approval.
