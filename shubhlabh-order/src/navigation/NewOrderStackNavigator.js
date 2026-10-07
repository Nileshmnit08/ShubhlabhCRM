import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import NewOrderScreen from '../features/orders/NewOrderScreen';
import OrderReviewScreen from '../features/orders/OrderReviewScreen';
import OrderSuccessScreen from '../features/orders/OrderSuccessScreen';

const NewOrderStack = createNativeStackNavigator();

export default function NewOrderStackNavigator() {
  return (
    <NewOrderStack.Navigator screenOptions={{ headerShown: false }}>
      <NewOrderStack.Screen name="NewOrderMain" component={NewOrderScreen} />
      <NewOrderStack.Screen name="OrderReview" component={OrderReviewScreen} />
      <NewOrderStack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    </NewOrderStack.Navigator>
  );
}
