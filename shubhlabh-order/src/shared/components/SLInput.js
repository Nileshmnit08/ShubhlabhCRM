import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';

export const SLInput = ({ 
  label, 
  error, 
  style, 
  containerStyle,
  ...props 
}) => {
  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <SLText variant="label" style={styles.label}>
          {label}
        </SLText>
      )}
      <TextInput
        style={[
          styles.input,
          error && styles.inputError,
          style
        ]}
        placeholderTextColor={theme.colors.textMuted}
        {...props}
      />
      {error && (
        <SLText variant="caption" color={theme.colors.error} style={styles.errorText}>
          {error}
        </SLText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.md,
  },
  label: {
    marginBottom: theme.spacing.xs,
  },
  input: {
    ...theme.typography.body,
    height: 56, // Touch target
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.medium,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
  },
  inputError: {
    borderColor: theme.colors.error,
  },
  errorText: {
    marginTop: theme.spacing.xs,
  }
});

export default SLInput;
