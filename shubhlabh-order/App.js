import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/features/auth/AuthContext';
import LoginScreen from './src/features/auth/LoginScreen';
import { StatusBar } from 'expo-status-bar';

import OnboardingNavigator from './src/features/onboarding/OnboardingNavigator';
import MainTabNavigator from './src/navigation/MainTabNavigator';
import NewOrderStackNavigator from './src/navigation/NewOrderStackNavigator';
import InAppNotificationBanner from './src/features/notifications/InAppNotificationBanner';
import { NotificationProvider } from './src/features/notifications/NotificationContext';
import { GlobalHelpFab } from './src/shared/components/GlobalHelpFab';
import { OrderListProvider } from './src/features/orders/OrderListContext';
import { I18nProvider } from './src/shared/localization/i18n';
import { ThemeProvider } from './src/shared/theme/ThemeProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export const navigationRef = createNavigationContainerRef();

const Stack = createNativeStackNavigator();

function OnboardingScreen() {
  const { logout } = useAuth();
  
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Buyer Onboarding</Text>
      <Text>Please complete your profile.</Text>
      <Text style={{ marginTop: 20, color: 'blue' }} onPress={logout}>
        LOGOUT
      </Text>
    </View>
  );
}

function MainNavigator() {
  const { session, customerProfile, loading, authError } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={{ marginTop: 16 }}>Loading...</Text>
      </View>
    );
  }

  // If there's an authError from role/mapping check, we still show the LoginScreen
  // which handles displaying the error message and 'CONTACT SHUBH LABH' button
  if (!session || authError) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // Onboarding Routing Decision
  const isOnboarded = session?.user?.user_metadata?.onboarding_completed || customerProfile?.is_onboarded;

  return (
    <View style={{ flex: 1 }}>
      <Stack.Navigator initialRouteName="MainTabs" screenOptions={{ headerShown: false }}>
        {isOnboarded ? (
          <>
            {/* Primary Main Tab Navigator with persistent bottom navigation */}
            <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
            {/* Full-Screen Dedicated Checkout Flow (Section 5 Exception) */}
            <Stack.Screen name="NewOrderTab" component={NewOrderStackNavigator} />
            <Stack.Screen name="NewOrderStack" component={NewOrderStackNavigator} />
          </>
        ) : (
          <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
        )}
      </Stack.Navigator>
      {isOnboarded && <GlobalHelpFab />}
      {isOnboarded && (
        <InAppNotificationBanner
          onNavigateToNotice={(updateId) => {
            if (navigationRef.isReady()) {
              navigationRef.navigate('MainTabs', {
                screen: 'HomeTab',
                params: {
                  screen: 'BusinessUpdateDetail',
                  params: { updateId }
                }
              });
            }
          }}
        />
      )}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <NotificationProvider>
              <OrderListProvider>
                <NavigationContainer ref={navigationRef}>
                  <StatusBar style="auto" />
                  <MainNavigator />
                </NavigationContainer>
              </OrderListProvider>
            </NotificationProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
});
