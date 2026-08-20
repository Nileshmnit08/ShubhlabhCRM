# Lead & Dormant Customer Architecture Audit

## 1. Current Architecture
The current CRM architecture revolves around `crm_parties` serving as the master entity. All operational workflows are decoupled into specialized, entity-agnostic tables:
- **`interactions`**: A unified log for every communication touchpoint (WhatsApp, Call, Meeting).
- **`follow_ups`**: A robust, date-driven task management engine supporting priorities, assignments, and statuses.
- **`tally_transactions`**: The raw ledger data layer, rolled up via intelligence views like `v_customer_financials`.
- **`Today's Work`**: A dynamic orchestration layer (`Today.jsx`) that aggregates the above tables to generate actionable daily queues.

## 2. Existing Lead Capability
**Does a Lead entity exist?** No separate entity exists. `crm_parties` has a generic `crm_status` column (currently defaulting to `'Active'`). 
**Can Lead use the existing architecture?** Absolutely. A "Lead" is structurally identical to a "Customer" (Name, Mobile, WhatsApp, Notes).
**Minimum fields:** `display_name`, `mobile`, `crm_status = 'Lead'`, and `lead_source` (could use `notes` or an extended column).
**Conversion:** Transitioning a Lead to a Customer is simply an `UPDATE crm_parties SET crm_status = 'Active'`.
**Integration:** `follow_ups` and `interactions` already map to `party_id`, natively supporting Lead tracking without modification.

## 3. Existing Dormant Customer Capability
**Identification:** The CRM currently possesses a `v_customer_attention` view that flags a customer as a "Dormant Candidate" if there has been *no CRM contact in 30 days* and no open requirements. 
**Recommendation:** Dormant status should be **calculated dynamically** based on Tally transaction history, but actioned by **generating an operational task** (a Follow-up). This prevents data staleness while ensuring staff actually execute the reactivation.

## 4. Existing Tally Data Capability
- **Last Sale (Customer Purchase):** Available natively via `last_order_date` in `v_customer_financials`.
- **Last Purchase (Payment):** Available natively via `last_payment_date`.
- **Days Since Last Transaction:** Easily calculated dynamically (`CURRENT_DATE - last_order_date`).
- **Missing Capability:** *Purchase Frequency*. The current views aggregate totals (`SUM(amount)`) but do not aggregate transaction *counts* (e.g., `COUNT(voucher_no)`), making it impossible to distinguish between a customer who buys ₹1L once a year vs. ₹1L in 10 orders a year.

## 5. Existing Follow-up Capability
The `follow_ups` engine is currently utilized for General actions and Payment actions via the implicit `follow_up_type` field.
- **Required Extension:** No schema changes required. We simply introduce 'Lead' and 'Reactivation' as logical values for `follow_up_type`. 
- **Capability:** Full support for assignment, scheduling, priority, and postponements.

## 6. Existing Activity Capability
The `interactions` table natively tracks `channel`, `outcome`, and `note`. 
- Recording a Lead contact or Dormant reactivation attempt requires zero architectural changes. The frontend simply pushes the respective string to `interaction_type`.

## 7. Existing WhatsApp Capability
The CRM utilizes a reusable `<WhatsAppAction>` component that deep-links to the WhatsApp client and automatically triggers the interaction logger. This component accepts a generic `party` prop and is instantly reusable for both Leads and Dormant Customers.

## 8. Today's Work Integration Point
The `Today.jsx` dashboard parses `follow_ups` into arrays (e.g., `paymentTasks`, `priorityTasks`). 
We can extend this controller to parse `follow_up_type === 'Lead'` into a "Lead Pipeline" section, and `follow_up_type === 'Reactivation'` into a "Dormant Queue", completely unifying the daily workflow.

## 9. Recommended Architecture
- **Single Entity Model:** Store Leads inside `crm_parties` governed by `crm_status = 'Lead'`.
- **Single Action Model:** Schedule all prospecting and reactivation tasks inside `follow_ups`.
- **Dynamic Dormancy:** Update `v_customer_financials` and `v_customer_attention` to calculate dormancy based strictly on `last_order_date` gaps (e.g., > 90 days), rather than relying on CRM interaction logs.

## 10. Required Database Changes
**No physical table changes required.** 
- Minor SQL updates to `v_customer_financials` (to add order counts for frequency).
- Minor SQL updates to `v_customer_attention` (to solidify dormancy logic).

## 11. Required Frontend Changes
- **Dashboard (`Today.jsx`)**: Add UI sections for Lead and Reactivation queues.
- **Customer List (`Customers/index.jsx`)**: Add filtering tabs (`Active`, `Leads`, `Dormant`) so cold leads don't clutter the active customer book.
- **Forms**: Minor tweaks to support creating a Party with a specific status.

## 12. Required API/Service Changes
None. Supabase JS data patterns fully support this structure.

## 13. Risks
- **UI Clutter:** Mixing Leads with Active Customers in a single list without strict default filtering will overwhelm the sales operators. Default views must heavily filter out Leads.
- **Identity Collision:** A Lead might be created manually, and later Tally imports the exact same party. The existing `merge_customers` RPC function mitigates this risk.

## 14. Duplicate-System Risks
By strictly reusing `crm_parties`, `interactions`, and `follow_ups`, we guarantee 0% architectural duplication. A unified timeline is preserved across the entire customer lifecycle.

## 15. Out-of-Scope Items
- Complex marketing automation pipelines.
- Automated email/WhatsApp blast engines.
