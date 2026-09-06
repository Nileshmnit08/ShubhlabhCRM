# MOBILE STITCH REQUIREMENT COMPLETION REPORT
## Micro-Sprint MC-UI-02: Add Requirement + Requirement Detail

---

## 1. Objective

Implement the Stitch-approved Add Requirement and Requirement Detail screens inside the existing Shubh Labh CRM mobile application. The salesperson must be able to capture a customer requirement from the field without creating any duplicate data model, new database table, or parallel requirement system.

---

## 2. Stitch Screens Implemented

| Screen | Status |
|---|---|
| Add Requirement (Fast Field Entry) | ✅ IMPLEMENTED |
| Requirement Detail | ✅ IMPLEMENTED (extrapolated from Stitch system tokens — no specific Stitch mockup existed) |

---

## 3. Existing CRM Requirement Architecture Inspected

**`requirements` table** (primary data source):
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `party_id` | UUID FK → crm_parties | Customer link |
| `product_type` | VARCHAR(255) NOT NULL | |
| `quantity` | INTEGER NOT NULL | |
| `unit` | VARCHAR(50) | default 'Bags' |
| `expected_date` | DATE | optional |
| `expected_rate` | DECIMAL(10,2) | optional |
| `priority` | VARCHAR(50) | default 'Normal' |
| `status` | VARCHAR(50) | default 'Open' |
| `notes` | TEXT | |
| `assigned_to` | UUID FK → app_users | |
| `intent_type` | VARCHAR(100) | default 'Product Interest' |
| `source_interaction_id` | UUID | optional link |
| `created_at`, `updated_at` | TIMESTAMP | |

**`v_board_requirements` view** (read source for detail screen):
- Joins `requirements` + `crm_parties` + `app_users` + `v_requirement_dispatch_summary`
- Provides: `customer_name`, `owner_email`, `total_dispatched_quantity`, `pending_quantity`, `dispatch_progress`, `is_pending`

**`products` table** inspected for real product names used in dropdowns (Sprint 5 + Sprint 20 seeds).

**RLS Policy:** `"Allow all on requirements"` — `USING (true) WITH CHECK (true)` — all authenticated active users can INSERT and SELECT. The app adds `assigned_to: userProfile.id` on insert for business-layer ownership traceability.

---

## 4. Existing Components Reused

| Component | Usage |
|---|---|
| `ScreenHeader.js` | Both screens — back button, title, subtitle |
| `Badge.js` | Status and priority pills in Requirement Detail |
| `Button.js` | Secondary/outline buttons in success state |
| `Input.js` | Updated to Stitch tokens (48px height, focus ring, `#F8FAFC` bg) |
| `theme/index.js` | All tokens: colors, spacing, typography, shadows, borders |

---

## 5. New Components Created

| Component | Location | Purpose |
|---|---|---|
| `SelectorSheet` | Inline in `AddRequirementScreen.js` | Lightweight bottom-sheet for product/unit/intent selection |
| `SegmentedControl` | Inline in `AddRequirementScreen.js` | Priority & intent selection (4-option segment) |
| `SelectorRow` | Inline in `AddRequirementScreen.js` | 48px tappable dropdown trigger row |
| `QuantityStepper` | Inline in `AddRequirementScreen.js` | Plus/minus stepper with inline TextInput |
| `SuccessView` | Inline in `AddRequirementScreen.js` | In-app success confirmation card |
| `InfoRow` | Inline in `RequirementDetailScreen.js` | Icon + label + value row |
| `SectionCard` | Inline in `RequirementDetailScreen.js` | Titled section card |

These components are scoped to their screens (not added to the global components directory) to preserve the existing component contract.

---

## 6. Requirement Fields Used

**Add Requirement form → `requirements` INSERT:**
- `party_id` — pre-filled from navigation params, never user-editable
- `product_type` — bottom-sheet dropdown (seeded from existing products table)
- `quantity` — stepper input (minimum 1, integer)
- `unit` — bottom-sheet dropdown ('Bags', 'MT', 'KG', 'Tonnes', 'Quintal')
- `priority` — segmented control ('Low', 'Normal', 'High', 'Urgent')
- `intent_type` — segmented control ('Product Interest', 'Price Discussion', 'Quotation Requested', 'Order Intention')
- `expected_date` — text input, validated YYYY-MM-DD
- `expected_rate` — decimal input, optional
- `notes` — multiline text area, optional
- `status` — hardcoded 'Open' on create (matches existing CRM default)
- `assigned_to` — set to `userProfile.id` from auth context

**NOT included** (no corresponding column): delivery_location, warehouse, transport_mode — not in existing schema.

---

## 7. Data Sources

| Operation | Source/Target |
|---|---|
| Read customer context | Passed via `route.params` from CustomerDetailScreen |
| Write new requirement | `supabase.from('requirements').insert()` |
| Read requirement detail | `supabase.from('v_board_requirements').select().eq('id', requirementId)` |
| Navigate to detail after save | `navigation.replace('RequirementDetail', ...)` |

---

## 8. Validation Rules Used

| Field | Rule |
|---|---|
| `product_type` | Must not be empty (required) |
| `quantity` | Must be integer ≥ 1 |
| `expected_date` | If provided: must match `YYYY-MM-DD` regex AND parse to valid Date |
| `expected_rate` | If provided: must be a parseable number |
| Anti-double-submit | `submitting` boolean flag prevents concurrent submit calls |

Error messages are human-readable. Raw Supabase error codes are never shown to the user. Console.error logs are preserved for developer diagnostics.

---

## 9. Permission / RLS Behavior

- RLS policy on `requirements` is `USING (true)` — permits all authenticated active users.
- `assigned_to: userProfile.id` is stamped on insert for business-level ownership without modifying RLS.
- If Supabase returns a `42501` error (which would indicate a future, stricter RLS policy), the user sees: _"Permission denied. You are not authorized to add requirements."_
- If a `23503` FK error occurs (invalid party_id), the user sees: _"Invalid customer reference."_
- No schema changes were made to RLS.

---

## 10. Files Changed

| File | Change Type |
|---|---|
| `mobile/src/screens/AddRequirementScreen.js` | REWRITTEN |
| `mobile/src/screens/RequirementDetailScreen.js` | NEW |
| `mobile/src/components/Input.js` | UPDATED (Stitch tokens) |
| `mobile/App.js` | UPDATED (register RequirementDetail, hide headers) |
| `mobile/src/screens/CustomerDetailScreen.js` | UPDATED (requirement card taps → RequirementDetail) |

---

## 11. Dependencies Changed

**NONE.** All UI is implemented using existing packages already in `package.json`:
- `lucide-react-native` (existing icon library)
- `react-native-safe-area-context` (existing)
- `@react-navigation/native` (existing)

---

## 12. Database Objects Changed

**NONE.** No tables, views, functions, triggers, policies, or indexes were created or modified.

---

## 13. API / Data-layer Changes

**NONE.** Using existing Supabase client calls:
- `supabase.from('requirements').insert()` — existed before
- `supabase.from('v_board_requirements').select()` — existed before

---

## 14. Physical Android Testing

Tested flow:
1. Open Customer Detail → Tap "+ Req" → Add Requirement form loads.
2. Customer name visible in context card — no re-search required.
3. Select product from bottom sheet → Adjust quantity stepper → Set priority.
4. Tap "Save Requirement" → Saving spinner appears → Success card displayed.
5. Tap "View Requirement" → RequirementDetail loads with correct data.
6. Verify dispatch vitals (0 dispatched, full pending — correct for new requirement).
7. Tap back → Customer Detail → Requirement card appears in list.
8. Tapping requirement card navigates to RequirementDetail.
9. Validate via Web CRM: record visible in Requirements Board with correct status=Open, assigned_to correct user.

**Validation failure test:** Leave product empty → tap Save → field error "Product is required." displayed inline. Form data preserved.

**Network failure:** Disconnect device → tap Save → toast-style banner: "Network error. Please check your connection and try again."

---

## 15. Stitch vs Device Visual Comparison

| Design Token | Stitch Spec | Implemented |
|---|---|---|
| Canvas background | `#F8F9FF` | `theme.colors.background` = `#f8f9ff` ✅ |
| Input height | 48px | `height: 48` ✅ |
| Input border | `1px solid #CBD5E1` | `1px #CBD5E1` ✅ |
| Input focus | `2px ring #2563EB` | `borderWidth: 2, borderColor: secondary` ✅ |
| Card background | `#FFFFFF` | `surfaceContainerLowest` = `#ffffff` ✅ |
| Card border radius | `8px` | `theme.borders.radius.md` = 8 ✅ |
| Button min-height | `48px` | Dock buttons = `height: 48` ✅ |
| Typography header | `Plus Jakarta Sans` | `theme.typography.fontFamily.display` ✅ |
| Typography body | `Inter` | `theme.typography.fontFamily.body` ✅ |
| Bottom sheet top radius | `12px` | `borderTopLeftRadius: theme.borders.radius.lg` = 12 ✅ |

---

## 16. Functional Testing

| Test | Result |
|---|---|
| Customer context pre-filled | ✅ PASS |
| Product dropdown works | ✅ PASS |
| Unit dropdown works | ✅ PASS |
| Intent segmented control | ✅ PASS |
| Priority segmented control | ✅ PASS |
| Quantity stepper increments/decrements | ✅ PASS |
| Quantity typed directly | ✅ PASS |
| Expected date validation (format) | ✅ PASS |
| Expected rate validation (numeric) | ✅ PASS |
| Save → Supabase insert → success | ✅ PASS |
| Success card shows summary | ✅ PASS |
| "View Requirement" navigates to detail | ✅ PASS |
| "Add Another" resets form | ✅ PASS |
| "Back to Customer" navigates back | ✅ PASS |
| Requirement appears in Customer Detail tab | ✅ PASS |
| Requirement Detail: vitals grid correct | ✅ PASS |
| Requirement Detail: dispatch progress bar | ✅ PASS |
| Requirement Detail: Edit button (Open only) | ✅ PASS |
| Requirement Detail: Add Follow-up CTA | ✅ PASS |

---

## 17. Regression Testing

| Screen | Status |
|---|---|
| Today's Work (`MyRouteScreen`) | ✅ Unaffected |
| My Customers | ✅ Unaffected |
| Customer Detail | ✅ Unaffected (only added tap behavior to req cards) |
| Navigation from Customer Detail | ✅ Working |
| Web CRM Requirements Board | ✅ Unaffected |
| Web CRM Party detail | ✅ Unaffected |

---

## 18. Known Limitations

- **Edit Requirement:** `EditMode` param is passed to `AddRequirementScreen` but the edit-mode data population is not wired in this sprint (the form pre-fills would require reading `existingRequirement` from params). Edit is deferred to next sprint.
- **Expected Date:** Implemented as a text field (YYYY-MM-DD). A native date picker would improve UX but requires additional dependency (`@react-native-community/datetimepicker`). Deferred.

---

## 19. Deferred Functionality

| Feature | Reason | Sprint |
|---|---|---|
| Edit Requirement pre-fill | Needs additional form wiring | MC-UI-02.5 or MC-UI-03 |
| Native Date Picker | New dependency required — PO approval needed | Future |
| Dispatch action from Requirement Detail | MC-UI-03 scope | MC-UI-03 |
| Requirement status change (e.g., mark Won/Lost) | Business rules review needed | MC-UI-03 |

---

## 20. Offline Support Status

**STATUS: NOT SUPPORTED**

The existing mobile architecture does not have an offline queue for Supabase writes. The `SyncManager` service is present (`src/services/SyncManager.js`) but only handles read-side refresh. If the device is offline when Save is tapped, a network error banner is displayed to the user. No fake offline success is shown.

---

## 21. Blockers

**NONE.**

---

## 22. PASS / FAIL / BLOCKED

**STATUS: PASS**

---

*Report generated: 2026-09-06 | Sprint: MC-UI-02 | Commit: `1cdadc3`*
