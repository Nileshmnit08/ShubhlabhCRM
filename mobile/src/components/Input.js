import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Input({ label, error, style, containerStyle, ...props }) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          style,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.typography.sizes.labelLg,
    fontWeight: theme.typography.weights.semibold,
    marginBottom: theme.spacing.xs,
    letterSpacing: 0.1,
  },
  input: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: theme.borders.radius.md,
    color: theme.colors.onSurface,
    height: 48,
    paddingHorizontal: theme.spacing.lg,
    fontSize: theme.typography.sizes.bodyMd,
    fontFamily: theme.typography.fontFamily.body,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  inputError: {
    borderColor: theme.colors.error,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.error,
    fontSize: theme.typography.sizes.labelMd,
    marginTop: theme.spacing.xs,
  },
});
