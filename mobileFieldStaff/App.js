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
import { BackgroundNotificationService } from './src/services/BackgroundNotificationService';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
  ChatConversationScreen,
  MyVisitsScreen,
  MyOrdersScreen,
  OrderDetailScreen,
  MyActivityScreen,
  ExpenseListScreen,
  ReconciliationScreen,
  OrderConfirmationScreen
} from './src/screens';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
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
  const { routePendingColdStart } = useNotifications();

  // After successful auth, attempt to route any cold-start pending notification.
  React.useEffect(() => {
    if (!session || !staffProfile) return;

    CallLogService.requestPermissions().then((granted) => {
      if (granted) {
        CallLogService.syncCallLogs(session.user.id);
      }
    });
    CallLogService.initAppStateListener();

    // Route any cold-start notification that was stored before nav was ready
    const timer = setTimeout(() => {
      routePendingColdStart();
    }, 600); // slight delay to ensure nav stack is fully mounted

    return () => {
      CallLogService.destroy();
      clearTimeout(timer);
    };
  }, [session, staffProfile]);

  // If loading or resolving identity, LoginScreen handles loading/error state
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
        name="OrderConfirmation" 
        component={OrderConfirmationScreen} 
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
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ChatConversation" 
        component={ChatConversationScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="MyVisits" 
        component={MyVisitsScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MyOrders" 
        component={MyOrdersScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="OrderDetail" 
        component={OrderDetailScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="MyActivity" 
        component={MyActivityScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="ExpenseList" 
        component={ExpenseListScreen} 
        options={{ headerShown: false }} 
      />
      <Stack.Screen 
        name="Reconciliation" 
        component={ReconciliationScreen} 
        options={{ headerShown: false }} 
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

    const setupNotifications = async () => {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('chat_messages', {
          name: 'Shubh Labh Messages',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#0061A4',
        });
      }
      
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      BackgroundNotificationService.registerTask();
    };
    setupNotifications();
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
