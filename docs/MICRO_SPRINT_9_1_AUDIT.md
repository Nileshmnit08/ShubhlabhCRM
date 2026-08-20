# Micro-Sprint 9.1: Payment Workflow Architecture Audit

## 1. Existing System Models
1. **Customer/Party Model (`crm_parties`)**: Tracks customers with fields like `id`, `display_name`, `mobile`, `whatsapp`, `crm_status`, `assigned_owner_id`, and `credit_limit`.
2. **Follow-up Model (`follow_ups`)**: Tracks scheduled follow-ups using `id`, `party_id`, `reason` (string), `follow_up_date`, `due_at`, `priority`, `status`, and `assigned_to`.
3. **Activity Model (`interactions` & `activity_logs`)**: Records interactions (`channel`, `outcome`, `note`, `next_action`) and system activity events.
4. **Today's Work Screen**: Supported by views like `v_today_followups`, `v_overdue_followups`, and `v_customer_attention`.
5. **User/Staff Model (`app_users`)**: Manages staff users with `role`, `is_active`, `whatsapp`, and `email`.
6. **Tally Outstanding Data (`tally_transactions` & `v_customer_financials`)**: `tally_transactions` stores voucher-level data. `v_customer_financials` aggregates this into `outstanding_balance`, `total_billed`, and `last_payment_date`.
7. **WhatsApp Implementation**: Utilizes deep-linking (`wa.me`) for fast customer communications. Webhook queue tables (`owner_whatsapp_notifications`) exist for owner assignment alerts.
8. **RLS Policies**: Strict Row-Level Security policies on `crm_parties` limit access to assigned owners and Admins. Standard RLS policies exist on other tables (`follow_ups`, `interactions`, etc.).
9. **APIs/Services**: Supabase REST APIs/views, along with RPCs like `merge_customers`.

## Audit Questions

**A. Can Payment Follow-up use the existing Follow-up system?**
Yes. The existing `follow_ups` model is generic enough to handle payment follow-ups. However, it currently uses a free-text `reason` field (e.g., "Call regarding overdue payment") rather than a distinct follow-up type or category, making programmatic filtering difficult.

**B. What fields already exist?**
- `outstanding_balance` (via `v_customer_financials` view)
- `credit_limit` (in `crm_parties`)
- `reason`, `follow_up_date`, `due_at`, `status` (in `follow_ups`)

**C. What fields are missing?**
- A specific `follow_up_type` (e.g., 'Payment', 'Sales', 'General') in `follow_ups` to easily differentiate payment reminders from regular check-ins.
- Promised payment tracking fields (e.g., `amount_promised`, `promise_date`) in `follow_ups` or `interactions`.
- A specific outcome type in `interactions` for 'Payment Promised' or 'Paid'.

**D. What existing components can be reused?**
- The `Today's Work` UI components (which render lists of follow-ups) can be adapted to filter or highlight Payment Follow-ups.
- The `Customer Profile` components which already display `outstanding_balance` via `v_customer_master`.
- The WhatsApp deep-link button (can be extended with payment-specific templates).

**E. What database changes are actually required?**
- Add `follow_up_type` column to `follow_ups` (defaulting to 'General').
- Add `amount_promised` and `promise_date` columns (either to `follow_ups` or `interactions`) for detailed tracking of payment commitments.
- Update relevant Views (e.g., `v_today_followups`, `v_overdue_followups`) to include the new fields.

**F. What UI changes are actually required?**
- Update the Today's Work screen to provide a specific "Payment Follow-ups" tab, filter, or distinct badge.
- Enhance the Follow-up Creation Modal to support selecting a type ("Payment") and capturing promised payment details.
- Add payment-specific WhatsApp message templates to the UI.
