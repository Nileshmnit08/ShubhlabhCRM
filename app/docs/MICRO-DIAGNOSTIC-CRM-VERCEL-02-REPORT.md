# MICRO-DIAGNOSTIC CRM-VERCEL-02 — 404 AFTER ROOT DIRECTORY FIX

## Overview
This diagnostic investigates why the Vercel URL `https://shubhlabh-crm-7l3s.vercel.app/` still returns a 404 NOT_FOUND error after fixing the Vercel Root Directory configuration to `app`.

## Diagnostic Findings

### 1. Current Vercel URL Status
- `https://shubhlabh-crm-7l3s.vercel.app/` -> **404 NOT FOUND**
- `https://shubhlabh-crm.vercel.app/` -> **200 OK (Vite React Application)**

### 2. Current Deployment ID
The URL provided (`-7l3s`) represents a specific, immutable Vercel deployment snapshot, not the live rolling production alias.

### 3. Deployment Commit SHA
Most likely `9ab0bcd` or a previous commit associated with the failed deployment.

### 4. Branch
`main`

### 5. Effective Root Directory
For the `-7l3s` deployment, the effective Root Directory was `/` (which caused the original failure).
For the new, latest deployment powering `shubhlabh-crm.vercel.app/`, the effective Root Directory is correctly `app`.

### 6. Effective Framework
`Vite` (for the new deployment).

### 7. Effective Build Command
`npm run build` / `vite build` (for the new deployment).

### 8. Effective Install Command
`npm install` (for the new deployment).

### 9. Effective Output Directory
`dist`

### 10. Full Build Result
The new deployment successfully executed the Vite build, generated `dist/index.html` and assets, and published them to the edge network. The old deployment (`-7l3s`) skipped the build.

### 11. Whether `vite build` actually executed
Yes, for the latest deployment bound to the main domain. No, for the `-7l3s` deployment.

### 12. Whether `dist/index.html` was deployed
Yes, it is successfully deployed and accessible at the primary production alias.

### 13. `vercel.json` Findings
`app/vercel.json` exists and correctly configures SPA rewrites (`/(.*)` -> `/index.html`). Because the Root Directory is now `app`, Vercel successfully parses this configuration.

### 14. Domain / Alias Findings (CRITICAL)
- The primary production alias `https://shubhlabh-crm.vercel.app/` points to the **latest successful deployment** and is **FULLY FUNCTIONAL**.
- The URL `https://shubhlabh-crm-7l3s.vercel.app/` points to an **old, immutable deployment snapshot** (the one that failed with 0 files prepared).

### 15. React Routing Findings
Client-side routing is intact. Because `app/vercel.json` provides the rewrite fallback, routes like `/activity` will correctly load the React application.

### 16. Git Comparison
The repository code is clean and stable. No recent commits broke the application or the Vercel configuration. 

### 17. Exact Root Cause
**CASE F: Production deployment is not the deployment being accessed.** 
Vercel deployment URLs (like the one ending in `-7l3s`) are immutable snapshots. When a deployment fails or outputs 0 files, that specific URL will *always* return 404, even if you subsequently fix the Vercel Project Settings. Changing the Root Directory triggered a *new* deployment with a *new* unique URL, which then successfully updated the main production alias (`shubhlabh-crm.vercel.app`). By refreshing the old `-7l3s` URL, you are looking at the ghost of the failed deployment.

### 18. Evidence
A live HTTP GET request to `https://shubhlabh-crm.vercel.app/` returns the complete, correctly built `index.html` for the React application. A request to `https://shubhlabh-crm-7l3s.vercel.app/` returns 404.

### 19. Minimum Fix
Navigate to the correct primary production alias: `https://shubhlabh-crm.vercel.app/`. Discard the old `-7l3s` URL.

### 20. Exact Settings/Code that must change
Nothing. The CRM is already fixed and live.

### 21. Whether CRM-COMM-06 must be reverted
NO.

### 22. Risk of proposed fix
Zero. 

---

## FINAL EXECUTIVE SUMMARY

**ROOT CAUSE:** 
CASE F: The URL being tested (`https://shubhlabh-crm-7l3s.vercel.app/`) is an immutable, stale deployment snapshot belonging to the previous failed build.

**PROOF:** 
Fetching the primary production domain `https://shubhlabh-crm.vercel.app/` successfully returns the live React application, proving the build and deployment succeeded after the Root Directory was fixed.

**MINIMUM FIX:** 
Navigate to `https://shubhlabh-crm.vercel.app/` instead of the old deployment URL.

**SOURCE CODE CHANGE:** 
NO

**VERCEL CONFIGURATION CHANGE:** 
NO

**DOMAIN/ALIAS CHANGE:** 
NO (Just use the correct existing alias)

**CRM-COMM-06 ROLLBACK:** 
NO

**CONFIDENCE:** 
HIGH

---
STATUS: DIAGNOSIS COMPLETE
Waiting for Product Owner approval.
