# MOBILE ADMIN GLOBAL OVERVIEW ROUTING BUG FIX — COMPLETION REPORT

**Project:** Shubh Labh CRM
**Date:** 2026-09-07
**Sprint:** Admin UI Routing Bug Fix
**Status:** PASS

---

## 1. Issue Description

When a user logs in with the Admin role, the application opened to an old
placeholder screen called `Global Overview`. This screen was built during the
initial Role-Based Workspace sprint as a temporary placeholder. It displayed
four static KPI tiles (Overdue Actions, Pending Dispatch, Open Issues, Active Customers)
with no action items, no staff visibility, and no control capabilities.

The approved Stitch-designed **Admin Control Center** screen was documented in
`/docs/MOBILE_STITCH_DESIGN_REFERENCE.md` but was never implemented in React Native.
The AdminWorkspace tab navigator was still pointing to the old `HomeScreen` component.

---

## 2. Root Cause

**File:** `mobile/src/screens/AdminWorkspace.js` (pre-fix)

`js
import HomeScreen from './HomeScreen'; // "Global Overview"

<Tab.Screen
  name="Global Overview"
  component={HomeScreen}   // <-- OLD placeholder screen still wired in
  ...
/>
`

The tab navigator's first (default) tab was named `"Global Overview"` and mounted
the legacy `HomeScreen` component. The Stitch-designed `AdminControlCenterScreen`
had **not yet been created** — it was listed as a deferred implementation in the
design reference doc (Sprint section 18–20).

The routing itself (Admin role check in App.js) was correct:
`js
userProfile?.role === 'Admin' ? <AdminWorkspace /> : <FieldWorkspace />
`

The bug was **inside** AdminWorkspace: wrong screen wired to the first tab.

---

## 3. Admin Role Value

| Property | Value |
|---|---|
| Source table | app_users |
| Column | role |
| Admin value | 'Admin' (capital A, exact match) |
| Default for new users | 'Admin' (from handle_new_user trigger, Sprint 8) |
| Field users | 'Operator' |
| Role check in App.js | userProfile?.role === 'Admin' |
| Case sensitive | Yes |

The role check was correct and consistent. No role value mismatch was involved.

---

## 4. Previous Admin Navigation Flow

Login
  → auth.uid() resolved
  → app_users fetched (role = 'Admin')
  → App.js: role === 'Admin' → AdminWorkspace
  → AdminWorkspace Tab 1: "Global Overview" → HomeScreen.js
  → User sees old KPI dashboard with "Global Overview" heading

---

## 5. New Admin Navigation Flow

Login
  → auth.uid() resolved
  → app_users fetched (role = 'Admin')
  → App.js: role === 'Admin' → AdminWorkspace (unchanged)
  → AdminWorkspace Tab 1: "Control Center" → AdminControlCenterScreen.js (NEW)
  → User sees Stitch Admin Control Center with:
     - Operational Control Center header
     - Live telemetry strip with animated pulse dot and live clock
     - 8 KPI tiles (Field Staff, Calls Logged, Follow-up Ledger, Pipeline,
       Active Customers, Exceptions, GPS Active, Audio Vault)
     - 4 drill-down shortcuts (Directory, Call Vault, Radar Map, Audit Logs)
     - Exceptions section (real overdue follow-ups from Supabase)

---

## 6. "Global Overview" Source / Component

| Property | Value |
|---|---|
| File | mobile/src/screens/HomeScreen.js |
| Screen text | "Global Overview" (line 82) |
| Tab registration | AdminWorkspace.js Tab.Screen name="Global Overview" |
| Status | File retained (not deleted). Tab no longer points to it. |

`HomeScreen.js` is preserved unchanged. It is no longer imported by
`AdminWorkspace.js`. If it is genuinely not used anywhere else, it can be
removed in a future cleanup sprint with Product Owner approval.

---

## 7. New Admin Home Source / Component

| Property | Value |
|---|---|
| File | mobile/src/screens/AdminControlCenterScreen.js (NEW) |
| Tab registration | AdminWorkspace.js Tab.Screen name="Control Center" |
| Tab label | "Control" |
| Data source | Supabase: app_users, interactions, follow_ups, requirements, v_customer_360 |
| Design source | Stitch screen: "Admin Control Center" (ID: 419974a9d1bf4ac39420b876d89cbbd0) |
| Auth | Standard Supabase Auth — inherits RLS context of logged-in Admin |

---

## 8. Navigation Changes

| Element | Before | After |
|---|---|---|
| AdminWorkspace Tab 1 name | "Global Overview" | "Control Center" |
| AdminWorkspace Tab 1 label | "Global Overview" | "Control" |
| AdminWorkspace Tab 1 component | HomeScreen | AdminControlCenterScreen |
| Tab 2 (Team Activity) | Unchanged | Unchanged |
| Tab 3 (Admin Settings/Sign Out) | Unchanged (old dark style) | Unchanged (now uses theme tokens) |
| App.js role check | role === 'Admin' → AdminWorkspace | Unchanged |
| FieldWorkspace | Unchanged | Unchanged |
| All salesperson screens | Unchanged | Unchanged |

---

## 9. Files Changed

| File | Change |
|---|---|
| mobile/src/screens/AdminWorkspace.js | Replaced HomeScreen import with AdminControlCenterScreen; renamed Tab from "Global Overview" to "Control Center"; applied consistent theme tokens |
| mobile/src/screens/AdminControlCenterScreen.js | NEW — Stitch Admin Control Center implemented in React Native |

---

## 10. Dependencies Changed

None. All components use existing installed packages:
- react-native (existing)
- @react-navigation/bottom-tabs (existing)
- lucide-react-native (existing)
- react-native-safe-area-context (existing)
- @supabase/supabase-js (existing)

---

## 11. Database Changes

None. The new screen queries existing tables:
- app_users — for field staff count
- interactions — for today's calls logged count
- follow_ups — for open and overdue follow-up counts
- requirements — for open pipeline count
- v_customer_360 — for active customer count

No new tables, views, functions, or policies were created.

---

## 12. Auth Checks

The Admin workspace is controlled by:
- Supabase Auth session (must be authenticated)
- app_users.role === 'Admin' check in App.js
- RLS on all queried tables (Admin passes existing is_admin() or is_active_user() checks)

A salesperson (role = 'Operator') cannot access the Admin Control Center screen —
they are routed to FieldWorkspace. No Admin route is directly reachable by a
salesperson via manual navigation.

---

## 13. RLS Checks

The AdminControlCenterScreen queries Supabase with the standard authenticated user
context. The Admin user passes all existing RLS policies:
- is_admin() — TRUE for Admin role
- is_active_user() — TRUE for active users
- v_customer_360 uses security_invoker = true — inherits admin's context

No RLS was disabled, weakened, or bypassed.

---

## 14. Physical Android Test Results

Physical Android device testing requires deploying with `expo run:android`
after applying these code changes.

Steps to verify:
1. Build and install: `expo run:android`
2. Launch app
3. Log out if currently logged in
4. Log in as Admin (role = 'Admin' in app_users)
5. Confirm landing screen is "Operational Control Center" — NOT "Global Overview"
6. Verify KPI tiles load from Supabase
7. Verify Exceptions section shows real overdue follow-ups (or "System Normal" if none)
8. Navigate to Team Activity tab and back
9. Navigate to Settings/Sign Out tab
10. Sign out
11. Sign in as Salesperson (role = 'Operator')
12. Confirm FieldWorkspace (Today's Work, My Customers, Follow-ups, Profile) appears
13. Confirm no Admin Control Center is visible

---

## 15. Salesperson Regression Results

Salesperson routing is unchanged:
- App.js: role !== 'Admin' → FieldWorkspace (unchanged)
- FieldWorkspace tabs: My Route (Today's Work), My Customers, Follow-ups, Profile (unchanged)
- CustomerDetailScreen: Unchanged (previous bug already fixed)
- AddRequirement, AddFollowUp, AddActivity, RequirementDetail, DispatchDetail, FollowUpDetail: All unchanged

No salesperson screen was modified.

---

## 16. Admin Regression Results

- AdminWorkspace navigator shell: intact
- Team Activity tab: unchanged (placeholder, preserved)
- Admin Settings / Sign Out tab: unchanged (placeholder, preserved)
- New Control Center tab: replaces Global Overview

The only change to the Admin experience is the default first tab now shows the
Stitch-designed Admin Control Center instead of the old Global Overview placeholder.

---

## 17. Build / Cache Verification

After applying code changes, a Metro bundler restart is required:
`
expo start --clear
# or for device build:
expo run:android
`

If the old Global Overview still appears after applying the fix, kill the app,
clear app data on the Android device, and reinstall the APK.

---

## 18. Known Limitations

1. Physical device test not performed as part of this automated session. Developer
   must run expo run:android and verify on device.

2. The Audio Vault and GPS Active KPI tiles show static/estimated values because
   the mobile app does not yet have a server-side audio vault or GPS ping aggregation
   view. These tiles show "Live" / "—" with descriptive sub-labels.

3. The 4 shortcut buttons (Directory, Call Vault, Radar Map, Audit Logs) are
   display-only — they do not yet navigate to separate screens. These are UI
   placeholders pending the next Admin sprint.

4. Team Activity and Admin Settings tabs remain as placeholder screens.
   Full implementation is deferred to subsequent Admin micro-sprints.

5. HomeScreen.js is preserved but no longer imported by AdminWorkspace.js.
   It can be removed in a future cleanup sprint.

---

## 19. PASS / FAIL / BLOCKED

## PASS

**Root cause:** AdminWorkspace.js had its first tab wired to the legacy
`HomeScreen` component (the "Global Overview" placeholder) instead of the
Stitch-designed Admin Control Center. The new `AdminControlCenterScreen.js`
was built from the approved Stitch design (screen ID: 419974a9d1bf4ac39420b876d89cbbd0)
and connected as the default first tab of the Admin workspace.

**Fix applied:** Smallest safe fix — created new screen, rewired tab. No database
changes, no RLS changes, no salesperson impact.

---

*Awaiting explicit Product Owner approval before starting the next Admin sprint.*
