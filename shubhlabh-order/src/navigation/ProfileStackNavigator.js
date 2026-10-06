import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileScreen from '../features/profile/ProfileScreen';
import ComplaintCenterScreen from '../features/complaints/ComplaintCenterScreen';
import UpdatesListScreen from '../features/updates/UpdatesListScreen';

const ProfileStack = createNativeStackNavigator();

export default function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ComplaintCenter" component={ComplaintCenterScreen} />
      <ProfileStack.Screen name="UpdatesList" component={UpdatesListScreen} />
    </ProfileStack.Navigator>
  );
}
