# SYNC-WEIGHT-ROOT-CAUSE-01

## Actual `requirement_items` schema
The actual Supabase schema for `requirement_items` **does not contain a `weight` column**. 
It contains: `id`, `requirement_id`, `category`, `product_name`, `quantity`, `unit`, and `created_at`.

## Failed Queue Payload
The failed item in the SyncService queue is an **old `requirements` payload** (i.e., `pendingOp.table === 'requirements'`) that improperly contains a nested array of `requirement_items`. 
Because it is a nested payload, it looks something like this:
```json
{
  "id": "...",
  "party_id": "...",
  "status": "New",
  "requirement_items": [
    {
      "id": "...",
      "product_name": "...",
      "quantity": 10,
      "unit": "Bags",
      "weight": 50
    }
  ]
}
```

## Exact Code Path Sending Weight
When the sync retry loop in `SyncService.js` processes this old `'requirements'` item, it executes the following:
```javascript
let safePayload = { ...pendingOp.payload };
if (pendingOp.table === 'requirement_items') {
  delete safePayload.weight;
}
```
Because the `table` is `'requirements'` (not `'requirement_items'`), the scrubber ignores it. The `safePayload` is then passed directly to `supabase.from('requirements').upsert([safePayload])`. 
PostgREST correctly detects the nested `requirement_items` array and attempts a nested insert. During this nested insert, PostgREST sees the `weight` key, checks its schema cache for `requirement_items`, fails to find the column, and throws the `PGRST108` error.

## Root Cause
The root cause is a combination of **A (old failed queue payload)** and **B (current code logic hole)**:
1. **Old Payload**: An older version of the app enqueued the entire requirement with its nested items directly into the `requirements` table operation. 
2. **Current Code Hole**: The current `SyncService.js` scrubber only deletes `weight` if the top-level table is exactly `'requirement_items'`, failing to strip `weight` from nested items inside a `'requirements'` payload. 

## Recommended Minimal Fix
Update the scrubber in `src/services/SyncService.js` (around line 241) to also iterate through and clean nested `requirement_items` if they exist on a `'requirements'` payload:

```javascript
          if (pendingOp.table === 'requirements') {
            // New fix for old nested payloads
            if (safePayload.requirement_items && Array.isArray(safePayload.requirement_items)) {
              safePayload.requirement_items.forEach(item => delete item.weight);
            }
            // ... existing safe recovery patch ...
```
