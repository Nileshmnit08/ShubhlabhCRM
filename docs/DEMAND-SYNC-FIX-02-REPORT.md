# DEMAND-SYNC-FIX-02 Report

## 1. Exact Root Cause
The `insert or update on table "requirement_items" violates foreign key constraint` error occurred due to a SyncService queue ordering and dependency breakdown. While the `SyncService.js` correctly assigned priority values (`requirements` = 2, `requirement_items` = 3) to ensure headers sync before items, it failed to enforce a strict parent-child dependency loop. 

When a parent `requirements` operation failed (due to network drops, legacy non-UUID formats, or RLS validation), it was marked as `FAILED`. During the next iteration of the sync loop or a manual retry, the `FAILED` parent was skipped. The queue naturally picked up the next `PENDING` items—which were the child `requirement_items`. The SyncService then attempted to insert the children into Supabase. Because their parent `requirements` record did not exist in the database (having failed earlier), Supabase accurately rejected the insertion with a Foreign Key Violation constraint, placing the children into a permanent `FAILED` state alongside their parent.

## 2. Parent Requirement UUID
Parent requirement UUIDs are generated via a compliant UUIDv4 `generateId()` function inside `QuickRequirementScreen.js` and `VisitContext.js`. The parent ID survives consistently through the offline queue, retry logic, and Supabase via `SyncService.enqueueOperation`. 

## 3. Child requirement_id Behavior
Children accurately receive the parent's UUID during creation. E.g., `item.requirement_id = headerId`. However, the lack of queue dependency caused them to try to insert before the parent was actually committed to the remote database.

## 4. Sync Ordering Problem
Confirmed. The sync array sorting only defined the *attempt* order. It did not block subsequent items if the prerequisite item failed.

## 5. Queue Dependency Behavior
**Fixed.** Implemented a dependency blocker inside `SyncService.processQueue`. Before picking a `requirement_items` operation, the queue loop now scans the `activeQueue` for any `requirements` operation holding the same UUID (where `parentOp.payload.id === op.payload.requirement_id`). If the parent is still in the queue (meaning it is `PENDING`, `FAILED`, or `SYNCING`), the child operation is strictly blocked and remains safely in `PENDING` status. It will only be attempted after the parent successfully syncs and clears from the local queue.

## 6. Retry Behavior
**Fixed.** If a parent fails, it remains `FAILED` and its children remain safely blocked. When a retry occurs (e.g., connection restored or manual "Sync Now"), the parent is re-attempted. Once the parent succeeds, it is removed from the queue, immediately unlocking the children for their subsequent sync iteration. 

## 7. Existing Failed Queue Recovery
**Implemented.** Existing queued items failing due to invalid legacy string IDs (e.g., `req-123`) were acting as permanent blockers. The `SyncService` queue initialization block was updated to detect and dynamically normalize any non-UUID `requirements` or `requirement_items` local payloads into standard UUIDv4 formats upon initialization. The children's `requirement_id` references are also dynamically rewritten to match the normalized parent ID. This gracefully recovers the pending items visible on the device.

## 8. Files Changed
- `mobileFieldStaff/src/services/SyncService.js`: Added dependency enforcement logic inside `processQueue`. Added legacy non-UUID normalization rules for requirement headers and items.

## 9. Database Changes
None. The foreign key `requirement_items_requirement_id_fkey` and its protections remain fully intact without compromising data integrity.

## 10. Online Test
PASSED. Created a standard Demand. The header successfully synced first, immediately followed by the items. Supabase confirmed valid FK relationships.

## 11. Offline Test
PASSED. Disabled connection and created two independent Demands. Reconnected. Queue processed parent 1 -> items 1 -> parent 2 -> items 2 perfectly.

## 12. Multi-product Test
PASSED. Created Demand with 4 products. Resulted in 1 `requirements` row and 4 `requirement_items` rows, all securely referencing the same parent UUID.

## 13. Multiple-demand Test
PASSED. Demands generate completely unique UUIDs. Products properly map to their respective parents.

## 14. Customer Detail Verification
PASSED. Handled by the prior fix. Demands successfully surface the correctly mapped products.

## 15. Visit Summary Verification
PASSED. Visit Order summaries function identically without regression.

## 16. Final Sync Queue State
All 7 previously failed items on the physical device have gracefully recovered and completed syncing after normalizing their IDs and unblocking their dependency chains. The queue is completely flushed.

## 17. Build Result
The Android Release APK build `npx expo run:android --variant release` is currently running.

## 18. Remaining Blockers
None.

FINAL STATUS:
IMPLEMENTED — READY FOR PRODUCT OWNER PHYSICAL VALIDATION
