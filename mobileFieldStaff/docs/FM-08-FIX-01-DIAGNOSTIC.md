SPRINT ID: FM-08-FIX-01
TITLE: FM-08 DASHBOARD DISCOVERY & LEFT NAVIGATION INTEGRATION

ROLE:
You are the Senior Full-Stack Engineer responsible for the existing
Shubh Labh CRM.

PRODUCT OWNER OBSERVATION:

FM-08 — Field Mobility & Expense Management Dashboard was requested/developed.

However, after opening the CRM, the Product Owner cannot find any new
left-panel navigation item/link that allows the FM-08 development to be
opened and physically tested.

CURRENT PROBLEM:

The Product Owner cannot identify or access the new FM-08 functionality
from the CRM navigation.

==================================================
1. PRIMARY OBJECTIVE
==================================================

ANALYSE the existing implementation and FIX the discoverability/access
problem.

The final result must allow an authorized CRM user to access FM-08 from
the normal left navigation.

Do NOT rebuild FM-08.

Do NOT redesign the entire CRM sidebar.

Do NOT modify unrelated CRM modules.

Do NOT create duplicate routes.

Do NOT create duplicate dashboard pages.

==================================================
2. FIRST: AUDIT — DO NOT CHANGE CODE YET
==================================================

Inspect the actual codebase.

Find whether FM-08 was implemented.

Search for:

FM-08
Field Mobility
Mobility
Expense Dashboard
Field Expenses
Reconciliation
field_tracking_sessions
field_travel_segments
field expenses
mobility dashboard

Also inspect:

router configuration
route definitions
sidebar/navigation configuration
navigation constants
permission/role logic
feature flags
layout components
lazy-loaded routes
CRM module registry
dashboard registration
deployment/build configuration

Determine:

A. Does the FM-08 page/component exist?
B. What is its exact file?
C. What is its exact route?
D. Is the route registered?
E. Is the route reachable directly?
F. Is the sidebar entry missing?
G. Is the sidebar entry hidden by permissions?
H. Is the feature behind a feature flag?
I. Was FM-08 implemented in a different app/project?
J. Is the production deployment running the latest source?
K. Is there a build/deployment mismatch?

==================================================
3. IMPORTANT — DO NOT GUESS
==================================================

Do not assume the problem is the sidebar.

Possible root causes include:

- FM-08 page was never created
- page exists but route missing
- route exists but navigation missing
- navigation exists but permission hides it
- feature flag disabled
- incorrect route path
- wrong application entry point
- stale production deployment
- component exists but is unreachable
- FM-08 was implemented only partially
- implementation exists in a different branch/workspace

Identify the ACTUAL root cause from the codebase.

==================================================
4. CREATE DIAGNOSTIC REPORT
==================================================

Before modifying anything, create:

FM-08-FIX-01-DIAGNOSTIC.md

Include:

1. FM-08 implementation status
2. Dashboard component/file
3. Route found
4. Router registration
5. Sidebar registration
6. Permission/role checks
7. Feature flags
8. Build/deployment status
9. Root cause
10. Recommended minimal fix

Use:

FOUND
NOT FOUND
BLOCKED

for each area.

==================================================
5. PRODUCT OWNER ACCESS REQUIREMENT
==================================================

After the fix, the authorized CRM user must be able to see a clear
left navigation entry.

Preferred label:

Field Mobility

or:

Mobility & Expenses

Choose the label that best matches the existing CRM naming conventions.

Do NOT introduce confusing duplicate labels such as:

Field Mobility
Field Activity
Mobility Dashboard
Expense Dashboard
Field Expense Dashboard

all pointing to the same feature.

There should be ONE primary navigation entry for the FM-08 module.

==================================================
6. NAVIGATION
==================================================

Add the minimum required navigation registration.

The navigation item must:

- appear in the normal CRM left panel
- use the existing sidebar component
- use existing icon conventions
- use existing typography
- use existing active-route highlighting
- work after page refresh
- work after logout/login
- respect existing authorization

Do NOT redesign the sidebar.

==================================================
7. ROUTING
==================================================

If the FM-08 route already exists:

reuse it.

If it does not exist:

create the minimum route required to expose the already-developed
FM-08 page.

Do NOT create a second dashboard.

Ensure:

Sidebar click
→ route
→ FM-08 page

works.

Direct route access should also work after browser refresh.

SPA fallback must continue working.

==================================================
8. PERMISSIONS
==================================================

Inspect the existing CRM role/permission architecture.

Do NOT bypass authorization.

Determine which existing role should access FM-08.

If the current architecture has:

Admin
Manager
Field Staff
etc.

reuse the existing permission model.

Do NOT create an unnecessary new permission system.

If permission configuration is missing and cannot safely be inferred:

REPORT IT and STOP rather than making the page publicly accessible.

==================================================
9. DO NOT MODIFY BUSINESS LOGIC
==================================================

This sprint must NOT change:

GPS calculation
distance calculation
travel segments
visit integration
expense calculation
expense approval
reconciliation
RLS business rules

Unless a navigation/access issue directly prevents the page from loading.

The purpose is ACCESSIBILITY/DISCOVERABILITY.

==================================================
10. DASHBOARD EXISTENCE TEST
==================================================

After fixing navigation, physically verify:

CRM
→ Left Panel
→ FM-08 navigation item
→ Click
→ FM-08 dashboard opens

Then verify:

1. Page title visible
2. Date filter visible
3. Staff filter visible
4. KPI section visible
5. Staff/activity section visible
6. Expense section visible
7. Reconciliation/evidence section visible

Do not require every dashboard function to pass in this sprint.

The objective is to make the feature accessible for the next physical
validation sprint.

==================================================
11. EMPTY/NO-DATA STATE
==================================================

If the dashboard has no data:

do NOT treat that as a navigation failure.

It should display a professional empty state such as:

"No field mobility or expense activity found for the selected period."

Do NOT insert fake data merely to make the dashboard appear populated.

==================================================
12. PRODUCTION BUILD
==================================================

Verify the current application is actually running the updated source.

Check:

npm/build configuration
environment
deployment target
route build output

If local development works but production does not:

identify the deployment/build reason.

Do not claim production fixed until the production deployment has been
updated and verified.

==================================================
13. NO UNRELATED CHANGES
==================================================

Do NOT modify:

authentication
chat
communication
customer management
orders
dealer management
production
inventory
existing visits
existing expenses outside FM-08
other sidebar modules

unless absolutely required to expose the FM-08 route.

==================================================
14. PHYSICAL VALIDATION
==================================================

Perform these tests.

TEST 1:
Login as authorized CRM user.

Expected:
FM-08 navigation item visible.

TEST 2:
Click FM-08 navigation item.

Expected:
FM-08 dashboard opens.

TEST 3:
Refresh browser.

Expected:
FM-08 remains accessible.

TEST 4:
Navigate to another CRM module.

Expected:
FM-08 remains in sidebar.

TEST 5:
Return to FM-08.

Expected:
correct active navigation highlighting.

TEST 6:
Logout/login.

Expected:
navigation behaves correctly.

TEST 7:
Open the FM-08 route directly in browser.

Expected:
page loads correctly if user is authorized.

TEST 8:
Unauthorized role.

Expected:
access follows existing CRM authorization rules.

TEST 9:
No-data timeframe.

Expected:
professional empty state, not crash.

TEST 10:
Production deployment.

Expected:
same navigation/access behavior in production.

==================================================
15. REQUIRED FINAL REPORT
==================================================

Update/create:

FM-08-FIX-01-REPORT.md

Include:

1. Original problem
2. Diagnostic findings
3. Root cause
4. FM-08 page/file
5. Exact route
6. Sidebar item
7. Permission behavior
8. Feature flag behavior if any
9. Files changed
10. Database changes, if any
11. Build/deployment changes
12. Physical test results
13. Production verification
14. Known limitations

For every test:

PASS
FAIL
BLOCKED

==================================================
16. SUCCESS CRITERIA
==================================================

FM-08 is considered accessible when:

LEFT PANEL
   ↓
FIELD MOBILITY / MOBILITY & EXPENSES
   ↓
FM-08 DASHBOARD
   ↓
PAGE LOADS
   ↓
AUTHORIZED USER CAN TEST IT

No duplicate dashboard.
No duplicate route.
No fake data.
No authorization bypass.

==================================================
17. FINAL PRODUCT OWNER GATE
==================================================

At the end report exactly one:

FM-08-FIX-01 STATUS:
FIXED — READY FOR PRODUCT OWNER PHYSICAL TEST

OR

FM-08-FIX-01 STATUS:
BLOCKED

OR

FM-08-FIX-01 STATUS:
FAIL

Do NOT claim the fix is complete merely because the code compiles.

STOP after the report.

WAIT FOR PRODUCT OWNER TESTING.

==================================================
END FM-08-FIX-01
==================================================