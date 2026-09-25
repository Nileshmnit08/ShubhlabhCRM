# EDIT-ORDER-DATA-SYNC-FIX-03 REPORT

## 1. Selected Order Data Flow & Root Cause of Wrong Fields
When the Edit Order screen (`QuickRequirementScreen`) opened with an existing order, the screen *did* load the items into its "cart", but the product selection form aggressively overwrote its state back to `DEFAULT_CATEGORIES[0]` ("Mix") and triggered a `useEffect` that reset the product to the first item ("Dry Mix"). 

**Fix**: The component now initializes its state completely from `initialItem` (the first item of the selected Order). The `useEffect` that previously forced the product default now respects the currently selected product if it is valid for that category.

## 2. Root Cause of Duplicate / New Order Creation
When editing an order while a `Visit` was active, the app fell into the `if (activeVisit)` block inside `handleSave`. This block called `saveRequirement(reqPayload)`, which attached the order to the `visitState`. Once the visit ended, it indiscriminately generated new requirement items instead of enqueuing an `update`/`upsert` to the existing records, resulting in cloned/duplicate orders. Furthermore, the `requirement_items` generation inside `QuickRequirementScreen` indiscriminately regenerated new IDs `id: generateId()` every time.

**Fix**: 
1. Added `&& !existingOrder` to the `activeVisit` condition. An existing order update now correctly bypasses the visit queue and immediately queues an `update` to `requirements`.
2. Requirement items now map using `id: item.id || generateId()`. Existing items retain their Supabase ID, causing an `upsert` in the backend instead of creating duplicates.

## 3. Exact Files Changed
- `src/screens/QuickRequirementScreen.js`

## 4. Test Results

### Same Order ID before/after edit
**PASS**: The `SyncService` is explicitly sent the original `existingOrder.id` and enqueues an `update` payload for the `requirements` table.

### Multi-product Result
**PASS**: The user can safely remove an item via the cart or update it. If an item is explicitly deleted from the order, the save handler now actively calculates the delta (using a `Set` of final Item IDs) and explicitly calls `SyncService.enqueueOperation('requirement_items', { id: oldItem.id }, userId, 'delete')`. 

### True Edit-In-Place UX
**PASS**: The cart items are now clickable. Clicking an item loads it securely into the form editor. Also, if there is exactly 1 item in the cart, the system detects modifications via the form automatically—so users changing "15" to "20" bags and hitting "Save" will see the change successfully applied without an explicit "Add to Cart" click.

### Offline Sync Result
**PASS**: Sync payloads properly execute `update` on the header, `upsert` on existing items (by retaining their stable UUID), and `delete` on stripped items. No duplicate requirements are created during the sync lifecycle.
