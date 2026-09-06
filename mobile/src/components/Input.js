import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Input({ label, error, style, ...props }) {
  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput 
        style={[styles.input, error && styles.inputError]} 
        placeholderTextColor={theme.colors.textMuted}
        {...props} 
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.sm,
    marginBottom: theme.spacing.xs,
    fontWeight: theme.typography.weights.medium,
  },
  input: {
    backgroundColor: theme.colors.background,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    borderRadius: theme.borders.radius.md,
    color: theme.colors.text,
    padding: theme.spacing.md,
    fontSize: theme.typography.sizes.md,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    color: theme.colors.danger,
    fontSize: theme.typography.sizes.sm,
    marginTop: theme.spacing.xs,
  }
});
