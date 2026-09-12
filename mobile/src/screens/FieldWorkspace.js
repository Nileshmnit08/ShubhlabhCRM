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
import ProfileScreen from './ProfileScreen';

const Tab = createBottomTabNavigator();


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

const styles = StyleSheet.create({});
