import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../features/home/HomeScreen';
import BusinessUpdatesListScreen from '../features/businessUpdates/BusinessUpdatesListScreen';
import BusinessUpdateDetailScreen from '../features/businessUpdates/BusinessUpdateDetailScreen';
import NotificationInboxScreen from '../features/notifications/NotificationInboxScreen';
import WeatherDetailsScreen from '../features/weather/WeatherDetailsScreen';
import MyRewardSchemesScreen from '../features/rewards/MyRewardSchemesScreen';
import RewardDetailScreen from '../features/rewards/RewardDetailScreen';

const HomeStack = createNativeStackNavigator();

export default function HomeStackNavigator() {
  return (
    <HomeStack.Navigator initialRouteName="HomeMain" screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="BusinessUpdatesList" component={BusinessUpdatesListScreen} />
      <HomeStack.Screen name="BusinessUpdateDetail" component={BusinessUpdateDetailScreen} />
      <HomeStack.Screen name="NotificationInbox" component={NotificationInboxScreen} />
      <HomeStack.Screen name="WeatherDetails" component={WeatherDetailsScreen} />
      <HomeStack.Screen name="MyRewardSchemes" component={MyRewardSchemesScreen} />
      <HomeStack.Screen name="RewardDetail" component={RewardDetailScreen} />
    </HomeStack.Navigator>
  );
}
