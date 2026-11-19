import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Package, ClipboardList, User } from 'lucide-react-native';

import HomeStackNavigator from './HomeStackNavigator';
import MarketPricesStackNavigator from './MarketPricesStackNavigator';
import OrdersStackNavigator from './OrdersStackNavigator';
import ProfileStackNavigator from './ProfileStackNavigator';
import { theme } from '../shared/theme';
import { useTranslation } from '../shared/localization/i18n';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator() {
  const { t } = useTranslation();
  const isEnglish = t('profile.language') === 'Language';

  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      backBehavior="initialRoute"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarHideOnKeyboard: true,
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
        component={HomeStackNavigator} 
        options={{
          tabBarLabel: isEnglish ? 'Home' : 'होम',
          tabBarIcon: ({ color, size }) => <Home color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="ProductsTab" 
        component={MarketPricesStackNavigator} 
        options={{
          tabBarLabel: isEnglish ? 'Products' : 'उत्पाद',
          tabBarIcon: ({ color, size }) => <Package color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="OrdersTab" 
        component={OrdersStackNavigator} 
        options={{
          tabBarLabel: isEnglish ? 'My Orders' : 'मेरे ऑर्डर',
          tabBarIcon: ({ color, size }) => <ClipboardList color={color} size={24} />
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileStackNavigator} 
        options={{
          tabBarLabel: isEnglish ? 'Profile' : 'प्रोफ़ाइल',
          tabBarIcon: ({ color, size }) => <User color={color} size={24} />
        }}
      />
    </Tab.Navigator>
  );
}
