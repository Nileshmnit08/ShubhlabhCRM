import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../theme';

export const LoadingView = ({ message = 'Loading...' }) => (
  <View style={styles.container}>
    <ActivityIndicator size="large" color={theme.colors.primary} />
    <Text style={styles.text}>{message}</Text>
  </View>
);

export const EmptyView = ({ message = 'No data available.' }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{message}</Text>
  </View>
);

export const ErrorView = ({ message = 'An error occurred.', onRetry }) => (
  <View style={styles.container}>
    <Text style={[styles.text, { color: theme.colors.alert }]}>{message}</Text>
    {/* Optional Retry Button */}
  </View>
);

export const OfflineView = () => (
  <View style={styles.container}>
    <Text style={[styles.text, { color: theme.colors.alert }]}>You are offline. Please check your connection.</Text>
  </View>
);

export const UnauthorizedView = () => (
  <View style={styles.container}>
    <Text style={styles.text}>You are not authorized to view this page. Please log in.</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  text: {
    marginTop: 10,
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
  }
});
