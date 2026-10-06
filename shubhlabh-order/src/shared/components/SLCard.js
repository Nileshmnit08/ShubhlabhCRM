import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const SLCard = ({ children, style, variant = 'default' }) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'highlight':
        return styles.highlight;
      case 'scheme':
        return styles.scheme;
      case 'order':
        return styles.order;
      default:
        return {};
    }
  };

  return (
    <View style={[styles.card, getVariantStyle(), style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    ...theme.elevation.sm,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  highlight: {
    borderColor: theme.colors.primary,
    backgroundColor: '#FFF8F0', // subtle orange tint
  },
  scheme: {
    borderColor: theme.colors.success,
    backgroundColor: '#F0FDF4', // subtle green tint
  },
  order: {
    padding: theme.spacing.lg,
  }
});

export default SLCard;
