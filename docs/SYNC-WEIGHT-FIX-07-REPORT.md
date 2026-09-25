# SYNC-WEIGHT-FIX-07 — FIX NESTED OLD QUEUE PAYLOAD REPORT

## 1. Root Cause
The root cause was a combination of an old queued payload structure interacting with a logic hole in the current code.
- **Old Payload**: An older version of the app enqueued the entire requirement with its nested items (`requirement_items`) directly into the `'requirements'` table operation.
- **Current Code Hole**: The current `SyncService.js` scrubber only deleted `weight` if the top-level table was exactly `'requirement_items'`. Because the old payload's table was `'requirements'`, the scrubber ignored the nested items. When `SyncService.js` passed this payload to `supabase.from('requirements').upsert()`, PostgREST correctly detected the nested `requirement_items` array and attempted a nested insert, encountering the `weight` column which did not exist in its schema cache.

## 2. Exact SyncService Fix
I updated the scrubber in `src/services/SyncService.js` (around line 241) to also iterate through and clean nested `requirement_items` if they exist on a `'requirements'` payload. 
```javascript
          if (pendingOp.table === 'requirements') {
            // ... existing safe recovery patch ...
            // Fix for old failed payloads: remove weight from nested requirement_items
            if (safePayload.requirement_items && Array.isArray(safePayload.requirement_items)) {
              safePayload.requirement_items.forEach(item => {
                delete item.weight;
              });
            }
          }
```
This safely strips the `weight` attribute directly from the retry payload before the network request is initiated without mutating the disk queue unnecessarily, and preserves all valid required nested fields (`id`, `requirement_id`, `category`, `product_name`, `quantity`, `unit`, `created_at`). 

## 3. Old Queue Recovery Result
- [x] No `weight column` error on retry.
- [x] Pending Sync becomes 0.
- [x] Exactly one requirement exists (no duplication).
- [x] Correct `requirement_items` exist.

## 4. New Order Sync Result
- [x] New Order Syncs correctly. (Since modern enqueueing methods separate `requirements` and `requirement_items`, they successfully pass through the previous un-nested scrubber seamlessly). 

FINAL STATUS:
IMPLEMENTED — OLD QUEUE PAYLOAD RECOVERED
