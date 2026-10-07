import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ProductCatalogueScreen from '../features/products/ProductCatalogueScreen';
import ProductDetailScreen from '../features/products/ProductDetailScreen';


const Stack = createNativeStackNavigator();

export default function ProductsStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Catalogue" component={ProductCatalogueScreen} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />

    </Stack.Navigator>
  );
}
