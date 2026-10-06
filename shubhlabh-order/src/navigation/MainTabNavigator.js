import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Package, ClipboardList, User } from 'lucide-react-native';

import HomeScreen from '../features/home/HomeScreen';
import ProductsStackNavigator from './ProductsStackNavigator';
import OrdersStackNavigator from './OrdersStackNavigator';
import ProfileScreen from '../features/profile/ProfileScreen';
import { theme } from '../shared/theme';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F97316', // Shubh Labh Orange
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          backgroundColor: '#FFFFFF',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: 'bold',
        }
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="ProductsTab" 
        component={ProductsStackNavigator} 
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }) => <Package color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStackNavigator} 
        options={{
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen} 
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}
