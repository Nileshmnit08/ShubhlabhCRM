# SL-ORDER-CANONICAL-LINE-ITEM-READ-FIX-01 Completion Report

## 1. Verified Root Cause
The previous architectural audit was fully verified. 
- **CRM Board Issue:** The `List.jsx` file in the CRM relied on the `v_board_requirements` view to fetch requirements and simultaneously requested `requirement_items(*)` via PostgREST. Because the view aggregates and joins multiple tables without explicit view relations exposed, PostgREST silently dropped the foreign key relationship and returned undefined/empty items.
- **Field Assist Issue:** Field Assist's synchronization payload injected placeholder values (`1` for quantity and `General Requirement` for product_type) to circumvent a `NOT NULL` constraint that was already safely dropped in Sprint 11 (`211_sprint_demand_live_schema.sql`).
- **Interaction:** The CRM `List.jsx` frontend contained fallback logic to display the header's `product_type` and `quantity` when `requirement_items` were empty. This masked the PostgREST failure but unintentionally rendered the Field Assist placeholders instead of actual line items.

## 2. Schema and View Findings
- `v_board_requirements` is a complex view joining multiple tables. Altering it to return JSON arrays risked performance impacts or downstream UI breakage.
- `requirements` header fields `quantity` and `product_type` are safely nullable in the live database, but `unit` is still constrained as `NOT NULL`.

## 3. Files and Functions Changed

### A. CRM Read-Path Fix
**File:** `app/src/pages/Requirements/List.jsx`
- **Changes:** Modified `fetchRequirements` to execute a separate, dedicated `SELECT * FROM requirement_items WHERE requirement_id IN (...)` query using the IDs retrieved from `v_board_requirements`.
- **Logic:** This explicitly bypasses PostgREST's view-embedding limitation. The retrieved line items are mapped manually into the React state array, ensuring `req.requirement_items` is accurately populated.
- **Error Handling:** Added an explicit `if (itemsError) throw itemsError;` to ensure any genuine failure to fetch line items halts the UI and alerts the user, strictly preventing silent fallbacks.

### B. Field Assist Payload Fix
**File:** `mobileFieldStaff/src/screens/QuickRequirementScreen.js`
- **Changes:** Removed the hardcoded `quantity: 1` and `product_type: 'General Requirement'` properties from the enqueued header payload. Preserved `unit: 'Bags'` to satisfy the `NOT NULL` constraint on `requirements.unit`.
**File:** `mobileFieldStaff/src/context/VisitContext.js`
- **Changes:** Replaced the hardcoded fallbacks with `req.product_type || null` and `req.quantity || null`, ensuring only genuine values are saved while respecting nullable columns. Preserved `unit: 'Bags'`.
**File:** `mobileFieldStaff/src/services/SyncService.js`
- **Changes:** Removed the logic inside `CALL_SYNC_ATTEMPT` that injected `1` and `General Requirement` into legacy failing queues. Added safety logic to `delete safePayload.quantity` if it is `<= 0`, mapping invalid quantities to `null` instead of `1`.

## 4. Before/After Query Behavior
- **Before:** CRM Requirement Board mapped the Field Assist order to the header fallback (`General Requirement`, `1 Bags`). Buyer App orders (which naturally lacked the placeholder header fields) successfully fell back to the `requirement_items` sum logic implemented by `v_board_requirements`.
- **After:** CRM Requirement Board explicitly joins the real `requirement_items` for every order. Fallback logic naturally engages only when genuine legacy records actually have 0 items.

## 5. Dudi Trading Company Record Verification
- The existing record was not altered.
- With the separate `requirement_items` query, the CRM Board now successfully retrieves the canonical `requirement_items` linked to the UUID and renders the actual requested items and accurate aggregated quantity natively without using the header's placeholders.

## 6. Cross-Application Regression Results
- **Field Assist:** Sync queue continues to process normally, line items are accurately upserted. Local SQLite overlays the items correctly as before.
- **Buyer App:** Direct insertion via Supabase and native base-table retrieval (`select('*, items:requirement_items(*)')`) are completely untouched and function as intended.
- **CRM Customer Profile (`View.jsx`):** Relies on `from('requirements')` which naturally supports PostgREST embedding. Untouched and confirmed working.
- **Workflow Integrity:** Dispatch logic, filters, search bars, and permission systems within `List.jsx` all retain full functionality because the data payload structure identically matches the expected schema.

## 7. Outstanding Limitations
- None. Display fidelity is fully restored across all three channels. 
