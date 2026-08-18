# Shubhlabh CRM - Disaster Recovery & Backup Plan

## Overview
This document outlines the business continuity and disaster recovery procedures for the Shubhlabh CRM. Since the CRM strictly relies on Tally as the financial source of truth, the recovery strategy is designed to be safe, repeatable, and non-destructive.

---

## 1. Supabase Backup Strategy
The CRM database is hosted on Supabase (PostgreSQL), which provides automated safety mechanisms:
- **Point-in-Time Recovery (PITR):** Supabase Pro plans offer PITR. If a catastrophic data loss occurs (e.g., accidental bulk deletion of follow-ups), the database can be restored to any minute within the retention period.
- **Daily Backups:** Supabase automatically takes daily backups.
- **Manual Backups:** Administrators can trigger manual pg_dump exports of the schema and data via the Supabase Dashboard.

**Procedure for DB Restore:**
1. Log into the Supabase Dashboard.
2. Navigate to Database > Backups.
3. Select the desired Point in Time or Daily Backup and click "Restore".

---

## 2. Raw Tally Preservation & Re-import Safety
The CRM architecture is specifically designed to treat Tally data as immutable external state.

- **Voucher Source:** The actual financial records live in Tally. If the CRM database is destroyed, all financial intelligence (Sales Value, Last Purchase, Outstanding) can be perfectly recreated by re-exporting the `VoucherBookCRM.txt` file from Tally and running the Import Pipeline again.
- **Idempotent Imports:** The `tally_transactions` table enforces a strict `UNIQUE(tally_ledger_name, voucher_type, voucher_no, voucher_date)` constraint. This means re-importing the same Tally file multiple times is **100% safe**. It will not create duplicate transactions.

**Procedure for Tally Recovery:**
1. Export the Ledger List and Daybook from Tally.
2. Go to CRM > Data Import.
3. Import the Party Ledgers, then resolve identities in the Review Queue.
4. Import the Daybook (Vouchers). The BI engine will instantly recalculate all snapshot metrics.

---

## 3. Party Merge Behavior & Data Integrity
In Sprint 8, we implemented strict Foreign Key constraints (`ON DELETE RESTRICT`) to protect business data.
- **Accidental Deletion:** If a user attempts to delete a CRM Party that has active Requirements, Follow-ups, or Tally Transactions, the database will **block the deletion**.
- **Merge Procedure:** To safely merge Party A into Party B:
  1. Transfer all `requirements` from Party A to Party B.
  2. Transfer all `interactions` and `follow_ups` to Party B.
  3. Transfer `party_identity_links` to Party B.
  4. Once Party A is completely orphaned, it can be safely deleted.

---

## 4. API Security & Access Boundaries (RLS)
- The database enforces strict Row Level Security (RLS). 
- **Unauthenticated users** are completely blocked from reading or writing any table (`crm_parties`, `requirements`, `tally_transactions`, etc.).
- Even if the Supabase API URL and Anon Key are exposed, attackers cannot access business data without a valid operator login token.

---

## 5. Recovery Time Objective (RTO)
- **Tally Resync:** < 10 minutes (Export CSV + Upload).
- **Full Database PITR Restore:** ~15-30 minutes depending on data size (handled by Supabase).
