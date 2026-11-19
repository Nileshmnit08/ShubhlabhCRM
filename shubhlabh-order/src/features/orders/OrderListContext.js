import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newClientReferenceId } from './repeatOrder.js';
import { loadDraft, saveDraft, clearDraft, revalidateDraftItems } from './orderDraftStorage.js';

const OrderListContext = createContext();
// Read-only "is there an unfinished order?" view of the cart. Its value NEVER changes identity, so
// screens that only need to ask (Home, My Orders, Order Detail, Help) do not re-render on every
// cart edit. Used by the shared order-start action (src/navigation/useOrderNavigation.js).
const OrderDraftContext = createContext(null);

export function OrderListProvider({ children }) {
  const { session, customerProfile } = useAuth();
  const partyId = customerProfile?.id || null;
  const partyIdRef = useRef(partyId);
  partyIdRef.current = partyId;

  // orderItems structure: array of objects { product: {id, name, ...}, quantity }
  const [orderItems, setOrderItems] = useState([]);
  const draftCountRef = useRef(0);
  draftCountRef.current = orderItems.length;
  const savedDraftRef = useRef(false); // a Repeat Order draft is stored on this device (see orderDraftStorage.js)
  const draftApi = useMemo(() => ({
    hasDraft: () => draftCountRef.current > 0,
    hasSavedDraft: () => savedDraftRef.current,
  }), []);
  const [orderMode, setOrderMode] = useState('create'); // 'create', 'edit', 'reorder'
  const [existingRequirementId, setExistingRequirementId] = useState(null);
  // Facts about THIS draft that are not line items (SL-ORDER-REPEAT-ORDER-02):
  //   kind 'create' | 'repeat' | 'edit'; clientReferenceId = the idempotency key of this draft (created once,
  //   so a retried submission resumes the same order instead of creating a second one); for a repeat also
  //   the delivery address of the previous order and which order it is based on. Lives next to the cart, so
  //   it survives navigation and tab switches exactly like the items do.
  const [draftMeta, setDraftMeta] = useState(() => ({ kind: 'create', clientReferenceId: newClientReferenceId() }));

  savedDraftRef.current = draftMeta.kind === 'repeat' && orderItems.length > 0;

  // Clear cart when session changes (e.g., logout). The SAVED repeat draft stays on the device for that
  // customer (it is only ever restored for the same customer).
  useEffect(() => {
    if (!session) {
      clearOrderList();
    }
  }, [session]);

  // --- Repeat Order draft persistence (SL-ORDER-REPEAT-ORDER-03) -----------------------------------------
  // Restore once per customer after sign-in / app restart, only into an EMPTY cart (never over an active draft).
  const [hydratedParty, setHydratedParty] = useState(null);
  const hydratingRef = useRef(null);
  useEffect(() => {
    if (!partyId) { hydratingRef.current = null; setHydratedParty(null); return; } // signed out: the next sign-in restores again
    if (hydratingRef.current === partyId) return;
    hydratingRef.current = partyId;
    loadDraft(AsyncStorage, partyId).then((res) => {
      if (partyIdRef.current === partyId && res.ok && draftCountRef.current === 0) {
        setOrderMode('reorder');
        setExistingRequirementId(null);
        setOrderItems(res.items);
        setDraftMeta(res.meta);
      }
    }).catch(() => {}).finally(() => {
      if (partyIdRef.current === partyId) setHydratedParty(partyId);
    });
  }, [partyId]);

  // Keep the stored copy equal to the repeat draft (every edit: quantity, removal, gifts, packaging, address).
  // A repeat draft the customer emptied is removed. Non-repeat carts are never stored.
  useEffect(() => {
    if (!partyId || hydratedParty !== partyId || draftMeta.kind !== 'repeat') return;
    if (orderItems.length > 0) saveDraft(AsyncStorage, { partyId, items: orderItems, meta: draftMeta });
    else clearDraft(AsyncStorage, partyId);
  }, [orderItems, draftMeta, partyId, hydratedParty]);

  /** Deletes the stored repeat draft only (the in-memory cart is untouched). Called once an order is placed. */
  const discardSavedDraft = () => { clearDraft(AsyncStorage, partyIdRef.current); };

  // Re-checks restored lines against the live catalogue (a product may have been removed since the draft was saved).
  const revalidateAgainst = (catalogue) => {
    setOrderItems((prev) => revalidateDraftItems(prev, catalogue));
    setDraftMeta((m) => (m.restored ? { ...m, restored: false } : m));
  };

  // Starting a new order / editing replaces the draft on purpose (the customer was asked first).
  const startNewOrder = () => {
    discardSavedDraft();
    setOrderMode('create');
    setExistingRequirementId(null);
    setOrderItems([]);
    setDraftMeta({ kind: 'create', clientReferenceId: newClientReferenceId() });
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
    discardSavedDraft();
    setOrderMode('edit');
    setExistingRequirementId(order.id);
    setDraftMeta({ kind: 'edit', clientReferenceId: newClientReferenceId() });
    _loadItems(order.items, allProducts);
  };

  // Repeat Order: the draft was built by repeatOrder.buildRepeatDraft from the VERIFIED previous order.
  // It becomes a brand-new order (no existing requirement id), so submitting it can never touch the old one.
  const loadRepeatDraft = (draft) => {
    setOrderMode('reorder');
    setExistingRequirementId(null);
    setOrderItems(draft.items);
    setDraftMeta({
      kind: 'repeat',
      clientReferenceId: draft.clientReferenceId,
      deliveryAddress: draft.deliveryAddress,
      source: draft.source,
      unavailableCount: draft.unavailableCount,
      priceChangeCount: draft.priceChangeCount,
    });
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
    setDraftMeta({ kind: 'create', clientReferenceId: newClientReferenceId() });
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
      draftMeta,
      startNewOrder,
      loadOrderForEdit,
      loadRepeatDraft,
      discardSavedDraft,
      revalidateAgainst,
      addToOrderList,
      updateQuantity,
      removeFromOrderList,
      clearOrderList,
      totalBags,
      totalAmount
    }}>
      <OrderDraftContext.Provider value={draftApi}>
        {children}
      </OrderDraftContext.Provider>
    </OrderListContext.Provider>
  );
}

export function useOrderDraft() {
  const context = useContext(OrderDraftContext);
  if (context === null) {
    throw new Error('useOrderDraft must be used within an OrderListProvider');
  }
  return context;
}

export function useOrderList() {
  const context = useContext(OrderListContext);
  if (context === undefined) {
    throw new Error('useOrderList must be used within an OrderListProvider');
  }
  return context;
}
