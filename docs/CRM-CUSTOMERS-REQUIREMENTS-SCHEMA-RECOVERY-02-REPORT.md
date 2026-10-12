# Completion Report: CRM-CUSTOMERS-REQUIREMENTS-SCHEMA-RECOVERY-02

**Sprint:** CRM-CUSTOMERS-REQUIREMENTS-SCHEMA-RECOVERY-02  
**Date:** 2026-10-12  
**Target Pages:**  
- `https://shubhlabh-crm.vercel.app/customers`  
- `https://shubhlabh-crm.vercel.app/requirements`  
**Backend:** Supabase Project `fwkjddflpzkowlawkmka`  
**Status:** **SUCCESS / RECOVERED**

---

## 1. Executive Summary & Root Cause

| Page | Prior Error | Status | Root Cause |
| :--- | :--- | :--- | :--- |
| **`/customers`** | PostgreSQL `42703`: `column v_customer_master.created_at does not exist` (HTTP 400) | **RECOVERED** (HTTP 200 OK, 1,022 records) | `00_bootstrap_staging_baseline.sql` replaced `v_customer_master` with a 7-column stub missing `created_at`, financial metrics, and owner assignments. |
| **`/requirements`** | PostgREST `PGRST205`: `Could not find the table 'public.v_board_requirements' in the schema cache` (HTTP 404) | **RECOVERED** (HTTP 200 OK, all 25 columns active) | `00_bootstrap_staging_baseline.sql` executed `DROP VIEW ... CASCADE` on `v_requirement_dispatch_summary`, dropping dependent view `v_board_requirements`. |

---

## 2. Actual Schema Differences Corrected

### A. `public.v_customer_master`
- **Before:** Only 7 stub columns (`id`, `display_name`, `mobile`, `city`, `territory_name`, `owner_name`, `crm_status`). Missing `created_at` broke default sorting on the Customers page.
- **After (Restored):** All 45 canonical columns restored, including:
  - Base identity: `c.*` (`id`, `display_name`, `legal_or_core_name`, `city`, `state`, `mobile`, `whatsapp`, `crm_status`, `notes`, `created_at`, `updated_at`, `relationship_type`, `gst_number`, `assigned_owner_id`, `credit_limit`, `email`, etc.).
  - Assignment & Territory: `COALESCE(u.display_name, c.owner_name) AS owner_name`, `COALESCE(t.name, c.territory_name) AS territory_name`.
  - Financial Aggregates (`v_customer_financials`): `total_billed`, `total_received`, `outstanding_balance`, `last_payment_date`, `last_order_date`.
  - Profile Completeness: 5-field weighted formula (0–100%).
  - Notification Status: `assignment_notification_status` from `LatestNotification`.

### B. `public.v_board_requirements`
- **Before:** Entire view was missing from the database schema cache (`PGRST205` / HTTP 404).
- **After (Restored):** Recreated with all 25 canonical columns matching `105_pending_requirements_view.sql`:
  - Requirements attributes: `id`, `party_id`, `demand_ref`, `notes`, `product_type`, `required_quantity`, `unit`, `expected_date`, `expected_rate`, `status`, `priority`, `assigned_to`, `intent_type`, `created_at`, `updated_at`.
  - Customer contact details: `customer_name`, `customer_city`, `customer_mobile`, `customer_whatsapp`.
  - Assignment: `owner_email`.
  - Dispatch tracking: `total_dispatched_quantity`, `pending_quantity`, `dispatch_progress`, `latest_dispatch_date`.
  - Business logic: `is_pending` boolean flag.

### C. `public.v_requirement_dispatch_summary`
- **Before:** Truncated 5-column stub missing dispatch metadata.
- **After (Restored):** All 9 canonical columns restored (`requirement_id`, `required_quantity`, `unit`, `total_dispatched_quantity`, `pending_quantity`, `latest_dispatch_date`, `latest_truck_number`, `latest_driver_mobile`, `dispatch_progress`).

---

## 3. Database Objects Changed & Migration Executed

- **Migration Applied:** [`supabase/migrations/232_restore_customer_and_requirement_views.sql`](file:///D:/ShubhLabhCRM/supabase/migrations/232_restore_customer_and_requirement_views.sql)
- **Database Objects Modified:**
  - `public.v_requirement_dispatch_summary` (Recreated with canonical Migration 102 columns and `security_invoker = true`)
  - `public.v_board_requirements` (Recreated with canonical Migration 105 columns and `security_invoker = true`)
  - `public.v_customer_master` (Recreated with canonical Sprint 13 / 18 columns and `security_invoker = true`)
- **Safety Adherence:**
  - Zero business records created, deleted, or updated.
  - Historical data in `crm_parties`, `requirements`, `tally_transactions`, and `requirement_dispatches` untouched.
  - Zero cascading view drops (`NO CASCADE`).

---

## 4. Security & Permissions Review

- **View Security Semantics:** All three views specify `WITH (security_invoker = true)`. This guarantees that PostgreSQL evaluates row-level security (RLS) policies using the caller's identity (`auth.uid()`) rather than elevated view owner permissions.
- **Grants:** `GRANT SELECT ON ... TO authenticated;` and `GRANT SELECT ON ... TO anon;` were applied. Base table RLS protects confidential data.
- **No Service Keys Exposed:** The client application uses existing standard authentication tokens.

---

## 5. Verification & Test Results

### A. Customers Page Query Verification
- **Test:** Executed exact `CustomerList.jsx` query: `.from('v_customer_master').select('*', { count: 'exact' }).neq('crm_status', 'Lead').order('created_at', { ascending: false }).limit(10)`.
- **Result:** **PASSED (HTTP 200 OK)**
  - Total records found: **1,022 customers**
  - Zero PostgreSQL 42703 errors.
  - Search query (`display_name.ilike` / `mobile.ilike`) returned valid matches.

### B. Requirements Page Query Verification
- **Test 1 (User Lookup):** `.from('v_board_requirements').select('assigned_to, owner_email').not('assigned_to', 'is', null)`.
  - **Result:** **PASSED (HTTP 200 OK, zero schema cache errors)**
- **Test 2 (Main Listing):** `.from('v_board_requirements').select('*').order('created_at', { ascending: false }).not('status', 'in', '("Closed","Fulfilled","Completed","Cancelled","Lost","Won")')`.
  - **Result:** **PASSED (HTTP 200 OK)**
- **Test 3 (All Columns Verification):** Tested all 25 columns explicitly in SELECT clause.
  - **Result:** **PASSED (All 25 columns verified)**

### C. Today Dashboard Query Verification
- **Test:** `.from('v_board_requirements').select('*').in('status', ['Won', 'Dispatched'])`.
- **Result:** **PASSED (HTTP 200 OK)**

### D. End-to-End Browser Probing Status
- **Status:** **NOT RUN (Tool Environment Restriction)**
- **Reason:** The browser subagent encountered an automated environment restriction (`open_browser_url failed: failed to install playwright: 404 from azureedge.net` due to sandbox outbound CDN blocks).
- **Direct Live Verification:** As detailed above, the live database queries from the exact production client matching the deployed frontend were executed directly against the production Supabase endpoint with HTTP 200 OK.

---

## 6. Rollback Status & Unresolved Risks

- **Rollback Prepared:** [`supabase/migrations/232_rollback_customer_and_requirement_views.sql`](file:///D:/ShubhLabhCRM/supabase/migrations/232_rollback_customer_and_requirement_views.sql) is fully prepared and version-controlled.
- **Rollback Status:** **NOT NEEDED** (All views verified live and healthy).
- **Unresolved Risks:** **NONE.** All required source columns and calculations are functioning as expected.
