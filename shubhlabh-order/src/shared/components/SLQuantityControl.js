import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../theme';
import SLText from './SLText';
import { Minus, Plus } from 'lucide-react-native';

export const SLQuantityControl = ({ quantity, onIncrease, onDecrease, style }) => {
  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity 
        style={styles.button} 
        onPress={onDecrease}
        disabled={quantity <= 0}
        activeOpacity={0.7}
      >
        <Minus size={20} color={quantity > 0 ? theme.colors.primary : theme.colors.disabled} />
      </TouchableOpacity>
      
      <View style={styles.quantityContainer}>
        <SLText variant="numeric" color={theme.colors.textPrimary}>
          {quantity}
        </SLText>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={onIncrease}
        activeOpacity={0.7}
      >
        <Plus size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.surface,
  },
  button: {
    padding: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
    height: 40, // standard touch target
  },
  quantityContainer: {
    paddingHorizontal: theme.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  }
});

export default SLQuantityControl;
