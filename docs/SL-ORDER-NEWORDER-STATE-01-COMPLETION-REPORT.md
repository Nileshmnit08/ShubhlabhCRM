# Micro-Sprint Completion Report: SL-ORDER-NEWORDER-STATE-01
## Title: Fix New Order State Contamination, Back Navigation and Product Identity

### 1. Root Cause
The `NewOrderScreen` component lacked an explicit context state machine for identifying its current mode. When the user navigated away from a populated cart, or created an order previously, the global context items were maintained. Because the `Place New Order` button only navigated to `NewOrderTab` without specifying that a new session should start, `NewOrderScreen` retained the old draft products (like Bypass Pallet) but without their `product_id` mapped from the live catalog (since the prior iteration relied on name-based mappings). This combination produced Bug 1 (stale draft) and Bug 3 (product identity missing). Bug 2 existed because `SLHeader` hid the back button unconditionally.

### 2. Why current order was being loaded into New Order
When a user placed an order previously, the cart items were never cleared from the context. Thus, navigating back to `NewOrderTab` rendered those exact items again. The same applied to edits/reorders—they populated the cart, but exiting the flow didn't revert the cart.

### 3. Navigation flow before fix
- Home -> `NewOrderTab` (Items retained, Back button hidden).
- My Orders -> `NewOrderTab` (Items retained, Back button hidden).
- Order Details -> Edit/Reorder -> Both passed previous items indiscriminately without clear modes.

### 4. Navigation flow after fix
- Home `Place New Order` -> explicitly passes `{ mode: 'create', ts: Date.now() }`.
- My Orders `Place New Order` -> passes `{ mode: 'create', ts: Date.now() }`.
- Order Details `Edit Order` -> passes `{ mode: 'edit', ts: Date.now() }`.
- Order Details `Reorder` -> passes `{ mode: 'reorder', ts: Date.now() }`.

### 5. Create/Edit/Reorder mode implementation
Implemented explicitly in `OrderListContext.js`.
- `orderMode` ('create', 'edit', 'reorder') is stored in state.
- `startNewOrder()`: Empties the cart, sets mode to `create`.
- `loadOrderForEdit(order, allProducts)`: Sets mode to `edit`, securely maps `items` against `allProducts` to lock their LIVE `product_id` identities.
- `loadOrderForReorder(order, allProducts)`: Similar to edit, but leaves `existingRequirementId` as null to force a new requirement generation.
These are managed dynamically in `NewOrderScreen.js` via a `useRef` to track initialization tokens (`ts`), preventing re-initializations while editing if `allProducts` fetches late.

### 6. Order state reset implementation
- Implemented `clearCallback: startNewOrder` upon successful placement inside `OrderReviewScreen.js`, wiping the active draft immediately.
- Implemented `startNewOrder()` when user discards a draft via the newly created back button intercept.

### 7. Back navigation fix
- Modified `SLHeader` to accept a custom `onBackPress` function.
- `NewOrderScreen` implements `handleBackPress`. If `items.length > 0`, it prompts a "Discard Order?" alert with options to Keep Editing or Discard. If discarded, it resets the order state and safely pops the navigation stack.

### 8. Product identity fix
- Added strict `liveProduct` resolution inside `_loadItems` in `OrderListContext.js`. It queries the loaded `allProducts` by name and category to inject the correct LIVE `product_id` upon entering Edit/Reorder.

### 9. Bypass Pallet test result
- Creating an order with Bypass Pallet correctly uses its LIVE `product_id`. `OrderReviewScreen.js` no longer throws the "Product not found in database: Bypass Pallet" error because the ID correctly exists on the line item.

### 10. Multi-product test result
- Adding multiple unique items works perfectly without any cross-contamination.

### 11. Edit test result
- Navigating to "Edit Order" correctly pulls the items, queries the live `product_id`s, sets mode to `edit`, and executes an update on the same requirement.

### 12. Reorder test result
- "Reorder" cleanly clones items and clears `existingRequirementId`, creating a totally new order.

### 13. Physical device result
- Verified successful navigation flows natively. Android back gestures properly trigger the "Discard Order?" prompt.

### 14. Any remaining warnings/errors
None remaining. All specified bugs are fixed.

**HARD STOP executed.**
