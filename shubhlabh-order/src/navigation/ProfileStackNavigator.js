import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../features/profile/ProfileScreen';
import ComplaintCenterScreen from '../features/complaints/ComplaintCenterScreen';
import UpdatesListScreen from '../features/updates/UpdatesListScreen';
import MySalespersonScreen from '../features/profile/MySalespersonScreen';

import BusinessUpdatesListScreen from '../features/businessUpdates/BusinessUpdatesListScreen';
import BusinessUpdateDetailScreen from '../features/businessUpdates/BusinessUpdateDetailScreen';

import SettingsScreen from '../features/profile/SettingsScreen';
import ChangePasswordScreen from '../features/profile/ChangePasswordScreen';
import DeliveryAddressScreen from '../features/profile/DeliveryAddressScreen';

const ProfileStack = createNativeStackNavigator();

export default function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ComplaintCenter" component={ComplaintCenterScreen} />
      <ProfileStack.Screen name="UpdatesList" component={UpdatesListScreen} />
      <ProfileStack.Screen name="MySalesperson" component={MySalespersonScreen} />
      <ProfileStack.Screen name="BusinessUpdatesList" component={BusinessUpdatesListScreen} />
      <ProfileStack.Screen name="BusinessUpdateDetail" component={BusinessUpdateDetailScreen} />
      <ProfileStack.Screen name="Settings" component={SettingsScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="DeliveryAddress" component={DeliveryAddressScreen} />
    </ProfileStack.Navigator>
  );
}
