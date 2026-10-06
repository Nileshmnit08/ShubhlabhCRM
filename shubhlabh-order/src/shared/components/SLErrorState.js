import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';
import SLButton from './SLButton';
import { AlertCircle } from 'lucide-react-native';

export const SLErrorState = ({ 
  title = "Something went wrong", 
  message = "We encountered an error. Please try again.", 
  onRetry,
  style 
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <AlertCircle size={48} color={theme.colors.error} />
      </View>
      
      <SLText variant="sectionTitle" align="center" style={styles.title}>
        {title}
      </SLText>
      
      <SLText variant="bodyMedium" color={theme.colors.textSecondary} align="center" style={styles.message}>
        {message}
      </SLText>
      
      {onRetry && (
        <SLButton 
          title="Retry" 
          onPress={onRetry} 
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
    backgroundColor: theme.colors.background,
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

export default SLErrorState;
