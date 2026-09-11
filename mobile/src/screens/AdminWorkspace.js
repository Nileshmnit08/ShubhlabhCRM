import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, Settings } from 'lucide-react-native';
import { theme } from '../theme';

// NEW: Stitch-approved Admin Control Center replaces old HomeScreen / "Global Overview"
import AdminControlCenterScreen from './AdminControlCenterScreen';
import TeamActivityScreen from './TeamActivityScreen';
import AdminSettingsScreen from './AdminSettingsScreen';

const Tab = createBottomTabNavigator();
export default function AdminWorkspace() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false, // Headers are handled inside each screen
        tabBarStyle: {
          backgroundColor: theme.colors.surfaceContainerLowest,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          elevation: 0,
          height: 60,
        },
        tabBarActiveTintColor: theme.colors.secondary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontFamily: theme.typography.fontFamily.body,
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}
    >
      {/* ── PRIMARY TAB: Admin Control Center (was: "Global Overview" → HomeScreen) ── */}
      <Tab.Screen
        name="Control Center"
        component={AdminControlCenterScreen}
        options={{
          tabBarLabel: 'Control',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />

      {/* ── Secondary tabs (unchanged from original, retained for compatibility) ── */}
      <Tab.Screen
        name="Team Activity"
        component={TeamActivityScreen}
        options={{
          tabBarLabel: 'Team',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Admin Settings"
        component={AdminSettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.onSurface,
    marginBottom: 8,
    fontFamily: theme.typography.fontFamily.display,
  },
  placeholderText: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily.body,
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: theme.colors.error,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: theme.typography.fontFamily.body,
  },
});
