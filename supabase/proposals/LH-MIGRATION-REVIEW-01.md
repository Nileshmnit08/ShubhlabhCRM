# LH-MIGRATION-REVIEW-01: review of proposals 247 FOUNDATION and 248 Settlement

**Date:** 2026-11-03
**Reviews:** `247_sprint_LH_DATABASE_FOUNDATION_01.sql`, `248_sprint_LH_SETTLEMENT_01.sql` and their rollback scripts
**Retired:** `247_sprint_LH_DATABASE_01.sql` (`lh_` tables), retired by the Product Owner on 2026-11-03. Its header now says DO NOT APPLY; the file is kept for history.

**Verdict: NOT READY TO APPLY.** The table design is a sound base, but two blockers must be fixed first:
- **Data open to anyone:** the access policies let anyone holding the public app key (which is embedded in the apps and in a public repository) read, change and delete all labour data.
- **No sign-in model:** LabourHisaab has no sign-in, and 248's policies assume one that doesn't exist.

There are also correctness defects in the summary views that the Labour Summary page would rely on.

**How it was checked:**
- Both files and both rollbacks were run in a local PostgreSQL (PGlite, synthetic data).
- The CRM repo was searched for name clashes.
- Nothing was applied to any real database.
- Test script: `C:\Users\dell\AppData\Local\Temp\claude\d--ShubhLabhCRM\5a6931de-2ebd-401e-9b68-02dd21760b21\scratchpad\pgrepro\lh_review.mjs`

---

## 1. Table relationships

```
contractors ─┬─< labourers ─────────────┬─< labour_work_allocations >── daily_work_entries ─< daily_work_details
             ├─< labour_rates ◄─(rate_id, SET NULL)── daily_work_entries                  
             ├─< daily_work_entries                                                       
             ├─< labour_payments >────── labourers                                       
             ├─< service_expenses ─< service_expense_allocations >── labourers            
             └─< labour_monthly_settlements ─< labour_monthly_settlement_items >── labourers
                                                └─< labour_settlement_corrections
```

- **Earnings, per labourer:** `labour_work_allocations.allocated_amount`, i.e. each labourer's share of a work entry's `calculated_labour_amount`.
- **Historical rates:** each work entry stores `rate_snapshot` and `rate_unit_snapshot`, so a later rate change doesn't re-price old entries. `labour_rates` records validity with `effective_from` / `effective_until`.
- **Deductions:** only `service_expense_allocations` rows; an expense with scope `Contractor expense` should never become a labourer deduction.
- **Completed/Pending Work:** neither file has any completion or status field, so these stay **"Not tracked"**, as you decided.

## 2. Findings (all reproduced locally unless marked)

### Blockers
| # | Finding | Evidence |
|---|---|---|
| B1 | **247's access policies are open to everyone.** Every table has `FOR ALL USING (true) WITH CHECK (true)` with no role restriction, so it applies to `anon` too. | As `anon`: read labourer names and phone numbers, **inserted a ₹99,999 payment**, **deleted all expense allocations**. |
| B2 | **No sign-in model.** LabourHisaab has no sign-in (no `auth.` or login code at all). 248's policies use `contractor_id = auth.uid()`, but `contractors.id` is a random UUID, not a user ID. | A signed-in user was refused (`42501`) when creating a settlement for the seed contractor. 247 lets everyone in while 248 lets no one in, so the two files are inconsistent. |
| B3 | **Demo data is written as real data.** The migration creates a fake contractor, 6 labourers with made-up phone numbers, and a work entry, payment and expense dated 2026-11-03. | Seed rows present after applying: 1 contractor, 6 labourers, 1 entry, 1 payment. |
| B4 | **The views skip access policies.** None set `security_invoker = true`, so they run with the owner's rights and bypass row-level security. Supabase's linter flags exactly this. | `reloptions` is null for all 4 views. |

### Correctness: the Labour Summary would be wrong
| # | Finding | Evidence |
|---|---|---|
| C1 | **Deductions are counted from the whole expense, not from what's allocated to labourers.** `v_daily_contractor_summary.labourer_allocated_deductions` sums `service_expenses.amount` for every non-contractor expense. That breaks the rule that expenses only count against a labourer when explicitly allocated. | ₹100 group expense with ₹30 allocated: the view deducts **100**, actual allocations are **30**. |
| C2 | **Weight is counted once per labourer.** `v_individual_monthly_statement.total_weight_kg` gives each labourer the entry's full weight, so totalling across labourers triple-counts. | One 10,000 kg entry shared by 3 labourers shows 10,000 kg for each (30,000 if totalled). |
| C3 | **Payment days count as working days.** `working_days = GREATEST(work_days, pay_days)`. | A payment-only day raised Golu's working days from 1 to 2. |
| C4 | **The stored amount isn't checked against rate × quantity.** `fn_calculate_work_amount` exists but nothing calls it. | An entry for 1,000 kg at ₹21 per 100 kg was accepted with amount **₹99,999** instead of ₹210. |
| C5 | **Rate history can be ambiguous.** Nothing prevents two overlapping rate periods for the same work type. `work_type` is free text with no link to `labour_rates`. | Inspection. |
| C6 | **Allocation total check has a race.** It counts existing rows without a lock, so two inserts at the same moment can together exceed the entry amount. Lowering an entry's amount afterwards isn't re-checked. | Inspection (not raced locally). |

### Safety and operations
| # | Finding | Evidence |
|---|---|---|
| S1 | **Deleting a contractor wipes financial history.** `contractors ON DELETE CASCADE` reaches payments, entries, expenses and settlements. `RESTRICT` on labourer allocations blocks it only while allocations exist. | With no allocations left, deleting the contractor took payments from 2 to **0**. |
| S2 | **247 can't be re-run safely.** `CREATE POLICY` has no `DROP POLICY IF EXISTS`, and re-running the seed duplicates `daily_work_details`. | Re-run failed with `42710 policy … already exists`. |
| S3 | **Settlement and audit gaps.** Nothing stops edits to a `Closed` month; corrections are only logged by convention. `closed_by` / `corrected_by` are free-text names, not user IDs. `year_month` has no format check. `fn_carry_forward_monthly_settlement` doesn't check the month is closed and has no fixed `search_path`. | Inspection. |
| S4 | **Functions don't pin `search_path`.** None set it, which Supabase's linter flags. | Inspection. |
| S5 | **No transaction wrapper.** Neither file uses `BEGIN … COMMIT`, so a partial failure leaves half a schema. | Inspection. |
| S6 | **Numbering clash.** "247" is shared with the retired file; renumber the approved one to avoid confusion. | Repo. |

### Rollback
- **Order matters: 248 first, then 247.** Rolling back 247 alone succeeds, but its `CASCADE` quietly drops 248's foreign keys and leaves 248's three tables orphaned (reproduced). Rolling back 248 then 247 left 0 tables.
- **Both rollbacks permanently delete all labour data.** That's fine before go-live and unacceptable after. Once real data exists, a rollback must archive first (rename tables, as done in 245/246) rather than drop.

## 3. Conflicts with the current CRM
- **Names:** no clashes found in `supabase/migrations`, `supabase/bootstrap`, the root SQL files, or CRM / Field Assist app code for any of the 12 tables, 4 views or 3 functions. **Not verified against the live database.**
- **Existing helpers to reuse:** `public.is_admin()`, `public.is_active_user()` and `public.is_buyer()` exist (root `08_…`, `224_…` and the staging bootstrap). CRM Admins can be given read access through these.
- **Exposure:** the CRM and LabourHisaab share one Supabase project (the production project). The public app key is embedded in both apps and the repo is public, so B1 is directly exploitable once applied.

## 4. Proposed migration order (after fixes are approved)
1. **Pre-flight (read-only):** confirm none of the names exist live; confirm the CRM role helpers exist.
2. **Revised 247 → renumbered (e.g. 249).** Tables, constraints and indexes; no seed; views with `security_invoker`; functions with a fixed `search_path`; real policies; wrapped in a transaction.
3. **Revised 248 → renumbered (e.g. 250).** Depends on 249, with the same fixes.
4. **Optional separate dev-only file** with the demo seed, never run on production.
5. **Staging test** of the Labour Summary data contract; then production with your approval.
6. **Rollback order:** 250, then 249. Use archive-style rollbacks once data exists.

## 5. Decisions needed from you
1. **How LabourHisaab signs in (fixes B2).** Recommended: LabourHisaab users sign in with Supabase Auth, and a new `contractor_members (contractor_id, user_id, role)` table maps users to contractors. Policies then check membership, and CRM Admins get read-only access via `is_admin()`.
   - The alternative, keeping the app sign-in-free, means the app can't write to the database safely at all.
2. **Approve the required fixes** B1–B4, C1–C6, S1–S6 and archive-style rollbacks. I'd then prepare revised proposals 249/250 plus a local test like the ones for 245/246. Nothing would be applied.
3. **Demo data:** drop it from the migration (recommended), or keep it in a separate dev-only file.
4. **Deleting a contractor:** switch to `RESTRICT` plus an `is_active` flag (recommended), so financial history can't be deleted.

Nothing has been applied, and the Labour Summary page and the LabourHisaab persistence sprint haven't been started.
