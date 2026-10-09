# Completion Report: CRM-FIELD-SYNC-RLS-TRAVEL-SEGMENTS-01

## 1. Objective
Fix the Field Assist sync failure caused by the RLS policy on `public.field_travel_segments` and safely recover failed pending sync items.

## 2. Root Cause Analysis
The sync failure reported on the physical device (`new row violates row-level security policy for table "field_travel_segments"`) is caused by a missing RLS policy for `INSERT` and `DELETE` operations on `field_travel_segments`. 

When the Field Assist mobile app synchronizes offline tracking data, it pushes records to the `staff_location_history` table using the authenticated user's session (`auth.uid()`). This insertion triggers the `trigger_recalculate_session_distance` function (introduced in `160_sprint_FM_03_distance_engine.sql` and modified in `170_sprint_FM_04_segment_engine.sql`), which in turn calls `recalculate_session_segments(session_id)`.

Inside `recalculate_session_segments()`, the engine performs:
```sql
DELETE FROM public.field_travel_segments WHERE session_id = p_session_id;
INSERT INTO public.field_travel_segments (session_id, staff_id, ...) VALUES (p_session_id, staff_uuid, ...);
```

Because the trigger is executed within the context of the user's Supabase REST API request, the function executes with the privileges of the authenticated user. While `field_travel_segments` has RLS enabled and a `SELECT` policy allowing users to read their own records, it **lacks both `INSERT` and `DELETE` policies**. Consequently, Postgres denies the operation, aborting the transaction and causing the entire sync batch (including location history and travel segments) to fail and remain stuck in the queue.

### Ownership Verification
- **Staff ID / Session ID**: In the database function `recalculate_session_segments()`, `staff_uuid` is derived securely by querying `staff_tracking_sessions` (`SELECT staff_id INTO staff_uuid FROM public.staff_tracking_sessions WHERE id = p_session_id;`). This guarantees that the user can only modify segments belonging to sessions they own (enforced by RLS on `staff_tracking_sessions`).
- **Authorization Enforcement**: RLS `WITH CHECK` and `USING` clauses matching `auth.uid() = staff_id` are the correct approach to ensure tenant isolation, preventing users from inserting or deleting segments belonging to other staff members.

## 3. Resolution
A database migration script (`234_sprint_FM_04_segment_engine_rls_fix.sql`) was created to properly define the missing `INSERT`, `UPDATE`, and `DELETE` RLS policies for `field_travel_segments`. 

The implemented policies are securely bound to `staff_id`:
```sql
CREATE POLICY "Enable insert access for users to own records" 
    ON public.field_travel_segments FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable update access for users to own records" 
    ON public.field_travel_segments FOR UPDATE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);

CREATE POLICY "Enable delete access for users to own records" 
    ON public.field_travel_segments FOR DELETE 
    USING (auth.role() = 'authenticated' AND auth.uid() = staff_id);
```

By applying these policies, the `recalculate_session_segments` function can successfully manage travel segments on behalf of the user during sync without requiring the security-weakening `SECURITY DEFINER` tag, thus preserving strict RLS evaluation.

## 4. Recovery of Failed Sync Items
Once the RLS policies are applied to the production database:
1. The mobile app's built-in `SyncService` will automatically retry the 379 failed items from `AsyncStorage`.
2. Since the payload in the queue contains valid `staff_location_history` and `staff_travel_segments` inserts, and the `SyncService` enforces dependency sequencing, the requests will pass through cleanly.
3. The trigger will recalculate the session and successfully insert the matching rows into `field_travel_segments` without any data loss or duplication.

## 5. Next Steps
- Apply `234_sprint_FM_04_segment_engine_rls_fix.sql` to the target remote Postgres database.
- Restart the Field Assist app on the connected physical device (ensure it has an active internet connection).
- Monitor the "Sync Status" on the device to verify that the pending queue drains to 0.
