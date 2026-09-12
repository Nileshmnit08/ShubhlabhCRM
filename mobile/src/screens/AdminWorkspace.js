import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, Phone, CalendarClock, BarChart3, Settings } from 'lucide-react-native';
import { theme } from '../theme';

// NEW: Stitch-approved Admin Control Center replaces old HomeScreen / "Global Overview"
import AdminControlCenterScreen from './AdminControlCenterScreen';
import TeamActivityScreen from './TeamActivityScreen';
import AdminCallsScreen from './AdminCallsScreen';
import FollowUpListScreen from './FollowUpListScreen';
import AdminPipelineScreen from './AdminPipelineScreen';

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
      <Tab.Screen
        name="Home"
        component={AdminControlCenterScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Staff"
        component={TeamActivityScreen}
        options={{
          tabBarLabel: 'Staff',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Calls"
        component={AdminCallsScreen}
        options={{
          tabBarLabel: 'Calls',
          tabBarIcon: ({ color, size }) => <Phone color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Follow-ups"
        component={FollowUpListScreen}
        options={{
          tabBarLabel: 'Follow-ups',
          tabBarIcon: ({ color, size }) => <CalendarClock color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Pipeline"
        component={AdminPipelineScreen}
        options={{
          tabBarLabel: 'Pipeline',
          tabBarIcon: ({ color, size }) => <BarChart3 color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({});
