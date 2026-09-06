import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { Map, Briefcase, UserCircle } from 'lucide-react-native';

import MyRouteScreen from './MyRouteScreen';
import MyCustomersScreen from './MyCustomersScreen';

const Tab = createBottomTabNavigator();

// Operator Profile / Logout
function ProfileScreen() {
  const { userProfile } = useAuth();
  
  return (
    <View style={styles.placeholderContainer}>
      <UserCircle color="#3b82f6" size={64} style={{marginBottom: 16}} />
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
        headerStyle: { backgroundColor: '#1e293b', shadowColor: 'transparent', elevation: 0 },
        headerTintColor: '#f8fafc',
        tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen 
        name="My Route" 
        component={MyRouteScreen} 
        options={{
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
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
  listItem: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  },
  itemSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 4,
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
  },
  roleBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginTop: 8,
  },
  roleText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
