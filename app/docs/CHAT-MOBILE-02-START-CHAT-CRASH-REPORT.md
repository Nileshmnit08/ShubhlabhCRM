# CHAT-MOBILE-02: Start Chat App Crash - Fix Report

## 1. Exact Error Captured
By extracting the crash dump directly from the Android device using `adb logcat -d -b crash`, the following fatal error was identified:
```
09-21 13:22:10.729 E AndroidRuntime: com.facebook.react.common.JavascriptException: 
ReferenceError: Property 'ActivityIndicator' doesn't exist
```

## 2. Root Cause
When the Field Assistant user selects a staff member and taps **"Start Chat"**, the `startChat()` handler triggers `setCreatingChat(true)`. 
The UI was programmed to render an `<ActivityIndicator size="small" color={colors.onPrimary} />` inside the button while the conversation is being generated on Supabase.
However, `ActivityIndicator` was **never imported** from `react-native` at the top of the file. 
When React Native attempted to render the unimported component, it immediately threw an unhandled `ReferenceError`, bypassing the `try/catch` blocks and resulting in a hard crash of the Android UI thread.

## 3. Affected File
- `mobileFieldStaff/src/screens/NewChatScreen.js`

## 4. The Fix
Added `ActivityIndicator` to the destructured `react-native` imports at the top of `NewChatScreen.js`.

## 5. Supabase Result
With the infinite recursion RLS policies fixed in the previous sprint (`fix_chat_rls.sql`), the `chatService.getOrCreateConversation()` method now correctly returns the conversation ID without throwing PostgREST `42P17` errors. 
The dual-insert transaction for `chat_conversations` and `chat_participants` executes seamlessly.

## 6. Physical Android Test Result
A new standalone Release APK was built locally and pushed to the connected physical device via `adb install -r`.
- **Staff Selected:** Yes.
- **Start Chat:** The `ActivityIndicator` spins cleanly without crashing.
- **Conversation Opens:** The chat screen mounts successfully.
- **Persistence:** Messages are sent and persist identically across cold restarts.
The fix is confirmed successful on device `e0d9da95`.
