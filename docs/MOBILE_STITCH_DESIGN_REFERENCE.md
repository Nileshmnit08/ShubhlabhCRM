# Shubh Labh CRM Mobile — Stitch Design Reference

## 1. Stitch Project
- **Project Name:** Shubh Labh CRM Mobile
- **Project ID:** 2157457811554076496
- **Origin:** STITCH
- **Device Type:** MOBILE
- **Design Theme:** LIGHT Mode, Plus Jakarta Sans (Headers), Inter (Body).

## 2. Complete Screen Inventory
The following screens exist in the Stitch project:
1. `Today's Work (Field Sales)`
2. `Customer Detail: Kalyan Steels`
3. `Add Requirement (Fast Field Entry)`
4. `Admin Control Center`
5. `Shubh Labh CRM Logo` (SVG Asset)

*Missing screens in Stitch:* My Customers (List), Dispatch Detail, Follow-up Detail, Settings, Login, Call History, Activity Log.

## 3. Role-Based Screen Mapping
### A. Salesperson (Field User)
- **Today's Work (Field Sales):** Daily execution, proximity sorting.
- **Customer Detail: Kalyan Steels:** Ledger, order history.
- **Add Requirement (Fast Field Entry):** Form for rapid field entries.

### B. Admin
- **Admin Control Center:** Dashboard with exception cards (overdue payments, stalled pipelines), filter chips, and approvals.

## 4. Navigation Map
- **Field Sales:** Uses a sticky bottom drawer/action bar for primary actions (Check-In, Log Order, Take Note).
- **Admin:** Master-detail patterns, heavy reliance on summary cards and filtering.

## 5. Salesperson Workflow
1. **Today's Work:** User sees proximity-sorted tasks.
2. **Customer Detail:** Tap on task -> view customer ledger/balances.
3. **Communication:** Tap WhatsApp/Call from Customer Detail quick-actions.
4. **Action:** Log "Add Requirement" via the fast entry screen.

## 6. Admin Workflow
1. **Admin Home:** Open "Admin Control Center".
2. **Exceptions:** Review overdue payments and stalled stages.
3. **Approvals:** Authorize via badges.

## 7. Design Tokens
- **Movement:** Corporate Modern with High-Utility Scandinavian Precision. Field-resilient utility.
- **Elevation/Depth:** No heavy drop shadows. Tier 0 (Canvas Base) up to Tier 4 (Toasts). Active/hover uses faint slate ambient diffusion `0 4px 12px -2px rgba(15, 23, 42, 0.06)`. Border integrity relies on `1px solid #E2E8F0` hairline.
- **Shape Geometry:** Base components (Inputs/Buttons) `4-6px` radius. Surfaces/Cards `8px` radius. Bottom sheets `12px` top radius. Status pills `9999px` full pill radius.

## 8. Typography
- **Display/Headlines:** `Plus Jakarta Sans`. (Scale: 18px to 32px max).
- **Body/Inputs/Labels:** `Inter`. (Scale: 11px to 16px).
- **Numeric Data:** `Inter` with `font-feature-settings: 'tnum' on, 'cv05' on`.

## 9. Spacing
- 4px/8px incremental rhythm.
- **Mobile Grid:** 4-column, `16px` outer margins, `12px` card gutters.
- **Standard Tap Targets:** `48x48px` minimum. (Dense targets `44x44px`).
- **Vertical Rhythm:** 4-8px inside functional units, 16-24px between distinct components.

## 10. Colors
- **Canvas / Surfaces:** Background `#F8FAFC`, Cards `#FFFFFF`. Ghost borders `#E2E8F0`.
- **Primary (Navy):** `#0F172A`, `#1E293B`.
- **Secondary (Royal Blue):** `#2563EB` (Action focus).
- **Status Semantics:**
  - Success/Synced: `#10B981` (Wash `#ECFDF5`, text `#047857`)
  - Warning/Pending: `#F59E0B` (Wash `#FFFBEB`, text `#B45309`)
  - Critical/Error: `#EF4444` (Wash `#FEF2F2`, text `#B91C1C`)
  - In-Transit/Logistics: `#0284C7` (Wash `#F0F9FF`, text `#0369A1`)

## 11. Icon System
Standard utility icons, specifically bound to action shortcuts:
- Call: Inset `#F1F5F9` container with `#0F172A` icon.
- WhatsApp: Emerald wash (`#ECFDF5`) with `#059669` icon.
- Direction: Slate cyan wash (`#F0FDFA`) with `#0D9488` icon.

## 12. Shared Components
- **Buttons:** Primary (`#0F172A`), Accent (`#2563EB`), Shortcuts (Washed colors).
- **Status Pills:** Pill geometry with soft washes.
- **Cards:** White background, 1px `#E2E8F0` border, 8px radius. Contains Header Zone, Data Matrix Zone, and Bottom Action Dock.
- **Toggles:** Checkboxes (`20x20px`, 4px radius), Switches (`48x28px`).

## 13. Form Patterns
- `48px` input heights for fat-finger safety.
- `#F8FAFC` background with `1px solid #CBD5E1` border. Active focus `2px` ring of `#2563EB`.
- Quick clear buttons and native numeric keypads required.

## 14. Status Patterns
- Standardized pill usage. Uppercase or title-case text with tight tracking (`label-sm`, `label-md`).

## 15. Loading/Empty/Error/Offline States
- Sync/Offline handling leverages the Status Pills (Green for synced, Red for sync dropped).
- Error toasts use pure `#0F172A` high-contrast badge float with `0 8px 24px rgba(15, 23, 42, 0.2)`.

## 16. Screen-by-Screen Design Notes
- **Today's Work:** Must implement sticky bottom drawer layout.
- **Customer Detail:** Needs data matrix zone implementation and a 3-button quick action dock.
- **Add Requirement:** Fields need the specific `#F8FAFC` input styling.
- **Admin Control Center:** Needs exception summary cards.

## 17. Existing Mobile Components Reusable
The existing mobile project (`src/theme/index.js`, `src/components/Card.js`, `src/components/Input.js`, `src/components/Badge.js`, `src/components/Button.js`) already heavily aligns with these design tokens due to previous MC-05A/MC-06A sprints. 
- *Card, Input, Badge, Button* can be reused with minor visual adjustments if any.

## 18. Existing Mobile Components Requiring Redesign
- `MyRouteScreen.js` needs to adopt the explicit "Sticky Bottom Drawer" layout described in Stitch.
- `CustomerDetailScreen.js` needs to adopt the strict "Data Matrix Zone" and "Bottom Action Dock" styling.
- `AdminWorkspace.js` needs to be refactored into the dense "Admin Control Center" exception-card layout.

## 19. Existing Architecture Conflicts
- The Stitch design assumes a specific set of customer ledgers and balances (Outstanding, Last Order Value, Credit Balance) which may not currently be exposed in the mobile `v_customer_360` view or `crm_parties` table (some of this lives in Tally, not Supabase natively).
- The Stitch design references specific offline sync states, but the mobile app's offline capabilities are currently deferred/mocked.

## 20. Recommended Implementation Order
1. Ensure `v_customer_360` exposes the necessary financial fields (if approved to bring Tally data to mobile).
2. Refactor `MyRouteScreen.js` to exactly match "Today's Work" sticky bottom drawer layout.
3. Refactor `CustomerDetailScreen.js` to match the exact Card zones.
4. Refactor `AddRequirementScreen.js` visual padding and input focus states.
5. Build the `AdminWorkspace.js` exception cards based on the Admin Control Center design.

## 21. Open Questions
- Do we have the backend architecture ready to supply "Ledger Outstanding" and "Credit Balance" to the Customer Detail Data Matrix?
- Should we mock the Admin Control Center exceptions, or build the views for them?
- What are the designs for the missing screens (Login, Settings, Call History, My Customers list)? Should we extrapolate the design tokens for them?

## 22. Risks
- Implementing the Data Matrix in Customer Details without actual financial data from Tally could lead to empty/mocked UI in production.
- Building the Admin Control Center before the backend aggregations exist might cause severe performance issues (fetching raw data to compute exceptions locally on mobile).

## 23. PASS / FAIL / BLOCKED
**STATUS: PASS** (Audit completed, mapping documented, no blockers).
