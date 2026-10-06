import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProductCatalogueScreen from '../features/products/ProductCatalogueScreen';
import ProductDetailScreen from '../features/products/ProductDetailScreen';
import MeriOrderListScreen from '../features/orders/MeriOrderListScreen';
import OrderReviewScreen from '../features/orders/OrderReviewScreen';
import OrderSuccessScreen from '../features/orders/OrderSuccessScreen';

const Stack = createNativeStackNavigator();

export default function ProductsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalogue" component={ProductCatalogueScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="MeriOrderList" component={MeriOrderListScreen} />
      <Stack.Screen name="OrderReview" component={OrderReviewScreen} />
      <Stack.Screen name="OrderSuccess" component={OrderSuccessScreen} />
    </Stack.Navigator>
  );
}
