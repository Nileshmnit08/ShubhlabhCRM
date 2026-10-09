# Phase 3: Order Data Mapping Contract

This contract defines the absolute, single source of truth for every order parameter across the Shubh Labh CRM, Field Assist, and Buyer Order App.

| Parameter | Canonical source | Relationship | Read rule | Write rule |
|---|---|---|---|---|
| **Order ID** | `requirements.id` | Primary key | Use `requirements.id` in all contexts. | Generated once on creation. |
| **Order Number** | `requirements.demand_ref` | Header field | Use `demand_ref` everywhere as human-readable ID. | Generated once via DB trigger. |
| **Customer/Buyer** | `requirements.party_id` | Foreign key to `crm_parties` | Authenticated users can only read permitted parties. | Must validate against `crm_parties`. |
| **Created By** | `requirements.assigned_to` | Foreign key to `app_users` | - | Authenticated user ID (assigned_to). |
| **Product** | `requirement_items.product_name` | Line item field | Match by product name and category. | - |
| **Item Quantity** | `requirement_items.quantity` | Line item field | Read directly from `requirement_items`. | Save directly to `requirement_items`. |
| **Unit** | `requirement_items.unit` | Line item field | Read directly from `requirement_items`. | Save directly to `requirement_items`. |
| **Item Weight** | `requirement_items.weight` | Line item field | Read directly from `requirement_items`. | Save directly to `requirement_items`. Do NOT embed in `product_name`. Do NOT store in header `notes`. |
| **Gift Items** | `requirement_items.gift` | Line item field | Read directly from `requirement_items`. | Save directly to `requirement_items`. Do NOT store in header `notes`. |
| **Other Gifts** | `requirement_items.other_gift` | Line item field | Read directly from `requirement_items`. | Save directly to `requirement_items`. Do NOT store in header `notes`. |
| **Delivery Address** | `requirements.notes` (JSON) | Header field | Read `address` from `notes` JSON. | Write `address` inside `notes` JSON. |
| **Delivery Date** | `requirements.expected_date` | Header field | Read `expected_date`. | Update canonical field. |
| **Status** | `requirements.status` | Header field | - | Validate permitted transition. |
| **Updated Timestamp** | `requirements.updated_at` | Header field | Reflect latest update. | Maintained by DB trigger. |

## Strict Prohibitions

- **NO JSON PARSING FOR LINE ITEMS:** Applications are strictly prohibited from parsing `requirements.notes->extras` for line item weights or gifts.
- **NO STRING PARSING FOR WEIGHT:** The CRM Board is strictly prohibited from extracting weight from the `product_name` using regex `/\((\d+(?:\.\d+)?)\s*kg\)/i`.
- **NO SILENT SUBSTITUTIONS:** Do not use `product_type` as a fallback for missing products.
- **NO ALTERNATIVE STRUCTURES:** `buyer_orders` and `buyer_order_items` tables must not be used for new orders. All orders must originate in `requirements`.
- **NO DUPLICATE ORDER HEADERS:** When Field Assist or Buyer App edits an order, it must update the existing `requirements.id` rather than generating a new order header.

## Migration Requirements
- Schema migration must add `weight` (NUMERIC), `gift` (VARCHAR), and `other_gift` (VARCHAR) to `requirement_items`.
- Data migration must parse existing `requirements.notes->extras` and populate `requirement_items.weight`, `gift`, and `other_gift`.
- Old `product_name` entries like "Dry Mix (50 kg)" should remain intact for historical display unless cleaned, but the system must rely on the explicit `weight` column going forward.
