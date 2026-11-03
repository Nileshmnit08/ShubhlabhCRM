// RootNavigator for LabourHisaab
// Tab Navigator + Modal Stacks for Work Entry, Payments, Detail, Statement, and Settings

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import BottomTabNavigator from './BottomTabNavigator';
import AddWorkEntryScreen from '../screens/AddWorkEntryScreen';
import DailyPaymentScreen from '../screens/DailyPaymentScreen';
import LabourDetailScreen from '../screens/LabourDetailScreen';
import IndividualStatementScreen from '../screens/IndividualStatementScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {/* Main 3 Bottom Tabs */}
        <Stack.Screen name="MainTabs" component={BottomTabNavigator} />

        {/* Individual Labour History & Detail */}
        <Stack.Screen
          name="LabourDetailScreen"
          component={LabourDetailScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Modal: Add Daily Work Entry */}
        <Stack.Screen
          name="AddWorkEntryModal"
          component={AddWorkEntryScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />

        {/* Modal: Record Daily Payments & Expenses */}
        <Stack.Screen
          name="DailyPaymentModal"
          component={DailyPaymentScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />

        {/* Modal / Screen: Individual Monthly Statement & WhatsApp Slip */}
        <Stack.Screen
          name="IndividualStatementModal"
          component={IndividualStatementScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Modal: Revise Work Rates & Settings */}
        <Stack.Screen
          name="SettingsModal"
          component={SettingsScreen}
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

