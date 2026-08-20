# Micro-Sprint 10.10 Baseline

## Version & Build
- **Application:** Shubh Labh CRM
- **Version:** 0.0.0 (per package.json)
- **Dependencies:** React 19, React-Router 7, Supabase-JS 2, Vite 5

## Current Major Modules & Routes
1. **Dashboard (Today's Work):** `/`
2. **Leads:** `/leads`, `/leads/new`, `/leads/:id`
3. **Customers:** `/customers`, `/customers/new`, `/customers/:id`
4. **Dormant Candidate Queue:** `/dormant`
5. **Reactivation Workflow:** `/reactivation`
6. **Data Sync & Review:** `/data/import`, `/data/review`
7. **Requirements Pipeline:** `/requirements`, `/requirements/new`, `/requirements/:id`
8. **Follow-ups:** `/follow-ups`, `/follow-ups/new`, `/follow-ups/:id/edit`
9. **Activity Timeline:** `/activity`
10. **Settings:** `/settings`

## Current Database Migrations
- `01_sprint_1_schema.sql` to `29_sprint_29_reactivation_queue_schema.sql` (Total: 35 migration scripts including fixes/seed files).
- Supabase backend configured.

## Known Open Issues (Pre-Hardening)
1. **Automated Testing:** No automated UI testing framework exists in the repository.
2. **Dormant Reactivation Cycle Reset:** "Start New Reactivation Cycle" relies on temporary local state manipulation rather than a persistent reset.
3. **WhatsApp Blockers:** Pop-up blockers can intercept the deep-link action without a fallback.

## Known Deferred Features
- Role-based granular permissions (beyond Admin vs Operator macro-roles).
- WhatsApp Business API integration (Webhooks, Delivery Receipts).
- Automated SMS/WhatsApp sequences.
- Tally Live Sync (currently file-based import).
- AI-driven Template Generation.
