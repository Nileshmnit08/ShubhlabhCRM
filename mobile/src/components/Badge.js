import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Badge({ label, status = 'default' }) {
  const getColors = () => {
    switch (status) {
      case 'success': 
        return { bg: theme.colors.successContainer, text: theme.colors.onSuccessContainer };
      case 'warning': 
        return { bg: theme.colors.warningContainer, text: theme.colors.onWarningContainer };
      case 'danger': 
      case 'error':
        return { bg: theme.colors.errorContainer, text: theme.colors.onErrorContainer };
      case 'info':
        return { bg: theme.colors.infoContainer, text: theme.colors.onInfoContainer };
      default: 
        return { bg: theme.colors.surfaceContainerHighest, text: theme.colors.onSurfaceVariant };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borders.radius.full,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    fontWeight: theme.typography.weights.semibold,
    letterSpacing: 0.3,
  }
});
