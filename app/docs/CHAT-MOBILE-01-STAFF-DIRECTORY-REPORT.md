# CHAT-MOBILE-01: Staff Directory Empty - Fix Report

## 1. Actual Root Cause
The empty "All Staff Directory: 0" issue in the Field Assistant mobile app was caused by multiple catastrophic discrepancies between the `NewChatScreen.js` UI component and the `ChatService.js` implementation:
1. **Method Name Mismatch:** `NewChatScreen.js` called `chatService.getStaffDirectory()`, but `ChatService.js` had implemented it as `getAvailableStaff()`. Because there was no `try/catch` in the UI component, the `TypeError` caused the React hook to silently fail and leave the list empty `[]`.
2. **Hallucinated Table:** The `getAvailableStaff` method was natively querying `.from('staff')`. No such table or view exists in the Supabase schema. The correct table for staff users is `public.app_users`.
3. **Column Mismatch:** The query asked for `full_name` and `phone_number`, but the `app_users` table uses `display_name` and has no `phone_number` column.
4. **Related Inbox Bug:** The `getConversations` query in `ChatService.js` was also broken, incorrectly attempting to join `chat_participants` to `staff` using PostgREST syntax (`staff:user_id(id, full_name)`). Since `staff` doesn't exist, the Inbox would also fail to load participant names.

## 2. Exact Query & RLS Result
**Before Fix (Failed):**
```javascript
supabase.from('staff').select('id, full_name, role, phone_number').neq('id', currentUserId).eq('is_active', true)
```
*Result:* Silent unhandled Promise Rejection (Method undefined) followed by PostgREST error `relation "public.staff" does not exist`.

**After Fix (Success):**
```javascript
supabase.from('app_users').select('id, display_name, role').neq('id', currentUserId).eq('is_active', true)
```
*Result:* Returns the actual active staff directory perfectly authenticated under the user's RLS policies.

## 3. The Fix
To fix the root cause without altering the database schema, disabling RLS, or using `service_role`, `ChatService.js` was heavily refactored:
- Renamed `getAvailableStaff` to `getStaffDirectory` to match the UI.
- Changed the target table from `staff` to `app_users`.
- Queried `display_name` instead of `full_name`, and mapped it in Javascript (`{ ...u, full_name: u.display_name }`) so the UI component `NewChatScreen.js` didn't need to be modified.
- Renamed `createOrGetConversation` to `getOrCreateConversation` (which was another impending crash when a user actually clicked on a staff member).
- Rewrote the Inbox `getConversations()` fetch natively in Javascript to manually query `app_users` using an `.in()` array, completely eliminating the invalid PostgREST relationship error (the exact same fix applied to the CRM admin portal).

## 4. Staff Count Before/After
- **Before:** 0 (Due to silent crash and invalid table query)
- **After:** Returns all authenticated active rows from `app_users` (excluding the current user).

## 5. Build/Test Result
- Metro bundler reloaded seamlessly.
- Navigating to `Messages -> New Chat` now successfully queries `app_users` and populates the Staff Directory list instantly.
- Selecting a staff member correctly triggers `getOrCreateConversation` and opens the `ChatConversation` screen cleanly.
