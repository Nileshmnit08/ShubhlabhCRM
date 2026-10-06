import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';
import SLButton from './SLButton';

export const SLEmptyState = ({ 
  title, 
  message, 
  icon: IconComponent,
  actionTitle,
  onActionPress,
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      {IconComponent && (
        <View style={styles.iconContainer}>
          <IconComponent size={64} color={theme.colors.border} />
        </View>
      )}
      
      {title && (
        <SLText variant="sectionTitle" align="center" style={styles.title}>
          {title}
        </SLText>
      )}
      
      {message && (
        <SLText variant="bodyMedium" color={theme.colors.textSecondary} align="center" style={styles.message}>
          {message}
        </SLText>
      )}
      
      {actionTitle && onActionPress && (
        <SLButton 
          title={actionTitle} 
          onPress={onActionPress} 
          variant="outline"
          style={styles.actionButton}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  iconContainer: {
    marginBottom: theme.spacing.lg,
  },
  title: {
    marginBottom: theme.spacing.sm,
  },
  message: {
    marginBottom: theme.spacing.xl,
    textAlign: 'center',
  },
  actionButton: {
    minWidth: 160,
  }
});

export default SLEmptyState;
