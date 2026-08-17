# Architecture and Domain Rules

## 1. Domain
The CRM is for a Small-Scale Feed Manufacturer. Operations are simple, margins are thin, and manual data entry must be minimized. 

## 2. Source of Truth
- **Tally** is the absolute source of truth for all financial data (ledgers, outstanding balances, sales registers). The CRM must never attempt to replace or become the accounting source of truth.
- **Supabase (PostgreSQL)** is the source of truth for CRM data (Interactions, Requirements, Follow-ups).

## 3. Scope Discipline & Deferred Features
The following features are **deliberately postponed** until reliable CRM data accumulates:
- AI customer scoring.
- Advanced customer-health metrics.
- Predictive ordering.
- Complex marketing automation.
- Uncontrolled bulk WhatsApp messaging.
- Large BI/reporting suites.
- Enterprise workflow engines.
- ERP/accounting replacement functionality.

**Rule:** A future feature may be proposed by Antigravity, but proposal does not equal authorization. It must enter a future sprint and receive Product Owner approval before any code is written.

## 4. Technical Stack
- **Frontend**: Vite + React + Tailwind (vanilla CSS approach used in v1)
- **Backend/DB**: Supabase (PostgreSQL)
- **Integrations**: WhatsApp Deep-linking (`wa.me`)
- **Data Import**: PapaParse (CSV), PDF.js (PDF)

## 5. Strict Antigravity Control Protocol
- The user is the Product Owner. Antigravity is the development agent.
- Work ONLY on the current sprint.
- Never implement future-sprint functionality because it appears convenient or related.
- Never change the approved architecture, database strategy or major dependencies without explicit approval.
- Do not introduce SQLite as a production database.
- Do not fabricate, infer or invent missing Tally information.
- Never silently merge ambiguous parties.
- Never delete or overwrite raw Tally staging information.
- All destructive or identity-changing operations must be explicit and auditable.
- Every sprint must produce a working, testable increment.
- Every sprint must include regression testing of previously working functionality.
- A sprint is not complete merely because code compiles.
- At sprint completion, generate the Sprint Completion Report (Walkthrough).
- At sprint completion, STOP.
- Do not automatically start the next sprint.
- Only explicit Product Owner approval permits the next sprint.

### 12.1 Required Sprint State Machine
- **PLANNED**: Implementation plan artifact generated.
- **BUILDING**: Code development and artifact creation.
- **TESTING**: Local verification and error boundary checking.
- **REVIEW**: Walkthrough artifact generated.
- **WAITING FOR APPROVAL**: STOP and await Product Owner decision.
  - ├── **APPROVED** → Proceed to next sprint planning.
  - └── **REVISE** → Return to current sprint building/testing.

### 13. Definition of Done
- The sprint objective is achieved.
- The intended business workflow works end-to-end.
- The application runs without release-blocking errors.
- Manual functional tests have been completed.
- Regression testing has passed.
- Database changes are documented.
- No raw Tally data has been lost or silently overwritten.
- Known limitations are documented.
- The Sprint Completion Report is produced.
- Antigravity is stopped and waiting for approval.

### 14. Standard Sprint Completion Report
All sprints must culminate in a Sprint Completion Report (`walkthrough.md`) following this exact structure:

```
SPRINT COMPLETION REPORT
Sprint: [Number]
Date: [Date]
Objective: [Objective]

1. IMPLEMENTED
- List every feature actually implemented.

2. NOT IMPLEMENTED
- List intentionally deferred items.

3. FILES CREATED / MODIFIED / DELETED
- ...

4. DATABASE CHANGES
- Tables
- Columns
- Indexes
- Policies / RLS
- Migrations

5. TALLY DATA IMPACT
- Imports affected:
- Raw data preserved:
- Identity mappings changed:

6. TESTS PERFORMED
- ...

7. TEST RESULTS
PASS / FAIL

8. REGRESSION TEST
PASS / FAIL

9. BUGS FOUND
- ...

10. BUGS FIXED
- ...

11. KNOWN LIMITATIONS
- ...

12. SECURITY / DATA SAFETY
- ...

13. SCREENSHOT / DEMO EVIDENCE
- ...

14. NEXT SPRINT PROPOSAL
- Proposal only; do not implement.

STATUS:
⛔ SPRINT COMPLETE — WAITING FOR PRODUCT OWNER APPROVAL
```

### 15. Product Owner Control Commands
Antigravity must respond to the following explicit control commands:
- `APPROVED — START SPRINT X`
- `REVISE CURRENT SPRINT`
- `STOP DEVELOPMENT`
- `SHOW CURRENT SPRINT STATUS`
- `RUN REGRESSION TEST`
- `SHOW FILES CHANGED`
- `SHOW DATABASE CHANGES`
- `SHOW TALLY IMPORT / IDENTITY CHANGES`

### 16. Mandatory Real-World Acceptance Scenarios
Before declaring this CRM production-ready, the Product Owner must be able to successfully perform the following:
1. Create a new customer and find it again through search.
2. Import a Tally party and preserve its original Tally name.
3. Flag two similarly named parties as possible matches without silently merging them.
4. Handle a Tally ledger marked '(OLD)' without converting it automatically to CRM Dormant.
5. Mark a party as Customer + Supplier.
6. Set Do Not Contact and verify WhatsApp action is appropriately restricted.
7. Open Today's Work and identify today's follow-up actions.
8. Open WhatsApp from a customer and record a response in seconds.
9. Choose Requirement and have the requirement form open automatically.
10. Choose Call Later and have a follow-up created/scheduled.
11. Create a feed-grade requirement such as DDGS 20 MT and track it through follow-up.
12. Validate a voucher-level Tally metric against Tally before trusting it.

### 17. Final Operating Model
- **TALLY** = Accounts / Financial Source of Truth
- **CRM** = Customer Relationship + Follow-up + Requirement Intelligence
- **WHATSAPP** = Communication Channel
- **REQUIREMENTS** = Structured Market Demand
- **TODAY'S WORK** = Daily Action Center
- **SUPABASE / POSTGRESQL** = Central Application Data Platform

*The final product should remain deliberately lightweight. Its success is measured by daily adoption and better customer follow-through—not by the number of modules or complexity of the technology.*
