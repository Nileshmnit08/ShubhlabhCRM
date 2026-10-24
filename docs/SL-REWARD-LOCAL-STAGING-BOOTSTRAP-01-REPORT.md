# MICRO-SPRINT REPORT: SL-REWARD-LOCAL-STAGING-BOOTSTRAP-01

**Project:** Shubh Labh CRM & Buyer App  
**Sprint Type:** Local Staging Environment Bootstrap Preparation & Dependency Architecture  
**Target Migration:** [supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql)  
**Bootstrap Script Prepared:** [supabase/bootstrap/00_bootstrap_staging_baseline.sql](file:///d:/ShubhLabhCRM/supabase/bootstrap/00_bootstrap_staging_baseline.sql)  
**Date:** October 11, 2026  
**Operating Mode:** STRICT READ-ONLY — Zero database writes, zero migration execution, zero production mutations.

---

## 1. DOCKER AVAILABILITY & LOCAL SUPABASE CLI STATUS

A comprehensive verification of container runtimes and local Supabase tooling was conducted on the host machine:

### 1.1 Tool Audit & Detection Results
- **Supabase CLI:** Installed and operational at **v2.120.0** (`npx supabase --version`).
- **CLI Project Association:** `npx supabase status` reports `"linked_project": null`. No remote Supabase project is linked to the local CLI.
- **Docker CLI / Engine:** **Not installed in PATH**. Command `docker` returned:
  ```
  docker: The term 'docker' is not recognized as a name of a cmdlet, function, script file, or executable program.
  ```
- **Docker Desktop Installation Paths:** Verified that neither `C:\Program Files\Docker\Docker\Docker Desktop.exe` nor `C:\Program Files\Docker\Docker\resources\bin\docker.exe` exists on the filesystem.
- **Alternative Container Runtimes:** Checked for `podman` and Windows Container services; none are installed.
- **Windows Subsystem for Linux (WSL):** Tested `wsl.exe -l -v`; returned `"The Windows Subsystem for Linux is not installed."`
- **Native Windows PostgreSQL:** Checked for local Windows service `*postgres*` or binary `psql.exe` on port 5432; none exist.
- **CLI Startup Probe:** Executed `npx supabase status`; failed immediately with:
  ```json
  {
    "linked_project": null,
    "_tag": "Error",
    "error": {
      "code": "StatusDbInspectError",
      "message": "failed to inspect container health: docker: command not found (podman also not found) — install Docker Desktop or Podman and ensure it is on PATH"
    }
  }
  ```

**Verdict:** The local container runtime required by Supabase CLI is unavailable. Local database containers cannot be started until Docker Desktop or Podman is installed.

---

## 2. ROOT SQL FILES DEPENDENCY AUDIT & SAFE EXECUTION ORDER

A full inventory of the SQL files stored in the repository root (`d:\ShubhLabhCRM\*.sql`) was conducted.

### 2.1 The Danger of Blindly Executing Root SQL Files
The repository root contains **over 150 individual `.sql` files** accumulated across sprints 1 through 235.
- Blindly executing every SQL file in alphabetical or sequential order would be **destructive and unmaintainable**:
  1. **Massive Production Data Seeds:** Files such as `07_seed_vouchers.sql` (5.3 MB) and `30_sprint_11_2_data_onboarding.sql` (3.2 MB) contain thousands of raw Tally accounting vouchers, personal customer phone numbers, GSTINs, and proprietary pricing. Importing these into staging violates the synthetic test constraint.
  2. **Conflicting & Superseded Migrations:** Early migrations (e.g., Sprint 17 `dealer_scheme_participations`) were superseded by bag-based rewards in Sprint 24 (`dealer_reward_eligibility`), and triggers in Migration 97 were replaced by Migration 104 (`104_dispatch_based_reward_triggers.sql`).
  3. **Schema Cache Invalidation & Circular Dependencies:** Several migration files contain temporary patches, bugfixes, and manual role overrides that would fail on a fresh database instance.

### 2.2 Canonical Dependency Tree for Reward Subsystem
Only a small, coherent subset of the root SQL files constitutes the actual foundation for the reward engine and Migration 225:

```
Level 0: Extensions (uuid-ossp, pgcrypto)
  │
Level 1: Core CRM Master Tables & Auth
  ├──► crm_parties (01_sprint_1_schema.sql, 13_sprint_13_customers_v2_schema.sql)
  ├──► app_users (08_sprint_8_fixes_schema.sql, 21_sprint_21_role_visibility_schema.sql)
  └──► Auth Helper Functions (is_admin(), is_active_user(), is_buyer(), get_auth_crm_party_id())
         (08_sprint_8_fixes_schema.sql, 224_sprint_ORDER_01A_buyer_security.sql)
  │
Level 2: Orders & Dispatches Subsystem
  ├──► requirements (01_sprint_1_schema.sql, 102_dispatch_tracking_schema.sql)
  ├──► requirement_dispatches (102_dispatch_tracking_schema.sql)
  └──► v_requirement_dispatch_summary (102_dispatch_tracking_schema.sql)
  │
Level 3: Reward Scheme Configuration
  ├──► dealer_schemes (72_sprint_17_6_dealer_schemes.sql, 97_sprint_24_bag_based_rewards.sql)
  └──► dealer_scheme_slabs (96_sprint_23_dealer_growth_hub.sql, 97_sprint_24_bag_based_rewards.sql)
  │
Level 4: Reward Eligibility & Calculations (Pre-225 State)
  ├──► dealer_reward_eligibility (97_sprint_24_bag_based_rewards.sql)
  ├──► dealer_reward_calculation_audit (97_sprint_24_bag_based_rewards.sql)
  ├──► dealer_targets, dealer_reward_ledger, dealer_reward_claims (96_sprint_23_dealer_growth_hub.sql)
  ├──► sales_invoices, sales_invoice_line_items (97_sprint_24_bag_based_rewards.sql)
  └──► v_customer_master (100_sprint_25_customer_scheme_growth_hub.sql)
  │
Level 5: Legacy Permissive Policies & Functions (To be secured by Migration 225)
  ├──► "Allow all on dealer_schemes" (72_sprint_17_6_dealer_schemes.sql)
  ├──► "Enable read/insert/update/delete on slabs" (98_fix_dealer_scheme_slabs_rls.sql)
  ├──► "Allow all on requirement_dispatches" (102_dispatch_tracking_schema.sql)
  └──► recalculate_dealer_scheme_eligibility, trg_dispatch_changed (104_dispatch_based_reward_triggers.sql)
```

---

## 3. LOCAL-ONLY SCHEMA BOOTSTRAP PLAN

To eliminate the risk of executing 150+ messy legacy migrations, a single, clean, self-contained bootstrap script was prepared:
[supabase/bootstrap/00_bootstrap_staging_baseline.sql](file:///d:/ShubhLabhCRM/supabase/bootstrap/00_bootstrap_staging_baseline.sql)

### 3.1 Bootstrap Script Components:
1. **Schema DDL:** Creates the exact 12 prerequisite tables, 2 views, and 4 security helper functions in the correct dependency order.
2. **Pre-Migration Baseline Modeling:** Applies the original unhardened policies (`"Allow all on dealer_schemes"`, `"Allow all on requirement_dispatches"`, slab CRUD policies) so that Migration 225 can be genuinely tested for its ability to drop legacy permissive policies and enforce role isolation.
3. **Synthetic Seed Data (Zero Production PII):**
   - **Buyer Alpha:** Customer UUID `11111111-1111-1111-1111-111111111111` ("Buyer Alpha Cattle Feed", Ajmer).
   - **Buyer Beta:** Customer UUID `22222222-2222-2222-2222-222222222222` ("Buyer Beta Dairy Supplies", Jaipur).
   - **Auth Users:**
     - User A: UUID `aaaa1111-1111-1111-1111-111111111111` (Role: `Buyer`, mapped to Buyer Alpha).
     - User B: UUID `bbbb2222-2222-2222-2222-222222222222` (Role: `Buyer`, mapped to Buyer Beta).
     - Staff User: UUID `cccc3333-3333-3333-3333-333333333333` (Role: `Salesperson`).
     - Admin User: UUID `dddd4444-4444-4444-4444-444444444444` (Role: `Admin`).
   - **Test Scheme:** "Q3 Monsoon Bonanza 2026" (Active, 2026-07-01 to 2026-10-31).
   - **Test Slabs:**
     - Silver Tier (50 to 99 bags): Reward = "Silver Coin 10g".
     - Gold Tier (100+ bags): Reward = "Gold Coin 5g".
   - **Test Orders & Dispatches:** Initial 60 bags dispatched to Buyer Alpha to trigger Silver Tier qualification.

---

## 4. PREVENTION OF ACCIDENTAL PRODUCTION REDIRECTION

To guarantee that local testing tools can never redirect commands, migrations, or queries to the production database (`fwkjddflpzkowlawkmka`):

1. **CLI Unlinked State:**
   - Verified that `supabase/config.toml` contains no `project_id`.
   - Verified that `npx supabase status` confirms `"linked_project": null`.
   - Without an active login (`SUPABASE_ACCESS_TOKEN` is unset), the Supabase CLI cannot communicate with Supabase Cloud.
2. **Environment File Isolation:**
   - The production `.env` files in `mobile/`, `mobileFieldStaff/`, `shubhlabh-order/`, and `app/` are ignored by local testing scripts.
   - When local Supabase runs, all client connections must connect strictly to:
     - **REST API:** `http://127.0.0.1:54321`
     - **PostgreSQL Direct Connection:** `postgresql://postgres:<DB_PASSWORD>@127.0.0.1:54322/postgres`
3. **Database Pre-Execution Identity Guard:**
   Before executing any SQL, the test runner must run the following verification query:
   ```sql
   SELECT 
       inet_server_addr() AS server_ip,
       current_database() AS db_name,
       current_user AS db_user;
   ```
   **Hard Assertion:** If `server_ip` is NOT `127.0.0.1` or `::1`, or if the host matches `aws-0-ap-south-1.pooler.supabase.com`, execution **aborts immediately**.

---

## 5. LOCAL RUNTIME TEST PLAN (READY FOR EXECUTION UPON DOCKER START)

Once the local container is online and initialized with [00_bootstrap_staging_baseline.sql](file:///d:/ShubhLabhCRM/supabase/bootstrap/00_bootstrap_staging_baseline.sql), the following test sequence will be executed:

| Test ID | Objective | Exact Command / Procedure | Expected Pass Criteria | Status |
| :--- | :--- | :--- | :--- | :--- |
| **LT-01** | **Apply Migration 225** | Apply `225_secure_reward_architecture_and_buyer_contract.sql` to local DB | Migration completes with 0 errors | **PENDING DOCKER** |
| **LT-02** | **Anon Performance Denial** | `POST http://127.0.0.1:54321/rpc/get_customer_scheme_performance` with anonKey | Returns HTTP 401 / 403 Forbidden | **PENDING DOCKER** |
| **LT-03** | **Anon Recalculation Denial** | `POST http://127.0.0.1:54321/rpc/recalculate_dealer_scheme_eligibility` with anonKey | Returns HTTP 401 / 403 Forbidden | **PENDING DOCKER** |
| **LT-04** | **Anon Dispatch Snooping** | `GET http://127.0.0.1:54321/rest/v1/requirement_dispatches` with anonKey | Returns HTTP 200 with `[]` (0 rows) | **PENDING DOCKER** |
| **LT-05** | **Buyer Isolation** | Authenticate as User A; call `get_buyer_my_schemes()` | Returns net bags = 60, Silver Tier Eligible; zero Buyer B rows | **PENDING DOCKER** |
| **LT-06** | **Cross-Buyer Denial** | Authenticate as User A; query `/dealer_reward_eligibility?customer_id=eq.<Buyer_B>` | Returns HTTP 200 with `[]` (0 rows) | **PENDING DOCKER** |
| **LT-07** | **Buyer Slab Tamper Denial** | Authenticate as User A; attempt `POST /rest/v1/dealer_scheme_slabs` | Returns HTTP 403 Forbidden (RLS violation) | **PENDING DOCKER** |
| **LT-08** | **Admin Scheme Management** | Authenticate as Admin; modify scheme dates | Returns HTTP 200 OK | **PENDING DOCKER** |
| **LT-09** | **Trigger-Driven Recalculation** | Staff logs additional 50 bags dispatch for Buyer Alpha (Total = 110 bags) | Trigger fires; Gold Tier created with status 'Eligible' | **PENDING DOCKER** |
| **LT-10** | **Dispatch Return on Approved** | Staff updates eligibility to 'Approved'; logs return of 70 bags (Total drops to 40) | Status remains 'Approved'; audit logs deficit row | **PENDING DOCKER** |
| **LT-11** | **Rollback Verification** | Execute `225_rollback_security.sql`; re-test policy state | Staff retains access; no duplicate policy conflicts | **PENDING DOCKER** |

---

## 6. HARD STOP TRIGGER & IMMEDIATE BLOCKER

### Hard Stop Condition Hit:
Per Section 5 of the Micro-Sprint Guidelines:
> *"HARD STOP: If Docker is unavailable, schema dependencies are incomplete, or the target database cannot be verified as local, stop and report the exact blocker."*

1. **Docker Runtime Missing:** Docker Desktop / Podman is not installed on this workstation. `npx supabase start` cannot provision the local PostgreSQL engine without a container runtime.
2. **Zero Production Mutation:** In strict compliance with instructions, production database `fwkjddflpzkowlawkmka` will **NOT** be used as a test substitute.
3. **Honest Reporting:** Zero runtime tests have been marked as passed because local database execution cannot occur without the container engine.

---

## DECISION & UNBLOCKING INSTRUCTIONS

```
STATUS: BLOCKED — USER ACTION REQUIRED
```

### Exact Action Required to Unblock Local Staging:
1. **Install Docker Desktop for Windows:**
   - Download installer: https://www.docker.com/products/docker-desktop/
   - Run installer, ensure WSL 2 or Hyper-V backend is enabled, and complete restart if prompted.
2. **Start Docker Desktop:**
   - Launch Docker Desktop and wait until the status in the bottom-left shows "Engine running".
3. **Notify Antigravity:**
   - Respond: *"Docker Desktop is running, proceed with local bootstrap"*.

Antigravity will immediately execute `npx supabase start`, apply [00_bootstrap_staging_baseline.sql](file:///d:/ShubhLabhCRM/supabase/bootstrap/00_bootstrap_staging_baseline.sql), apply [225_secure_reward_architecture_and_buyer_contract.sql](file:///d:/ShubhLabhCRM/supabase/migrations/225_secure_reward_architecture_and_buyer_contract.sql), and run the complete LT-01 through LT-11 runtime test suite.

STOP — WAIT FOR USER APPROVAL
