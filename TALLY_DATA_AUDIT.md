# Tally Data Audit & Identity Resolution Rules (Sprint 0 Fixes)

This document establishes the definitive data architecture rules, constraints, and identity resolution parameters for the Shubhlabh CRM's integration with Tally.

---

## 1. Data Source Limitations & Missing Fields

The CRM consumes two primary sources from Tally: 
1. **Ledger List** (Master data)
2. **Daybook/Voucher List** (Transaction data)

### Available Fields (from Ledger/Voucher text files):
- **Ledger Name** (e.g., `M/S Shubhlabh Traders (OLD)`)
- **Group Name** (e.g., `Sundry Debtors`, `Sundry Creditors`)
- **Voucher Date, Type, Number, Amount** (from Daybook only)

### Critical Missing Fields:
The Tally exports provided do **NOT** contain the following fields. The CRM must NEVER assume or simulate them:
- Phone Numbers (Mobile / WhatsApp)
- Contact Persons
- Complete Addresses (City/Location is often embedded poorly in the ledger name, or absent)
- Lat/Long coordinates
- Credit Limits / Terms

### Architectural Constraint (Ledger List Limitations):
> [!WARNING]
> A Party **Ledger List** alone cannot support financial metrics. Features such as "Last Purchase Date", "Purchase Frequency", "Sales Trend", "Total Purchase Value", or "Outstanding Balance" CANNOT be calculated from a Ledger List. These metrics absolutely require the **Voucher-level Daybook** export (implemented in Sprint 7).

---

## 2. Terminology & Field Distinctions

To prevent data corruption and ensure clear reporting, the CRM enforces strict distinctions between Tally names and CRM names.

| Field Name | Description | Example |
| :--- | :--- | :--- |
| **`tally_ledger_name`** | The raw, immutable string imported directly from Tally. This is never edited by CRM users. | `Rahul Poultry Farm (OLD)` |
| **`legal_or_core_name`** | The sanitized name used for exact matching. Suffixes like `(OLD)` are stripped out. | `Rahul Poultry Farm` |
| **`display_name`** | The human-friendly name assigned by the CRM operator. This can be completely different from the legal name. | `Rahul (Main Branch)` |

### Customer, Supplier, and Mixed Classifications
- **Customer:** Any party under the Tally group `Sundry Debtors`.
- **Supplier:** Any party under the Tally group `Sundry Creditors`.
- **Customer + Supplier:** If Tally contains two ledgers for the same physical entity (one Debtor, one Creditor), they must be linked to a **SINGLE CRM Party** identity. The CRM Party will act as a unified profile showing transactions from both ledgers.

---

## 3. CRM Status vs. Tally Status

Tally and the CRM operate on independent life-cycles.

### Tally Status (Immutable)
- Derived strictly from the `tally_ledger_name`. 
- **Rule:** If a ledger name contains `(OLD)`, its Tally Status is considered **Tally OLD**. 
- A ledger containing `(OLD)` is **NOT automatically classified as CRM Dormant**. It simply represents a deprecated financial ledger in Tally.

### CRM Status (Mutable)
- Managed exclusively by the CRM operator.
- **Active:** Currently doing business.
- **Dormant:** Business has ceased (e.g., farm closed, shifted to competitor). 
- If a party is marked as `Tally OLD`, the CRM operator may still create follow-ups or requirements against the CRM Party if a new ledger is expected to be created for them.

---

## 4. Identity Resolution Outcomes

When Tally data is imported, the CRM compares the raw `tally_ledger_name` against existing CRM Parties. There are four explicit outcomes:

### A. Exact Match (Automatic)
The sanitized Tally name perfectly matches an existing `legal_or_core_name` or `display_name`.
- **Action:** Automatically linked. No user intervention required.

### B. Possible Match (Similarity)
Two parties share similar spellings (e.g., `Shree Ram Traders` vs `Shri Ram Traders`). 
- **Action:** Flagged for review in the Identity Resolution Queue. 
> [!IMPORTANT]
> **Strict Rule:** Two similarly named parties are NEVER automatically merged. Uncertain parties must remain separate until manually confirmed by an operator.

### C. Manual Confirmation (Human Intervention)
An operator reviews a "Possible Match" or an unmatched Tally ledger and explicitly links it to an existing CRM Party.
- **Action:** A new `party_identity_links` record is created. Future imports of that exact Tally ledger name will instantly resolve to this CRM Party via Exact Match.

### D. New Party (Promotion)
An operator confirms that a Tally ledger represents a genuinely new business relationship with no existing CRM equivalent.
- **Action:** The Tally ledger is promoted to create a brand new CRM Party.
