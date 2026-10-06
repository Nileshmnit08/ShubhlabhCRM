import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';

export const SLStatusBadge = ({ status, text, style }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'success':
      case 'completed':
      case 'delivered':
        return styles.success;
      case 'warning':
      case 'pending':
        return styles.warning;
      case 'error':
      case 'cancelled':
        return styles.error;
      default:
        return styles.default;
    }
  };

  const getTextColor = () => {
    switch (status) {
      case 'success':
      case 'completed':
      case 'delivered':
        return theme.colors.success;
      case 'warning':
      case 'pending':
        return '#B8860B'; // Dark goldenrod for contrast
      case 'error':
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <SLText variant="caption" color={getTextColor()} style={{ fontWeight: '600' }}>
        {text}
      </SLText>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.pill,
    alignSelf: 'flex-start',
  },
  success: {
    backgroundColor: '#E6F4EA', // Light green
  },
  warning: {
    backgroundColor: '#FEF7E0', // Light yellow
  },
  error: {
    backgroundColor: '#FCE8E6', // Light red
  },
  default: {
    backgroundColor: theme.colors.border,
  }
});

export default SLStatusBadge;
