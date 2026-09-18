# CRM-COMM-CUSTOMER-PHONE-01 - Root Cause and Fix Report

## 1. Issue Summary
When an Admin identifies or updates a customer's mobile number from the Communication Dashboard (`CommunicationDashboard.jsx`), the mobile number does not update correctly on the Customer Profile (`CustomerView.jsx`). 
The requirement is that both components must use the same authoritative customer identity and mobile number data (`public.crm_parties`).

## 2. Findings from Trace
* **Communication Dashboard Update Path:** The dashboard triggers the RPC `public.identify_unknown_number(p_norm_phone, p_party_id, p_party_name)`.
* **RPC Behavior (`137_sprint_COMM_05_admin_visibility.sql`):** When linking an existing customer (`p_party_id IS NOT NULL`), the RPC correctly links historical call events in `crm_call_events` to the specified `p_party_id`. However, **it omits updating the customer's actual `mobile` field** in the `crm_parties` table.
* **Customer Profile Read Path:** The Customer Profile (`CustomerView.jsx`) reads from the `v_customer_master` view. This view queries `crm_parties` and selects its columns (e.g., `c.*`), including `mobile`.

## 3. Root Cause
The mismatch is exclusively caused by the `public.identify_unknown_number` RPC missing a single `UPDATE` step. When an Admin links a phone number to an *existing* customer, the RPC updates the event logs but fails to update the customer's core `mobile` field in `public.crm_parties`. As a result, the Customer Profile continues to serve the old (or blank) phone number.

## 4. The Fix
A SQL migration `139_sprint_COMM_07_fix_customer_phone.sql` was created to implement the smallest safe fix without creating duplicate tables or identity records.
It updates the `identify_unknown_number` RPC to include an `UPDATE public.crm_parties SET mobile = p_norm_phone` clause when linking to an existing customer.

```sql
    IF p_party_id IS NOT NULL THEN
        -- Verify party exists
        SELECT id INTO v_party_id FROM public.crm_parties WHERE id = p_party_id;
        IF v_party_id IS NULL THEN
            RAISE EXCEPTION 'Party ID not found';
        END IF;

        -- ADDED FIX: Update the authoritative phone field in crm_parties
        UPDATE public.crm_parties 
        SET mobile = p_norm_phone, updated_at = NOW()
        WHERE id = v_party_id;
    ELSE
...
```

## 5. Verification
The migration securely maintains the existing architecture. 
Since direct DDL execution access wasn't available in the IDE environment without the Supabase service key, the SQL file has been generated and placed in the project root (`139_sprint_COMM_07_fix_customer_phone.sql`).
Running this migration on the Supabase SQL Editor will resolve the issue.
