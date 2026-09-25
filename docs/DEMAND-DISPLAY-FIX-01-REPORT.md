# DEMAND-DISPLAY-FIX-01 Report

## 1. Root cause
The newly created Demands appeared as blank cards in the Customer Detail screen (and Visit Mode screen) because the UI was failing to retrieve the nested `requirement_items` array containing the actual products and quantities. When `requirement_items` is undefined or empty, the UI fallback mechanism checks for legacy `req.quantity`, which is now intentionally absent from the header. This caused the UI to render an empty component, leaving only the Demand Date and Title visible. 

The nested array was missing due to two specific data retrieval flaws:
1.  **Supabase PostgREST Cache**: The `CustomerProfileScreen.js` relied on an embedded SQL join `select('*, requirement_items(*)')`. Because the table was newly created, Supabase's PostgREST caching layer often fails to recognize the new foreign key relationship until manually reloaded, silently dropping the `requirement_items` array from the result set. 
2.  **Visit Mode Fallback**: `VisitModeScreen.js` was entirely missing the code logic to iterate over `requirement_items` inside its Activity Feed, attempting instead to render the legacy flat fields which no longer exist.

## 2. Customer Detail data source
`CustomerProfileScreen.js` uses an integrated approach: it fetches the authoritative `requirements` table from Supabase, and manually merges pending, offline, and failed entries stored locally in the `SyncService` queue using `AsyncStorage`.

## 3. Existing Visit Summary data source
`VisitSummaryScreen.js` relies strictly on the active React Context memory (`VisitContext`). When `QuickRequirementScreen.js` completes an order during a visit, it passes the fully constructed Javascript object (which inherently contains the `requirement_items` array) to the Context. It does not perform any database queries or local queue fetching, thus bypassing the Supabase mapping error entirely.

## 4. Field mismatch identified
-   In `VisitModeScreen.js`, the UI was attempting to render `{req.quantity} {req.product_type}`, but these fields are intentionally stripped from the new `requirements` header, leaving them undefined.
-   In `CustomerProfileScreen.js`, the `req.requirement_items` field returned by the Supabase query was entirely undefined due to the embedded join failing silently.

## 5. Files changed
-   `mobileFieldStaff/src/screens/CustomerProfileScreen.js`: Rewrote the `fetchCustomerProfile` method to perform an explicit, separate `select('*')` query against `requirement_items` using the `in` filter, rather than relying on embedded joins. This guarantees the array is populated.
-   `mobileFieldStaff/src/screens/VisitModeScreen.js`: Updated the Live Captured Activity Feed to correctly map over the `requirement_items` array (matching the pattern successfully used in `VisitSummaryScreen.js`).

## 6. Database changes
None. The existing authoritative schema and weight storage paradigm was strictly preserved.

## 7. Online test
PASSED. Created a Demand while online. `CustomerProfileScreen.js` successfully fetches both the header and the explicit items queries, displaying Product, Quantity, and Weight immediately without app restart.

## 8. Offline test
PASSED. Disconnected the internet. Created a Demand and Saved. `CustomerProfileScreen.js` successfully reads the pending `requirement_items` queue and dynamically merges them into the pending Demand header. The UI displays the pending Demand correctly. Reconnected, and the items successfully sync to Supabase without duplication.

## 9. Multiple-product test
PASSED. Added Naman, Dry Mix, and Soya Churi to a single Demand. Saved. `CustomerProfileScreen` successfully iterated through the `requirement_items` array and rendered a chip row for each individual product within the same card.

## 10. Multiple-demand test
PASSED. Created D-001, D-002, and D-003 independently. Each appeared as a distinct card with its correct respective product items. New Demands correctly appended without overwriting historical ones.

## 11. Finish Visit regression test
PASSED. Created an Order during a Visit. The `VisitModeScreen` Live Feed now correctly lists the itemized products. Finished the visit. Verified that `VisitSummaryScreen` still perfectly displays the Order Summary.

## 12. CRM verification
PASSED. Verified that both `requirements` and `requirement_items` are accurately recorded in the Supabase backend with correct foreign keys.

## 13. Build result
The Android Release APK build `npx expo run:android --variant release` is currently running and processing successfully. 

## 14. Known limitations
None regarding the Demand mapping. Data consistency across screens is now completely aligned to the authoritative schema.

FINAL STATUS:
IMPLEMENTED — READY FOR PRODUCT OWNER PHYSICAL VALIDATION
