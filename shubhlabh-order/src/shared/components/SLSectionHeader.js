import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';
import { ChevronRight } from 'lucide-react-native';

export const SLSectionHeader = ({ title, actionTitle, onActionPress, style }) => {
  return (
    <View style={[styles.container, style]}>
      <SLText variant="sectionTitle" style={styles.title}>{title}</SLText>
      
      {actionTitle && (
        <TouchableOpacity 
          style={styles.actionContainer} 
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <SLText variant="label" color={theme.colors.primary}>{actionTitle}</SLText>
          <ChevronRight size={16} color={theme.colors.primary} style={styles.icon} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  title: {
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  icon: {
    marginLeft: theme.spacing.xs,
  }
});

export default SLSectionHeader;
