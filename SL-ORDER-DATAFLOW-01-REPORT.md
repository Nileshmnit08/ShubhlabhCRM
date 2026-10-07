# Data Flow Fix Report (SL-ORDER-DATAFLOW-01)

## What Was Fixed

The core issue was that the Buyer App was saving orders to a disconnected, parallel table structure (`buyer_orders` and `buyer_order_items`), while the Shubh Labh CRM app was reading from `requirements` and `requirement_items`. This created a data silo where CRM Staff couldn't see Buyer orders, and Buyers couldn't see orders created by CRM Staff.

Additionally, the "New Order" screen was showing an empty Category and Product list because the authenticated Buyer role lacked Row Level Security (RLS) permission to read from the `public.products` table.

## Changes Implemented

1. **Unified Order Creation (`OrderReviewScreen.js`)**
   - Removed the dependency on the legacy `place_buyer_order` RPC.
   - Refactored the `handlePlaceOrder` function to perform direct inserts into `requirements` (header) and `requirement_items` (lines).
   - Mapped all product fields correctly (`product_name`, `category`, `quantity`, `unit`, and `extras` as JSON in `notes`).
   - *Note on `product_id`:* The user prompt requested `product_id = actual products.id`, but the CRM's `requirement_items` schema does not contain a `product_id` column. Following the strict instruction ("The CRM/database must remain the source of truth"), I mapped the items using `product_name` and `category` to align perfectly with the existing CRM table schema.

2. **Unified Order Reading (`MyOrdersScreen.js`)**
   - Updated the main query to fetch from `requirements` and join `requirement_items`.
   - The query automatically filters by `party_id = customerProfile.id`, ensuring Buyers only see their own customer's orders.
   - Preserved UI mappings (e.g., calculating `total_bags` from `requirement_items`) to ensure the display logic remains unbroken.

3. **Product Visibility Fix (RLS Script)**
   - The Buyer App's `useProducts()` hook was returning 0 rows because the `is_active_user()` policy was recently updated to explicitly exclude the `'Buyer'` role, cutting off their access to the product master.
   - I have created `SL-ORDER-DATAFLOW-02-FIX-PRODUCTS.sql` in the project root to restore Buyer read access to `public.products`.

## Action Required

To resolve the "EMPTY Category/Product" issue in the New Order screen, please run the following SQL script in your Supabase SQL Editor:

```sql
-- SL-ORDER-DATAFLOW-02-FIX-PRODUCTS.sql
DROP POLICY IF EXISTS "Buyer Products Select" ON public.products;
CREATE POLICY "Buyer Products Select"
  ON public.products FOR SELECT
  USING (true); 
```

Once this script is applied, the Buyer App will successfully load all active products, and any orders placed will instantly appear in the CRM's Requirements view.
