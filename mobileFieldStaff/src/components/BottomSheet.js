import React from 'react';
import { View, StyleSheet, Text, Modal, TouchableWithoutFeedback, Animated } from 'react-native';
import { colors, rounded, elevation } from '../theme/tokens';

export function BottomSheetFoundation({ children, visible, onClose, height = '40%' }) {
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={[styles.container, elevation.level3, { height }]}>
          <View style={styles.dragPillContainer}>
            <View style={styles.dragPill} />
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: rounded.lg,
    borderTopRightRadius: rounded.lg,
    paddingBottom: 24,
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
    flex: 1,
    paddingHorizontal: 16,
  }
});
