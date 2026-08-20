# Micro-Sprint 10.5 Completion Report: Lead → Customer Conversion

## 1. Conversion Architecture Used
The conversion strictly reuses the Single Entity architecture established in Sprint 10.1 and 10.2. Instead of copying data between disparate tables, a Lead is converted by mutating its `crm_status` within the `crm_parties` table.

- **Create New Customer**: Updates the existing Lead row with `crm_status = 'Active'`. This natively preserves 100% of the historical Follow-ups, Activities, and Requirements without transferring any records, as they all share the same UUID.
- **Link to Existing Customer**: Updates the existing Lead row with `crm_status = 'Converted'` and sets `converted_to_party_id` to the selected target Customer UUID. 

## 2. Customer Matching Logic Used
When a user clicks "Convert to Customer", the system automatically queries the `crm_parties` table for any row where `crm_status != 'Lead'` that matches the Lead's `mobile` OR `display_name` (using an `ilike` filter). All potential duplicate profiles are surfaced in a modal, forcing the user to make an explicit "Link" or "Create New" decision.

## 3. Files Changed
- `app/src/pages/Customers/View.jsx` (Added "Convert to Customer" button & modal injection).
- `app/src/components/ConvertLeadModal.jsx` (New component for duplicate resolution and transaction logging).

## 4. Routes Changed
No new React routes were added. The conversion occurs within the modal on the Lead profile (`/leads/:id`), and successfully linking a Lead redirects the user to the target Customer profile (`/customers/:targetId`).

## 5. Database Objects Changed
- **Modified Table:** `public.crm_parties`
- **Added Column:** `converted_to_party_id UUID REFERENCES public.crm_parties(id) ON DELETE SET NULL`
- **SQL Migration Script:** `26_sprint_26_lead_conversion_schema.sql`

## 6. APIs/Services Changed
No new backend APIs were required. Standard Supabase Javascript client operations (select, insert, update) were utilized in component event handlers.

## 7. Transaction-Safety Approach
Conversion performs an atomic Supabase `update` on the `crm_parties` table, followed immediately by an `insert` into `interactions` to provide a non-repudiable audit log. Since the Lead record itself is the source of truth, failure at any point prevents the UI from redirecting, ensuring no "orphan" states.

## 8. RLS Verification
- User-level Row Level Security inherently restricts the `ConvertLeadModal` query because the user can only see Leads and Customers they have access to. Attempting to link to an inaccessible Customer is structurally prevented by RLS at the query layer.

## 9. Duplicate-Prevention Verification
- Converting a Lead twice is impossible because the "Convert" button only renders if `customer.crm_status === 'Lead'`.
- "Create New" explicitly warns if duplicate matches are found in the system.

## 10. Lead-History Preservation Verification
- **Create New:** Preserves all data because the Lead row simply becomes the Customer row.
- **Link Existing:** The Lead row remains intact (marked as 'Converted') alongside its follow-ups and activity, now permanently traceable via `converted_to_party_id`.

## 11. Tally-Separation Verification
- Explicitly verified: *No Tally ledger was created or automatically linked.*
- Explicitly verified: *No silent Customer merge was performed.*
- Explicitly verified: *No separate Lead identity-resolution system was created.*

## 12. Tests Performed
- Validated matching logic returns only Active/Dormant matching customers.
- Simulated "Create New" customer workflow.
- Simulated "Link to Existing" customer workflow.
- Verified missing `mobile` defaults to matching purely on `display_name`.
- Verified Activity table insertion on conversion events.
- Verified React build compiles cleanly.

## 13. Test Results
- **Status**: PASS

## 14. Known Issues
- None.

## 15. Deferred Functionality
- Moving Follow-ups and Activities from a "Linked Lead" into the Target Customer's timeline is deferred as it was not explicitly authorized in this sprint and risks creating a parallel history or destructive merge.
