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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import './src/services/BackgroundLocationService';
import { CallLogService } from './src/services/CallLogService';

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
  VisitSummaryScreen,
  SchemeDetailScreen,
  MessagesInboxScreen,
  NewChatScreen,
  ChatConversationScreen
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
          else if (route.name === 'Messages') iconName = 'chat';
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
      <Tab.Screen name="Messages" component={MessagesInboxScreen} />
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

  React.useEffect(() => {
    // Request permissions and initialize background sync listener once authenticated
    CallLogService.requestPermissions().then((granted) => {
      if (granted) {
        CallLogService.syncCallLogs(session.user.id);
      }
    });
    CallLogService.initAppStateListener();

    return () => {
      CallLogService.destroy();
    };
  }, []);

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
      <Stack.Screen 
        name="SchemeDetail" 
        component={SchemeDetailScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="NewChat" 
        component={NewChatScreen} 
        options={{ title: 'New Chat' }} 
      />
      <Stack.Screen 
        name="ChatConversation" 
        component={ChatConversationScreen} 
      />
    </Stack.Navigator>
  );
}

import { navigationRef } from './src/navigation/RootNavigation';

export default function App() {
  React.useEffect(() => {
    const loadLanguage = async () => {
      try {
        const lang = await AsyncStorage.getItem('@app_language');
        if (lang) {
          // i18n is initialized in './src/i18n'
          const i18next = require('i18next').default;
          if (i18next && i18next.changeLanguage) {
            i18next.changeLanguage(lang);
          }
        }
      } catch (e) {
        console.error('Failed to load language', e);
      }
    };
    loadLanguage();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <SyncProvider>
          <VisitProvider>
            <NavigationContainer ref={navigationRef}>
              <RootNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
          </VisitProvider>
        </SyncProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
