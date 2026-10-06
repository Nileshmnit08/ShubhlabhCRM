const fs = require('fs');
const path = require('path');

const srcDir = 'D:/ShubhLabhCRM/shubhlabh-order/src';
const features = ['auth', 'onboarding', 'home', 'products', 'orders', 'updates', 'complaints', 'profile'];
const shared = ['components', 'theme', 'utils', 'constants'];

features.forEach(f => fs.mkdirSync(path.join(srcDir, 'features', f), { recursive: true }));
shared.forEach(s => fs.mkdirSync(path.join(srcDir, 'shared', s), { recursive: true }));

const screens = [
  'auth/LoginScreen.js',
  'onboarding/ShopLocationScreen.js',
  'home/HomeScreen.js',
  'products/ProductCatalogueScreen.js',
  'products/ProductDetailScreen.js',
  'orders/MeriOrderListScreen.js',
  'orders/OrderSuccessScreen.js',
  'orders/MyOrdersScreen.js',
  'orders/OrderTrackingScreen.js',
  'updates/UpdatesListScreen.js',
  'complaints/ComplaintCenterScreen.js',
  'profile/ProfileScreen.js',
  'profile/MySalespersonScreen.js',
  'profile/ContactShubhLabhScreen.js',
  'profile/SettingsScreen.js'
];

const template = (name) => `import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '../../shared/theme';

export default function ${name.replace(/.*\//, '').replace('.js', '')}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${name.replace(/.*\//, '').replace('.js', '')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
  text: { fontSize: 20, color: theme.colors.text, fontWeight: 'bold' }
});
`;

screens.forEach(s => {
  fs.writeFileSync(path.join(srcDir, 'features', s), template(s));
});

console.log('Scaffolding complete.');
