import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, touchTargets, rounded, elevation } from '../theme/tokens';

export function FAB({ icon = 'add', onPress }) {
  return (
    <TouchableOpacity 
      style={[styles.fab, elevation.level3]} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <MaterialIcons name={icon} size={28} color={colors.onPrimary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: rounded.lg, // 16px squircle
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  }
});
