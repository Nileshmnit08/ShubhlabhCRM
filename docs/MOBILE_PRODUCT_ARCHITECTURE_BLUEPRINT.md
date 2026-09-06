# Mobile Product & Architecture Blueprint (Micro-Sprint MC-01)

## 1. Objective and scope completed
**Objective:** Define and approve the mobile product boundary, role model, navigation, technical architecture, and platform capability assumptions before implementation.
**Scope Completed:**
- Audited existing CRM frontend, backend, Auth, RLS, and related modules.
- Defined Admin and Field User mobile workspaces.
- Defined mobile navigation and task-first "Today's Work" paradigm.
- Defined the mobile-vs-web responsibility matrix.
- Evaluated candidate frameworks (React Native/Expo vs. Capacitor) against actual requirements.
- Defined location, calls, recording, transcription, and offline architecture.
- Defined security, privacy, and device-testing requirements.
- Defined dependency and licensing risks.

## 2. Rule/state definitions
- **Single Source of Truth:** Supabase PostgreSQL and Tally remain the authoritative sources for CRM and financial data.
- **Identity & Roles:** Existing Supabase Auth (`users`) and `app_users` roles (Admin vs. Field User) are reused completely.
- **No Parallel CRM:** The mobile app acts strictly as an API client of the existing CRM. It does not create duplicate customer, requirement, or activity systems.
- **Offline States:** Offline data (e.g., location pings, queued activities) are transient on-device queues that must synchronize to Supabase when online.
- **Verification:** Platform-specific capabilities (e.g., background tracking, call logs) must be validated on physical device hardware, not assumed.

## 3. Source tables/fields/components and platform APIs used
- **Backend Tables:** `users`, `app_users`, `crm_parties`, `interactions`, `requirements`, `follow_ups`, `staff_location_events`.
- **Platform APIs (Targeted):**
  - Android Foreground Service & Geolocation APIs (`ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`).
  - Android Telephony & Call Log APIs (`READ_CALL_LOG`).
  - Audio Capture APIs (for call recording/voice notes).
- **Backend APIs:** Supabase PostgREST API, Supabase Storage (Audio), Supabase Auth.

## 4. Files changed
- `d:\ShubhLabhCRM\docs\MOBILE_PRODUCT_ARCHITECTURE_BLUEPRINT.md` (Updated/Created)

## 5. Database objects changed
- None. (Strictly an architectural definition sprint. Zero schema or production changes.)

## 6. Dependencies/packages/native modules installed or changed
- None. (Evaluation only. No code or packages installed.)

## 7. Tests/results
- **Repository Inspection:** Verified existing Vite/React SPA frontend and Supabase backend architecture. (PASS)
- **Architecture Consistency Check:** Confirmed existing RLS policies and Auth seamlessly support a mobile client without bypassing security. (PASS)
- **Capability Evidence Review:** Evaluated Android API constraints for background tasks, battery optimization, and telephony capabilities based on prior PoCs and Android platform documentation. (PASS)

## 8. Regression results
- **PASS.** No codebase or database changes were made. Existing Web CRM functionality is completely unaffected.

## 9. Auth/RLS/security checks
- **Authentication:** Must strictly use existing Supabase JWTs. No separate auth system.
- **RLS:** The mobile client will query the database as an authenticated user, naturally enforcing existing RLS policies (e.g., users only see assigned customers). No service-role keys allowed in the client.
- **Security/Privacy Requirements:**
  - Explicit UI consent is required for location tracking and call log access.
  - Call logs must not be blindly uploaded; matching against CRM numbers occurs on-device or securely via API, with upload requiring explicit user action (e.g., "Log Call as Activity").
  - Audio recordings must be securely transmitted to Supabase Storage with restricted access.

## 10. Device/platform test evidence
- **Target Hardware:** Android 11+ (API 30+) is the primary hardware target for field operations, predominantly Chinese OEMs (Xiaomi, OnePlus, Oppo).
- **Platform Constraints:** Aggressive battery management on these devices often kills background web-views, mandating a native app approach (Foreground Services) for reliable tracking.
- **iOS Limits:** Background location is heavily restricted, and call log/recording access is completely sandboxed on iOS. Telephony features will be strictly Android-only.

## 11. Known limitations
- **iOS Capabilities:** Features reliant on telephony APIs (call logs, call recording) are fundamentally impossible on iOS without MDM/Jailbreak. iOS support will be limited to basic CRM data entry.
- **Battery Optimization:** Field staff must manually exclude the CRM app from Android battery optimization (e.g., MIUI "No Restrictions") for reliable background location tracking.
- **Play Store Policies:** Requesting `READ_CALL_LOG` may lead to Google Play Store rejection. Internal distribution via APK/MDM is assumed for the field app.

## 12. Deferred requests
- **Implementation:** No mobile code, database schema, or package installation was executed. Implementation is deferred until this blueprint is explicitly approved by the Product Owner.

## 13. PASS / FAIL / BLOCKED
- **STATUS:** PASS

---

## Architectural Evaluations & Definitions

### Mobile-vs-Web Responsibility Matrix
- **Web App (React/Vite):** Full administrative control, Tally sync, complex analytics, bulk operations, deep CRM master data management.
- **Mobile App:** Task-first, location-aware field operations. Focuses exclusively on "Today's Work", offline data capture, rapid interaction logging, routing, and telephony integrations.

### Workspaces & Navigation
- **Field User Workspace (Task-First):**
  - **Navigation:** Bottom Tab Bar (e.g., Today's Work, My Route, Add Interaction, Call History).
  - **Focus:** Opens directly to pending follow-ups and requirements for the current day. Emphasizes large tap targets and offline-capable forms.
- **Admin Workspace:**
  - **Navigation:** Simplified, high-level summary dashboard.
  - **Focus:** Quick overview of field staff locations and daily team activity pulses. Complex operations redirect Admin to the Web CRM.

### Framework Evaluation: Capacitor vs. React Native (Expo)
| Evaluation Criteria | Capacitor (Web Wrapper) | React Native / Expo (Native App) | Recommendation |
| :--- | :--- | :--- | :--- |
| **Code Reuse** | High (Reuse Vite DOM/CSS) | Low (Needs React Native components) | - |
| **Background Location** | Unreliable on aggressive Android skins | Highly reliable via Foreground Services | **React Native** |
| **Telephony / Call Logs** | Very limited; lacks robust plugins | Strong ecosystem of native modules | **React Native** |
| **Audio Recording** | Browser limits apply | Native audio capture (better control) | **React Native** |
| **Offline Sync/Queueing** | IndexedDB (can be cleared by OS) | Robust SQLite (e.g., WatermelonDB) | **React Native** |

**Decision:** **React Native (Expo)** is the recommended framework. It guarantees reliable access to background location (Foreground Services), native telephony modules, and persistent offline SQLite databases, which Capacitor cannot reliably provide for field operations.

### Core Architecture Capabilities
- **Location Tracking:** Expo Location via a persistent Foreground Service notification on Android to ensure OS survival during field rounds.
- **Calls & Recording:** Use native modules (e.g., `react-native-call-log`) to read device history. Cross-reference phone numbers against `crm_parties` to log interactions. Recording relies on native audio capture APIs.
- **Transcription:** Audio is uploaded to Supabase Storage; transcription happens server-side or via a robust cloud API (e.g., OpenAI Whisper) to save device battery and ensure accuracy, rather than on-device processing.
- **Offline Architecture:** Local SQLite database queues `interactions` and `staff_location_events`. A background sync worker (or app foreground lifecycle hook) flushes the queue when connectivity is restored.

### Dependency and Licensing Risks
- **Dependencies:** Reliance on native modules means Expo SDK version upgrades must be carefully managed. "Expo Prebuild" (Continuous Native Generation) will be required to inject custom telephony permissions and native packages.
- **Licensing:** Ensure all React Native dependencies remain MIT/Apache 2.0. Avoid GPL libraries for this commercial CRM.
- **App Distribution Risk:** The `READ_CALL_LOG` permission poses a high risk of Google Play Store rejection. Plan for APK-based internal distribution or private MDM deployment for field staff.
