import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MyOrdersScreen from '../features/orders/MyOrdersScreen';
import OrderDetailScreen from '../features/orders/OrderDetailScreen';

const Stack = createNativeStackNavigator();

export default function OrdersStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MyOrders" component={MyOrdersScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
    </Stack.Navigator>
  );
}
