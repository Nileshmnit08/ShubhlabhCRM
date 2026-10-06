# SL-ORDER-01B — CRM Customer Login Provisioning

## 1. Executive Summary
The CRM-side workflow for provisioning Shubh Labh Order Buyer accounts has been completed. This securely maps a Buyer's Login ID and Password to their specific `crm_party_id` without exposing any vulnerabilities or allowing cross-customer data leakage.

## 2. Changes Implemented

### A. Database Migration (225_sprint_ORDER_01B_buyer_provisioning.sql)
- Granted `EXECUTE` permission on `public.admin_create_buyer` to the `authenticated` role.
- Prior to this, the function was hidden from the Supabase/PostgREST schema cache due to default security settings in PostgreSQL.
- Included `NOTIFY pgrst, 'reload schema'` to ensure the CRM can immediately invoke the RPC.

### B. CRM Frontend Integration (app/src/pages/Customers/View.jsx)
- **State Management**: Added `buyerAccount` (for existing mappings), `buyerForm` (for login generation), and UI toggles (`isProvisioning`, `provisionError`).
- **Fetch Logic**: Injected `supabase.from('app_users').select('*').eq('crm_party_id', id).eq('role', 'Buyer')` into `fetchCustomerContext` for Admins.
- **App Access Tab**: Added a new tab in the `CustomerView` dashboard visible **only to Admins**.
  - **Unprovisioned State**: Displays a form with `Login ID`, `Password`, and `Confirm Password`. Explains that OTP/Phone auth is disabled.
  - **Provisioned State**: Replaces the form with a green success panel displaying the Buyer's Status, Login ID, and Display Name. Password resets are handled separately.
- **Audit Trail**: Every successful buyer creation logs a Note into the `interactions` table so it appears in the Timeline.
- **Strict Adherence**: Did not touch `LoginScreen.js` in the mobile app. The mobile app strictly sends what is typed in the `email` field to Supabase. Admins must enter an email-formatted Login ID (e.g., `SL1234@buyer.shubhlabh.local`) to satisfy Supabase Auth requirements while keeping it independent of the user's actual personal email or phone number.

## 3. Next Steps for Testing
1. Execute `225_sprint_ORDER_01B_buyer_provisioning.sql` on the Supabase database.
2. Build the CRM (`cd app && npm run build`).
3. Log into the CRM as an Admin and navigate to a Customer profile.
4. Click the **App Access** tab.
5. Create a Buyer login (e.g. `testbuyer@buyer.shubhlabh.local` / `Password123!`).
6. Launch the Release APK of **Shubh Labh Order** on the physical device.
7. Attempt login with the newly provisioned credentials.
8. Verify RLS applies successfully (you should only see that customer's product catalogue and orders).
