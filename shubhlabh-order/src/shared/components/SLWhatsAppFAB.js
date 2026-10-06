import React from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MessageCircle } from 'lucide-react-native';
import SLText from './SLText';

export const SLWhatsAppFAB = ({ onPress, style }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <TouchableOpacity 
      style={[
        styles.fab, 
        { bottom: insets.bottom + theme.spacing.xxl + theme.spacing.lg }, 
        style
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <MessageCircle size={28} color={theme.colors.white} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: theme.spacing.lg,
    width: 56, // Touch target 56dp
    height: 56,
    borderRadius: 28,
    backgroundColor: '#25D366', // WhatsApp Brand Color
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.md,
    zIndex: 1000,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default SLWhatsAppFAB;
