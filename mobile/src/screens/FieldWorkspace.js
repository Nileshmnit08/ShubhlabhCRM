import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { Map, Briefcase, CalendarCheck, UserCircle } from 'lucide-react-native';
import { theme } from '../theme';

import MyRouteScreen from './MyRouteScreen';
import MyCustomersScreen from './MyCustomersScreen';
import FollowUpListScreen from './FollowUpListScreen';

const Tab = createBottomTabNavigator();

// Operator Profile / Logout
function ProfileScreen() {
  const { userProfile } = useAuth();

  return (
    <View style={styles.placeholderContainer}>
      <UserCircle color={theme.colors.secondary} size={64} style={{ marginBottom: 16 }} />
      <Text style={styles.placeholderTitle}>{userProfile?.display_name}</Text>
      <View style={styles.roleBadge}>
        <Text style={styles.roleText}>{userProfile?.role}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function FieldWorkspace() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
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
        name="My Route"
        component={MyRouteScreen}
        options={{
          tabBarLabel: "Today's Work",
          tabBarIcon: ({ color, size }) => <Map color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="My Customers"
        component={MyCustomersScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Briefcase color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Follow-ups"
        component={FollowUpListScreen}
        options={{
          tabBarIcon: ({ color, size }) => <CalendarCheck color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <UserCircle color={color} size={size} />,
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
  roleBadge: {
    backgroundColor: 'rgba(37,99,235,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    marginTop: 8,
  },
  roleText: {
    color: theme.colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: theme.typography.fontFamily.body,
  },
});
