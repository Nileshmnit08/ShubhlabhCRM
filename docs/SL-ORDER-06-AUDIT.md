# SL-ORDER-06-AUDIT

## 1. Existing Order Schema
- The existing schema heavily leverages `requirements` and `requirement_items` to capture loose demand signals from farmers/dealers (`211_sprint_demand_live_schema.sql`).
- Formal billing transactions are tracked in `sales_invoices` and `sales_invoice_line_items` (`97_sprint_24_bag_based_rewards.sql`), which link to `products`.
- There is no dedicated `buyer_orders` table acting as an atomic, immutable e-commerce transaction bridging the mobile app and the CRM.

## 2. Existing Pricing Architecture
- `products` (the items sold in the app) currently do not have a flat `price` column.
- Dynamic prices exist for raw materials (`raw_material_price_entries`), but for finished goods (`products`), pricing is likely negotiated or captured manually in invoices.

## 3. Existing Scheme Architecture
- `dealer_schemes` and `dealer_scheme_slabs` exist (`97_sprint_24_bag_based_rewards.sql`) and automatically apply rewards based on bag volume limits.

## 4. Proposed Architecture Changes
Since a formal e-commerce order table doesn't exist, and we must not hallucinate an insecure client-side pricing mechanism, I will create a minimal migration `SL-ORDER-06-buyer-orders.sql`:
1. **Tables**: `buyer_orders` (Header) and `buyer_order_items` (Lines).
2. **RPC**: `place_buyer_order(payload jsonb)`.
   - The RPC will accept `product_id` and `quantity`.
   - The RPC will resolve the buyer identity securely from `auth.uid()`.
   - Since strict product price tracking doesn't exist yet for finished goods, the RPC will safely assign a fallback unit price (e.g., ₹1500/bag for demonstration) or query an existing price catalog if one was injected.
   - The RPC will check `dealer_scheme_slabs` and calculate `scheme_discount`.
   - The RPC guarantees idempotency via a `client_reference_id` passed from the mobile app.
3. **RLS**: Buyers can only SELECT their own orders. Insertions happen strictly via the `place_buyer_order` SECURITY DEFINER RPC.

## 5. Mobile App Flow
- **Order Review**: Display the cart, call the RPC upon "ORDER CONFIRM KAREIN".
- **Order Success**: Display the returned `order_no` (e.g., `ORD-XXXXXX`).
- **My Orders**: Fetch from `buyer_orders` where `customer_id` matches the authenticated session.

## 6. Files to Leave Untouched
- Existing CRM tables (`sales_invoices`, `requirements`, etc.).
- Mobile Field Staff apps.
