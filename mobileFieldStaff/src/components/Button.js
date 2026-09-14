import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, typography, touchTargets, rounded } from '../theme/tokens';

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  disabled = false, 
  loading = false,
  icon = null
}) {
  const isPrimary = variant === 'primary';
  const isDestructive = variant === 'destructive';

  const containerStyle = [
    styles.button,
    isPrimary && styles.primary,
    variant === 'secondary' && styles.secondary,
    isDestructive && styles.destructive,
    disabled && styles.disabled
  ];

  const textStyle = [
    styles.text,
    isPrimary && styles.primaryText,
    variant === 'secondary' && styles.secondaryText,
    isDestructive && styles.destructiveText,
    disabled && styles.disabledText
  ];

  return (
    <TouchableOpacity 
      style={containerStyle} 
      onPress={onPress} 
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary || isDestructive ? colors.onPrimary : colors.onSurface} />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text style={textStyle}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: touchTargets.standard, // 52px
    borderRadius: rounded.default,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: '#CBD5E1', // Structural border
  },
  destructive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  disabled: {
    opacity: 0.5,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  text: {
    ...typography.labelLg,
  },
  primaryText: {
    color: colors.onPrimary,
  },
  secondaryText: {
    color: colors.tertiary, // Deep Navy Slate
  },
  destructiveText: {
    color: colors.error,
  },
  disabledText: {
    // Disabled text inherits the color but the container is 0.5 opacity
  },
});
