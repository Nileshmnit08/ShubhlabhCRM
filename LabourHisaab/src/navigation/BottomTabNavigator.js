// BottomTabNavigator for LabourHisaab
// Exactly 5 Tabs as in reference snapshot:
// 1. होम (Home)
// 2. मजदूर (Labour)
// 3. रिपोर्ट (Reports)
// 4. लेखाजोखा (Ledger / Daily Payment)
// 5. सेटिंग (Settings)

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Users, BarChart3, Wallet, Settings } from 'lucide-react-native';
import theme from '../constants/theme';

import HomeScreen from '../screens/HomeScreen';
import LabourListScreen from '../screens/LabourListScreen';
import ReportsScreen from '../screens/ReportsScreen';
import DailyPaymentScreen from '../screens/DailyPaymentScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.navActive,
        tabBarInactiveTintColor: theme.colors.navInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: '#EAE7E1',
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 5,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 2,
        },
      }}
    >
      {/* 1. होम (Home) */}
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'होम',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Home size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      {/* 2. मजदूर (Labour) */}
      <Tab.Screen
        name="LabourTab"
        component={LabourListScreen}
        options={{
          tabBarLabel: 'मजदूर',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Users size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      {/* 3. रिपोर्ट (Reports) */}
      <Tab.Screen
        name="ReportsTab"
        component={ReportsScreen}
        options={{
          tabBarLabel: 'रिपोर्ट',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <BarChart3 size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      {/* 4. लेखाजोखा (Ledger / Daily Payment) */}
      <Tab.Screen
        name="LedgerTab"
        component={DailyPaymentScreen}
        options={{
          tabBarLabel: 'लेखाजोखा',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Wallet size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />

      {/* 5. सेटिंग (Settings) */}
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'सेटिंग',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : null}>
              <Settings size={20} color={color} strokeWidth={focused ? 2.5 : 2} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: '#FFEEDB',
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 14,
  },
});
