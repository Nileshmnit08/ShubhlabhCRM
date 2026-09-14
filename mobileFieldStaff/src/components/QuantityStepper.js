import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, touchTargets, rounded } from '../theme/tokens';

export function QuantityStepper({ value, onChange, min = 0, max = 999 }) {
  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={[styles.button, value <= min && styles.disabled]} 
        onPress={handleDecrement}
        disabled={value <= min}
      >
        <MaterialIcons name="remove" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      
      <View style={styles.valueContainer}>
        <Text style={styles.valueText}>{value}</Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, value >= max && styles.disabled]} 
        onPress={handleIncrement}
        disabled={value >= max}
      >
        <MaterialIcons name="add" size={24} color={colors.onSurface} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.default,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
  },
  button: {
    width: touchTargets.stepper,
    height: touchTargets.stepper,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
  },
  disabled: {
    opacity: 0.3,
  },
  valueContainer: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  valueText: {
    ...typography.headlineMd,
    fontVariant: ['tabular-nums'],
    color: colors.onSurface,
  }
});
