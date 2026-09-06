import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { Users, LayoutDashboard, Settings } from 'lucide-react-native';
import HomeScreen from './HomeScreen'; // We will reuse the original HomeScreen as Global Overview

const Tab = createBottomTabNavigator();

// Placeholder for Team Activity
function TeamActivityScreen() {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>Team Activity</Text>
      <Text style={styles.placeholderText}>Admin view of all field operators' daily activities.</Text>
    </View>
  );
}

// Placeholder for Settings
function AdminSettingsScreen() {
  const { userProfile } = useAuth();
  
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>Admin Settings</Text>
      <Text style={styles.placeholderText}>Manage CRM Roles & Defaults.</Text>
      <Text style={{color: '#94a3b8', marginTop: 20}}>Logged in as: {userProfile?.display_name}</Text>
      
      <TouchableOpacity style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AdminWorkspace() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#1e293b', shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#f8fafc',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen 
        name="Global Overview" 
        component={HomeScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <LayoutDashboard color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Team Activity" 
        component={TeamActivityScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
      <Tab.Screen 
        name="Settings" 
        component={AdminSettingsScreen} 
        options={{
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  placeholderTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  logoutButton: {
    marginTop: 40,
    backgroundColor: '#ef4444',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
