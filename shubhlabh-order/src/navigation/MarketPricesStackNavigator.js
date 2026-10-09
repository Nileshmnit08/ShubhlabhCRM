import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MarketPricesScreen from '../features/market/MarketPricesScreen';
import WatchlistScreen from '../features/market/WatchlistScreen';

const Stack = createNativeStackNavigator();

export default function MarketPricesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MarketPrices" component={MarketPricesScreen} />
      <Stack.Screen 
        name="Watchlist" 
        component={WatchlistScreen} 
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  );
}
