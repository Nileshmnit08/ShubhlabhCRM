# FA-NOTIFY-02: Android System Push Notifications

## IMPLEMENTATION SUMMARY
The Android System Push Notifications feature has been fully coded on both the mobile app and the backend. It integrates `expo-notifications`, stores native FCM device tokens in Supabase, and uses a new Edge Function to securely trigger FCM HTTP v1 API requests.

The exact conversation deep-link routing reuses the robust `NotificationRouter.js` logic already present in the app. Duplicate foreground system notifications are suppressed.

**However, the feature is blocked from physical testing because no Firebase project configuration (`google-services.json`) exists in the repository, and the Edge Function requires Firebase Admin secrets.**

## ARCHITECTURE
*   **Token Storage:** `device_push_tokens` table in Supabase links `auth.users(id)` to native FCM tokens.
*   **App Registration:** `PushTokenService.js` fetches native Android device tokens (`getDevicePushTokenAsync`) and saves them to the DB on app load.
*   **Deep-Link Routing:** `NotificationContext.js` uses `expo-notifications` listeners to parse tapped notification payloads (containing `conversation_id`), creates a simulated `crm_notifications` object, and delegates to the existing `handleNotificationPress()` logic.
*   **Server Sender:** Supabase Edge Function `send-fcm-notification` is triggered by a DB webhook on `crm_notifications` INSERT. It fetches the user's active tokens and sends the push securely via the FCM HTTP v1 API (using a generated JWT from service account credentials).

## FILES CHANGED
- `[MODIFY]` `package.json` (installed expo-notifications)
- `[MODIFY]` `app.json` (added expo-notifications plugin & googleServicesFile path)
- `[MODIFY]` `src/context/NotificationContext.js` (integrated foreground/background response listeners)
- `[NEW]` `src/services/PushTokenService.js` (token registration logic)
- `[NEW]` `supabase/migrations/20260923044626_create_device_push_tokens.sql` (DB schema for tokens)
- `[NEW]` `supabase/functions/send-fcm-notification/index.ts` (Edge Function for FCM delivery)

## DEPENDENCIES
- `expo-notifications` (via `npx expo install expo-notifications` for SDK 57 compatibility)

## DATABASE / SUPABASE CHANGES
- New table `device_push_tokens` (with RLS policies and cascading deletes).
- New Edge Function `send-fcm-notification`.
- *(Pending Action)* Database Webhook required to trigger the function on `crm_notifications` INSERT.

## FCM CONFIGURATION (ACTION REQUIRED)
> [!CAUTION]
> **FIREBASE SETUP REQUIRED BY PRODUCT OWNER**
> To complete the feature and enable physical testing, you must:
> 
> 1. Create a Firebase project and register `com.shubhlabh.fieldassistant`.
> 2. Download `google-services.json` and save it to `D:\ShubhLabhCRM\mobileFieldStaff\android\app\google-services.json`.
> 3. Generate a Firebase Admin Service Account JSON key.
> 4. Set the following Supabase Edge Function secrets using the Supabase CLI:
>    - `FIREBASE_PROJECT_ID`
>    - `FIREBASE_CLIENT_EMAIL`
>    - `FIREBASE_PRIVATE_KEY`
> 5. Create a Supabase Database Webhook to trigger `send-fcm-notification` on `crm_notifications` table `INSERT`.
> 6. Build a **NEW APK** after `google-services.json` is added to the project.

## NOTIFICATION PAYLOAD
The payload sent by the Edge Function to FCM includes:
```json
"data": {
  "type": "chat_message",
  "conversation_id": "<conversation UUID>",
  "notification_id": "<notification UUID>"
}
```

## DEEP-LINK FLOW
Foreground, Background, and Cold-Start taps are all intercepted by `Notifications.addNotificationResponseReceivedListener` or `Notifications.getLastNotificationResponseAsync`. The payload `conversation_id` is extracted and routed directly via `navigate('ChatConversation', { conversationId })`.

## SECURITY CHECK
- ✅ Supabase RLS is enforced on `device_push_tokens`.
- ✅ The Edge Function handles FCM keys securely on the server-side.
- ✅ **NO** server secrets (service-role key, Firebase admin JSON) are bundled in the mobile app.
- ✅ The `google-services.json` (once added) only contains safe public identifiers for FCM client registration.

## BUILD RESULT
Code changes are complete, but a final standalone Android build requires `google-services.json` to exist at the specified path. Building without it will fail the Google Services Gradle plugin step.

## PHYSICAL TEST RESULT
Not performed. Blocked by missing Firebase configuration.

## REPORT
`D:\ShubhLabhCRM\mobileFieldStaff\docs\FA-NOTIFY-02-REPORT.md` (Contents identical to this artifact)

## FINAL STATUS
**BLOCKED — REQUIRES EXTERNAL CONFIGURATION/ACTION**
