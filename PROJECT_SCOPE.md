# SMALL-SCALE FEED CRM: PROJECT SCOPE

## 1. Product Vision
This project is a lightweight, domain-specific CRM for a small-scale feed business. It acts as an operational system for customer relationships, daily follow-ups, and market-demand intelligence. It is explicitly designed to work alongside Tally, not replace it.

## 2. In Scope
- **Operational CRM**: Customer relationships, interaction logs, follow-up scheduling, customer feedback, and tracking feed-grade requirements.
- **Tally Co-existence**: Tally remains the absolute accounting and financial source of truth.
- **"Today's Work" Centric**: A primary operating screen that prioritizes actionable, daily tasks rather than passive reporting.
- **WhatsApp Integration (Manual)**: Primary communication channel for fast customer contact through human-controlled WhatsApp deep links.
- **Tally Integration & Staging**: Controlled import pipeline for Tally data involving staging (`tally_raw_parties`) and a manual identity resolution process (`party_identity_links`).
- **Data Persistence**: Supabase/PostgreSQL as the central application database.
- **Frontend App**: Flutter with a responsive architecture suitable for Desktop/Web.

## 3. Out of Scope (Current Release)
- **Tally Replacement**: We are NOT building an accounting system.
- **Automated WhatsApp API**: Official API automation, bulk messaging, or bot-driven communication are explicitly out of the initial scope.
- **Advanced CRM Features**: AI scoring, complex customer-health models, marketing automation, or enterprise CRM features.
- **Automatic Identity Merging**: Uncertain parties must never be silently merged. Ambiguous identities require human review.
- **Financial Analytics from Ledger Lists**: We will not infer transaction history, purchase frequency, sales trends, or outstanding balances from simple ledger-list exports. This requires voucher-level exports in the future.
- **SQLite**: SQLite is not part of the production architecture.

## 4. Development Principles
- **Phase-Gated Sprints**: Every sprint is independently testable and requires explicit Product Owner approval before the next sprint begins.
- **Data Protection**: Raw Tally data must be preserved before normalization or identity resolution.
