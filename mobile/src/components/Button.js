import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', // 'primary', 'secondary', 'danger', 'outline', 'ghost'
  loading = false, 
  disabled = false,
  icon: Icon,
  style,
  textStyle,
}) {
  const getColors = () => {
    switch (variant) {
      case 'secondary': 
        return { bg: theme.colors.secondary, text: theme.colors.onSecondary };
      case 'danger': 
        return { bg: theme.colors.error, text: theme.colors.onError };
      case 'outline':
        return { bg: 'transparent', text: theme.colors.onSurface, border: theme.colors.outlineVariant };
      case 'ghost':
        return { bg: 'transparent', text: theme.colors.secondary };
      default: 
        return { bg: theme.colors.primary, text: theme.colors.onPrimary };
    }
  };

  const colors = getColors();

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: colors.bg },
        colors.border && { borderWidth: 1, borderColor: colors.border },
        (disabled || loading) && styles.disabled,
        style
      ]} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={colors.text} size="small" />
      ) : (
        <>
          {Icon && <Icon size={20} color={colors.text} style={styles.icon} />}
          <Text style={[styles.text, { color: colors.text }, textStyle]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    minHeight: theme.spacing['touch-target'],
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borders.radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    fontSize: theme.typography.sizes.labelLg,
    fontFamily: theme.typography.fontFamily.body,
    fontWeight: theme.typography.weights.semibold,
  },
  icon: {
    marginRight: theme.spacing.sm,
  }
});
