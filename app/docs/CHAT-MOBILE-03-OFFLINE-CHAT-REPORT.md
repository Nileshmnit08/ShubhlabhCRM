# CHAT-MOBILE-03: Offline Chat Architecture Report

## 1. Root Cause of Start Chat Doing Nothing
Previously, when the device was completely offline, `getOrCreateConversation()` in `ChatService` would attempt a Supabase query to find or create a conversation. This query would silently fail or return an error due to the lack of network connectivity. `NewChatScreen` correctly trapped this error and closed the modal, but because there was no fallback, the UI appeared to do nothing and the chat screen never opened.

## 2. Files Changed
- `mobileFieldStaff/src/services/ChatService.js`
- `mobileFieldStaff/src/screens/ChatConversationScreen.js`
- (Verified `NewChatScreen.js` required no changes due to seamless backend API compatibility).

## 3. Offline Storage & Queue Implementation
- **AsyncStorage Cache:** Added `@chat_conversations_{userId}` cache in `ChatService`. When online, conversations are cached locally.
- **Offline Conversation Generation:** If offline, `getOrCreateConversation` immediately generates a deterministic UUID on the client and enqueues the creation of `chat_conversations` and `chat_participants` into `SyncService`. It returns this UUID instantly, allowing `NewChatScreen` to navigate seamlessly.
- **Message Queuing:** `sendMessage` was refactored to use `SyncService.enqueueOperation`. It enqueues both the `chat_messages` insert and the `crm_notifications` insert.
- **Restart Hydration:** `getMessages` was upgraded to independently fetch pending messages from the `SyncService` queue and inject them into the retrieved Supabase data, ensuring that offline messages persist across app cold starts.

## 4. Supabase Tables Used
- `chat_conversations`
- `chat_participants`
- `chat_messages`
- `crm_notifications`

## 5. Sync/Idempotency Behavior
- **Message Idempotency:** The client generates a `tempId` (UUID) upon pressing "Send". This ID is passed to `SyncService`. If the SyncService retries, it uses the exact same `tempId`. Supabase will seamlessly accept this insert, or reject duplicates safely.
- **Websocket Reconciliation:** When `SyncService` successfully pushes the pending message to the server, Supabase broadcasts an `INSERT` websocket event back to the device. `ChatConversationScreen` catches this event, maps it to the existing `tempId`, and flips `pending: false`, turning the clock icon into a checkmark.
- **Duplicate Conversations:** Because we enqueue `chat_conversations` with a client-generated UUID, the backend safely accepts it. It acts as an idempotent append-only operation.

## 6. Online/Offline Test Results
- **A. Online:** Works instantly; message sent to Supabase natively.
- **B. Offline:** "Start Chat" opens immediately. Messages appear instantly with a "clock" (pending) icon. No crashes or silent drops.
- **C. Reconnect:** Restoring connection triggers `SyncService` loop; the message syncs to Supabase and the icon changes to a checkmark (`sent`).
- **D. Restart:** Force-closing the app while offline and reopening it perfectly retains the `pending` message due to queue hydration.

## 7. Build Result
- Release APK successfully compiled and pushed via ADB. 

## 8. Final Status
- **COMPLETED**. The chat module is now a fully capable Offline-First system.
