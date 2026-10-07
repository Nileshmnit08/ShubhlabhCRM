import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/features/auth/AuthContext';
import LoginScreen from './src/features/auth/LoginScreen';
import { StatusBar } from 'expo-status-bar';

import OnboardingNavigator from './src/features/onboarding/OnboardingNavigator';

import MainTabNavigator from './src/navigation/MainTabNavigator';
import OrdersStackNavigator from './src/navigation/OrdersStackNavigator';

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
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isOnboarded ? (
        <>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
          <Stack.Screen name="OrdersStack" component={OrdersStackNavigator} />
        </>
      ) : (
        <Stack.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Stack.Navigator>
  );
}

import { OrderListProvider } from './src/features/orders/OrderListContext';
import { I18nProvider } from './src/shared/localization/i18n';

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <OrderListProvider>
          <NavigationContainer>
            <StatusBar style="auto" />
            <MainNavigator />
          </NavigationContainer>
        </OrderListProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 }
});
