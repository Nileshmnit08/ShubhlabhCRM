import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PlaceholderScreen = ({ title }) => (
  <View style={styles.container}>
    <Text style={styles.text}>{title} Screen</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 20,
  }
});

// Assuming usage of React Navigation Bottom Tabs (to be installed if used)
export const RootNavigator = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Root Navigation Shell (Home, Products, Orders, Profile)</Text>
      <Text style={styles.text}>Menu: ⋮</Text>
    </View>
  );
};
