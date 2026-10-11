# MICRO-SPRINT REPORT: SL-REWARD-STAGING-ENVIRONMENT-01

**Project:** Shubh Labh CRM & Buyer App  
**Sprint Type:** Staging Environment Discovery, Isolation Verification & Readiness  
**Target Migration:** [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql)  
**Target Date:** October 11, 2026  
**Repository Working Tree:** `d:\ShubhLabhCRM` (Branch: `main`)  
**Operating Mode:** STRICT READ-ONLY — Zero database writes, zero migration execution, zero production mutations.

---

## 1. ENVIRONMENT & TOOL VERSIONS

An exhaustive inspection of the local workstation runtime environment and development tooling was performed:

| Tool / Component | Expected State | Actual Detected State | Verification Command / Evidence | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Operating System** | Windows 10/11 x64 | Windows (pwsh 7 / PowerShell) | Local System Audit | **OPERATIONAL** |
| **Node.js / npm** | Node >= 18 | Node v20.x available | `node -v` | **OPERATIONAL** |
| **Supabase CLI** | CLI >= 1.x / 2.x | **Supabase CLI v2.120.0** | `npx supabase --version` returned `2.120.0` | **INSTALLED** |
| **Supabase CLI Auth** | Linked / Logged in | **Not Logged In (`AccessTokenRequiredError`)** | `npx supabase projects list` returned `AccessTokenRequiredError` | **UNCONFIGURED** |
| **Local Supabase Config** | `supabase/config.toml` | Present (configured for Edge Functions & local dev) | File exists at `supabase/config.toml` | **PRESENT** |
| **Docker Engine / CLI** | Docker daemon running | **Command Not Found / Not Installed** | `docker: The term 'docker' is not recognized` | **MISSING** |
| **Docker Desktop App** | Installed on Windows | **Not Installed** | Path `C:\Program Files\Docker\Docker\Docker Desktop.exe` does not exist | **MISSING** |
| **Podman / Alternative** | Optional container engine | **Not Installed** | `podman: The term 'podman' is not recognized` | **MISSING** |
| **Local Container Status** | Containers on ports 5432/54321 | **Failed: Docker not found** | `npx supabase status` failed with: `failed to inspect container health: docker: command not found (podman also not found)` | **OFFLINE** |

---

## 2. STAGING ISOLATION EVIDENCE

In accordance with strict safety rules (*"Do not assume that the production Supabase project can be used for staging. Do not print credentials, tokens, database passwords, or service-role keys in logs or reports"*), a comprehensive scan of the repository configuration was conducted to identify any existing staging databases or environment configurations:

### 2.1 Configuration File Inspection
All project environment files across the repository were analyzed:

| File Path | Configured Supabase Host | Project Reference (Redacted Identifier) | Environment Classification |
| :--- | :--- | :--- | :--- |
| `d:\ShubhLabhCRM\mobile\.env` | `https://fwkjddflpzkowlawkmka.supabase.co` | `fwkjddflpzkowlawkmka` | **LIVE PRODUCTION** |
| `d:\ShubhLabhCRM\mobileFieldStaff\.env` | `https://fwkjddflpzkowlawkmka.supabase.co` | `fwkjddflpzkowlawkmka` | **LIVE PRODUCTION** |
| `d:\ShubhLabhCRM\shubhlabh-order\.env` | `https://fwkjddflpzkowlawkmka.supabase.co` | `fwkjddflpzkowlawkmka` | **LIVE PRODUCTION** |
| `d:\ShubhLabhCRM\app\src\lib\supabase.js` | Defaults to `http://localhost:54321` or `VITE_SUPABASE_URL` | Variable fallback | **PRODUCTION / LOCAL** |
| `d:\ShubhLabhCRM\app\apply_migration_pg.cjs` | `aws-0-ap-south-1.pooler.supabase.com:6543` | `fwkjddflpzkowlawkmka` | **LIVE PRODUCTION** |

### 2.2 Git Branch & Remote Configuration
- **Active Git Branch:** `main` (commit `10f17e5`)
- **Remote Branches:** Only `origin/main` exists. There are **zero** staging, test, or development branches in the repository.
- **Remote Git Origin:** `https://github.com/Nileshmnit08/ShubhlabhCRM`

### 2.3 Verdict on Staging Isolation
- **No separate staging Supabase project exists.**
- The only configured remote Supabase reference in the entire codebase is `fwkjddflpzkowlawkmka`, which has been confirmed in all prior sprints as the **active production database** containing live customer records, historical vouchers, active staff sessions, and real business dispatches.
- Executing Migration 225 or any test DDL/DML against `fwkjddflpzkowlawkmka` would violate safety constraints and risk live production disruption.

---

## 3. MIGRATION DEPENDENCY ASSESSMENT

Migration 225 (`225_secure_reward_architecture_and_buyer_contract.sql`) is a security remediation and contract deployment script. It alters existing policies, replaces existing functions, and reads from pre-existing business tables. It does **not** create the foundational CRM data model from scratch.

### 3.1 Migration Storage in Repository
- In standard Supabase CLI projects, all migrations reside sequentially in `supabase/migrations/`.
- In this repository, `supabase/migrations/` contains **only one file**:
  - `supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql`
- The foundational migrations (150+ SQL files from `01_sprint_1_schema.sql` through `235_...`) reside in the repository root directory (`d:\ShubhLabhCRM\*.sql`).
- If a fresh Supabase database instance is initialized via `supabase start` or a new blank cloud project, running `supabase db push` or `supabase migration up` would attempt to apply Migration 225 directly on an empty `public` schema.

### 3.2 Required Prerequisite Schema Objects (Migration 225 Dependencies)

Migration 225 requires the following prerequisite tables, columns, views, and functions to already exist:

| Prerequisite Object | Origin Migration | Required by Migration 225 For |
| :--- | :--- | :--- |
| `public.app_users` | Migration 20, 21, 224 | Role checks (`role`, `crm_party_id`, `is_active`) in RLS and security functions |
| `public.is_admin()` | Migration 21, 224 | Guard function gating scheme and slab mutations |
| `public.is_active_user()` | Migration 21, 224 | Guard function gating CRM staff access |
| `public.is_buyer()` | Migration 224 | Guard function isolating buyer access |
| `public.get_auth_crm_party_id()` | Migration 224 | Anchor resolving buyer's `crm_party_id` from `auth.uid()` |
| `public.dealer_schemes` | Migration 72, 97, 100 | Target table for RLS policies, trigger checks, performance joins |
| `public.dealer_scheme_slabs` | Migration 96, 97, 98 | Target table for RLS policies, slab intervals (`min_bags`, `max_bags`) |
| `public.requirements` | Migration 01, 102 | Foreign key link between dispatches and `party_id` (`customer_id`) |
| `public.requirement_dispatches` | Migration 102 | Target table for buyer isolation RLS, trigger `trg_dispatch_changed` |
| `public.dealer_reward_eligibility` | Migration 97, 104 | Target table for RLS policies, recalculation engine writes, buyer read contract |
| `public.dealer_reward_calculation_audit` | Migration 97 | Target table for RLS policies, audit log entries on deficits and recalculations |
| `public.dealer_targets` | Migration 96 | Target table for RLS policies |
| `public.dealer_reward_ledger` | Migration 96 | Target table for RLS policies |
| `public.dealer_reward_claims` | Migration 96 | Target table for RLS policies |
| `public.v_customer_master` | Migration 13, 100 | View queried by `get_customer_scheme_performance()` |
| `public.v_requirement_dispatch_summary` | Migration 102 | Target view for anonymous SELECT revocation |
| `public.sales_invoices` & `...line_items` | Migration 07, 100 | Queried for historical 3-month monthly baseline in performance RPC |

### 3.3 Synthetic Staging Seed Requirement
To run Migration 225 in an isolated staging environment without cloning production PII, a **synthetic baseline seed script** must be executed before applying Migration 225. This script must create:
1. The prerequisite tables and helper functions.
2. Two test buyers (`Buyer A` with party ID `00000000-0000-0000-0000-000000000001`, `Buyer B` with party ID `00000000-0000-0000-0000-000000000002`).
3. One test CRM staff user (`Staff User` with role `'Salesperson'`).
4. One test scheme with 2 milestone slabs (e.g. Bronze at 50 bags, Silver at 100 bags).
5. Synthetic orders and dispatches to test multi-milestone progression and returns.

---

## 4. SETUP COMPLETED VS SETUP STILL REQUIRED

### 4.1 Setup Completed (Read-Only Preparation)
- [x] Identified Supabase CLI version (`2.120.0`).
- [x] Verified local repository migration structure and root SQL catalog.
- [x] Confirmed zero exposure of credentials or secrets.
- [x] Verified that production (`fwkjddflpzkowlawkmka`) is fully isolated from testing.
- [x] Analyzed full dependency graph required by Migration 225.
- [x] Prepared the complete Staging Test Suite specification (ST-01 through ST-10).
- [x] Prepared the synthetic staging schema DDL script.

### 4.2 Setup Still Required (Awaiting User Action)
- [ ] **Provisioning of an Isolated Database Environment** (Choose Path A or Path B below).
- [ ] Execution of baseline prerequisite schema in the staging environment.
- [ ] Application of Migration 225 to staging schema.
- [ ] Execution of runtime verification test suite.
- [ ] Execution of rollback test script and post-rollback verification.

---

## 5. SAFE STAGING PATHS & OPTIONS FOR USER APPROVAL

Because Docker is not installed and no remote staging Supabase project currently exists, two safe paths are available. Neither path touches production.

### OPTION A: Local Docker Desktop (Recommended — Zero Cloud Cost, Maximum Isolation)
- **Description:** Install Docker Desktop for Windows to allow the installed Supabase CLI (`v2.120.0`) to run an ephemeral, completely isolated local PostgreSQL instance on `localhost:54321` / `localhost:54322`.
- **User Actions Required:**
  1. Download and install Docker Desktop for Windows (from https://www.docker.com/products/docker-desktop/).
  2. Launch Docker Desktop and ensure the Docker Engine status is "Running".
  3. Notify Antigravity to run `npx supabase start`.
- **Cost:** $0.
- **Privacy / Safety:** 100% offline local machine; zero cloud interaction.

### OPTION B: Dedicated Remote Supabase Staging Project
- **Description:** Create a separate, free-tier Supabase project (e.g., `shubhlabh-staging`) in the Supabase Cloud dashboard specifically dedicated to staging and testing.
- **User Actions Required:**
  1. Go to https://supabase.com/dashboard and create a new project named `shubhlabh-crm-staging`.
  2. Provide the Project URL and API keys in a new file `staging.env` (never commit to git).
  3. Approve Antigravity to execute the baseline schema and Migration 225 against that staging reference.
- **Cost:** Free tier ($0) or included under existing organization.
- **Privacy / Safety:** Completely separate database cluster; zero risk to production.

---

## 6. STAGING TEST PLAN (SPECIFICATION FOR EXECUTION IN STAGING)

Once Option A or Option B is provisioned, the following test suite will be executed against the staging database:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       STAGING RUNTIME TEST SUITE                            │
├───────┬─────────────────────────────────┬───────────────────────────────────┤
│ ID    │ Test Description                │ Expected Assertion                │
├───────┼─────────────────────────────────┼───────────────────────────────────┤
│ ST-01 │ Anon RPC: get_customer_scheme...│ HTTP 401 / 403 (Denial confirmed) │
│ ST-02 │ Anon RPC: recalculate_dealer... │ HTTP 401 / 403 (Denial confirmed) │
│ ST-03 │ Anon REST: /requirement_dis...  │ HTTP 200 with 0 rows (RLS gated)  │
│ ST-04 │ Buyer Isolation: Buyer A RPC    │ Returns Buyer A net bags & slabs  │
│ ST-05 │ Cross-Buyer S萊op: Buyer A vs B  │ GET /dealer_reward_eligibility=B  │
│       │                                 │ returns 0 rows                    │
│ ST-06 │ Buyer Slab Tamper Attempt       │ POST /dealer_scheme_slabs returns │
│       │                                 │ HTTP 403 Forbidden                │
│ ST-07 │ CRM Admin Scheme Configuration  │ Admin can PATCH/INSERT slabs      │
│ ST-08 │ Staff Dispatch Logging          │ Staff logs dispatch -> trigger    │
│       │                                 │ fires recalculation without error │
│ ST-09 │ Multi-Milestone Ladder          │ get_buyer_my_schemes() returns    │
│       │                                 │ all slabs in milestones JSONB     │
│ ST-10 │ Approved Reward Deficit Test    │ Dispatch return logged; status    │
│       │                                 │ stays 'Approved'; deficit in audit│
│ ST-11 │ Rollback Script Execution       │ Run 225_rollback_security.sql;    │
│       │                                 │ confirm staff access restored     │
│       │                                 │ without policy conflicts          │
└───────┴─────────────────────────────────┴───────────────────────────────────┘
```

**Honest Testing Note:** In compliance with definition of done, **zero runtime tests are reported as passed** because staging database execution has not yet occurred.

---

## 7. HARD STOP TRIGGER & IMMEDIATE BLOCKER

### Hard Stop Condition Hit:
Per Section 5 of Micro-Sprint Guidelines:
> *"Stop immediately if: The target database cannot be conclusively identified as staging. Environment setup requires an unapproved purchase or remote resource. Do not work around these conditions by pointing the migration at production."*

1. **Local Staging:** Docker Desktop is not installed on this system; `npx supabase start` cannot initialize without a container runtime.
2. **Remote Staging:** No dedicated remote staging Supabase project exists in this repository. The only remote reference is production (`fwkjddflpzkowlawkmka`).
3. **Safety Constraint:** In strict adherence to our read-only mandate, **no migrations or DDL will be executed against production**.

---

## DECISION & NEXT SAFE STEP

```
STATUS: BLOCKED — USER ACTION REQUIRED
```

### Next Safe Action for User:
Please select and approve your preferred staging path:
- **To proceed with Option A (Local Docker):** Please install and start [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/), then instruct Antigravity to proceed with `npx supabase start`.
- **To proceed with Option B (Remote Supabase Project):** Please create a dedicated staging project on Supabase Cloud, provide its isolated reference in a `staging.env` file, and approve testing against that staging project.

STOP — WAIT FOR USER APPROVAL
