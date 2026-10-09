import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Package, ClipboardList, User } from 'lucide-react-native';

import HomeScreen from '../features/home/HomeScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import NewOrderStackNavigator from './NewOrderStackNavigator';
import MarketPricesStackNavigator from './MarketPricesStackNavigator';
import { theme } from '../shared/theme';
import { useTranslation } from '../shared/localization/i18n';
import { PlusCircle, LineChart } from 'lucide-react-native';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
          backgroundColor: theme.colors.surface,
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        }
      }}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeScreen} 
        options={{
          tabBarLabel: t('profile.language') === 'Language' ? 'Home' : 'होम',
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="MarketPricesTab" 
        component={MarketPricesStackNavigator} 
        options={{
          tabBarLabel: t('profile.language') === 'Language' ? 'Market Prices' : 'बाज़ार भाव',
          tabBarIcon: ({ color, size }) => <LineChart color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="NewOrderTab" 
        component={NewOrderStackNavigator} 
        options={{
          tabBarLabel: t('profile.language') === 'Language' ? 'New Order' : 'नया ऑर्डर',
          tabBarIcon: ({ color, size }) => <PlusCircle color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStackNavigator} 
        options={{
          tabBarLabel: t('profile.language') === 'Language' ? 'Profile' : 'प्रोफ़ाइल',
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}
