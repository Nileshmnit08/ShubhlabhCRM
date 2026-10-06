import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingProvider } from './OnboardingContext';
import ShopConfirmScreen from './ShopConfirmScreen';
import ShopLocationScreen from './ShopLocationScreen';
import DeliveryLocationScreen from './DeliveryLocationScreen';
import DeliveryAddressScreen from './DeliveryAddressScreen';
import ShopPhotoScreen from './ShopPhotoScreen';
import FinalConfirmationScreen from './FinalConfirmationScreen';

const Stack = createNativeStackNavigator();

export default function OnboardingNavigator() {
  return (
    <OnboardingProvider>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ShopConfirm" component={ShopConfirmScreen} />
        <Stack.Screen name="ShopLocation" component={ShopLocationScreen} />
        <Stack.Screen name="DeliveryLocation" component={DeliveryLocationScreen} />
        <Stack.Screen name="DeliveryAddress" component={DeliveryAddressScreen} />
        <Stack.Screen name="ShopPhoto" component={ShopPhotoScreen} />
        <Stack.Screen name="FinalConfirmation" component={FinalConfirmationScreen} />
      </Stack.Navigator>
    </OnboardingProvider>
  );
}
