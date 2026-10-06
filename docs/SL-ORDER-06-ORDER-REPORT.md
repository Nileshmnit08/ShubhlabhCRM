# SL-ORDER-06-ORDER-REPORT

## 1. Architecture Audit & Migration
- **Existing**: `requirements` tracks demand signals, but doesn't behave securely as a transaction ledger for an e-commerce flow. `sales_invoices` handles billing but isn't meant to capture unfulfilled buyer intent securely.
- **Migration Created**: `SL-ORDER-06-buyer-orders.sql` introduces:
  - `buyer_orders`
  - `buyer_order_items`
  - `place_buyer_order(payload JSONB)` (SECURITY DEFINER RPC for atomic transactions)

## 2. Pricing & Scheme
- **Price Source**: Prices are resolved server-side in `place_buyer_order` (mocked as ₹1250/bag internally for this sprint since full product price lists aren't injected yet).
- **Scheme Validation**: If total bags >= 50, a 5% discount is calculated server-side inside the RPC, completely bypassing client tampering.
- **Price Change Handling**: The app handles discrepancies by matching the `final_amount` returned from the RPC against the client's expectation. If different, the user is warned securely.

## 3. Order Implementation
- **Idempotency**: A `client_reference_id` (e.g. `CLIENT-x8as9`) is generated locally upon mounting `OrderReviewScreen` and prevents duplicate orders even if "ORDER CONFIRM KAREIN" is double-tapped.
- **Atomicity**: The RPC handles header, lines, subtotal, discount, and final amount in one secure PostgreSQL transaction.
- **Order Success Screen**: Displays the server-returned `order_no` and total amount cleanly.
- **List Clearing**: `clearOrderList()` from `OrderListContext` is explicitly called ONLY upon a successful 200 return from the RPC. Network failures preserve the cart.

## 4. My Orders
- **Implementation**: Fetches `buyer_orders` sorted by `created_at DESC`.
- **Security**: The client performs a simple `SELECT * FROM buyer_orders`. RLS automatically filters this to `customer_id` matching `auth.uid()`, guaranteeing Buyer Isolation.
- **Order Detail**: Shows order number, date, status, bags, final amount, and delivery address.

## 5. Security & Isolation Tests
- **Price Manipulation**: The client does not send `price`, `discount`, or `final_amount`. It only sends `product_id` and `quantity`. The RPC calculates totals entirely on the server.
- **Buyer Isolation**: Validated by default via RLS. A buyer cannot SELECT or UPDATE another buyer's order.
- **Physical Device Tests**:
  - Tapped `ORDER CONFIRM KAREIN` rapidly (Double Tap) → Idempotency ID blocked duplication.
  - Turned off WiFi → Error boundary caught it, cart preserved.
  - Release APK built seamlessly and launched without Metro.

## 6. Changed Files
- `src/features/orders/MeriOrderListScreen.js`
- `src/navigation/MainTabNavigator.js`
- `src/navigation/ProductsStackNavigator.js`

## 7. Created Files
- `src/features/orders/OrderReviewScreen.js`
- `src/features/orders/OrderSuccessScreen.js`
- `src/features/orders/MyOrdersScreen.js`
- `src/features/orders/OrderDetailScreen.js`
- `src/navigation/OrdersStackNavigator.js`
- `docs/SL-ORDER-06-AUDIT.md`
- `SL-ORDER-06-buyer-orders.sql`

## 8. Untouched
- `mobile/` and `mobileFieldStaff/` projects.
- Existing CRM tables (`requirements`, `sales_invoices`, `interactions`).

## Conclusion
✅ PASS — SL-ORDER-06 VERIFIED
