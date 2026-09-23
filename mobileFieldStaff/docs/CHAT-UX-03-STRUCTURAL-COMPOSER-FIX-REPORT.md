# Chat Composer Structural UX Fix Report

## 1. Previous CHAT-UX-02 Diagnosis
In the previous sprint, the bug was misdiagnosed as an Android layout offset calculation failure (e.g., `KeyboardAvoidingView` failing to compensate for the Translucent Status Bar). The attempted fix arbitrarily padded the bottom of the composer with `insets.top + 24`.

## 2. Why It Failed Physically
Physical device testing revealed that the *entire* composer was physically pushed off the bottom of the screen when the keyboard opened. The layout failure was not a tiny 24px misalignment; it was a catastrophic overflow of the parent container. The arbitrary padding only affected layout that was already hidden beneath the keyboard viewport bounds.

## 3. Actual Root Cause Discovered
The true root cause was a fundamental React Native Flexbox bug. The `<FlatList>` component rendering the messages lacked a `style={{ flex: 1 }}` constraint. 
When the Android OS native window resized to accommodate the keyboard (`adjustResize`), the root container shrunk correctly. However, the unconstrained `FlatList` attempted to consume its full content height, overflowing its bounds and physically pushing its sibling (the Composer) entirely off the screen into the unrendered area beneath the keyboard.

## 4. Final Layout Architecture
The screen now properly adheres to standard React Native Flexbox constraints:
- **Root**: `<KeyboardAvoidingView style={{ flex: 1 }}>`
- **Children**:
  - `Header` (Takes natural height)
  - `FlatList` (`style={{ flex: 1 }}`) -> Flexibly fills all remaining available space.
  - `Composer` (Takes natural height, strictly anchored to bottom).

## 5. Keyboard Handling Approach
- Retained standard `windowSoftInputMode="adjustResize"`.
- Removed all arbitrary status bar / safe area pixel hacks (`Math.max(insets.top, 24)`).
- When the keyboard is active, safe area bottom is discarded (collapsing to `10px`), because the Android keyboard completely covers the physical navigation bar. When closed, it safely honors `insets.bottom`.

## 6. Files Changed
- `src/screens/ChatConversationScreen.js`

## 7. Android Configuration Changes
None. Did not alter `app.json` or `windowSoftInputMode`. Relied purely on correct Flexbox boundaries.

## 8. Physical Device Tested
- Device Serial: `e0d9da95`

## 9. APK Build Result
- Success (`./gradlew assembleRelease` completed successfully in ~45s). The updated structural bundle has been installed natively on device `e0d9da95`.

## 10. Test Cases and Results
Ready for physical verification by the product owner:
- [ ] Keyboard Closed: Verify composer is visible.
- [ ] Tap TextInput: Verify the entire Composer cleanly shifts above the keyboard.
- [ ] Typing: Verify typed text and cursor are clearly visible.
- [ ] Multiline: Verify input expands smoothly without clipping.
- [ ] Sending: Tap Send while the keyboard is open; verify message sends immediately.
- [ ] Message List: Verify the oldest messages are at top, newest at bottom, and user is not forcibly thrown to the bottom when reading history.

## 11. Unrelated Functionality
- **Confirmed**: Chat architecture, Supabase schema, offline `SyncService`, realtime listeners, and voice-to-text functionality were **completely untouched**. The changes were strictly isolated to React Native Flexbox constraints.

## 12. Final Status
IMPLEMENTED — READY FOR PHYSICAL VALIDATION
