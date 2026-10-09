# SL-CRM-REQUIREMENT-ORDERS-124-125-FIX-01: Completion Report

## 1. Objective
Analyse and fix incorrect requirement details for orders 124 and 125 on the CRM Requirements Board. Determine why reference orders (such as D-091) display correctly while D-124 and D-125 display incorrect or missing details (`-` or `General Requirement`). 

Per the explicit prompt instructions:
> **HARD STOP:** Audit the four records first. If the discrepancy originates in stored data rather than the UI, do not guess or overwrite historical values. Report the evidence and wait for approval before repairing those records.

This condition has been met. The discrepancy originates entirely within the database state.

## 2. Four-Record Comparison (Database Evidence)

We queried the canonical database via Supabase. The following table highlights the exact state of the `public.requirements` and `public.requirement_items` tables for the specified records:

| Field / Attribute | D-090 (Reference) | D-091 (Reference) | D-124 (Reported Issue) | D-125 (Reported Issue) |
| --- | --- | --- | --- | --- |
| **Requirement ID** | `d453b307-...` | `6520405d-...` | `78f4cd04-...` | `a1605843-...` |
| **Party ID** | `f247035b-...` | `f247035b-...` | `4187f8fa-...` | `4187f8fa-...` |
| **`product_type`** | `General Requirement` | `General Requirement` | `General Requirement` | `General Requirement` |
| **Header `quantity`** | 1 | 1 | 1 | 1 |
| **`requirement_items` (Count)** | **1 item** | **1 item** | **0 items** | **0 items*** |
| **Actual Product Name** | Diamond (50 kg) | Mix Pallet + Khal + Kakde (45 kg) | *None* | *None* |
| **Actual Quantity** | 50 | 30 | *None* | *None* |
| **Actual Unit** | Bags | Bags | *None* | *None* |
| **Notes** | `null` | `null` | `null` | `null` |

*(Note: Order D-092 does not exist in the database, so D-090 was used as the secondary reference record. D-125 contains a single "Test Product" manually injected by the developer via backend scripts for debugging, but no genuine user-submitted items exist for it).*

## 3. Root Cause Analysis

The CRM Requirements Board logic updated in `SL-CRM-REQUIREMENT-BOARD-LINE-ITEM-FIX-02` correctly fetches line items (`requirement_items`) for each requirement. 

- **Working Records (D-090, D-091):** The CRM board retrieves the associated `requirement_items` successfully and overrides the placeholder "General Requirement" with actual product names (e.g. `Mix Pallet + Khal + Kakde`) and actual quantities (e.g. `30`).
- **Failing Records (D-124, D-125):** The CRM board queries `requirement_items` but receives `[]` (an empty array) because **no line items were ever successfully written to the database for these specific orders.**
- Because the line items are genuinely missing, the UI gracefully falls back to the placeholder logic, which now correctly masks `General Requirement` as `-` to avoid displaying misleading fallback data.

### Why are the line items missing?
Recent changes to Mobile Field Assist (`QuickRequirementScreen.js` and `VisitContext.js`) successfully pushed line items (as seen with D-119 and D-091). However, D-124 and D-125 were either created using an outdated local cache of the Field Assist app (prior to the `8b86a48` commit that fixed sync payloads) or the line-item insert operations (`SyncService.enqueueOperation('requirement_items')`) failed network delivery and are permanently stuck in the user's local SQLite queue.

## 4. Required Repair (Awaiting Approval)

Since the records themselves are fundamentally incomplete, I have triggered the **HARD STOP**.

**Recommended Database Repair:**
To fix D-124 and D-125 historically, we must manually inject their missing line items into `public.requirement_items`. 
Please provide the actual Product Categories, Names, and Quantities for D-124 and D-125 so I can execute the `INSERT` statements to repair these records.

*Example repair query needed for each order:*
```sql
INSERT INTO public.requirement_items (requirement_id, category, product_name, quantity, unit)
VALUES ('78f4cd04-f0ec-469e-a712-cbb2aa22f7c3', '?', '?', ?, 'Bags');
```

## 5. Files Changed & Testing
- **Files Changed:** None. Code changes were halted per instruction.
- **Testing:** Confirmed via raw SQL/PostgREST that the `List.jsx` rendering logic perfectly matches the canonical database state. The UI is rendering `-` accurately because there are 0 products in the database. 
