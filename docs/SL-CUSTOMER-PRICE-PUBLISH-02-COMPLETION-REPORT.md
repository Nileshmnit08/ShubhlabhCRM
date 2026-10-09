# MICRO-SPRINT: SL-CUSTOMER-PRICE-PUBLISH-02
**Status:** IMPLEMENTED, MIGRATION PENDING, END-TO-END TESTS BLOCKED
**Date:** 2026-10-09

## 1. Objective
Create a separate Customer Price Publishing module to strictly separate external quoted prices from internal purchasing costs, and update the Buyer App to consume the new customer-facing prices.

## 2. Before/After Sidebar Routes
- **Before:** The internal module "Daily Price Entry" was incorrectly renamed to "Customer Price Publishing", mixing the two distinct domains.
- **After:** 
  - Restored original internal route: `Raw Material Pricing > Daily Price Entry` (Route: `/raw-material-prices/daily-entry`).
  - Added brand new external route: `Customer Price Publishing` (Route: `/customer-price-publishing`).

## 3. Database Tables & Migrations
- **Created Migration:** `232_sprint_CUSTOMER_PRICES.sql`
- **New Table:** `public.customer_published_prices`
- **Schema:** Tracks `price`, `unit`, `effective_date`, `is_published`, `remarks`, and auditing metadata for `raw_material_id`.
- **Proof of Separation:** The Buyer App now reads exclusively from `customer_published_prices`. The internal `raw_material_price_entries` table remains strictly for internal CRM procurement calculations.

## 4. Files Changed
1. **`app/src/lib/navConfig.js`**: Restored internal terminology, added new Customer Price Publishing menu item under Reports & Market.
2. **`app/src/pages/RawMaterialPrices/DailyPriceEntry.jsx`**: Restored page title.
3. **`app/src/App.jsx`**: Registered `/customer-price-publishing` route.
4. **`app/src/pages/CustomerPricePublishing/index.jsx`** *(New)*: Created the streamlined Admin form to view and publish customer prices in bulk with draft support.
5. **`shubhlabh-order/src/features/market/MarketPricesScreen.js`**: Replaced query to `raw_material_price_entries` with `customer_published_prices`, using `effective_date` and `unit`.
6. **`shubhlabh-order/src/features/market/components/MarketGraph.js`**: Updated history chart configuration to process `effective_date` instead of `entry_date`.
7. **`232_sprint_CUSTOMER_PRICES.sql`** *(New)*: Schema definition and RLS policies for the new table.

## 5. Deployment Status and Unresolved Limitations
- **Action Required:** The user must manually execute `232_sprint_CUSTOMER_PRICES.sql` in the Supabase SQL editor because I lack direct raw SQL execution permissions for DDL.
- **Test Blocker:** Per the mandate "If an isolated test environment is unavailable, stop before publishing dummy values into production and report the blocker", I have halted End-to-End dummy testing. We are running against the live Supabase instance and publishing ₹1,800 for Khal into the public feed would violate safety requirements. 
- **Next Step:** Please execute the SQL migration, verify the CRM UI at `/customer-price-publishing`, and optionally clear the table if testing dummy data manually.
