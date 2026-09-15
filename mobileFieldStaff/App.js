import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons } from '@expo/vector-icons';
import './src/i18n';
import { colors } from './src/theme/tokens';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { SyncProvider } from './src/context/SyncContext';
import './src/services/BackgroundLocationService';

import {
  HomeScreen,
  CustomersScreen,
  NearbyScreen,
  MyWorkScreen,
  ProfileScreen,
  CustomerProfileScreen,
  VisitModeScreen,
  QuickRequirementScreen,
  AddCustomerScreen,
  LoginScreen,
  NotificationsScreen,
  VisitSummaryScreen
} from './src/screens';
import { NotificationProvider } from './src/context/NotificationContext';
import { VisitProvider } from './src/context/VisitContext';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = 'home';
          else if (route.name === 'Customers') iconName = 'people';
          else if (route.name === 'Nearby') iconName = 'radar';
          else if (route.name === 'My Work') iconName = 'assignment';
          else if (route.name === 'Profile') iconName = 'person';
          
          return <MaterialIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.outline,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="Nearby" component={NearbyScreen} />
      <Tab.Screen name="My Work" component={MyWorkScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { session, staffProfile, loading } = useAuth();

  // If loading or resolving identity, LoginScreen will handle showing the loading/error state if needed,
  // but we can also just let LoginScreen mount because it checks `loading` inside it.
  
  if (!session || !staffProfile) {
    return <LoginScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surfaceContainerLowest },
        headerTintColor: colors.onSurface,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen 
        name="MainTabs" 
        component={MainTabs} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Notifications" 
        component={NotificationsScreen} 
        options={{ title: 'Notifications' }} 
      />
      <Stack.Screen 
        name="CustomerProfile" 
        component={CustomerProfileScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="VisitMode" 
        component={VisitModeScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="QuickRequirement" 
        component={QuickRequirementScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="VisitSummary" 
        component={VisitSummaryScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="AddCustomer" 
        component={AddCustomerScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SyncProvider>
          <VisitProvider>
            <NavigationContainer>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </VisitProvider>
        </SyncProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
