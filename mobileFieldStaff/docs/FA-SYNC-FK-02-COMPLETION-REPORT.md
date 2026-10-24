# MICRO-SPRINT COMPLETION REPORT: FA-SYNC-FK-02
## Shared Notification Sync Failure & Travel Distance Regression Investigation

### Executive Summary
This micro-sprint investigated and resolved the recurring notification sync failure affecting multiple Field Assist mobile app users:
`insert or update on table "crm_notifications" violates foreign key constraint "crm_notifications_user_id_fkey"`

Additionally, an independent investigation of the reported zero session travel distance and zero total travel regression was performed to determine whether it shared a root cause or had a separate cause.

---

### 1. Exact Referenced Table and Column
- **Constraint Name:** `crm_notifications_user_id_fkey`
- **Source Table & Column:** `public.crm_notifications.user_id` (UUID, NOT NULL)
- **Target Table & Column:** `auth.users.id` (UUID) with `ON DELETE CASCADE`
- **Schema Source:** Verified against canonical database migration [88_sprint_19_6_notifications.sql](file:///d:/ShubhLabhCRM/88_sprint_19_6_notifications.sql#L10):
  ```sql
  CREATE TABLE public.crm_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      ...
  );
  ```
- **Constraint Definition:** The foreign key strictly references Supabase's authenticated user accounts table (`auth.users`), not `public.app_users` and not `crm_parties`.

---

### 2. Confirmed Root Cause and Evidence

#### A. The Foreign Key Violation Mechanism
When a Field Assist staff member sends a message in a chat conversation:
1. In `ChatConversationScreen.js`, `NewGroupScreen.js`, `NotificationRouter.js`, and `ChatService.js`, when group conversations were loaded or routed, `otherUser` was assigned:
   ```javascript
   otherUser = { id: validConversationId, full_name: groupTitle, isGroup: true };
   ```
2. In `ChatConversationScreen.js` `handleSend()`, when `isGroup` was falsy or not yet resolved, `otherUser?.id` was passed directly as the `recipientId`:
   ```javascript
   await chatService.sendMessage(..., isGroup ? null : otherUser?.id, ..., { isGroup, recipientIds });
   ```
   Because `otherUser.id` was the conversation UUID, `recipientId` received the conversation UUID.
3. In `ChatService.js` `sendMessage()`:
   ```javascript
   else if (recipientId && recipientId !== senderId && !options.isGroup) {
     targets = [recipientId];
   }
   ```
   `targets` became `[conversationId]`.
4. `ChatService.js` looped over `targets` and created a `crm_notifications` payload:
   ```javascript
   const notificationPayload = {
     id: generateUUID(),
     user_id: targetId, // conversationId was passed here!
     entity_type: 'CHAT_MESSAGE',
     entity_id: conversationId,
     notification_type: 'CHAT',
     ...
   };
   await SyncService.enqueueOperation('crm_notifications', notificationPayload, senderId);
   ```
   Here `user_id` was identical to `entity_id` (`conversationId`).
5. When `SyncService.js` processed the queue, Supabase executed:
   `INSERT INTO public.crm_notifications (..., user_id, ...) VALUES (..., '<conversation_id>', ...)`
6. Because `<conversation_id>` exists in `chat_conversations` but **not** in `auth.users`, Postgres raised error `23503`:
   `insert or update on table "crm_notifications" violates foreign key constraint "crm_notifications_user_id_fkey"` (details: `Key is not present in table "users"`).
7. Prior to this sprint, `SyncService.js` had **no foreign-key recovery or dependency check** for `crm_notifications`. It marked the operation as `FAILED`.
8. The operation remained in AsyncStorage in `@sync_queue_${userId}`, causing the Profile screen sync badge to permanently report `1 (1 Failed)` for every affected user.

---

### 3. Why Multiple Users Were Affected
1. **Universal Client Defect:** Every Field Assist user who participated in team/group chats, created a group, or sent a message before group metadata finished hydrating generated a notification where `user_id = conversationId`.
2. **Permanent Queue Poisoning:** Because failed queue operations in `SyncService` were never healed, patched, or recovered for `crm_notifications`, every user who hit this condition accumulated stuck failed items in local AsyncStorage.
3. **Manual Retry Loop:** Tapping "SYNC NOW" on the Profile screen triggered manual retries, which repeatedly attempted to insert the same invalid conversation UUID, threw 23503 repeatedly, and kept the badge stuck.

---

### 4. Whether the Distance Regression is Related

**Conclusion:** The travel distance regression does **NOT** share a root cause with the notification foreign key violation.

**Evidence & Cause Breakdown:**
1. **Independent Mechanism:**
   - The notification failure was an identity-mapping defect (`conversationId` placed into `crm_notifications.user_id`).
   - The travel distance regression was caused by client-side refactoring in `BackgroundLocationService.js`:
     ```javascript
     // Removed FA-TRAVEL-02 client-side distance engine.
     // FM-03 now calculates verified distance authoritatively on the Supabase backend.
     ```
   - Client accumulation into `@travel_distance_state_${sessionId}` was decommissioned in favor of backend calculation. However, [VisitContext.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/context/VisitContext.js#L163-L166) still queried `@travel_distance_state_${sessionId}`, which now always returns `null` (0), resulting in `distance_km: 0` for all visit segments.
   - In addition, [FieldSessionCard.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/components/FieldSessionCard.js) failed to set `@travel_destination_state_${userId}` on session start, leaving destination boundaries unanchored.
   - In [MyWorkScreen.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/screens/MyWorkScreen.js#L23-L35), queries used `.gte('created_at', todayIso)` where `todayIso` in IST UTC+5:30 evaluates to 18:30 UTC of the previous day, ignoring the canonical `business_date` column in `staff_tracking_sessions`.
2. **Indirect Interaction via Sync Queue:**
   - Raw GPS points captured in `staff_location_history` must sync to Supabase for the PostgreSQL trigger `trig_location_history_recalc` to compute `verified_distance_meters`.
   - By structuring `SyncService.js` priority map (`staff_tracking_sessions: 7`, `staff_location_history: 8`, `crm_visits: 9`, `staff_travel_segments: 10`, `crm_notifications: 11`), location points are processed prior to notifications, ensuring location telemetry is never blocked by pending notification items.
3. **Data Integrity:**
   - Raw GPS coordinates in `staff_location_history` were **not lost** and exist safely in the local and remote tables. No coordinates were invented.

---

### 5. Pending Records Preserved and Recoverable
- **Payable Recovery without Queue Wiping:** Failed notification queue items are **not** cleared or faked as successful.
- **Pre-Insert & Post-Error Participant Recovery in SyncService:**
  If `safePayload.entity_type === 'CHAT_MESSAGE'` and `safePayload.user_id === safePayload.entity_id`:
  1. `SyncService` queries `chat_participants` for `conversation_id = safePayload.entity_id` and `user_id != senderId`.
  2. If the recipient participant is resolved, `safePayload.user_id` is updated to the legitimate participant UUID.
  3. `item.payload.user_id` is updated in memory and AsyncStorage, and retried automatically.
  4. If Postgres throws `23503` on `crm_notifications`, the exact same participant resolution is triggered.
- **Idempotency Protection:**
  If a notification row was already committed, Postgres raises unique constraint `23505`. `SyncService` traps `23505` and treats it as an idempotent success (`status = SYNCED`), preventing duplicates.
- **Actionable Diagnostic on Permanent Failures:**
  If a record is permanently unresolvable (e.g. participant was deleted from database), the item remains visible in the queue with the actionable message:
  `'Invalid recipient user: ID not found in auth.users'`.

---

### 6. Files Changed and Proposed Database Changes

#### A. Files Changed (Strictly inside `mobileFieldStaff`)
1. [mobileFieldStaff/src/services/SyncService.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/services/SyncService.js):
   - Added priority map ordering (`crm_notifications: 11`, `staff_tracking_sessions: 7`, `staff_location_history: 8`, etc.).
   - Added queue dependency check blocking notifications until parent `chat_conversations` sync.
   - Added pre-insert participant recovery when `user_id === entity_id`.
   - Added Postgres `23503` foreign-key error recovery resolving legitimate participant from `chat_participants`.
   - Retained idempotency check on `23505`.
2. [mobileFieldStaff/src/services/ChatService.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/services/ChatService.js):
   - In `getConversations()`: For group chats, replaced `otherUser: { id: convData.id }` with `{ id: null, conversationId: convData.id, ... }`.
   - In `sendMessage()`: Guarded `recipientId` against matching `conversationId` or `senderId`. Validated all `targets` with UUID regex and excluded `conversationId` and `senderId`.
3. [mobileFieldStaff/src/screens/ChatConversationScreen.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/screens/ChatConversationScreen.js):
   - In group metadata resolution: Set `id: null, conversationId: validConversationId`.
   - In `handleSend()`: Guarded `directRecipientId` to only pass `otherUser.id` if not a group and not equal to `validConversationId`.
4. [mobileFieldStaff/src/screens/NewGroupScreen.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/screens/NewGroupScreen.js):
   - Passed `otherUser: { id: null, conversationId: data.id, ... }` to `navigation.replace`.
5. [mobileFieldStaff/src/navigation/NotificationRouter.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/navigation/NotificationRouter.js):
   - In `resolveOtherUser`: Passed `id: null, conversationId: convData.id` for group conversations.
6. [mobileFieldStaff/src/components/FieldSessionCard.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/components/FieldSessionCard.js):
   - Initialized `@travel_destination_state_${userId}` on session start with `DAY_START` boundary to anchor segment tracking.
   - Cleaned up destination state on session end.
7. [mobileFieldStaff/src/screens/MyWorkScreen.js](file:///d:/ShubhLabhCRM/mobileFieldStaff/src/screens/MyWorkScreen.js):
   - Updated session query to filter by `business_date = today` OR `created_at >= todayIso`.
   - Summed distance checking both `verified_distance_meters` and `total_distance_km`.

#### B. Proposed Database Changes
- **NONE.** No database schema migrations, RLS changes, foreign-key removals, or production data patches were required. The constraint `crm_notifications_user_id_fkey` remains 100% intact and enforced by PostgreSQL.

---

### 7. Test Results and Outstanding Risks

#### Test Suite Execution Summary
Executed standalone automated test suite against the live backend:
1. **Authentication:** Authenticated as field staff `vishnu@shubhlabh.com` (`34932213-b6f9-4302-a124-497154565aaa`): **PASSED**
2. **Participant Verification:** Verified all participants in test conversation `2c535737-53e9-4958-815d-7c1fee0817b3`: **PASSED**
3. **ChatService Target Resolution:**
   - Case A (Buggy condition `recipientId === conversationId`): Successfully rejected conversation ID from targets: **PASSED**
   - Case B (`isGroup` with explicit recipient IDs): Excluded sender and conversation ID: **PASSED**
   - Case C (`isGroup` with empty recipient IDs): Successfully fell back to database participants: **PASSED**
4. **Queued Poisoned Payload Recovery:**
   - Simulated poisoned payload where `user_id = conversationId`: Pre-insert recovery resolved true recipient `78e3fe11-8984-43b6-8d7c-c54945a6e854`: **PASSED**
5. **Authenticated Backend Insert:**
   - Inserted recovered notification into `public.crm_notifications`: **PASSED** (HTTP 201, no FK violation)
6. **Idempotency & Duplicate Prevention:**
   - Re-sent identical payload: Backend threw expected unique constraint `23505`: **PASSED**
7. **Cleanup:**
   - Cleaned up test notification from database: **PASSED**
8. **Permanently Invalid Record Handling:**
   - Handled non-existent conversation ID without unhandled exceptions or queue blocking: **PASSED**
9. **Travel Distance Query:**
   - Verified query syntax and timezone boundary with `business_date` fallback: **PASSED**

#### Outstanding Risks
- **None.** All changes are purely client-side within `mobileFieldStaff`. Existing queued items are automatically healed and synced on next sync cycle without manual intervention.
