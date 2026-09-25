ROOT CAUSE
The UI layer in `QuickRequirementScreen` accurately tracks weight selection and assigns it directly to the local `requirement_items` payload queue object for offline resilience. However, the Supabase schema for `requirement_items` does not feature a dedicated `weight` column (the weight is already successfully persisted by concatenating it directly into the `product_name` string, e.g., "Dry Mix (50 kg)"). When the background `SyncService` dispatches the payload to the server, PostgREST strictly rejects the row because of the unrecognized `weight` property, stranding the item in a failed sync state.

FIX
Patched the `pushToServer` execution block within `SyncService.js`. For any pending operation targeting the `requirement_items` table, the code now intercepts and explicitly deletes the `weight` key from the `safePayload` clone immediately before pushing to Supabase. This elegantly bypasses the schema constraint error while fully retaining the `weight` property within the local offline queue architecture. (I also patched a React hook order crash in `App.js` that was preventing the app from launching after the build).

FILES CHANGED
- `d:\ShubhLabhCRM\mobileFieldStaff\src\services\SyncService.js`
- `d:\ShubhLabhCRM\mobileFieldStaff\App.js`

SYNC TEST RESULT
- **PASS**: The previously failed order gracefully auto-recovers and syncs successfully on the next network tick since the patched `SyncService` sanitizes the existing stranded payload. Pending Sync counter drops to 0. A newly created Order synchronizes seamlessly, storing the concatenated weight string exactly as intended in the database without triggering column validation errors.

STOP.
