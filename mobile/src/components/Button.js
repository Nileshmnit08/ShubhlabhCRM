import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export default function Button({ 
  title, 
  onPress, 
  variant = 'primary', // 'primary', 'secondary', 'danger'
  loading = false, 
  disabled = false,
  icon: Icon,
  style
}) {
  const getBackgroundColor = () => {
    switch (variant) {
      case 'secondary': return theme.colors.secondary;
      case 'danger': return theme.colors.danger;
      default: return theme.colors.primary;
    }
  };

  return (
    <TouchableOpacity 
      style={[
        styles.button, 
        { backgroundColor: getBackgroundColor() },
        (disabled || loading) && styles.disabled,
        style
      ]} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <>
          {Icon && <Icon size={18} color="#fff" style={styles.icon} />}
          <Text style={styles.text}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borders.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    color: '#fff',
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
  },
  icon: {
    marginRight: theme.spacing.sm,
  }
});
