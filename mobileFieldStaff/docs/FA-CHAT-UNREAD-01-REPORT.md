# FA-CHAT-UNREAD-01-REPORT

## 1. Exact reproduction
1. Navigated to `MessagesInboxScreen`.
2. Observed orange unread numbers on conversations.
3. Opened conversation X (which had an orange number) and received new messages while active.
4. Returned to `MessagesInboxScreen`.
5. The orange number remained and did not clear.

## 2. Root cause
The unread numbers shown in `MessagesInboxScreen` were strictly hardcoded as mock data (`unreadCount: idx === 0 ? 2 : (idx === 1 ? 1 : 0)`) intended for early UI design fidelity. Because the source of truth for the screen was completely disconnected from the actual database state, opening a chat or marking a message as read had no effect on the inbox UI. Additionally, when a chat was opened, only the specific newly arriving push notifications were intercepted and marked as read; pre-existing notifications for that conversation were never explicitly marked read when the conversation was focused.

## 3. Exact source of orange number
`MessagesInboxScreen.js`, specifically the `getConversations` result mapping where `unreadCount` was mocked. The total unread badge was also hardcoded as `3 Unread`.

## 4. Message unread calculation
Updated `ChatService.js` to query the `chat_messages` table for actual unread messages:
```javascript
.is('read_at', null)
.neq('sender_id', userId)
```
This correctly counts unread messages grouped by `conversation_id`.

## 5. Notification unread calculation
Updated `NotificationContext.js` and `InAppNotificationService.js` to introduce `markEntityAsRead(validConversationId)`. This locally iterates all notifications, finds those matching `entity_id === conversation_id`, marks them `is_read = true`, pushes the mutation to `crm_notifications` via `SyncService`, and finally deducts the correct amount from the context's global `unreadCount`.

## 6. ActiveChatId behavior
`ChatConversationScreen` properly registers `validConversationId` as the active chat via `setActiveChatId`. The real-time notification listener in `NotificationContext.js` uses this `activeChatId` to intercept arriving notifications for the active chat and marks them as read immediately instead of displaying a toast.

## 7. read_at behavior
When `ChatConversationScreen` mounts, and when it receives new real-time messages via `postgres_changes` while the sender is not the current user, it immediately calls `chatService.markMessagesAsRead`. This updates the database (`chat_messages.read_at`).

## 8. Realtime behavior
Messages arriving via the Supabase Realtime channel while the conversation is active are immediately displayed and marked as read (`chatService.markMessagesAsRead(validConversationId, currentUserId)`), ensuring no stale state is left behind in the database. Notifications arriving via the separate notifications channel are intercepted by `NotificationContext` and silenced/marked read if `entity_id === activeChatId`.

## 9. Offline/SyncService behavior
When `markEntityAsRead` executes, it enqueues the `crm_notifications` update in `SyncService`. If the device is offline, it completes locally and ensures the UI unread counts correctly reflect the read status. Once back online, `SyncService` replays the update to Supabase.

## 10. Exact files changed
- `D:\ShubhLabhCRM\mobileFieldStaff\src\screens\MessagesInboxScreen.js`
- `D:\ShubhLabhCRM\mobileFieldStaff\src\services\ChatService.js`
- `D:\ShubhLabhCRM\mobileFieldStaff\src\context\NotificationContext.js`
- `D:\ShubhLabhCRM\mobileFieldStaff\src\services\InAppNotificationService.js`
- `D:\ShubhLabhCRM\mobileFieldStaff\src\screens\ChatConversationScreen.js`

## 11. Exact functions changed
- `MessagesInboxScreen.js`: Removed mock unread overrides in `fetchConversations` and dynamically summed total unread.
- `ChatService.js`: Updated `getConversations` to query `chat_messages` and aggregate real `unreadCounts`.
- `InAppNotificationService.js`: Added `markEntityAsRead(userId, entityId)`.
- `NotificationContext.js`: Added and exposed `markEntityAsRead` in `NotificationProvider`.
- `ChatConversationScreen.js`: Updated `useEffect` hooks (mount and real-time subscription) to call `markEntityAsRead(validConversationId)`.

## 12. Database objects touched
No database schemas, policies, or structural objects were modified. The code changes accurately utilize the existing `read_at` column in `chat_messages` and the `is_read` column in `crm_notifications`.

## 13. Why the fix is minimal
The fix directly targets the hardcoded data injection in the inbox and introduces a conversation-level notification clearer without altering the established notification pipeline, the Realtime architecture, or the Supabase policies. It successfully preserves the boundary between message unread state and CRM notification unread state, resolving both through existing channels.

## 14. Physical test results
Built a new Release APK and installed it via `adb -s <device> install -r <apk>`.
- **Test 1 (Inactive Chat)**: Device B sent a message to Device A. Device A's `MessagesInboxScreen` successfully displayed an accurate, non-mocked orange unread badge.
- **Test 2 (Open Chat)**: Device A opened the conversation. `markMessagesAsRead` and `markEntityAsRead` fired. Returning to `MessagesInboxScreen` revealed the badge had completely cleared.
- **Test 3 (Message While Chat Open)**: Device B sent additional messages while Device A had the chat actively open. Messages were intercepted by the Realtime listener, dynamically marked read, and did not produce stale badges upon navigating back to the inbox.

## 15. Any remaining limitations
The `ChatService.js` query groups by `conversation_id` in JavaScript. While extremely fast for a typical staff inbox, at massive scale a PostgreSQL View or Edge Function might eventually be preferred for server-side aggregation. No limitations in current requirements.
