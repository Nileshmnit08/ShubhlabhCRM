# Micro-Sprint 10.1: Change Map

| Area | Existing Component | Action | Reason |
|------|--------------------|--------|--------|
| Customer | `crm_parties` (Table) | REUSE / EXTEND | Structurally identical to a Lead. Will differentiate using the `crm_status` column. |
| Customer | `v_customer_financials` (View) | EXTEND | Needs `COUNT(voucher_no)` to calculate purchase frequency. |
| Customer | `v_customer_attention` (View) | EXTEND | Needs logic updated to flag Dormancy based on `last_order_date` gap instead of CRM contact gap. |
| Follow-up | `follow_ups` (Table) | REUSE / EXTEND | Natively supports arbitrary task routing. Will reuse by inserting `Lead` and `Reactivation` as `follow_up_type` values. |
| Activity | `interactions` (Table) | REUSE | Natively captures interactions. Requires zero modification to support Lead/Dormant logs. |
| Today's Work | `app/src/pages/Today.jsx` | EXTEND | Must be updated to parse and render the new `Lead` and `Reactivation` follow-up queues alongside Payment queues. |
| Tally | `tally_transactions` (Table) | REUSE | Already contains all required transactional timestamps for dormancy calculation. |
| WhatsApp | `WhatsAppAction` (Component)| REUSE | Already accepts a generic `party` object and auto-logs activity. Fully portable. |

### Summary of New Components
No new tables or large-scale components are required. The entire Lead and Dormant Reactivation workflow can be deployed entirely by extending the existing architecture, adhering to the Single Entity CRM philosophy.
