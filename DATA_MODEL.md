# SMALL-SCALE FEED CRM: DATA MODEL

The following represents the logical data model for the CRM. Physical PostgreSQL implementations, constraints, indexes, and RLS (Row Level Security) policies will be finalized in subsequent sprints.

## 1. Core CRM Entities

### users
- `id` (PK)
- `name`
- `mobile/email`
- `role`
- `is_active`
- `created_at`
- `updated_at`

### parties / crm_parties
- `id` (PK)
- `display_name`
- `legal_or_core_name`
- `city`
- `state`
- `mobile`
- `whatsapp`
- `communication_preference`
- `preferred_channel`
- `preferred_contact_time`
- `crm_status`
- `notes`
- `created_at`
- `updated_at`

### party_relationships
- `id` (PK)
- `party_id` (FK to crm_parties)
- `relationship_type` (Customer, Supplier, Customer + Supplier, Other, Unknown)
- `is_active`
- `created_at`
- `updated_at`

### customer_contacts
- `id` (PK)
- `party_id` (FK to crm_parties)
- `contact_person`
- `mobile`
- `whatsapp`
- `designation`
- `is_primary`
- `notes`

## 2. Interaction & Operations

### interactions / activity
- `id` (PK)
- `party_id` (FK to crm_parties)
- `user_id` (FK to users)
- `channel`
- `interaction_type`
- `outcome`
- `note`
- `created_at`
- `next_action`
- `next_action_date`

### follow_ups
- `id` (PK)
- `party_id` (FK to crm_parties)
- `reason`
- `follow_up_date`
- `priority`
- `assigned_to` (FK to users)
- `status`
- `notes`
- `created_by`
- `completed_by`
- `completed_at`

## 3. Product & Requirements

### products
- `id` (PK)
- `product_name`
- `category`
- `unit`
- `is_active`
- `notes`
- `created_at`
- `updated_at`

### requirements
- `id` (PK)
- `party_id` (FK to crm_parties)
- `product_id` (FK to products)
- `quantity`
- `unit`
- `expected_rate`
- `required_date`
- `priority`
- `source_interaction_id` (FK to interactions)
- `status`
- `notes`
- `created_by`
- `created_at`
- `updated_at`

### requirement_events / status_history
- `id` (PK)
- `requirement_id` (FK to requirements)
- `old_status`
- `new_status`
- `changed_by`
- `changed_at`
- `note`

## 4. Tally Import & Staging Pipeline

### tally_imports
- `id` (PK)
- `source_file_name`
- `source_type`
- `imported_at`
- `imported_by`
- `record_count`
- `success_count`
- `error_count`
- `status`
- `notes`

### tally_raw_parties
- `id` (PK)
- `tally_import_id` (FK to tally_imports)
- `tally_source_id`
- `tally_ledger_name`
- `tally_group`
- `tally_status`
- `raw_location`
- `raw_payload_or_source_reference`
- `first_seen`
- `last_seen`

### party_identity_links
- `id` (PK)
- `crm_party_id` (FK to crm_parties)
- `tally_raw_party_id` (FK to tally_raw_parties)
- `match_type`
- `confidence`
- `resolution_status`
- `reason`
- `resolved_by`
- `resolved_at`

### identity_review_queue
- `id` (PK)
- `tally_raw_party_id` (FK to tally_raw_parties)
- `candidate_crm_party_id` (FK to crm_parties)
- `match_reason`
- `confidence`
- `status`
- `reviewed_by`
- `reviewed_at`
- `review_notes`

### tally_transactions (future)
- `id` (PK)
- `tally_import_id`
- `tally_voucher_id`
- `voucher_date`
- `party_reference`
- `amount`
- `transaction_type`
- `raw_reference`

## 5. Domain Rules & Definitions

### Identity Rules
- **CRM Party Identity**: The stable business identity used by the CRM.
- **Tally Ledger Name**: A source-system display value and may change over time.
- **Resolution Process**: A CRM party can be linked to one or more Tally ledger identities only after explicit identity resolution. A possible duplicate is NOT a confirmed duplicate.
- **Manual Merging**: Merging must be an explicit, auditable action by a human.
- **Staging Priority**: Original Tally values must remain recoverable from staging/import history (`tally_raw_parties`). Do not use party name alone as a permanent primary identity.

### Status Rules
Tally Status is distinctly separate from CRM Status. "Tally OLD" must not automatically mean "CRM Dormant".

**Tally Status:** Active | OLD | Unknown
**CRM Status:** Active | Dormant | At Risk | Inactive | Blocked

### Communication Preferences
- WhatsApp
- Call
- WhatsApp + Call
- No WhatsApp
- Do Not Contact
*(Preferred Contact Time is optional)*
