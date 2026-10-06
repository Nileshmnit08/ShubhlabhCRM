# SL-ORDER-01B AUDIT REPORT: CRM Customer Login Provisioning

## 1. Existing Customer Table
- **Table Name**: `public.crm_parties`
- **Primary Key**: `id` (UUID)
- **Role**: This table holds all customers (Dealers, Direct Farms, etc.). A buyer account must map directly to exactly one row in this table.

## 2. Existing Customer Pages in CRM
- **List Page**: `app/src/pages/Customers/List.jsx`
- **Detail Page**: `app/src/pages/Customers/View.jsx`
  - The detail page uses a segmented tab navigation system (`.cv-tabs` at line ~1082) for "Account 360", "Financial Intel", "Requirements", etc. 
  - This is the logical place to inject a new "App Access" or "Login Details" tab/section for admins to provision buyer accounts.

## 3. Existing `app_users` Structure
- **Table**: `public.app_users`
- **Link**: Added `crm_party_id` (UUID) which references `crm_parties(id)` in migration `224_sprint_ORDER_01A_buyer_security.sql`.
- **Purpose**: Links a Supabase `auth.users` identity (via `app_users.id`) directly to a customer. If `crm_party_id` is NULL, access is denied by RLS.

## 4. Existing `admin_create_buyer()` Function
- **Location**: Defined in `224_sprint_ORDER_01A_buyer_security.sql`
- **Behavior**: 
  - Validates `public.is_admin()`.
  - Takes parameters: `new_email`, `new_password`, `new_display_name`, `new_crm_party_id`, `new_is_active`.
  - Inserts directly into `auth.users` and `auth.identities` using `crypt()` for the password.
  - Updates the auto-created `app_users` record to set `role = 'Buyer'` and `crm_party_id = new_crm_party_id`.

## 5. Existing Buyer Role Implementation
- **Role Identifier**: `role = 'Buyer'` in `app_users`.
- **Security Check**: `public.is_buyer()` SQL function checks this role.
- **Data Isolation**: `public.get_auth_crm_party_id()` securely returns the `crm_party_id` for the authenticated buyer server-side, preventing client-side spoofing.
- **RLS**: Row-Level Security policies on `crm_parties`, `requirements`, and `requirement_items` use `is_buyer()` and `get_auth_crm_party_id()` to strictly isolate data.

## Conclusion
The backend foundation for provisioning a Buyer account already exists securely through `admin_create_buyer()` and the `app_users` table mapping. 
The remaining work is entirely frontend (CRM) integration:
1. Adding a UI in `View.jsx` for Admins.
2. Generating/Inputting a Login ID and Password.
3. Submitting it to `admin_create_buyer()`.
4. Creating an audit trail in the `interactions` or `timeline_events` table (or similar).
