# Micro-Sprint Completion Report: Dormant Candidates – Customer Search

## Objective
Add a dynamic, case-insensitive customer search field to the Dormant Candidates page, allowing users to quickly find specific customers by name without altering the existing triage workflow or underlying data architecture.

## Implementation Details

### UI Updates (`app/src/pages/Customers/DormantList.jsx`)
1. **Search Input Field**: Added a text input field to the existing filter panel (the "glass-panel" above the data table) specifically for searching customer names.
2. **Component Reuse**: Utilized the existing Shubh Labh CRM input styling, complete with a `Search` icon for context and an `X` clear button that appears when text is entered to easily reset the search.
3. **Empty State**: The search naturally integrates with the existing table logic. If a search yields no matches, the standard empty-state placeholder ("No candidates found in this view") is displayed automatically.

### Logic & Data Integration
1. **State Management**: Added a new `search` property to the existing `filters` state object. Updates to the search field dynamically trigger the data fetch `useEffect`.
2. **Query Modification**: The `fetchDormantCandidates` function was updated to conditionally apply an `.ilike('display_name', '%search_term%')` clause to the Supabase query. This provides the required case-insensitive, partial-match searching natively through the database without pulling in extraneous data.
3. **Scope Adherence**: 
   - The query still sources directly from the established `v_dormant_candidates` view.
   - All other filters (Review State, Assigned Staff) continue working in tandem with the search field.
   - No customer data, triage rules, or database schemas were modified.

## Testing Performed
- [x] Search for a customer by their exact name.
- [x] Search using partial name fragments (case-insensitive) and confirm correct results.
- [x] Search for a non-existent name and verify the empty-state pattern appears.
- [x] Use the clear (`X`) button to instantly reset the search and restore the full list.
- [x] Verify the search field scales properly on mobile and desktop layouts alongside other filters.

## Status
Ready for Product Owner approval.
