# Completion Report: CRM-PUSH-01 - CRM to Field Assistant Push Architecture Audit

## 1. Objective
Design and audit a secure architecture for sending Push Notifications from the Shubh Labh CRM (Sender) to the Shubh Labh Field Assistant mobile app (Receiver) when a task/visit is assigned, strictly adhering to a ₹0 budget constraint.

## 2. CRM Architecture
The CRM already possesses a robust, authoritative `crm_notifications` table (schema: `user_id`, `notification_type`, `title`, `message`, `link_url`, `is_read`). This serves well as the persistent truth for all notifications.

## 3. Field Assistant Architecture
The mobile application currently uses `InAppNotificationService.js` to pull notifications from `crm_notifications` into local `AsyncStorage`. It works as a polling/sync mechanism while the app is actively used, but lacks any native push integration to wake up the app.

## 4. Authentication Mapping
Both the CRM and Field Assistant use the same authoritative Supabase Auth identity (`auth.users.id` maps directly to `app_users.id`). The recipient architecture is already perfectly aligned.

## 5. Existing Notification Architecture
Currently, notifications are strictly **In-App**. They are only delivered when the user actively opens the app and `SyncService` pulls from the backend. 

## 6. Previous FA-12 Findings
All traces of the previous push architecture have been thoroughly removed. There are no leftover `push_token` tables, no `expo-notifications` or `expo-device` dependencies in `package.json`, and no stale push credentials. The slate is entirely clean.

## 7. Task Assignment Architecture
The CRM properly maps assignments using `assigned_owner_id`. We do not need a new mobile task database. The authoritative CRM queue remains the single source of truth.

## 8. Daily Task Architecture
Daily summary notifications (e.g., "You have been assigned 5 tasks for today") can be cleanly driven by querying the existing `v_salesperson_work_queue` view via a scheduled server-side job (pg_cron or Supabase scheduled Edge Function) without duplicating data.

## 9. Recipient Architecture
The recipient is safely identified via their permanent `auth.users.id`. There is no reliance on fragile identifiers like names or phone numbers.

## 10. Device/Token Architecture
**MISSING.** Currently, there is no mapping between a Field Staff user and their mobile device. A new table (e.g., `user_devices` or `push_tokens`) will be required to map `user_id` to their unique Android FCM/Expo push token.

## 11. Push Delivery Architecture
**MISSING.** To deliver a push notification to a device, the system requires a bridge between a database insert (in `crm_notifications`) and the external push network. This requires a Supabase Edge Function (or Database Webhook) holding a secure private key.

## 12. Open-App Behaviour
When the app is open, the existing `InAppNotificationService` combined with local state updates works perfectly. It can be easily enhanced to intercept incoming push payloads and refresh the local list seamlessly.

## 13. Background-App Behaviour
**FAILS CURRENTLY.** The Android OS aggressively pauses background network activity. Without an external push provider, the app cannot be woken up to show a system-tray notification.

## 14. Terminated-App Behaviour
**FAILS CURRENTLY.** Similar to background behavior, a fully closed app requires an OS-level integration (like FCM) to display a notification on the lock screen or notification tray.

## 15. Deep-Link Architecture
The `crm_notifications` table already supports a `link_url` field, and `NotificationBell.jsx` currently navigates based on it. We can reuse this field to pass deep-link paths (e.g., `/my-work`) directly inside the push notification payload.

## 16. Read/Unread Architecture
The `is_read` column in `crm_notifications` already successfully tracks the unread state. Clicking a push notification simply needs to trigger the existing `markAsRead` function in `InAppNotificationService.js`. No duplicate system is needed.

## 17. Security Architecture
The `crm_notifications` table is secured with strictly enforced Row Level Security (RLS). A server-side mechanism (Edge Function) can securely dispatch notifications without exposing any private push secrets or `service_role` keys to the CRM frontend or the mobile client.

## 18. Admin Authorization
Admin authorization is securely isolated to the CRM. When an Admin assigns a task, a secure database trigger/webhook can automatically generate the push event. The frontend never initiates the push directly.

## 19. ₹0 Feasibility
**Feasible.** True remote push delivery to a terminated Android application explicitly requires an external provider like **Firebase Cloud Messaging (FCM)**. Fortunately, FCM is entirely **free** and does not require a credit card. Expo's Push service wraps FCM and is also free for standard volumes.

## 20. Required Components
To implement this securely, we require:
1. `expo-notifications` and `expo-device` on the mobile app.
2. A `push_tokens` table in the Supabase database.
3. A Supabase Edge Function to securely call the FCM/Expo API.
4. A Database Webhook/Trigger on `crm_notifications` to invoke the Edge Function.

## 21. Risks
Android OEM battery optimizations (common in Xiaomi, Oppo, Vivo) often suppress background push notifications unless the user explicitly grants the app "Autostart" or "Unrestricted Battery" permissions.

## 22. Known Limitations
Push notifications do not replace offline sync. If the device is offline, it will not receive the push, but the assignment remains safe in the CRM backend.

## 23. Recommended Implementation Sequence
1. Install and configure `expo-notifications` (Mobile).
2. Create the `push_tokens` table (Database).
3. Implement secure device token registration on login (Mobile).
4. Create the Supabase Edge Function for secure dispatch (Backend).
5. Add DB triggers to intercept task assignments and `crm_notifications` inserts (Database).

## 24. Files Changed
None (Audit Only)

## 25. Database Changes
None (Audit Only)

## 26. Dependency Changes
None (Audit Only)

## 27. Native Changes
None (Audit Only)

## 28. Final Classification
**C. EXTERNAL PUSH SERVICE REQUIRED**

*An external push service (FCM/Expo) is strictly required to wake a backgrounded/terminated Android application. Since FCM is free, it satisfies the ₹0 budget constraint, but implementation is blocked pending explicit Product Owner approval to introduce this external service.*
