import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import { ChevronLeft } from 'lucide-react-native';
import SLText from './SLText';

export const SLHeader = ({ title, showBack = true, navigation, onBackPress, rightComponent, style }) => {
  return (
    <View style={[styles.header, style]}>
      {(showBack && (navigation || onBackPress)) ? (
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => {
            if (onBackPress) {
              onBackPress();
            } else if (navigation) {
              navigation.goBack();
            }
          }}
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
    width: 48,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    marginHorizontal: theme.spacing.sm,
  },
  rightContainer: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SLHeader;
