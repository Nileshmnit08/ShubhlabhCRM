import React, { useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme';

export const SLSkeleton = ({ width, height, borderRadius = theme.radius.medium, style }) => {
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    );
    
    animation.start();
    
    return () => animation.stop();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7]
  });

  return (
    <Animated.View 
      style={[
        styles.skeleton,
        { width, height, borderRadius, opacity },
        style
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.disabled,
  }
});

export default SLSkeleton;
