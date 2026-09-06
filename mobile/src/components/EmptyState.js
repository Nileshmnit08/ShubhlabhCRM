import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';
import { Inbox } from 'lucide-react-native';

export default function EmptyState({ title, description, icon: Icon = Inbox }) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={48} color={theme.colors.border} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.sizes.lg,
    fontWeight: theme.typography.weights.bold,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  description: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.sizes.md,
    textAlign: 'center',
  }
});
