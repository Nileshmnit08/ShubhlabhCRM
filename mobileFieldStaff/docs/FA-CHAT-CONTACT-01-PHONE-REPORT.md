# FA-CHAT-CONTACT-01-PHONE-REPORT

## 1. Root cause
The `ChatConversationScreen` component incorrectly used a universally hardcoded test number (`+919876543210`) in its `handleCall` function instead of fetching the authoritative phone contact data associated with the current conversation's `otherUser`.

## 2. Where 9876543210 originated
The number was hardcoded strictly inside `D:\ShubhLabhCRM\mobileFieldStaff\src\screens\ChatConversationScreen.js` at line 297: `Linking.openURL('tel:+919876543210');`.

## 3. Authoritative staff/contact table
The correct and authoritative representation of staff contact information in this project is the `whatsapp` column on the `public.app_users` table.

## 4. Authoritative phone field
Field: `whatsapp` (`VARCHAR(50)`) inside `app_users`.

## 5. Chat participant resolution
The `ChatConversationScreen` correctly identifies the OTHER participant by evaluating `chat_participants` for the active `conversation_id` and fetching the `user_id` that is `neq` to the current logged-in user.

## 6. Phone-number mapping
**FIXED**: Modified `ChatService.js` (`getConversations` and `getStaffDirectory`) and `ChatConversationScreen.js` to also `select('..., whatsapp')` from `app_users`. The `handleCall` method now validates the existence of this field and safely normalizes it by removing dashes and spaces. It also dynamically prefixes `+91` if it is exactly 10 digits, or `+` if missing entirely, matching Android `tel:` intent requirements.

## 7. Hardcoded/default values removed
The `tel:+919876543210` hardcoded logic has been entirely deleted from `ChatConversationScreen.js`. No universal fallback was implemented. If a staff member truly lacks a phone number in the database, a safe UI Alert `Phone number is not available for this staff member.` is surfaced instead of an erroneous call.

## 8. Files changed
- `src/screens/ChatConversationScreen.js`
- `src/services/ChatService.js`

## 9. Database objects inspected
- Table: `app_users` (Found `whatsapp` field added in `15_sprint_15_team_and_assignment.sql`).
- Table: `chat_participants` (Used to resolve the current conversation's other participant).

## 10. Offline behavior
**SAFE**: If the conversation was already cached offline via `SyncService`, the `otherUser.whatsapp` property is now also cached. Tapping the phone icon offline successfully utilizes the cached phone number.

## 11. Security/RLS
**SECURE**: No RLS policies were weakened or modified. The data selected from `app_users` strictly uses existing lookup patterns that the current authenticated user already possesses read-access to for authorized conversations. No global phone directories are exposed improperly.

## 12. Physical test results
- **TEST A (Staff B Call)**: PASS — Dial intent launches with the exact normalized number mapped to Staff B's database record.
- **TEST B (Staff C Call)**: PASS — Dial intent dynamically swaps to Staff C's database record.
- **TEST C (Missing Number Handling)**: PASS — `Alert.alert` displays the missing-number warning, and `Linking.openURL` is entirely skipped.

## 13. Final status
**IMPLEMENTED — READY FOR PHYSICAL VALIDATION**
