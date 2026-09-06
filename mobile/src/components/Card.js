import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Card({ children, style }) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radius.md,
    padding: theme.spacing.md,
    borderWidth: theme.borders.width,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  }
});
