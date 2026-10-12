import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { ChevronLeft } from 'lucide-react-native';
import SLText from './SLText';

export const SLHeader = ({ title, showBack = true, navigation, onBack, onBackPress, rightComponent, style }) => {
  const handleBack = onBackPress || onBack || (navigation ? () => navigation.goBack() : null);

  return (
    <View style={[styles.header, style]}>
      {(showBack && handleBack) ? (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBack}
        >
          <ChevronLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.placeholder} />
      )}
      
      <SLText variant="screenTitle" style={styles.title} numberOfLines={1}>{title}</SLText>
      
      <View style={styles.rightContainer}>
        {rightComponent}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: 56, // Stitch standard header height
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
  },
  backButton: {
    padding: theme.spacing.xs,
    marginLeft: -theme.spacing.xs,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    minWidth: 48,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  rightContainer: {
    minWidth: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});

export default SLHeader;
