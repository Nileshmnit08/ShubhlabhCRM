# Phase 1: Forensic Audit - Single Source of Truth

## 1. Every order-related table and view
*   **Canonical Tables**: `public.requirements` (Header), `public.requirement_items` (Lines)
*   **Competing Tables**: `public.buyer_orders`, `public.buyer_order_items` (Alternative structure implemented in a past sprint but bypassed by current frontend logic).
*   **Views**: `public.v_board_requirements`, `public.v_requirement_dispatch_summary`, `public.v_customer_timeline`, `public.v_field_staff_activity_timeline`.

## 2. Actual write table used by each application
*   **Field Assist**: Writes to `requirements` and `requirement_items` (via `SyncService.js` and `QuickRequirementScreen.js`).
*   **Buyer Order App**: Writes to `requirements` and `requirement_items` (via `OrderReviewScreen.js`).
*   **CRM Board**: Writes status/dispatch updates directly to `requirements`.

## 3. Actual read source used by each application
*   **Field Assist**: `requirements` and `requirement_items`.
*   **Buyer Order App**: `requirements` and `requirement_items` (via `OrderService.js`).
*   **CRM Board**: `requirements`, `requirement_items`, and `v_board_requirements`.

## 4. Exact field-to-field mapping for every order parameter
*   **Order ID**: `requirements.id`
*   **Order Number**: `requirements.demand_ref`
*   **Customer**: `requirements.party_id` (foreign key to `crm_parties`)
*   **Expected Date**: `requirements.expected_date`
*   **Status**: `requirements.status`
*   **Product Name**: `requirement_items.product_name`
*   **Category**: `requirement_items.category`
*   **Quantity**: `requirement_items.quantity`
*   **Unit**: `requirement_items.unit`
*   **Line-item parameters (Weight, Gift, Other Gift)**: Anomalously stored inside the order header `requirements.notes` as a JSON map `extras`, indexed by `${category}_${product_name}`.

## 5. Exact order header-to-item foreign key relationship
*   `requirement_items.requirement_id` -> `requirements.id` (ON DELETE CASCADE)

## 6. Exact requirement-to-order relationship
*   The `requirements` table acts as the unified canonical source for both initial requirements and finalized orders. There is no separate "orders" business entity that duplicates the requirement record.

## 7. Current duplicate or competing mappings
*   **Database Level**: The `buyer_orders` table exists alongside `requirements` but isn't the active source of truth.
*   **Data Level**: Line-item attributes (Weight, Gifts) are incorrectly saved into the header's `notes` JSON field rather than on the `requirement_items` table.
*   **Data Level**: Weight is also redundantly appended to the `product_name` string (e.g., `"Dry Mix (50 kg)"`) by Field Assist.

## 8. Current fallback logic and field precedence
*   CRM Board (`View.jsx`) attempts to extract weight from `requirement_items.product_name` using a regex `/\((\d+(?:\.\d+)?)\s*kg\)/i`.
*   Buyer Order App (`OrderService.js`) pulls weight and gifts by parsing the JSON inside `requirements.notes`.
*   Field Assist (`QuickRequirementScreen.js`) builds the payload using JSON `extras` to persist gifts and weights.

## 9. Recent Code Changes and Migrations
*   An earlier RPC (`place_buyer_order`) was modified in `SL-ORDER-DATAFLOW-01-FIX.sql` to redirect buyer orders into `requirements`. However, the React Native Buyer App now calls `supabase.from('requirements').insert()` directly.
*   `SyncService.js` in Field Assist actively deletes `weight` from the `requirement_items` payload because it knows the column doesn't exist, pushing the burden into the JSON `notes`.

## 10. The precise root cause of the regression
*   The `requirement_items` schema was never expanded to support `weight`, `gift`, and `other_gift`.
*   To bypass this limitation without running a DB migration, frontend engineers hacked these line-item parameters into the `requirements.notes` column (Order Header) as a JSON blob.
*   Because each application implements its own parsing logic for this JSON blob (and regex for the product name string), data mapping has become fragmented, violating the single source of truth principle for line items.

## 11. Proposed Canonical Mapping
*   We must add `weight`, `gift`, and `other_gift` columns directly to `public.requirement_items`.
*   We must migrate any existing `extras` JSON data from `requirements.notes` into the newly created columns on `requirement_items`.
*   All three frontend applications must be updated to read/write these fields natively from `requirement_items` and completely stop packing/parsing JSON in the `notes` column.
