import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function DateSelectorWrapper({ label, value, onPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={onPress}>
        <Text style={styles.value}>{value || 'Select Date'}</Text>
        <MaterialIcons name="calendar-today" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

export function TimeSelectorWrapper({ label, value, onPress }) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.field} onPress={onPress}>
        <Text style={styles.value}>{value || 'Select Time'}</Text>
        <MaterialIcons name="access-time" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },
  field: {
    flexDirection: 'row',
    height: 48, // Fat finger safe
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: rounded.default,
    alignItems: 'center',
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  value: {
    ...typography.bodyLg,
    color: colors.onSurface,
  }
});
