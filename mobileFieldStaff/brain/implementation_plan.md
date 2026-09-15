# FA-13: Visit Mode Integration

The goal of this sprint is to securely connect the existing `VisitModeScreen` to the Supabase backend with offline-first synchronization, accurate real-time duration tracking, and duplicate prevention.

## User Review Required

> [!IMPORTANT]
> The current CRM architecture utilizes generic tables (`interactions`, `activity_logs`), but neither possesses authoritative fields critical for field visits (e.g., precise `started_at`, `ended_at`, `duration_seconds`, GPS `latitude`/`longitude`, and structured `outcomes` JSON). 
> 
> As instructed, rather than shoehorning this into an incompatible structure, I will introduce a dedicated `crm_visits` authoritative schema delivered via a standard SQL migration (`123_sprint_FA_13_visits_schema.sql`).

## Open Questions

> [!WARNING]
> 1. **Zero-Cost Voice Transcription**: The UI has a "Tap to Speak Note" button. The sprint requirements forbid external/paid transcription APIs (no Google Speech, no Whisper, etc.) and fake transcription. React Native does not natively supply a reliable, built-in offline transcription engine uniformly across Android without bridging native VoiceRecognizer. I will preserve the *honest unavailable state* (i.e. a "Not Available Offline/Free" toast) when tapping the Voice button. Let me know if you expect a different zero-cost fallback.

## Proposed Changes

---

### Database Schema

#### [NEW] [123_sprint_FA_13_visits_schema.sql](file:///D:/ShubhLabhCRM/123_sprint_FA_13_visits_schema.sql)
Create the authoritative `crm_visits` table to store completed visits.
- `id` (UUID, PK)
- `party_id` (UUID, Ref: crm_parties)
- `staff_id` (UUID, Ref: app_users)
- `started_at` (TIMESTAMP)
- `ended_at` (TIMESTAMP)
- `duration_seconds` (INT)
- `latitude`, `longitude` (FLOAT)
- `outcomes` (JSONB)
- Includes strict RLS policies tied to the authenticated user.

---

### Local State Management

#### [NEW] [VisitContext.js](file:///D:/ShubhLabhCRM/mobileFieldStaff/src/context/VisitContext.js)
Introduces a global `VisitProvider` leveraging `AsyncStorage` to persist the active visit (e.g. `party_id` and `started_at`).
- Prevents creating duplicate active visits.
- Recovers gracefully after app crash/background interruption.
- Triggers the offline `SyncService` only upon **Finish Visit** to strictly avoid fragmented/half-synced visits.

---

### App Integration

#### [MODIFY] [App.js](file:///D:/ShubhLabhCRM/mobileFieldStaff/App.js)
Wrap the application in `<VisitProvider>` to allow global access to the visit state.

#### [MODIFY] [CustomerProfileScreen.js](file:///D:/ShubhLabhCRM/mobileFieldStaff/src/screens/CustomerProfileScreen.js)
- Wire the **Start Visit** button to invoke `VisitContext.startVisit(partyId, lat, lng)`.
- Enforce the "duplicate active visit protection" rule by navigating directly to the active visit if one already exists.

#### [MODIFY] [VisitModeScreen.js](file:///D:/ShubhLabhCRM/mobileFieldStaff/src/screens/VisitModeScreen.js)
- **Timer**: Replace the dummy interval with a precise duration calculator (`Date.now() - activeVisit.started_at`).
- **Data Binding**: Bind the structured outcomes (`metCustomer`, `demandAdded`, etc.) and real customer context to the state.
- **Finish Visit**: Connect the checkout button to `VisitContext.finishVisit(outcomes)`, which will calculate final duration and safely push the result to the existing `SyncService` offline queue (`crm_visits` table).
- **Voice/Requirement buttons**: Route to `QuickRequirementScreen` or display honest unavailable state.

## Verification Plan

### Automated Tests
- Run `npx expo export --clear` to ensure the Metro cache resolves all contexts properly.

### Manual Verification
1. Open the app on Android test device (`e0d9da95`).
2. Verify `CustomerProfile` opens successfully.
3. Tap **Start Visit** and assert accurate timestamp and elapsed time calculation.
4. Minimize/Kill the app -> Restart -> Verify the active visit is recovered.
5. Capture real outcomes and verify "Finish Visit" queues exactly one record.
6. Verify offline sync natively handles `crm_visits` and no duplicate visits can be instantiated simultaneously.
