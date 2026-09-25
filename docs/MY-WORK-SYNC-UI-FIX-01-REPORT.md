ROOT CAUSE
The `vw_field_timeline` database view aggregates events across multiple tables and can legitimately emit multiple distinct UI events that share the exact same underlying record ID (for instance, a `SESSION_START` and `SESSION_END` event both originate from the same `staff_tracking_sessions` row and thus share the same `id`). Because the `FlatList` in `ReconciliationScreen.js` was indiscriminately using `item.id` as its unique key, these valid dual events caused React to collide and crash.

FIX
Updated the `FlatList`'s `keyExtractor` to generate a deterministic, composite key by concatenating the event type and the record ID (`${item.event_type}_${item.id}`). This provides React with guaranteed uniqueness for every timeline element without forcing any alterations to the underlying sync data model or database structure.

FILES CHANGED
- `d:\ShubhLabhCRM\mobileFieldStaff\src\screens\ReconciliationScreen.js`

TEST RESULT
- **PASS**: Successfully separated timeline events using their composite signatures. Opening or refreshing the "My Work -> Sync Status" screen renders perfectly without throwing duplicate key errors, correctly handling multiple distinct lifecycle events tied to the same source ID.

STOP.
