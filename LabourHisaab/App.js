// LabourHisaab — Android Labour Management Prototype
// Zero-Backend, In-Memory State, Zero Friction Execution

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LabourHisaabProvider } from './src/context/LabourHisaabContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor="#FFFFFF" />
      <LabourHisaabProvider>
        <RootNavigator />
      </LabourHisaabProvider>
    </SafeAreaProvider>
  );
}

