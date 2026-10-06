import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export const SLButton = ({ 
  title, 
  onPress, 
  variant = 'primary', // primary, secondary, outline
  disabled = false,
  loading = false,
  style,
  textStyle 
}) => {
  const getBackgroundColor = () => {
    if (disabled) return theme.colors.disabled;
    if (variant === 'primary') return theme.colors.primary;
    if (variant === 'secondary') return theme.colors.surface;
    if (variant === 'danger') return theme.colors.error;
    return 'transparent';
  };

  const getTextColor = () => {
    if (disabled) return theme.colors.textSecondary;
    if (variant === 'outline') return theme.colors.primary;
    if (variant === 'secondary') return theme.colors.primary;
    return theme.colors.white;
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: getBackgroundColor() },
        variant === 'outline' && styles.outline,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 56, // 56dp for primary CTAs per Stitch
    borderRadius: theme.radius.button,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    width: '100%',
  },
  outline: {
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  text: {
    ...theme.typography.button,
  },
});

export default SLButton;
