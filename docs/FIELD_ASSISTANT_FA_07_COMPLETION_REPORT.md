# FA-07 COMPLETION REPORT

**Sprint:** FA-07 — Add Customer + Quick Field Onboarding
**Status:** BLOCKED (Pending Physical Android Testing by Product Owner)
**Date:** 2026-09-14

## Executive Summary
Implemented the "Add Customer" workflow in the Shubh Labh Field Assistant app, fully integrating the mobile React Native interface with the existing CRM database (`crm_parties`). However, the sprint is currently BLOCKED pending mandatory physical device testing, which cannot be executed autonomously by the agent.

## Architecture Evidence & Validations

### 1. Customer Creation Architecture
- **Inspected Mechanism:** The existing web CRM uses direct authenticated inserts to `crm_parties` (e.g., in `app/src/pages/Data/Review.jsx` and `app/src/pages/Customers/Form.jsx` via `supabase.from('crm_parties').insert(...)`). There is no dedicated RPC or service layer for customer creation.
- **RLS Verification:** The operation is safe and architecturally consistent. `08_sprint_8_fixes_schema.sql` defines `CREATE POLICY "Active users CRM Insert" ON public.crm_parties FOR INSERT WITH CHECK (public.is_active_user());`. Thus, direct insertion from the authenticated client is the established, secure method.
- **Security:** The mobile app strictly uses the standard authenticated Supabase client. No `service_role` key is used. RLS remains enabled. Ownership (`assigned_owner_id`) is strictly mapped from the authenticated staff's identity (`useAuth().staffProfile.id`).

### 2. Duplicate Protection Architecture
- **Constraint/Index:** Duplication prevention is enforced by `idx_crm_parties_unique_name`, a unique index on `LOWER(TRIM(display_name))` created in `19_sprint_19_dedupe_customers.sql`.
- **Intended Use:** This DB-level constraint prevents duplicate customer creation.
- **Mobile Handling:** The mobile app intercepts the resulting Postgres constraint violation (Error Code `23505`) and gracefully maps it to a translated UI error ("Customer with this name already exists"), without modifying the database constraint.

### 3. Field Mapping Verification
Verified every submitted field against the existing `crm_parties` data model:
- `display_name` ← "Shop / Business Name" (Mapped exactly)
- `legal_or_core_name` ← "Owner / Contact Person" (Mapped exactly)
- `mobile` ← "Primary Mobile Number" (Mapped exactly)
- `customer_type` ← "Category" (Mapped exactly)
- `notes` ← "Tags" (Tags like "Fertilisers", "Seeds" are serialized as a string into the `notes` column. This is consistent with the current architecture as no dedicated tags table/array exists for `crm_parties`, preventing the need for unauthorized schema additions.)

### 4. Offline Scope Check
- **Verification:** FA-07 did **NOT** introduce any actual offline persistence, local SQLite, AsyncStorage queueing, or synchronization logic. 
- **Clarification:** The phrase "Instant offline save" was merely a static UI string inherited from the provided Stitch visual design representing the field-first philosophy. The actual implementation relies entirely on an active network connection for immediate insertion.

## Verification Checklist

- [ ] **English physical-device test:** BLOCKED
- [ ] **Hindi physical-device test:** BLOCKED
- [ ] **Successful creation test:** BLOCKED
- [ ] **Duplicate test:** BLOCKED
- [ ] **Ownership verification:** BLOCKED
- [ ] **Customer retrieval/My Customers verification:** BLOCKED
- [ ] **Regression test results:** BLOCKED (Login, Customers, Customer Profile, My Customers, navigation)

## Changes Summary
- **Changed files:** 
  - `d:\ShubhLabhCRM\mobileFieldStaff\src\i18n\en.js`
  - `d:\ShubhLabhCRM\mobileFieldStaff\src\i18n\hi.js`
  - `d:\ShubhLabhCRM\mobileFieldStaff\src\screens\AddCustomerScreen.js`
- **Database objects changed:** None.
- **Database objects NOT changed:** No schema, index, or RLS changes were made.
- **Known limitations:** Requires manual physical device interaction for final gate.

## Explicit Declarations
- **FA-08 was NOT started.**
- No unrelated functionality was introduced.
- No schema/RLS changes were made.

---
**FINAL CONTROL STATUS:** BLOCKED
WAIT FOR EXPLICIT PRODUCT OWNER APPROVAL.
