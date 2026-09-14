# FA-08A LOCATION ARCHITECTURE REPORT

**Sprint:** FA-08A — CUSTOMER LOCATION ARCHITECTURE
**Date:** 2026-09-14
**Objective:** Perform an architecture/design investigation to determine the correct authoritative way to store customer physical location.

## 1. Existing Architecture Inspected

- **`public.crm_parties` Table:** The authoritative source for customer data currently stores geographical textual identifiers (`city`, `state`). It does not contain spatial coordinates, geometry, or GPS metadata.
- **Related Address/Location Entities:** None exist. There is no dedicated `crm_addresses` or `crm_locations` table in the current database schema.
- **Search Results:** A comprehensive codebase and SQL schema search across the Shubh Labh CRM project yielded zero occurrences of `latitude`, `longitude`, `geocode`, `geofence`, or `coordinate` fields applied to customer data. Occurrences of "location" (e.g., `market_location`, `warehouse_location` in raw material entries) were strictly `VARCHAR` string representations of physical areas.

## 2. Architecture Options Considered

### Option A: Directly on `crm_parties`
**Proposed Storage:** Add location fields (`latitude`, `longitude`, `location_accuracy`, `location_captured_at`) directly to the existing `crm_parties` table.
- **Advantages:** 
  - Highly consistent with the current architectural pattern (where `city`, `mobile`, `whatsapp` are stored directly on the entity).
  - Eliminates the need for complex `JOIN` operations when calculating "Nearby Customers" across the entire database.
  - Zero overhead for mobile inserts; `AddCustomerScreen` can simply include the coordinates in its existing single `supabase.insert()` call.
- **Disadvantages:** Only supports one primary location per customer. Blends geospatial metadata into the core identity table.
- **Impact on CRM/Mobile:** Minimal. Queries transparently receive new fields. Mobile insert adds new payload keys.
- **Impact on RLS:** Inherits the existing `crm_parties` RLS. Completely secure out of the box.

### Option B: Existing Address/Location Entity
**Result:** Rejected. No such entity exists in the current architecture.

### Option C: New Dedicated `crm_party_locations` Entity
**Proposed Storage:** Create a new table (e.g., `crm_party_locations`) linked via `party_id`.
- **Advantages:** Supports multiple locations per customer (e.g., Shop vs. Warehouse). Provides a clean separation of spatial data and identity.
- **Disadvantages:** Introduces significant complexity. Requires new RLS policies mirroring `crm_parties`. For nearby calculation, every geospatial query must `JOIN` against the core party table to apply authorization and ownership filters. Requires two sequential inserts on the mobile app (or an RPC) during customer creation.

## 3. Recommended Architecture

**Recommendation:** **Option A (Directly on `crm_parties`)**

Given the "Small-Scale Feed CRM" origins and the strict directive to "reuse existing architecture wherever possible", embedding the coordinates directly into `crm_parties` is the most robust, performant, and consistent approach. It natively respects all existing ownership and RLS rules without creating secondary policy synchronization risks.

### Exact Proposed Database Objects/Fields
Modify `public.crm_parties` by adding:
1. `latitude` (NUMERIC)
2. `longitude` (NUMERIC)
3. `location_accuracy` (NUMERIC) - To store the GPS accuracy in meters.
4. `location_captured_at` (TIMESTAMP WITH TIME ZONE) - To fulfill auditability for when the coordinate was locked.

*Note: While PostGIS `GEOMETRY/GEOGRAPHY` types are standard for geospatial querying, standard `NUMERIC` types combined with a Haversine formula function are often sufficient and less invasive if PostGIS is not currently enabled on the Supabase instance. The PO should decide if PostGIS activation is preferred.*

### Proposed RLS Approach
None required. By storing these fields directly on `crm_parties`, they automatically fall under the existing `crm_parties` RLS policies (e.g., `Active users CRM Insert`, `Role-based CRM Select`).

### Proposed Migration Approach
Execute a simple `ALTER TABLE public.crm_parties ADD COLUMN` script. Existing customers will safely default to `NULL` for these fields, which the mobile app will naturally interpret as "Location Unavailable."

## 4. Architectural Impact

- **Impact on FA-08:** Unblocks FA-08. Mobile app can capture GPS and push it via the existing `insert` call. "Nearby Customers" can be calculated using a new secure Postgres RPC that calculates distance on the `latitude`/`longitude` fields while respecting the authenticated user's scope.
- **Impact on Future Visit Mode:** Fully supports Geofencing. The mobile app can compare current location against the customer's stored `latitude`/`longitude` to enforce proximity-based Check-In.

## 5. Risks & Open Product Owner Decisions
- **PostGIS vs. NUMERIC:** PO must decide whether to enable the PostGIS extension on Supabase for native geospatial indexing, or stick to simple `NUMERIC` columns and mathematical distance calculations.
- **Multiple Locations:** This design locks customers to a single primary geolocation. If dealers require separate locations for "Shop" and "Godown" in the future, a migration to Option C will be required.

## Explicit Confirmations
- **NO database changes were made.**
- **NO mobile functionality was implemented.**
- **FA-09 was NOT started.**

**FINAL STATUS:** ARCHITECTURE REVIEW COMPLETE — AWAITING PRODUCT OWNER APPROVAL
