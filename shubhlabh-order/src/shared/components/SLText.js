import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export const SLText = ({ 
  children, 
  variant = 'body', 
  color, 
  align = 'left',
  style, 
  ...props 
}) => {
  const getVariantStyle = () => {
    return theme.typography[variant] || theme.typography.body;
  };

  return (
    <Text 
      style={[
        getVariantStyle(),
        { textAlign: align },
        color && { color },
        style,
      ]} 
      {...props}
    >
      {children}
    </Text>
  );
};

export default SLText;
