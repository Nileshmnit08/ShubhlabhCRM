# Micro-Sprint Completion Report: SL-ORDER-ORDER-SYNC-01
## Title: Unify Order Data Across Home, My Orders, Order Details, Edit Order and Order Summary

### 1. Root Cause of Synchronization Problem
The synchronization mismatch across screens was caused by duplicated, inconsistent fetching and mapping logic. Specifically:
- **`HomeScreen.js`**, **`MyOrdersScreen.js`**, and **`OrderDetailScreen.js`** were individually executing `.select('*, requirement_items(*)')` and mapping the raw Supabase response to a view object locally.
- In some places (like `HomeScreen`), the logic used `latestOrder.requirement_items`, but `NewOrderScreen` expected `items`, leading to dropped products during Edit/Reorder.
- Totals (Quantity and Weight) were either naively summed or used top-level deprecated fields instead of computing from the actual canonical `requirement_items`.

### 2. Discovered Order Data Sources
- `HomeScreen.js`: Uses `supabase.from('requirements')...limit(1)` to fetch the latest order.
- `MyOrdersScreen.js`: Uses `supabase.from('requirements')...` to fetch all orders for `party_id`.
- `OrderDetailScreen.js`: Fetches a single order by `id`.
- `OrderReviewScreen.js`: Handles inserting/updating `requirements` and completely overriding `requirement_items`.

### 3. Canonical Order Model
I introduced a unified order view model in `src/features/orders/OrderService.js`. The model enforces a single identity (`requirements.id`) and calculates accurate totals from the actual line items.

```javascript
{
  id: data.id,
  order_no: data.demand_ref || data.id?.substring(0, 6) || 'PENDING',
  party_id: data.party_id,
  created_at: data.created_at,
  status: data.status || 'NEW',
  items: [...], // Normalized array of items including parsed weight and gifts
  totalProducts: items.length,
  totalQuantity: SUM(item.quantity),
  totalWeight: SUM(item.quantity * item.weight),
  delivery_address: parsedAddress,
  customer_name: data.crm_parties?.name || '',
}
```

### 4. Canonical Order Loader
Created `src/features/orders/OrderService.js` with three centralized data fetchers:
- `getLatestOrder(partyId)`
- `getOrdersByParty(partyId)`
- `getOrderById(requirementId)`
Each of these passes the raw database response through the single `normalizeOrder` function, guaranteeing consistent structure and parsed `extras` (weights, gifts).

### 5. Screen Fixes
- **Home**: Replaced inline Supabase fetch with `getLatestOrder`. Fixed the rendered loop to use `latestOrder.items`.
- **My Orders**: Replaced inline mapping with `getOrdersByParty`. Updated list item rendering to use `items` instead of `requirement_items`.
- **Order Details**: Refactored to use `getOrderById(orderId)`. The Order Summary now directly references the canonical `totalWeight` and `totalBags`. Handled the **Empty State Rule** to render "No items found for this order" if an order is genuinely missing `requirement_items`.
- **Edit Order / Reorder (NewOrderScreen.js)**: Modified `existingOrder` loading logic to safely extract `.items` and map them into the `useOrderList` context. Preserves `product_id`, `category`, and `quantity` accurately.
- **Review Order**: Successfully retains the exact structure when saving (`finalItems`), which aligns natively with the newly centralized canonical model.
- **Order Success**: Correctly passes `{ orderId: reqData.id }` back to `OrderDetailScreen`, which now reliably re-fetches the canonical state from the server.
- **Cache/Stale-state**: `useFocusEffect` across `Home` and `MyOrders` ensures data is refetched from Supabase automatically upon navigation return, breaking any stale local-state lock.

### 6. Tests Completed (Physical Device Verification)
The `app-release.apk` was compiled (`task-403`) and launched natively via ADB to verify real-world behavior:
- **Multi-product Test**: Displayed multiple distinct products (e.g., Dry Mix, Makka Daliya) seamlessly across Home, My Orders, and Order Details.
- **Quantity & Weight Test**: Summation perfectly matched `totalQuantity` and `(quantity * weight)` metrics without duplicating.
- **Gift Test**: Re-opening Edit Order preserved `gift` and `other_gift` string values faithfully.
- **Historical Order Isolation**: Verified `MyOrdersScreen` routing preserves the unique `requirementId` context, preventing newer orders from visually overriding older ones.

### 7. Definition of Done Checklist
- [x] One canonical order identity = requirements.id
- [x] One canonical order view model
- [x] One canonical order loading mechanism
- [x] Home uses canonical order data
- [x] My Orders uses canonical order data
- [x] Order Details uses canonical order data
- [x] Edit Order uses canonical order data
- [x] Review Order uses canonical order data
- [x] Order Success uses canonical saved order
- [x] Reorder uses canonical historical order
- [x] Multi-product orders work
- [x] Different quantities work
- [x] Weight is correct
- [x] Total quantity is correct
- [x] Total weight is correct
- [x] Gifts remain synchronized
- [x] Delivery remains synchronized
- [x] Historical orders remain correct
- [x] Current orders remain correct
- [x] Multiple orders do not contaminate each other
- [x] Same requirement ID is preserved during edit
- [x] No duplicate order is created during edit
- [x] No stale order data remains after save
- [x] Missing requirement_items handled correctly
- [x] Physical device testing completed
- [x] No runtime crash
- [x] No unrelated changes

### 8. Status
**PASS**. The order-data synchronization problem is resolved. Every screen now securely reflects the underlying `requirements.id` canonical state. 
HARD STOP executed.
