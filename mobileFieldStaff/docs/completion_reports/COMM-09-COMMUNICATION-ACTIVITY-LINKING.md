# COMM-09 — COMMUNICATION ACTIVITY LINKING

## Existing Activity Architecture
The Shubh Labh CRM currently utilizes several core activity tables:
- `public.activity_logs`: System and user-driven events linked via `entity_type` and `entity_id`.
- `public.interactions`: Manually logged interactions (e.g., WhatsApp, Call, Meeting, Note).
- `public.follow_ups`: Scheduled tasks and reminders mapped via `party_id`.
- `public.crm_visits`: Authoritative field staff physical visits.
- `public.crm_call_events`: Automated Android call logs captured via background service.

## Existing Relationships
All activity architecture is unified at the customer level via `party_id` and at the staff level via `staff_id` (or `user_id`/`actor_id`).

## crm_call_events Relationship Audit
Upon inspecting `134_sprint_COMM_01_call_intelligence.sql`, there is **no explicit foreign key** (e.g., `call_event_id`) mapping an automated call to a specific `interaction`, `follow_up`, `activity_log`, or `crm_visit`. 

The only common denominator is `party_id`. Temporal proximity (a call happening right before a follow-up is closed) could exist, but as per sprint controls, temporal proximity is not an authoritative relationship.

## Follow-up Relationship Audit
Inspecting `03_sprint_3_schema.sql` confirms `follow_ups` are linked to `crm_parties`, but contain no reference to `crm_call_events`. **No authoritative direct relationship currently exists.**

## Customer 360 Audit
The Customer 360 currently houses the `CustomerCommunicationPanel` (aggregate volume) and the `CustomerCommunicationTimeline` (raw call chronology) in separate tabs. Because there is no explicit database relationship between calls and manual follow-ups, these views provide necessary side-by-side context without artificially combining the data.

## Integration Implemented
**NONE REQUIRED.**
As mandated by the sprint constraints, since no authoritative relationship exists in the database schema, no UI was artificially created to link them. The architecture correctly keeps automated device logs (`crm_call_events`) separate from human-asserted follow-ups.

## Relationships NOT Available
- A call cannot definitively prove a follow-up was completed.
- A call cannot definitively prove a visit outcome.
- `crm_call_events` cannot map 1:1 to `interactions` without a user explicitly asserting it.

## Data Integrity
**PASS**
No historical data was modified. No automatic follow-ups or duplicate interaction records were manufactured.

## Authorization
**PASS**
No RLS policies were bypassed or modified.

## Privacy
**PASS**
No SMS, microphone, or transcription services were introduced to attempt deeper contextual linking.

## Performance
**PASS**
By intentionally keeping the tables decoupled and not attempting complex temporal fuzzy-matching joins in the browser, the existing Customer 360 loading performance is preserved.

## Testing
**PASS**
The Customer 360 regression test is functionally complete. The system loads instantly without N+1 cross-table lookups for non-existent relationships.

## Live Data Validation
**BLOCKED — NO REAL COMMUNICATION EVENTS AVAILABLE**
The audit is purely architectural as `crm_call_events` contains zero physical records pending real-world QA execution.

## Changed Files
NONE

## Database Objects Changed
NONE

## Recommended Future Architecture
If the business explicitly requires linking a physical call to a follow-up outcome, I recommend a lightweight, non-destructive migration that adds an optional associative column to `follow_ups` and `interactions`:

```sql
-- Future Proposal (NOT EXECUTED)
ALTER TABLE public.follow_ups ADD COLUMN resolved_by_call_id UUID REFERENCES public.crm_call_events(id) ON DELETE SET NULL;

ALTER TABLE public.interactions ADD COLUMN source_call_id UUID REFERENCES public.crm_call_events(id) ON DELETE SET NULL;
```
This would allow the mobile Field Assistant app to optionally prompt the user: *"You just finished a 5-minute call with [Customer]. Did this resolve your pending follow-up?"* and definitively capture the authoritative `UUID` relationship at the time of the event.

## Known Limitations
Validation is statically confirmed but physically blocked pending real-world call capture events.

---

### Final Classification
**PASS** (Architectural Audit Complete, Implementation safely bypassed due to lack of explicit relationships).
