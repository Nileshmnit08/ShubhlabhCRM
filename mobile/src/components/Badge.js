import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Badge({ label, status = 'default' }) {
  const getColors = () => {
    switch (status) {
      case 'success': return { bg: 'rgba(16, 185, 129, 0.2)', text: theme.colors.success, border: theme.colors.success };
      case 'warning': return { bg: 'rgba(245, 158, 11, 0.2)', text: theme.colors.warning, border: theme.colors.warning };
      case 'danger': return { bg: 'rgba(239, 68, 68, 0.2)', text: theme.colors.danger, border: theme.colors.danger };
      default: return { bg: 'rgba(148, 163, 184, 0.2)', text: theme.colors.textMuted, border: theme.colors.textMuted };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
    borderRadius: theme.borders.radius.sm,
    borderWidth: theme.borders.width,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: theme.typography.sizes.sm - 2,
    fontWeight: theme.typography.weights.bold,
  }
});
