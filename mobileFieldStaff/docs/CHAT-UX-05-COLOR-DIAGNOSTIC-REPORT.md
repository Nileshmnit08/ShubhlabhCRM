# CHAT-UX-05 — Color-Boundary Diagnostic & Composer Fix Report

## 1. Actual JSX Hierarchy

```
KeyboardAvoidingView (styles.container — flex: 1)
 ├── View (topStickyHeader — Header)
 ├── FlatList (style={{ flex: 1 }} — Message List)
 └── View (inputContainer — Composer)
      ├── View (inputWrapper)
      │    └── TextInput
      ├── TouchableOpacity (micBtn — Mic/Voice)
      └── TouchableOpacity (sendBtn — Send)
```

Hierarchy is Type **B** (all three children are direct children of the KAV root).

## 2. Composer Parent

The Composer (`inputContainer`) is a direct sibling of the `FlatList` inside `KeyboardAvoidingView`. No nesting issue.

## 3. Composer Layout Dimensions (Keyboard Closed/Open)

**Before fix**: KAV `behavior={undefined}` → KAV did nothing on Android → keyboard overlaid the window → Composer layout remained at the bottom of the full-height window but physically hidden behind the keyboard.

**After fix**: KAV `behavior="padding"` → KAV actively applies `paddingBottom` equal to keyboard height → entire content shifts up → Composer is fully visible above keyboard.

## 4. Message List Dimensions (Keyboard Closed/Open)

With `style={{ flex: 1 }}` on the FlatList and `behavior="padding"` on KAV:
- Keyboard closed: FlatList fills available space between header and composer.
- Keyboard open: KAV shrinks available space via padding; FlatList flexibly shrinks to accommodate.

## 5. Actual Root Cause

**`KeyboardAvoidingView` with `behavior={undefined}` is a no-op on Android.**

The manifest had `windowSoftInputMode="adjustResize"`, but on modern Android with edge-to-edge rendering (React Native 0.73+ default), the OS ignores `adjustResize` and the keyboard simply overlays the window. Because `behavior` was `undefined`, KAV never applied any compensation — the keyboard overlaid the full window height, physically hiding the Composer behind it.

**Physical proof**: Debug colors showed:
- 🔵 Blue Header — visible
- 🟢 Green FlatList — extended continuously to keyboard top edge
- 🟡 Yellow Composer — invisible (hidden behind keyboard)
- 🔴 Red Root — NOT shrinking (adjustResize not working)

## 6. Files Changed

- `src/screens/ChatConversationScreen.js`
  - Changed `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` → `behavior="padding"` (applies to both platforms)
  - Added `style={{ flex: 1 }}` to FlatList (structural constraint)
  - Added `micBtn` style for the voice/mic button
  - Removed all debug borders, debug backgrounds, and `onLayout` console logging

## 7. Android Configuration Changes

None. `android/app/src/main/AndroidManifest.xml` was not modified. The fix is purely JS-layer — using KAV active padding instead of relying on OS window resize.

## 8. Physical Device Tested

- Device Serial: `e0d9da95`

## 9. APK Build Result

- **Debug APK** (with color borders): BUILD SUCCESSFUL ✅ — Installed, physically confirmed 🟡 Yellow Composer visible above keyboard
- **Production APK** (debug code removed): BUILD SUCCESSFUL ✅ — Installed on `e0d9da95`

## 10. Physical Test Results

| Test | Result |
|---|---|
| Composer visible with keyboard closed | ✅ PASS |
| Composer visible with keyboard open (yellow border confirmed) | ✅ PASS — Physically verified |
| Typed text visible in TextInput | ✅ PASS |
| Send button fully visible above keyboard | ✅ PASS |
| Mic/Voice button visible above keyboard | ✅ PASS |
| Send tappable without dismissing keyboard | ✅ PASS |
| Message list shrinks correctly | ✅ PASS |
| Newest message remains at bottom | ✅ PASS |
| Debug borders removed in production APK | ✅ CONFIRMED |

## 11. Chat Architecture Untouched

**Confirmed**: Zero changes to Supabase schema, `chat_messages`, `chat_conversations`, `chat_participants`, `SyncService`, UUID handling, offline queue, Realtime subscriptions, notification logic, or authentication. This was a UI/layout/keyboard-handling-only fix.

## 12. Final Status

**PASS — PHYSICALLY VALIDATED**
