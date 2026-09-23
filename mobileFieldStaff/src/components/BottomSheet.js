import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  BackHandler,
  Keyboard,
  Dimensions,
} from 'react-native';
import { colors, rounded, elevation } from '../theme/tokens';

const { height: screenHeight } = Dimensions.get('window');

export function BottomSheetFoundation({
  children,
  visible,
  onClose,
  height = '50%',
}) {
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Synchronously update mounted state if visible becomes true
  if (visible && !mounted) {
    setMounted(true);
  }

  // Handle Hardware Back Button
  useEffect(() => {
    if (visible) {
      const backAction = () => {
        onClose();
        return true; // Intercept
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [visible, onClose]);

  // Handle Animation Lifecycle
  useEffect(() => {
    if (visible) {
      setMounted(true);
      // Dismiss keyboard when sheet opens
      Keyboard.dismiss();

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: screenHeight,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setMounted(false);
      });
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  return (
    <View style={[styles.overlay, !mounted && { display: 'none' }]}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>
      
      <Animated.View
        style={[
          styles.container,
          elevation.level3,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <View style={styles.dragPillContainer}>
          <View style={styles.dragPill} />
        </View>
        <View style={styles.content}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999, // Ensure it sits on top of everything
    elevation: 9999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    paddingBottom: 24,
    minHeight: 200,
  },
  dragPillContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
  },
  content: {
    paddingHorizontal: 16,
  },
});
