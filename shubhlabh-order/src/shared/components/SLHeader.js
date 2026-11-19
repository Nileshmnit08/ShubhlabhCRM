import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { ChevronLeft } from 'lucide-react-native';
import SLText from './SLText';

export const SLHeader = ({ title, showBack = true, navigation, onBack, onBackPress, rightComponent, style }) => {
  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    insets = useSafeAreaInsets();
  } catch (e) {
    // Fallback for tests or environments outside SafeAreaProvider
  }

  const handleBack = onBackPress || onBack || (navigation ? () => {
    if (navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else if (navigation.navigate) {
      navigation.navigate('MainTabs');
    }
  } : null);

  return (
    <View style={[styles.container, { paddingTop: insets.top }, style]}>
      <View style={styles.header}>
        {(showBack && handleBack) ? (
          <TouchableOpacity 
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  header: {
    height: 56, // Stitch standard header height
    flexDirection: 'row',
    alignItems: 'center',
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
