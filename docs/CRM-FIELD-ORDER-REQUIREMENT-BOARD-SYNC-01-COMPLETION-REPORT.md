# CRM-FIELD-ORDER-REQUIREMENT-BOARD-SYNC-01 Completion Report

## Root Cause
The Field Assist app sync was silently failing to create orders in the canonical `public.requirements` table. Upon analyzing the database constraints (specifically `ALTER COLUMN unit SET NOT NULL;` introduced in Sprint 8 Fixes) and the `QuickRequirementScreen.js` and `VisitContext.js` sync payloads, it was found that the `unit` parameter was not being supplied when enqueueing `requirements` inserts. Since PostgREST rejected the insert, the offline sync queue got stuck continually retrying a doomed request with a 400 or 500 error, masking it as a local network issue instead of a schema compliance error. Consequently, valid orders existed solely in Field Assist's local SQLite database and never reached the server to appear on the CRM Requirements Board.

## Resolution
1. **Schema Compliance:** Patched `QuickRequirementScreen.js` and `VisitContext.js` to ensure the `unit: 'Bags'` (or `req.unit`) property is passed inside the `requirements` entity payload fed to `SyncService.enqueueOperation`. This resolves the `not-null` constraint violation.
2. **Realtime Refresh:** Subscribed to `public.requirements` Postgres changes using Supabase Realtime in `app\src\pages\Requirements\List.jsx`. The CRM Requirements Board will now automatically fetch and display orders instantly upon sync from a Field Assist app online.

## Verification
- Confirmed that RLS policies for `requirements` allow an `authenticated` user with `is_active_user()` to successfully insert and view their own created data.
- Confirmed that Field Assist assigns the created order with `assigned_to: userId`, which natively aligns with the default CRM Requirements Board visibility policies.
- Confirmed no duplicate tables were made.
