import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import AdminWorkspace from './src/screens/AdminWorkspace';
import FieldWorkspace from './src/screens/FieldWorkspace';
import CustomerDetailScreen from './src/screens/CustomerDetailScreen';
import MyCustomersScreen from './src/screens/MyCustomersScreen';
import LogFollowUpScreen from './src/screens/LogFollowUpScreen';
import AddActivityScreen from './src/screens/AddActivityScreen';
import ActivityListScreen from './src/screens/ActivityListScreen';
import CallHistoryScreen from './src/screens/CallHistoryScreen';
import AddRequirementScreen from './src/screens/AddRequirementScreen';
import AddFollowUpScreen from './src/screens/AddFollowUpScreen';
import UpdateDispatchScreen from './src/screens/UpdateDispatchScreen';
import RequirementDetailScreen from './src/screens/RequirementDetailScreen';
import DispatchDetailScreen from './src/screens/DispatchDetailScreen';
import FollowUpListScreen from './src/screens/FollowUpListScreen';
import FollowUpDetailScreen from './src/screens/FollowUpDetailScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import StaffDetailScreen from './src/screens/StaffDetailScreen';
import AdminCallDetailScreen from './src/screens/AdminCallDetailScreen';
import AddCustomerScreen from './src/screens/AddCustomerScreen';
import AdminSettingsScreen from './src/screens/AdminSettingsScreen';
import { StatusBar } from 'expo-status-bar';
import './src/i18n'; // Initialize i18n

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const { session, userProfile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="light" />
        <LoginScreen />
      </>
    );
  }

  // Role-based routing with Stack for Detail screens
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#1e293b' }, headerTintColor: '#fff', headerBackTitleVisible: false }}>
          <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
            {() => userProfile?.role === 'Admin' ? <AdminWorkspace /> : <FieldWorkspace />}
          </Stack.Screen>
          <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="MyCustomers" component={MyCustomersScreen} options={{ headerShown: false }} />
          <Stack.Screen name="LogFollowUp" component={LogFollowUpScreen} options={{ title: 'Log Follow-up' }} />
          <Stack.Screen name="AddActivity" component={AddActivityScreen} options={{ headerShown: false }} />
          <Stack.Screen name="ActivityList" component={ActivityListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="CallHistory" component={CallHistoryScreen} options={{ title: 'Recent Calls' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings & UI' }} />
          <Stack.Screen name="AddRequirement" component={AddRequirementScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddFollowUp" component={AddFollowUpScreen} options={{ headerShown: false }} />
          <Stack.Screen name="UpdateDispatch" component={UpdateDispatchScreen} options={{ headerShown: false }} />
          <Stack.Screen name="RequirementDetail" component={RequirementDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="DispatchDetail" component={DispatchDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="FollowUpList" component={FollowUpListScreen} options={{ headerShown: false }} />
          <Stack.Screen name="FollowUpDetail" component={FollowUpDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminCallDetail" component={AdminCallDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddCustomer" component={AddCustomerScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Admin Settings" component={AdminSettingsScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}

import { initSyncManager } from './src/services/SyncManager';

export default function App() {
  React.useEffect(() => {
    initSyncManager();
  }, []);

  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9ff',
  },
});
