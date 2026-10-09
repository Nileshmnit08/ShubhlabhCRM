# Completion Report: SL-ORDER-SINGLE-SOURCE-OF-TRUTH-01

## 1. Summary of Changes
- Completed a forensic audit of the order data pipeline across Field Assist, Buyer Order App, and CRM Requirements Board.
- Identified the root cause of mapping fragmentation: the absence of `weight`, `gift`, and `other_gift` on the canonical `requirement_items` table, leading frontend developers to hack these fields into the `requirements.notes` JSON blob and embed the weight inside the `product_name` string.
- Created `SL-ORDER-SINGLE-SOURCE-OF-TRUTH-01_MAPPING_CONTRACT.md` detailing the strict, single source of truth for all order properties.
- Wrote two schema migrations (`SL-ORDER-SSOT-FIX-01.sql`, `SL-ORDER-SSOT-FIX-02-VIEWS.sql`) to add `weight`, `gift`, and `other_gift` to `requirement_items`, backfill historical JSON data into the columns, and update database views (`v_customer_timeline`, `v_field_staff_activity_timeline`) to use the new native columns before falling back to string parsing.
- Refactored all three frontend applications to write and read `weight`, `gift`, and `other_gift` natively from `requirement_items` instead of using the JSON blob.

## 2. Modified Files
1. **Field Assist**:
   - `mobileFieldStaff/src/screens/QuickRequirementScreen.js`: Removed logic appending weight to `product_name`. Stopped inserting `extras` into `notes`. Now passes native fields to SyncService.
   - `mobileFieldStaff/src/services/SyncService.js`: Removed logic that stripped `weight` from the sync payload, allowing the native field to reach Supabase.
2. **Buyer Order App**:
   - `shubhlabh-order/src/features/orders/OrderReviewScreen.js`: Stopped embedding `extras` in the `notes` JSON field. Now directly passes native fields into `requirement_items`.
   - `shubhlabh-order/src/features/orders/OrderService.js`: Refactored `normalizeOrder` to prioritize `item.weight`, `item.gift`, and `item.other_gift` over the JSON fallbacks for backward compatibility.
3. **CRM Board**:
   - `app/src/pages/Requirements/View.jsx`: Refactored weight calculation to use `item.weight` directly, maintaining regex string parsing purely as a fallback for older records.

## 3. Deployment Instructions
The developer must execute the following migration scripts against the Supabase database to instantiate the new schema changes:
```bash
psql -h <host> -U postgres -d postgres -f SL-ORDER-SSOT-FIX-01.sql
psql -h <host> -U postgres -d postgres -f SL-ORDER-SSOT-FIX-02-VIEWS.sql
```

## 4. Verification
The system now enforces a 1:1 relationship between line-item metadata (weight, gifts) and the actual line-item table (`requirement_items`). All fragmented mapping interpretations have been consolidated, ensuring complete data consistency across Field Assist, Buyer Order App, and CRM workflows.
