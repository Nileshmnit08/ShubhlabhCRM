import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const OrderListContext = createContext();

export function OrderListProvider({ children }) {
  const { session } = useAuth();
  
  // orderItems structure: array of objects { product: {id, name, ...}, quantity }
  const [orderItems, setOrderItems] = useState([]);

  // Clear cart when session changes (e.g., logout)
  useEffect(() => {
    if (!session) {
      setOrderItems([]);
    }
  }, [session]);

  const addToOrderList = (product, quantity) => {
    setOrderItems((prev) => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setOrderItems(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const removeFromOrderList = (productId) => {
    setOrderItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearOrderList = () => {
    setOrderItems([]);
  };

  const totalBags = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // NOTE: Server/backend must remain authoritative for actual commercial calculations
  // This is purely for local UI display estimates if prices were available.
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * (item.product.price || 0)), 0);

  return (
    <OrderListContext.Provider value={{
      orderList: orderItems,
      addToOrderList,
      updateQuantity,
      removeFromOrderList,
      clearOrderList,
      totalBags,
      totalAmount
    }}>
      {children}
    </OrderListContext.Provider>
  );
}

export function useOrderList() {
  const context = useContext(OrderListContext);
  if (context === undefined) {
    throw new Error('useOrderList must be used within an OrderListProvider');
  }
  return context;
}
