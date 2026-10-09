import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { useVisit } from '../context/VisitContext';
import { useAuth } from '../context/AuthContext';
import { SyncService } from '../services/SyncService';
import { supabase } from '../lib/supabase';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const DEFAULT_CATEGORIES = ['Mix', 'Pallet', 'Churi', 'Daliya'];
const DEFAULT_PRODUCTS = [
    {name: 'Dry Mix', category: 'Mix'},
    {name: 'Lapti Mix', category: 'Mix'},
    {name: 'Naman', category: 'Pallet'},
    {name: 'Gori', category: 'Pallet'},
    {name: 'Shubh Labh', category: 'Pallet'},
    {name: 'Diamond', category: 'Pallet'},
    {name: '8000', category: 'Pallet'},
    {name: 'Chana Churi', category: 'Churi'},
    {name: 'Soya Churi', category: 'Churi'},
    {name: 'Makka Aata', category: 'Churi'},
    {name: 'Makka Daliya', category: 'Daliya'},
    {name: 'Wheat Daliya', category: 'Daliya'}
];

export function QuickRequirementScreen({ navigation, route }) {
  const { activeVisit, saveRequirement } = useVisit();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const customerName = route.params?.customerName || 'Customer';
  const customerId = route.params?.customerId || null;
  const existingOrder = route.params?.existingOrder || null;

  let parsedExtras = {};
  try {
     if (existingOrder?.notes) {
         const notesObj = JSON.parse(existingOrder.notes);
         if (notesObj && notesObj.extras) parsedExtras = notesObj.extras;
     }
  } catch(e) {}

  const initialItem = existingOrder?.requirement_items?.[0];
  const initialExtra = initialItem ? (parsedExtras[`${initialItem.category}_${initialItem.product_name}`] || {}) : {};

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [allProducts, setAllProducts] = useState(DEFAULT_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState(initialItem?.category || DEFAULT_CATEGORIES[0]);
  const [selectedProduct, setSelectedProduct] = useState(
    initialItem ? (initialItem.product_name.includes(' (') ? initialItem.product_name.split(' (')[0] : initialItem.product_name) : null
  );
  
  const [qty, setQty] = useState(initialItem?.quantity || 10);
  const [activeUnit, setActiveUnit] = useState(initialItem?.unit || 'Bags');
  const [items, setItems] = useState([]);
  const [weight, setWeight] = useState(initialExtra.weight || initialItem?.weight || 50);
  const [gift, setGift] = useState(initialExtra.gift || initialItem?.gift || null);
  const [otherGift, setOtherGift] = useState(initialExtra.other_gift || initialItem?.other_gift || '');
  const [editingItemIndex, setEditingItemIndex] = useState(existingOrder?.requirement_items?.length > 0 ? 0 : null);
  useEffect(() => {
    fetchProducts();
    if (existingOrder && existingOrder.requirement_items) {
      setItems(existingOrder.requirement_items.map(item => {
        const key = `${item.category}_${item.product_name}`;
        const extra = parsedExtras[key] || {};
        return {
          id: item.id,
          category: item.category,
          product_name: item.product_name,
          quantity: item.quantity,
          unit: item.unit,
          weight: extra.weight || item.weight,
          gift: extra.gift || item.gift,
          other_gift: extra.other_gift || item.other_gift
        };
      }));
    }
        gift: item.gift,
        other_gift: item.other_gift
      })));
    }
  }, []);

  useEffect(() => {
    // Select first product of category automatically if category changes
    // Only overwrite if current product is not in the newly selected category
    const catProducts = allProducts.filter(p => p.category === selectedCategory);
    if (catProducts.length > 0) {
      const isValidCurrent = catProducts.find(p => p.name === selectedProduct);
      if (!isValidCurrent) {
        setSelectedProduct(catProducts[0].name);
      }
    } else {
      setSelectedProduct(null);
    }
  }, [selectedCategory, allProducts]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('active', true).order('name');
      if (data && data.length > 0) {
        setAllProducts(data);
        const uniqueCategories = [...new Set(data.map(p => p.category).filter(Boolean))];
        if (uniqueCategories.length > 0) setCategories(uniqueCategories);
        await AsyncStorage.setItem('@catalog_products', JSON.stringify(data));
      } else {
        await loadCachedProducts();
      }
    } catch (e) {
      await loadCachedProducts();
    }
  };

  const loadCachedProducts = async () => {
    try {
      const cached = await AsyncStorage.getItem('@catalog_products');
      if (cached) {
        const parsed = JSON.parse(cached);
        setAllProducts(parsed);
        const uniqueCategories = [...new Set(parsed.map(p => p.category).filter(Boolean))];
        if (uniqueCategories.length > 0) setCategories(uniqueCategories);
      }
    } catch (e) {
      console.log('Failed to load cached products');
    }
  };

  const WEIGHT_OPTIONS = [35, 40, 45, 50, 60];

  const handleAddProduct = () => {
    if (!selectedProduct) {
      alert('Please select a product.');
      return;
    }
    if (qty <= 0) {
      alert('Quantity must be greater than zero.');
      return;
    }
    
    const pNameWithWeight = `${selectedProduct} (${weight} kg)`;
    const newItems = [...items];

    if (editingItemIndex !== null && newItems[editingItemIndex]) {
        // Update the explicitly selected item
        newItems[editingItemIndex].category = selectedCategory;
        newItems[editingItemIndex].product_name = pNameWithWeight;
        newItems[editingItemIndex].quantity = qty;
        newItems[editingItemIndex].unit = activeUnit;
        newItems[editingItemIndex].weight = weight;
        newItems[editingItemIndex].gift = gift;
        newItems[editingItemIndex].other_gift = otherGift;
        setEditingItemIndex(null); // Clear after updating
    } else {
        // Check for duplicates
        const existingIndex = items.findIndex(i => i.product_name === pNameWithWeight || i.product_name === selectedProduct || i.product_name.startsWith(selectedProduct + ' ('));
        if (existingIndex >= 0) {
           newItems[existingIndex].quantity = qty;
           newItems[existingIndex].unit = activeUnit;
           newItems[existingIndex].weight = weight;
           newItems[existingIndex].product_name = pNameWithWeight;
           newItems[existingIndex].gift = gift;
           newItems[existingIndex].other_gift = otherGift;
        } else {
           newItems.push({
             category: selectedCategory,
             product_name: pNameWithWeight,
             quantity: qty,
             unit: activeUnit,
             weight: weight,
             gift: gift,
             other_gift: otherGift
           });
        }
    }
    
    setItems(newItems);
    setQty(10);
    setGift(null);
    setOtherGift('');
  };
  
  const handleRemoveItem = (index) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const handleSave = async () => {
    let finalItems = [...items];
    
    // Auto-update the currently editing item if the user didn't explicitly press "UPDATE ITEM"
    // This allows true edit-in-place without requiring the user to tap ADD PRODUCT
    if (editingItemIndex !== null && finalItems[editingItemIndex]) {
        const pNameWithWeight = `${selectedProduct} (${weight} kg)`;
        finalItems[editingItemIndex].category = selectedCategory;
        finalItems[editingItemIndex].product_name = pNameWithWeight;
        finalItems[editingItemIndex].quantity = qty;
        finalItems[editingItemIndex].unit = activeUnit;
        finalItems[editingItemIndex].weight = weight;
        finalItems[editingItemIndex].gift = gift;
        finalItems[editingItemIndex].other_gift = otherGift;
    } else if (finalItems.length === 0 && selectedProduct) {
         finalItems.push({
             category: selectedCategory,
             product_name: `${selectedProduct} (${weight} kg)`,
             quantity: qty,
             unit: activeUnit,
             weight: weight,
             gift: gift,
             other_gift: otherGift
         });
    }

    if (finalItems.length === 0) {
      alert('Please add at least one product to the order.');
      return;
    }
    
    try {
      const headerId = existingOrder ? existingOrder.id : generateId();
      const party_id = existingOrder ? existingOrder.party_id : (customerId || activeVisit?.party_id);
      
      if (!userId || !party_id) {
        alert('Missing user or customer context. Cannot save order.');
        return;
      }
      
      const itemExtras = {};
      finalItems.forEach(item => {
        const key = `${item.category}_${item.product_name}`;
        itemExtras[key] = {
          gift: item.gift || null,
          other_gift: item.other_gift || null,
          weight: item.weight || null,
          unit: item.unit || 'Bags'
        };
      });

      const clientRef = 'ref-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      let newNotesStr = null;
      try {
        const baseNotes = existingOrder?.notes ? JSON.parse(existingOrder.notes) : {};
        baseNotes.extras = itemExtras;
        baseNotes.client_reference_id = baseNotes.client_reference_id || clientRef;
        newNotesStr = JSON.stringify(baseNotes);
      } catch (e) {
        newNotesStr = JSON.stringify({ extras: itemExtras, client_reference_id: clientRef });
      }

      const reqPayload = {
        id: headerId,
        party_id: party_id,
        status: 'New',
        expected_date: existingOrder ? existingOrder.expected_date : new Date().toISOString().split('T')[0],
        notes: newNotesStr,
        requirement_items: finalItems.map(item => ({
            id: item.id || generateId(),
            requirement_id: headerId,
            category: item.category,
            product_name: item.product_name,
            quantity: item.quantity,
            unit: item.unit,
            weight: item.weight,
            gift: item.gift,
            other_gift: item.other_gift
        }))
      };

      if (activeVisit && !existingOrder) {
         // Part of a visit AND it's a new order: defer to finishVisit
         await saveRequirement(reqPayload);
      } else {
         const actionType = existingOrder ? 'update' : 'upsert';
         // Standalone demand or Edit: enqueue directly
         await SyncService.enqueueOperation('requirements', {
            id: reqPayload.id,
            party_id: reqPayload.party_id,
            status: reqPayload.status,
            expected_date: reqPayload.expected_date,
            notes: reqPayload.notes,
            quantity: 1, // Satisfy req_positive_values constraint
            product_type: 'General Requirement',
            assigned_to: userId
         }, userId, actionType);
         for (const item of reqPayload.requirement_items) {
            const dbItem = {
               id: item.id,
               requirement_id: item.requirement_id,
               category: item.category,
               product_name: item.product_name,
               quantity: item.quantity,
               unit: item.unit
            };
            await SyncService.enqueueOperation('requirement_items', dbItem, userId, 'upsert');
         }
         
         if (existingOrder && existingOrder.requirement_items) {
             const finalItemIds = new Set(reqPayload.requirement_items.map(i => i.id));
             for (const oldItem of existingOrder.requirement_items) {
                 if (!finalItemIds.has(oldItem.id)) {
                     await SyncService.enqueueOperation('requirement_items', { id: oldItem.id }, userId, 'delete');
                 }
             }
         }
      }
      
      // Success feedback
      navigation.replace('OrderConfirmation', {
        order: reqPayload,
        customerName: customerName,
        customerMobile: route.params?.customerMobile || existingOrder?.crm_parties?.mobile
      });
    } catch (e) {
      console.error(e);
      alert('Failed to save order');
    }
  };


  const currentCategoryProducts = allProducts.filter(p => p.category === selectedCategory);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerLogoText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerPageTitle}>New Order</Text>
          </View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Context Background Simulator */}
        <View style={styles.contextBox}>
          <View style={styles.contextTop}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialIcons name="person" size={14} color={colors.primary} />
                <Text style={styles.contextActive}>CUSTOMER ORDER</Text>
             </View>
          </View>
          <View style={styles.contextContent}>
            <View>
              <Text style={styles.contextTitle}>{customerName}</Text>
            </View>
            <MaterialIcons name="store" size={28} color={colors.outlineVariant} />
          </View>
        </View>

        {/* Bottom Sheet Frame */}
        <View style={styles.sheetFrame}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            
            {/* Added Items Section */}
            {items.length > 0 && (
              <View style={styles.cartSection}>
                <Text style={styles.sectionLabel}>Order Items ({items.length})</Text>
                {items.map((item, idx) => (
                  <TouchableOpacity key={idx} style={[styles.cartItem, editingItemIndex === idx && styles.cartItemEditing]} onPress={() => {
                      setEditingItemIndex(idx);
                      setSelectedCategory(item.category);
                      setSelectedProduct(item.product_name.split(' (')[0]);
                      setQty(item.quantity);
                      setActiveUnit(item.unit);
                      if (item.weight) setWeight(item.weight);
                      setGift(item.gift || null);
                      setOtherGift(item.other_gift || '');
                  }}>
                    <View style={{flex: 1}}>
                      <Text style={styles.cartItemCategory}>{item.category}</Text>
                      <Text style={styles.cartItemTitle}>{item.product_name}</Text>
                      <Text style={styles.cartItemQty}>{item.quantity} {item.unit}</Text>
                      {item.gift && (
                         <Text style={{fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4}}>
                           Gift: {item.gift === 'Others' ? item.other_gift : item.gift}
                         </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                       <MaterialIcons name="delete-outline" size={24} color={colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Select Category</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 16}}>
              {categories.map(c => (
                <TouchableOpacity 
                  key={c} 
                  style={selectedCategory === c ? styles.dateChipActive : styles.dateChipInactive}
                  onPress={() => setSelectedCategory(c)}
                >
                  <Text style={selectedCategory === c ? styles.dateTextActive : styles.dateTextInactive}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Product Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Select Product</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 16}}>
              {currentCategoryProducts.length > 0 ? currentCategoryProducts.map(p => (
                <TouchableOpacity 
                  key={p.name} 
                  style={selectedProduct === p.name ? styles.dateChipActive : styles.dateChipInactive}
                  onPress={() => setSelectedProduct(p.name)}
                >
                  <Text style={selectedProduct === p.name ? styles.dateTextActive : styles.dateTextInactive}>{p.name}</Text>
                </TouchableOpacity>
              )) : (
                <Text style={{color: colors.onSurfaceVariant}}>No products in this category.</Text>
              )}
            </ScrollView>

            {/* Quantity Stepper */}
            <View style={styles.qtySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Quantity & Unit</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity onPress={() => setActiveUnit('Bags')} style={activeUnit === 'Bags' ? styles.unitActive : styles.unitInactive}><Text style={activeUnit === 'Bags' ? styles.unitTextActive : styles.unitTextInactive}>Bags</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveUnit('MT')} style={activeUnit === 'MT' ? styles.unitActive : styles.unitInactive}><Text style={activeUnit === 'MT' ? styles.unitTextActive : styles.unitTextInactive}>MT</Text></TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.stepperBox}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                  <MaterialIcons name="remove" size={24} color={colors.onSurface} />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4}}>
                    <Text style={styles.stepperValue}>{qty}</Text>
                    <Text style={styles.stepperLabel}>{activeUnit}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.stepperBtn, {backgroundColor: colors.primary}]} onPress={() => setQty(qty + 1)}>
                  <MaterialIcons name="add" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Weight: {weight} kg</Text>
              <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity onPress={() => setWeight(Math.max(1, weight - 1))} style={{backgroundColor: colors.surfaceContainer, borderRadius: 8, padding: 4}}>
                   <MaterialIcons name="remove" size={20} color={colors.onSurface} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setWeight(weight + 1)} style={{backgroundColor: colors.primary, borderRadius: 8, padding: 4}}>
                   <MaterialIcons name="add" size={20} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 16}}>
              {WEIGHT_OPTIONS.map(w => (
                <TouchableOpacity 
                  key={w} 
                  style={weight === w ? styles.dateChipActive : styles.dateChipInactive}
                  onPress={() => setWeight(w)}
                >
                  <Text style={weight === w ? styles.dateTextActive : styles.dateTextInactive}>{w} kg</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Gift Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Select Gift (Optional)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 16}}>
              {['Oswal Soap', 'Katora', 'Glass', 'Spoon', 'Tea Bag', 'Others'].map(g => (
                <TouchableOpacity 
                  key={g} 
                  style={gift === g ? styles.dateChipActive : styles.dateChipInactive}
                  onPress={() => setGift(gift === g ? null : g)}
                >
                  <Text style={gift === g ? styles.dateTextActive : styles.dateTextInactive}>{g}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {gift === 'Others' && (
              <View style={{marginBottom: 16}}>
                <TextInput
                  style={{ backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: colors.outlineVariant, color: colors.onSurface }}
                  placeholder="Enter gift name"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={otherGift}
                  onChangeText={setOtherGift}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionBlock}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
                <MaterialIcons name={editingItemIndex !== null ? "edit" : "add-shopping-cart"} size={20} color={colors.primary} />
                <Text style={styles.addBtnText}>{editingItemIndex !== null ? "UPDATE ITEM" : "ADD LINE"}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.saveBtn, items.length === 0 && !selectedProduct && {opacity: 0.5}]} onPress={handleSave}>
                <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />
                <Text style={styles.saveBtnText}>save order</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, backgroundColor: colors.background },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerLogoText: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contextBox: { backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 16, marginBottom: 12 },
  contextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contextActive: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.5 },
  contextContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contextTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },

  sheetFrame: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, elevation: 5, overflow: 'hidden' },
  sheetScroll: { padding: 16, paddingBottom: 40 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },

  cartSection: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, marginBottom: 16, borderColor: colors.outlineVariant, borderWidth: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  cartItemEditing: { borderWidth: 2, borderColor: colors.primary },
  cartItemCategory: { fontSize: 10, color: colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  cartItemTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface, marginVertical: 2 },
  cartItemQty: { fontSize: 14, color: colors.onSurfaceVariant },

  qtySection: { backgroundColor: colors.surfaceContainerLow, borderRadius: 12, padding: 12, marginBottom: 16, marginTop: 8 },
  unitToggle: { flexDirection: 'row', backgroundColor: colors.surfaceContainer, borderRadius: 12, padding: 2 },
  unitActive: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unitInactive: { paddingHorizontal: 8, paddingVertical: 2 },
  unitTextActive: { fontSize: 11, fontWeight: 'bold', color: colors.onPrimary },
  unitTextInactive: { fontSize: 11, color: colors.onSurfaceVariant },
  stepperBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 12, padding: 6, elevation: 1, marginBottom: 4 },
  stepperBtn: { width: 52, height: 52, borderRadius: 8, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  stepperValueBox: { alignItems: 'center' },
  stepperValue: { fontSize: 26, fontWeight: '800', color: colors.onSurface },
  stepperLabel: { ...typography.labelMd, fontWeight: '600', color: colors.onSurfaceVariant },

  dateChipActive: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', elevation: 1 },
  dateChipInactive: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surfaceContainerLow, justifyContent: 'center' },
  dateTextActive: { ...typography.labelMd, fontWeight: 'bold', color: colors.onPrimary },
  dateTextInactive: { ...typography.labelMd, color: colors.onSurface },

  actionBlock: { gap: 12, marginTop: 8 },
  addBtn: { height: 50, backgroundColor: colors.surfaceContainer, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  addBtnText: { ...typography.labelLg, fontWeight: 'bold', color: colors.primary },
  saveBtn: { height: 56, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
});
