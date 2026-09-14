# FIELD ASSISTANT PRODUCT ARCHITECTURE BLUEPRINT

## 1. Product Purpose
The Shubh Labh Field Assistant is a dedicated mobile application engineered for field sales and collection staff. It replaces back-office administrative complexity with a "Field-First, Voice-First, Low-Typing" interface optimized for outdoor environments and high-velocity physical operations. The core operating principle is: **CAPTURE, DON'T MANAGE.**

## 2. Product Boundary
The Field Assistant is strictly bounded to front-line field operations. It must remain structurally separate from the Shubh Labh CRM back-office web app and the existing CRM mobile application. It will not include administrative dashboards, pipeline management, Tally syncing, or back-office reporting. Its primary navigation focuses exclusively on Home, Customers, Nearby, My Work, and Profile.

## 3. Stitch Source Reference
Approved visual and UX source of truth:
- **Project ID:** `8444892899635486687`
- **Project Name:** Shubh Labh Field Assistant
- **Design System:** Field Direct Tactile

## 4. Complete Stitch Screen Inventory
1. **Home — Today's Work** (`482013212e7c4450959d70edf494f16b`): Daily targets and immediate action summary.
2. **My Work — Work Queue** (`ccc26fa1dff547b0b1e151dfd9944452`): Actionable, prioritized list of daily visits and tasks.
3. **Nearby Customers — Proximity Radar** (`b3fb35968983440aa0902c0311da4830`): Geo-based rendering of local customers for route optimization.
4. **My Customers** (`9e7aa539280a4e739ad265de98e886b8`): Master roster of all assigned merchants.
5. **Customer Profile — 10 Second View** (`0af1530b82754814a06784718d82a2e2`): High-density critical stats, balance, and quick actions for a customer.
6. **Visit Mode — Active Field Visit** (`112d65556b30413f81f6a2f99829b156`): In-progress UI for active check-ins.
7. **Visit Outcome & Voice Review Sheet** (`89de6ede9ac4499c80fdefe468450bea`): Voice-dictation and finalization form for closing out a visit.
8. **Quick Requirement — Rapid Demand Capture** (`f5b2c3556fb6468caaf8210a549dca78`): Oversized stepper UI for wholesale unit captures.
9. **Add Customer — Quick Field Onboarding** (`5865cf43686b4d7286f691735c4e5c5e`): Rapid intake form for field-generated leads.

## 5. Navigation Map
**Primary Bottom Navigation:**
- Home (Dashboard/Today's Work)
- Customers (My Customers)
- Nearby (Proximity Radar)
- My Work (Work Queue)
- Profile (Settings/Status)

## 6. User-Flow Map
- **App Launch:** ➔ Home Screen
- **From Home:** ➔ My Work (Daily tasks) OR Nearby (Routing)
- **From My Work / Nearby:** ➔ Customer Profile (10 Second View)
- **From Customer Profile:** ➔ Active Field Visit (Check-in)
- **During Active Visit:** ➔ Quick Requirement (Capture Orders) AND/OR Visit Outcome (Voice Review)
- **Completing Visit:** ➔ Finalize (Bottom Sheet) ➔ Return to My Work
- **Global Actions (FAB):** ➔ Add Customer / Quick Logging

## 7. Reusable Component Inventory
The following UI elements should be designed as standalone reusable React Native components:
- **Merchant Row/Card:** Standard row with 4px semantic color stripe (Status indicator).
- **Metric Pill/Status Indicator:** Wide-tracking, rounded-full chips denoting Overdue, Pending, etc.
- **Primary Execution Button:** 52px high, `#0D5C3A`, embossed for tactile feedback.
- **Secondary Action Button:** 52px high, `#FFFFFF` with structural border.
- **Quantity Selector/Stepper:** Oversized (54x54px) tap nodes for demand capture.
- **Floating Action Button (FAB):** 16px rounded squircle, Level 3 elevation.
- **Standard Bottom Sheet:** 40% snap point with 36x4px drag pill.
- **Voice Capture Node:** Microphone component indicating listening/recording state.
- **Sync/Offline Status Band:** Global slim header for network queue state.
- **Native Selectors & Pickers:** Date/time capture fields that utilize native OS UI.

## 8. Existing CRM Architecture that will be reused
The Field Assistant will act as a client for the existing Supabase infrastructure:
- **Authentication:** Supabase Auth (JWT).
- **User/Staff Identity:** Existing `users` / `staff` profiles.
- **Customers & Party Identity:** Existing `customers` and `dealers` schemas.
- **Ownership:** Existing salesperson assignment structures.
- **Requirements, Follow-ups, Activities:** The CRM's single source of truth schemas.

## 9. New Project Boundary
- **Codebase Location:** `d:\ShubhLabhCRM\mobileFieldStaff`
- The project will NOT share navigation, screens, or source code with the existing `mobile` application, preventing feature entanglement with admin operations.

## 10. Authentication Dependency
- Will rely purely on the existing Supabase Auth implementation.

## 11. Customer Architecture Dependency
- Connects directly to the existing CRM `customers` schema; relies heavily on Row Level Security (RLS) to enforce field staff ownership boundaries.

## 12. Requirement Dependency
- Connects to the CRM `requirements` table; acts strictly as a low-typing input client.

## 13. Follow-up Dependency
- Feeds into existing CRM `follow_ups` schedules.

## 14. Activity Dependency
- Logs raw interactions (Voice transcriptions, check-ins) into the `activities` schema.

## 15. GPS Dependency
- Requires hardware GPS for Visit Modes (Active Field Visit check-ins) and Proximity Radar (Nearby Customers).

## 16. Voice Dependency
- Requires Microphone APIs and an integration (e.g., `whisper.rn` or remote backend) to transcribe speech into structured activity/outcome logs.

## 17. Offline Dependency
- Requires robust local storage and a background synchronization queue. The UI must aggressively render from local cache to maintain velocity, syncing only when connectivity permits.

## 18. Notification/Work Dependency
- Relies on Push Notifications and data-sync to keep the "My Work" queue dynamic.

## 19. English/Hindi Requirements
- True bilingual support is strictly mandated.
- **Constraint:** Typography lines-heights must dynamically tolerate Devanagari Matra ascenders/descenders. UI buttons must preserve minimum 4px optical buffers to prevent truncation. Do not translate core business data entered by the user.

## 20. Physical-Device Testing Requirements
- Critical hardware integrations (GPS tracking, Voice Recording, Offline execution) mandate deployment to real Android/iOS physical devices for validation.

## 21. Proposed Implementation Sequence
1. Scaffold clean React Native/Expo project in `mobileFieldStaff`.
2. Establish Design Tokens (Colors, Inter Font, Spacing) and standard reusable components.
3. Scaffold primary Navigation shell (Bottom Tabs).
4. Build static UI for the 9 core screens (No data binding).
5. Implement Authentication (Supabase integration).
6. Implement Local State / Offline Sync architecture.
7. Connect UI to live/synced data layers.
8. Integrate hardware capabilities (GPS, Voice).

## 22. Risks/Blockers
- **Offline Sync Conflicts:** Resolution strategy required if a field rep edits a customer who was modified by Admin simultaneously.
- **Bilingual Clipping:** Hardcoded heights on buttons/cards may clip Hindi translations.
- **Performance:** Rendering massive customer lists on budget field devices requires aggressive list virtualization.

## 23. Items Explicitly Deferred
- MICRO-SPRINT FA-01 specifically defers all implementation: NO business logic, NO authentication, NO GPS, NO Voice, NO offline sync, NO new tables.
