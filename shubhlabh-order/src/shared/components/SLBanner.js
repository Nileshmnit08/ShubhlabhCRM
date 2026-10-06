import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';
import { Info, AlertCircle, CheckCircle, X } from 'lucide-react-native';

export const SLBanner = ({ 
  title, 
  message, 
  variant = 'info', 
  onClose,
  actionTitle,
  onActionPress,
  style 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return {
          bg: '#FEF7E0',
          border: theme.colors.warning,
          icon: AlertCircle,
          iconColor: '#B8860B'
        };
      case 'error':
        return {
          bg: '#FCE8E6',
          border: theme.colors.error,
          icon: AlertCircle,
          iconColor: theme.colors.error
        };
      case 'success':
        return {
          bg: '#E6F4EA',
          border: theme.colors.success,
          icon: CheckCircle,
          iconColor: theme.colors.success
        };
      case 'info':
      default:
        return {
          bg: '#E8F0FE',
          border: theme.colors.navy,
          icon: Info,
          iconColor: theme.colors.navy
        };
    }
  };

  const vStyles = getVariantStyles();
  const IconComponent = vStyles.icon;

  return (
    <View style={[styles.container, { backgroundColor: vStyles.bg, borderLeftColor: vStyles.border }, style]}>
      <View style={styles.iconContainer}>
        <IconComponent size={24} color={vStyles.iconColor} />
      </View>
      
      <View style={styles.contentContainer}>
        {title && (
          <SLText variant="cardTitle" style={styles.title}>{title}</SLText>
        )}
        <SLText variant="bodyMedium" color={theme.colors.textPrimary}>{message}</SLText>
        
        {actionTitle && (
          <TouchableOpacity onPress={onActionPress} style={styles.actionButton}>
            <SLText variant="label" color={theme.colors.primary}>{actionTitle}</SLText>
          </TouchableOpacity>
        )}
      </View>

      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderRadius: theme.radius.medium,
    borderLeftWidth: 4,
    marginBottom: theme.spacing.lg,
  },
  iconContainer: {
    marginRight: theme.spacing.md,
    paddingTop: theme.spacing.xs,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    marginBottom: theme.spacing.xs,
  },
  actionButton: {
    marginTop: theme.spacing.sm,
    alignSelf: 'flex-start',
  },
  closeButton: {
    marginLeft: theme.spacing.sm,
    padding: theme.spacing.xs,
  },
});

export default SLBanner;
