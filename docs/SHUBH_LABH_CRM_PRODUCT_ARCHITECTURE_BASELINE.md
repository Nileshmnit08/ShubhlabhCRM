# SHUBH LABH CRM PRODUCT & ARCHITECTURE BASELINE

## 1. Executive Summary
This document establishes the architecture, product, UI, and security baseline for Shubh Labh CRM as of Sprint 01 (Audit Phase). The system is a React-based frontend powered by a Supabase PostgreSQL backend. It relies heavily on Tally as the financial source of truth, aiming to streamline daily follow-ups, requirements, and payments. The audit reveals a functional application with growing technical debt in the form of duplicated schemas, disabled Row Level Security (RLS) policies, UI inconsistencies, and menu bloat. 

## 2. Current CRM Map
**A. Main Navigation:** 
- Configurable Pinned/Daily Work (Default: Today, Requirements, Follow-ups, Payments, Dispatches, Customers).
- Admin Menu Groups: Customers & Growth, Demand Insights, Operations, Raw Material Prices, Data & Automation, Settings.

**B. Routes:** 
- Centralized in `App.jsx`.
- Strict division between standard user operational areas and `AdminRoute` wrappers.

**C. Major Modules:**
- Customers, Requirements, Follow-ups, Payments, Dispatches, Raw Material Prices, Dealer Control Towers, Demand Towers.

**D. Important Workflows:**
- Daily Work execution via the "Today" view.
- Tally data import, staging, and identity resolution.
- Lead/opportunity progression into actionable requirements.
- Dispatch tracking from requirement to delivery.

**E. Database Tables:** 
- Master Data: `crm_parties`, `users`, `products`.
- Operations: `interactions`, `follow_ups`, `requirements`, `requirement_dispatches`.
- Integrations: `tally_imports`, `tally_raw_parties`.
- Numerous module-specific tables (e.g., `transporter_metadata`, various dealer tables).

**F. Reusable Components:** 
- Limited. `AppShell` handles layout, but lists/tables/cards are often redefined inline per page.

**G. Authentication & Authorization:** 
- Supabase Auth handles sessions.
- Authorization relies on `app_users` roles ('Admin' vs 'Operator') and is enforced at the route level in React, but inconsistently enforced at the Database level.

**H. Tally Integration:** 
- Tally is the strict financial source of truth. Data flows one-way into staging tables (`tally_raw_parties`) and requires manual identity resolution before mapping to `crm_parties`.

**I. WhatsApp Workflows:** 
- Handled primarily through `wa.me` deep linking for direct messaging, with basic template schemas emerging in the database.

## 3. Navigation & Route Map
- **General Routes:** `/` (Today), `/customers`, `/requirements`, `/follow-ups`, `/payments`, `/dispatches`.
- **Admin-Only Routes:** `/leads`, `/opportunities`, `/dormant`, `/reactivation`, `/data/...`, `/activity`, `/reports/...`, `/performance`, `/control-room`, `/account-control`, `/dealer-control`, `/demand-...`, `/coverage`, `/automation-control`, `/raw-material-prices`, `/settings`, `/logistics`.

## 4. Module Maturity Scores
| Module | Score | What is Working | Biggest Weakness | Highest-Value Next Improvement |
| :--- | :---: | :--- | :--- | :--- |
| **Navigation** | 75 | Role-based visibility and pinned daily workflows. | Severe menu bloat for Admins. | Group related Admin modules into unified dashboards. |
| **Customer Management** | 80 | Clear separation of CRM identity vs Tally staging. | Duplication of dealer/customer concepts. | Unify dealer and customer growth views. |
| **Requirements** | 85 | End-to-end tracking from lead to dispatch. | High manual entry burden for repetitive fields. | Quick-clone or template requirements. |
| **Follow-ups** | 80 | Centralized daily task lists. | Context switching to view party history. | Inline party history in the follow-up view. |
| **Payments** | 70 | Dedicated workspace for collections. | Relies on potentially stale Tally syncs. | Improved visibility of sync timestamps. |
| **Dispatch / Logistics** | 65 | Core tracking schema exists. | Duplication of transporter concepts across files. | Centralize transporter master data. |
| **Raw Material Prices** | 70 | Extensive dedicated configuration. | Heavily fragmented across 6+ tabs/routes. | Consolidate into a single daily input screen. |
| **Tally Integration** | 90 | Follows strict source-of-truth rules. | Manual identity resolution is slow. | UI improvements for bulk identity matching. |
| **WhatsApp Workflow** | 75 | Functional deep linking. | Lack of robust inbound message tracking. | Better automated logging of outbound template use. |
| **Reports** | 60 | Basic activity extraction available. | Fragmented across "Control Towers" and "Insights". | Unify into a single Management Dashboard. |
| **User/Admin Control** | 80 | Route-level isolation is effective. | RLS policies are bypassed in the database. | Lock down PostgreSQL RLS policies. |

## 5. Architecture Findings
- **Duplicate Concepts:** Multiple schemas exist for Dealers (`dealer_control_tower`, `dealer_growth_hub`, `dealer_schema`) and Demand (`demand_signals`, `product_demand`, `territory_demand`).
- **Transporter Duplication:** `110_transporter_metadata.sql` and `111_transporter_details.sql` vs standalone definitions.
- **Dead/Fragmented Code:** Extensive micro-sprinting has led to numerous isolated `.sql` scripts rather than cohesive database migrations.
- **Frontend Authorization Only:** Route checks are solid, but backend checks are missing for newer tables.

## 6. Data/Database Findings
- Manual `.sql` scripts are used for migrations, leading to fragmentation.
- Hardcoded IDs were not significantly observed, but mock test data files exist (e.g., `test-insert.js`).

## 7. Security Findings
- **OBSERVATION (CRITICAL):** Multiple recent tables (e.g., `requirement_dispatches`, `transporter_metadata`) use `USING (true) WITH CHECK (true)` RLS policies. This bypasses security and exposes data to any authenticated (or potentially unauthenticated depending on role) user.
- **FACT:** Frontend Admin routes correctly prevent unauthorized UI access.

## 8. UI/UX Findings
- **OBSERVATION:** The `index.css` file defines a comprehensive set of variables and utility classes (e.g., `.glass-panel`, `.btn-primary`).
- **OBSERVATION:** Many component files (e.g., `RawMaterialPrices/Configuration.jsx`) bypass these utilities, heavily relying on inline `style={{...}}`.
- **RECOMMENDATION:** Refactor to strictly use the existing CSS design system to ensure consistency (Dark mode, responsive layouts).

## 9. Operational Workflow Findings
- **FACT:** The "Today" page successfully centralizes daily operational work (Follow-ups, Requirements).
- **OBSERVATION:** Admin users are overwhelmed by 15+ specialized "Control Tower" or "Intelligence" links, forcing them to hunt for information.
- **FACT:** Tally remains the operational source of truth for finance; the CRM correctly defers to it.

## 10. Top 10 Recommended Improvements
1. **Security Fix:** Lock down all `USING (true)` RLS policies to restrict row access by tenant/role.
2. **Architecture:** Unify `Dealer Growth Hub`, `Dealer Control Tower`, and related dealer schemas.
3. **Architecture:** Consolidate Demand control towers (Signals, Product, Territory) into one intelligence module.
4. **Data Model:** Centralize Transporter metadata and deduplicate logistics tracking logic.
5. **UI/UX:** Replace inline styles (`style={{...}}`) with structured CSS classes from `index.css`.
6. **UI/UX:** Abstract repeating UI elements (Tables, Action Cards, Modals) into reusable React components.
7. **UX/Workflow:** Consolidate the Raw Material Prices UI into fewer, more efficient screens.
8. **DevOps:** Establish a standard database migration process (e.g., `supabase db push`) to replace standalone SQL files.
9. **QA:** Configure Playwright test scripts properly in `package.json` for CI/CD automation.
10. **UX/Navigation:** Refine the navigation menu for Admins to reduce cognitive load and group reports under a single "Management" hub.

## 11. Recommended Next 5 Micro-Sprints
**Sprint 1: Security & RLS Hardening**
- **Objective:** Secure all database tables.
- **User Problem:** Data is technically exposed via API despite UI blocks.
- **Exact Scope:** Review and rewrite all `USING (true)` RLS policies in Supabase.
- **Expected Outcome:** Watertight data layer.
- **Dependencies:** None.
- **Risk Level:** High (could break existing queries if not tested properly).
- **Why First:** Security is paramount before adding new features.

**Sprint 2: UI Component Standardization**
- **Objective:** Clean up React codebase and enforce design system.
- **User Problem:** Inconsistent UI rendering and hard-to-maintain code.
- **Exact Scope:** Create reusable `Card`, `Table`, and `Modal` components. Remove inline styles.
- **Expected Outcome:** Cleaner codebase, consistent look and feel.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Why Second:** Reduces technical debt and speeds up all future frontend development.

**Sprint 3: Dealer Architecture Unification**
- **Objective:** Merge redundant dealer modules.
- **User Problem:** Confusion between Dealer Growth Hub and Dealer Control Tower.
- **Exact Scope:** Consolidate schemas and merge UI screens into a single "Dealer Hub".
- **Expected Outcome:** Single source of truth for Dealer management.
- **Dependencies:** Sprint 2 (UI Components).
- **Risk Level:** Medium.
- **Why Third:** Eliminates the largest piece of architectural duplication.

**Sprint 4: Demand Intelligence Consolidation**
- **Objective:** Merge redundant demand modules.
- **User Problem:** Data is scattered across Signals, Product, and Territory views.
- **Exact Scope:** Create a unified Demand Dashboard.
- **Expected Outcome:** Admins get a single, holistic view of market demand.
- **Dependencies:** Sprint 2.
- **Risk Level:** Medium.
- **Why Fourth:** Streamlines the Admin experience and reduces navigation bloat.

**Sprint 5: Test Automation Setup**
- **Objective:** Enable CI/CD testing.
- **User Problem:** Regressions might occur during rapid micro-sprinting.
- **Exact Scope:** Fix `package.json` test scripts, configure Playwright, write 3 core e2e tests.
- **Expected Outcome:** Automated safety net.
- **Dependencies:** None.
- **Risk Level:** Low.
- **Why Fifth:** Prepares the project for safe, scalable future enhancements.

## 12. Risks / Technical Debt
- **RLS Bypasses:** Critical security risk if not addressed.
- **Schema Sprawl:** The "micro-sprint per schema" approach is causing DB fragmentation.
- **Inline Styling:** Bypassing CSS makes global theme changes (like Dark Mode) difficult.

## 13. Deferred Items
- Any advanced AI predictions, complex marketing automations, or ERP replacements remain out of scope as per architectural rules.
- Fixing the identified duplicates is deferred to the planned Sprints.

## 14. Final Recommendation
The application successfully meets its core objective: providing a lightweight CRM that defers to Tally for finances while managing daily follow-ups. However, recent micro-sprints have introduced technical debt (schema duplication, open RLS, UI inconsistencies). The immediate priority must be consolidating the architecture and securing the database before adding any new business features.

STATUS:
⛔ AUDIT COMPLETE — WAITING FOR PRODUCT OWNER APPROVAL
