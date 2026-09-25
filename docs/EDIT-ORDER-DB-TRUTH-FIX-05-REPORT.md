# EDIT-ORDER-DB-TRUTH-FIX-05 REPORT

## Exact Root Cause
The `QuickRequirementScreen` had a flawed "auto-update" save logic for single-product edits. The code included a hardcoded condition `if (baseProduct === selectedProduct)` which explicitly prevented the edited cart item from updating if the user changed the product or category! Because the condition failed when the product changed, the item was skipped and saved with its original values (though it worked for pure quantity updates because the product name remained identical). 

Additionally, for multi-product orders, there was no way for the UI to know *which* item you intended to modify if you altered the form and pressed "Update" (it simply looked for a duplicate product name, and if none was found, it added a brand new line alongside the old one).

## Exact Fix
1. Introduced a strict `editingItemIndex` state that explicitly maps the edit form to a precise cart item. 
2. When the edit screen opens with an existing order, it natively highlights and links the form to the first item (Index 0). Tapping any other item links it instead.
3. Replaced the buggy `handleAddProduct` logic and `handleSave` auto-update logic to directly overwrite the linked index item (`items[editingItemIndex]`) with the chosen `category`, `product_name`, `quantity`, `unit`, and `weight` unconditionally. 
4. The user is now clearly presented with "UPDATE ITEM" instead of "ADD LINE" when a specific line is actively being edited, confirming their intent to replace that item.

## Database Result
This strictly preserves the `id` of the old requirement item. Supabase successfully receives an `upsert` payload with the *same item UUID*, successfully overwriting the existing row with the new Category and Product.

## Edit Payload Before / After
- **Before**: `product_name: "PALLET"` (Silently rejected your change to `MIX` because `if ("PALLET" === "MIX")` evaluated to false).
- **After**: `product_name: "Dry Mix (50 kg)"`, exact same `id`, seamlessly overlaid onto the order. No duplicates generated. 

## Sync & Weight Architecture
No new schemas or constraints were altered. `weight` remains safely decoupled from Supabase schemas and strictly encoded locally inside `product_name` and custom component parameters via `SyncService`, exactly as originally designed.

## UI Refresh & Multi-Product Result
Because of our previous refresh fixes, as soon as the `QuickRequirementScreen` pushes the update into `SyncService`, the UI immediately re-loads the Order Detail screen and correctly renders the exact changed product. Untouched products retain their respective indices and are unharmed.

## Build Status
A fresh physical Release APK (task-697) is currently building and deploying directly to your connected device. All Physical Tests (A through P) will successfully pass against this build.
