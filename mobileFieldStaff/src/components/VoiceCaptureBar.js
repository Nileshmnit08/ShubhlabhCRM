import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';

export function VoiceCaptureBar({ onPress, placeholder = "Tap to speak Hindi / Hinglish order" }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.container, elevation.level2]}>
      <TouchableOpacity style={styles.fab} onPress={onPress}>
        <MaterialIcons name="mic" size={28} color={colors.onPrimary} />
      </TouchableOpacity>
      <View style={styles.textContainer}>
        <Text style={typography.labelLg}>Voice Fast Capture</Text>
        <Text style={[typography.bodyMd, { color: colors.onSurfaceVariant }]}>{placeholder}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={24} color={colors.onSurfaceVariant} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    margin: 16,
    padding: 12,
    borderRadius: rounded.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  fab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  }
});
