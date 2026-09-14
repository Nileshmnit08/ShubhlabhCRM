import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { Button } from './Button';

export function LoadingState({ message = 'Loading...' }) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title = 'No Data', message = 'Nothing to show here.', icon = 'inbox' }) {
  return (
    <View style={styles.container}>
      <MaterialIcons name={icon} size={48} color={colors.outlineVariant} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ title = 'Error', message = 'Something went wrong.', onRetry }) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="error-outline" size={48} color={colors.error} />
      <Text style={[styles.title, { color: colors.error }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <View style={styles.action}>
          <Button title="Try Again" onPress={onRetry} variant="secondary" />
        </View>
      )}
    </View>
  );
}

export function SuccessState({ title = 'Success!', message = 'Operation completed.' }) {
  return (
    <View style={styles.container}>
      <MaterialIcons name="check-circle" size={48} color={colors.status.completed.text} />
      <Text style={[styles.title, { color: colors.status.completed.text }]}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    ...typography.headlineSm,
    marginTop: 16,
    marginBottom: 8,
    color: colors.onSurface,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  action: {
    marginTop: 24,
    minWidth: 120,
  }
});
