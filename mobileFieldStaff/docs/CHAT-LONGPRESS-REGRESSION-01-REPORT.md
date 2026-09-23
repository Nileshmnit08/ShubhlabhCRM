# Root Cause Analysis: CHAT-LONGPRESS-REGRESSION-01

## 1. Identified Regression
The long-press gesture was completely unresponsive in the live physical build following the FIX-02 regression stabilization sprint.

## 2. Technical Root Causes (Dual Failure)

### Failure A: Animated.View Race Condition in BottomSheet
During FIX-02, the React Native <Modal> was replaced with an Animated.View inside BottomSheetFoundation. The component initialized its local visibility state via useState(visible).
When the user long-pressed a message, ChatConversationScreen successfully updated actionSheetVisible=true. However, because BottomSheetFoundation was already mounted as null (since visible was initially false), the useState hook ignored the new prop. The useEffect hook did catch the prop change and queued a state update to flip mounted=true, but simultaneously fired Animated.timing().start().
Result: The native driver attempted to start a hardware animation on a View that had not yet mounted natively, causing the bottom sheet to fail silently and never visibly appear.

### Failure B: Android FlatList Touch Interception
During FIX-02, the MessageBubble was extracted into a memoized component. On Android devices, TouchableOpacity nested deeply within an inverted FlatList is known to have its gesture recognition prematurely cancelled by the scroll view's pan handler before the default 500ms long-press delay fires.

## 3. The Fix
1. Synchronous Mounting: Added a synchronous derived-state check in BottomSheetFoundation to ensure mounted=true in the exact same render cycle that visible becomes true. This guarantees the Animated.View exists natively before the useEffect animation fires.
2. Gesture Prioritization: Added delayLongPress={250} to the MessageBubble's TouchableOpacity. This accelerates the long-press threshold so that it reliably beats the scroll interceptor.

## 4. Test Matrix Status
- Pending physical verification.
