import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

const OrderListContext = createContext();

export function OrderListProvider({ children }) {
  const { session } = useAuth();
  
  // orderItems structure: array of objects { product: {id, name, ...}, quantity }
  const [orderItems, setOrderItems] = useState([]);
  const [orderMode, setOrderMode] = useState('create'); // 'create', 'edit', 'reorder'
  const [existingRequirementId, setExistingRequirementId] = useState(null);

  // Clear cart when session changes (e.g., logout)
  useEffect(() => {
    if (!session) {
      clearOrderList();
    }
  }, [session]);

  const startNewOrder = () => {
    setOrderMode('create');
    setExistingRequirementId(null);
    setOrderItems([]);
  };

  const _loadItems = (items, allProducts) => {
    if (!items) {
      setOrderItems([]);
      return;
    }
    const mapped = items.map(item => {
      const liveProduct = allProducts.find(p => p.name === item.product_name && p.category === item.category);
      return {
        ...item,
        id: Math.random().toString(36).substr(2, 9), // new line item UI ID
        product_id: liveProduct?.id || null, // MUST use LIVE catalogue ID
        product_name: liveProduct?.name || item.product_name,
        category: liveProduct?.category || item.category,
      };
    });
    setOrderItems(mapped);
  };

  const loadOrderForEdit = (order, allProducts) => {
    setOrderMode('edit');
    setExistingRequirementId(order.id);
    _loadItems(order.items, allProducts);
  };

  const loadOrderForReorder = (order, allProducts) => {
    setOrderMode('reorder');
    setExistingRequirementId(null); // Because we will save as a NEW order
    _loadItems(order.items, allProducts);
  };

  const addToOrderList = (product, quantity) => {
    setOrderItems((prev) => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { 
        id: Math.random().toString(36).substr(2, 9),
        product_id: product.id,
        product_name: product.name,
        category: product.category || '',
        quantity: quantity,
        unit: product.unit_of_measure || 'Bags',
        weight: product.weight || 50,
        gift: null,
        other_gift: '',
        product // Keep the reference for UI
      }];
    });
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) return;
    setOrderItems(prev => prev.map(item => 
      item.product_id === productId 
        ? { ...item, quantity: newQuantity } 
        : item
    ));
  };

  const removeFromOrderList = (productId) => {
    setOrderItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearOrderList = () => {
    setOrderItems([]);
    setOrderMode('create');
    setExistingRequirementId(null);
  };

  const totalBags = orderItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // NOTE: Server/backend must remain authoritative for actual commercial calculations
  // This is purely for local UI display estimates if prices were available.
  const totalAmount = orderItems.reduce((sum, item) => sum + (item.quantity * (item.product?.price || 0)), 0);

  return (
    <OrderListContext.Provider value={{
      orderList: orderItems,
      setOrderList: setOrderItems, // Expose setter for NewOrderScreen
      orderMode,
      existingRequirementId,
      startNewOrder,
      loadOrderForEdit,
      loadOrderForReorder,
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
