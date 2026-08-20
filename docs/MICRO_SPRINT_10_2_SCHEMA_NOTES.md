# Schema Notes: Lead Data Model (Micro-Sprint 10.2)

## 1. Tables Created
None. In accordance with the Single Entity architecture approved in 10.1, we strictly reused `public.crm_parties`.

## 2. Tables Modified
- `public.crm_parties`

## 3. Columns Added
- `lead_source VARCHAR(255)`

## 4. Foreign Keys
None added. The existing identity/customer infrastructure remains untouched.

## 5. Indexes
None added for this single field.

## 6. RLS Policies
No changes. Existing open development policies on `crm_parties` inherently cover the new column and Lead states seamlessly.

## 7. Constraints
None. The new `lead_source` column is strictly nullable to ensure backward compatibility for all existing Active customers who were created without a source.

## 8. Status Values
- `crm_status` within `crm_parties` is a `VARCHAR(50)`.
- It natively supports arbitrary states (e.g., `'Lead'`, `'Active'`) without requiring a PostgreSQL `ENUM` type migration.

## 9. Relationship Design
- **Follow-ups**: Existing follow-ups use `party_id`. Since a Lead *is* a party, a Lead will natively support follow-ups with zero changes.
- **Activity**: Existing interactions use `party_id`. Lead interactions will seamlessly map.
- **Tally Identity**: Explicitly severed. A Lead has no automatic integration into Tally until conversion.

## 10. Why each change was necessary
- `lead_source` was added because the approved 10.1 Audit identified it as the *only* missing primitive required for Lead analytics. All other required fields (Name, Mobile, WhatsApp, Notes, Assignment) were structurally inherited from the Customer model.

## 11. How this prepares for Lead workflow
This database foundation ensures that when the Frontend UI is constructed (Sprint 10.3), inserting a Lead is identical to inserting a Customer, simply passing `{ crm_status: 'Lead', lead_source: 'Facebook' }` in the payload. 

## 12. What was deliberately NOT implemented
- A separate `leads` table.
- A `lead_activities` table.
- A `lead_followups` table.
- Any Tally integration pipelines.
- Explicit Customer conversion logic (triggers/RPCs). Conversion will be handled application-side in future sprints by simply patching `crm_status = 'Active'`.
