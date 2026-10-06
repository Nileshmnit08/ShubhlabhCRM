import React from 'react';
import { View, SafeAreaView, StyleSheet, StatusBar } from 'react-native';
import { theme } from '../theme';

export const SLScreen = ({ 
  children, 
  backgroundColor = theme.colors.background,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
  noPadding = false
}) => {
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={edges}>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <View style={[
        styles.container, 
        !noPadding && styles.padding,
        style
      ]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
});

export default SLScreen;
