import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { theme } from '../../shared/theme';
import { useTranslation } from '../../shared/localization/i18n';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import { User, Store, Plus, Minus, Trash2, Edit2, ShoppingCart, CheckCircle, ArrowLeft } from 'lucide-react-native';
import SLHeader from '../../shared/components/SLHeader';
import { useProducts } from '../products/useProducts';
import { useOrderList } from './OrderListContext';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const DEFAULT_CATEGORIES = [];
const DEFAULT_PRODUCTS = [];

const WEIGHT_OPTIONS = [35, 40, 45, 50, 60];
const GIFT_OPTIONS = ['Oswal Soap', 'Katora', 'Glass', 'Spoon', 'Tea Bag', 'Others'];

export default function NewOrderScreen({ navigation, route }) {
  const { t } = useTranslation();
  const { userProfile, customerProfile } = useAuth();
  
  const buyerName = userProfile?.display_name || customerProfile?.name || "Buyer Name";
  const shopName = customerProfile?.shop_name || "Shop Name";

  const mode = route.params?.mode || 'create';
  const ts = route.params?.ts;
  const existingOrder = route.params?.previousOrder || null;

  const { products: allProducts, loading: productsLoading } = useProducts();
  const { 
    orderList: items, 
    setOrderList: setItems, 
    removeFromOrderList,
    startNewOrder,
    loadOrderForEdit,
    loadOrderForReorder,
    orderMode,
    existingRequirementId
  } = useOrderList();

  const categories = useMemo(() => {
    return [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  }, [allProducts]);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  
  const [qty, setQty] = useState(10);
  const [activeUnit, setActiveUnit] = useState('Bags');
  const [weight, setWeight] = useState(50);
  const [gift, setGift] = useState(null);
  const [otherGift, setOtherGift] = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  const initRef = useRef(null);

  useEffect(() => {
    if (categories.length > 0 && !selectedCategory) {
      setSelectedCategory(categories[0]);
    }
  }, [categories]);

  useEffect(() => {
    if (mode === 'create') {
      if (initRef.current !== ts) {
        startNewOrder();
        initRef.current = ts;
      }
    } else {
      if (allProducts.length > 0 && initRef.current !== ts) {
        if (mode === 'edit') loadOrderForEdit(existingOrder, allProducts);
        if (mode === 'reorder') loadOrderForReorder(existingOrder, allProducts);
        initRef.current = ts;
      }
    }
  }, [mode, ts, existingOrder, allProducts, startNewOrder, loadOrderForEdit, loadOrderForReorder]);

  useEffect(() => {
    // Select first product of category automatically if category changes
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

  const handleAddProduct = () => {
    if (!selectedProduct) {
      Alert.alert(t('common.error'), t('newOrder.validationSelectProduct'));
      return;
    }
    if (qty <= 0) {
      Alert.alert(t('common.error'), t('newOrder.validationQuantity'));
      return;
    }
    
    const currentProductRecord = allProducts.find(p => p.name === selectedProduct && p.category === selectedCategory);
    
    if (!currentProductRecord || !currentProductRecord.id) {
      Alert.alert(t('common.error') || 'Error', 'Invalid product selected. Must be from the live database.');
      return;
    }

    const newItems = [...items];

    if (editingItemIndex !== null && newItems[editingItemIndex]) {
        newItems[editingItemIndex].product_id = currentProductRecord.id;
        newItems[editingItemIndex].category = selectedCategory;
        newItems[editingItemIndex].product_name = currentProductRecord.name;
        newItems[editingItemIndex].quantity = qty;
        newItems[editingItemIndex].unit = activeUnit;
        newItems[editingItemIndex].weight = weight;
        newItems[editingItemIndex].gift = gift;
        newItems[editingItemIndex].other_gift = otherGift;
        setEditingItemIndex(null); 
    } else {
        const existingIndex = items.findIndex(i => i.product_id === currentProductRecord.id && i.weight === weight && i.gift === gift);
        if (existingIndex >= 0) {
           newItems[existingIndex] = {
             ...newItems[existingIndex],
             quantity: qty,
             unit: activeUnit,
             weight: weight,
             gift: gift,
             other_gift: otherGift,
             product: currentProductRecord
           };
        } else {
           newItems.push({
             id: generateId(),
             product_id: currentProductRecord.id,
             category: selectedCategory,
             product_name: currentProductRecord.name,
             quantity: qty,
             unit: activeUnit,
             weight: weight,
             gift: gift,
             other_gift: otherGift,
             product: currentProductRecord
           });
        }
    }
    setItems(newItems);
    setQty(10);
    setGift(null);
    setOtherGift('');
  };
  
  const handleRemoveItem = (index, product_id) => {
    if (product_id) {
       removeFromOrderList(product_id);
    } else {
       const newItems = [...items];
       newItems.splice(index, 1);
       setItems(newItems);
    }
  };

  const handleSave = () => {
    let finalItems = [...items];
    
    if (editingItemIndex !== null && finalItems[editingItemIndex]) {
        const currentProductRecord = allProducts.find(p => p.name === selectedProduct && p.category === selectedCategory);
        finalItems[editingItemIndex].product_id = currentProductRecord?.id || null;
        finalItems[editingItemIndex].category = selectedCategory;
        finalItems[editingItemIndex].product_name = currentProductRecord?.name || selectedProduct;
        finalItems[editingItemIndex].quantity = qty;
        finalItems[editingItemIndex].unit = activeUnit;
        finalItems[editingItemIndex].weight = weight;
        finalItems[editingItemIndex].gift = gift;
        finalItems[editingItemIndex].other_gift = otherGift;
    } else if (finalItems.length === 0) {
       Alert.alert(t('common.error'), t('newOrder.validationEmptyOrder'));
       return;
    }

    if (finalItems.length === 0) {
      Alert.alert(t('common.error'), t('newOrder.validationEmptyOrder'));
      return;
    }

    if (existingOrder) {
       let prevItems = existingOrder.items || [];
       if (typeof prevItems === 'string') {
         try { prevItems = JSON.parse(prevItems); } catch(e){}
       }
       if (Array.isArray(prevItems)) {
          const serializeForComparison = (list) => {
             return [...list].map(i => `${i.product_name}|${i.quantity}|${i.unit}|${i.weight}|${i.gift || ''}|${i.other_gift || ''}`).sort().join('::');
          };
          if (serializeForComparison(finalItems) === serializeForComparison(prevItems)) {
             Alert.alert(
                t('profile.language') === 'Language' ? "Identical Order" : "समान ऑर्डर",
                t('profile.language') === 'Language' ? "Your order is the same as your last order." : "यह ऑर्डर आपके पिछले ऑर्डर के समान है।",
                [
                  { text: t('profile.language') === 'Language' ? "Edit Order" : "ऑर्डर में बदलाव करें", style: 'cancel' },
                  { text: t('profile.language') === 'Language' ? "Place Order" : "ऑर्डर करें", onPress: () => processSave(finalItems) }
                ]
             );
             return;
          }
       }
    }
    processSave(finalItems);
  };

  const processSave = (finalItems) => {
    // Navigate to OrderReview with the assembled finalItems
    navigation.navigate('OrderReview', { finalItems, existingOrder, clearCallback: startNewOrder });
  };

  const currentCategoryProducts = allProducts.filter(p => p.category === selectedCategory);

  const handleBackPress = () => {
    if (items.length > 0) {
      Alert.alert(
        t('profile.language') === 'Language' ? 'Discard Order?' : 'ऑर्डर रद्द करें?',
        t('profile.language') === 'Language' ? 'You have items in your new order. Are you sure you want to leave?' : 'आपके नए ऑर्डर में आइटम हैं। क्या आप वाकई बाहर जाना चाहते हैं?',
        [
          { text: t('profile.language') === 'Language' ? 'KEEP EDITING' : 'बदलाव जारी रखें', style: 'cancel' },
          { 
            text: t('profile.language') === 'Language' ? 'DISCARD' : 'रद्द करें', 
            style: 'destructive', 
            onPress: () => {
              startNewOrder();
              if (navigation.canGoBack()) navigation.goBack();
              else navigation.navigate('MainTabs');
            } 
          }
        ]
      );
    } else {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('MainTabs');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <SLHeader 
        title={t('newOrder.title')} 
        showBack={true} 
        onBackPress={handleBackPress}
      />

      <View style={styles.mainContainer}>
        {/* Context Background */}
        <View style={styles.contextBox}>
          <View style={styles.contextTop}>
             <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <User size={14} color={theme.colors.primary} />
                <Text style={styles.contextActive}>{t('newOrder.customerOrder')}</Text>
             </View>
          </View>
          <View style={styles.contextContent}>
            <View>
              <Text style={styles.contextTitle}>{buyerName}</Text>
              {!!shopName && <Text style={styles.contextSubtitle}>{shopName}</Text>}
            </View>
            <Store size={28} color={theme.colors.border} />
          </View>
        </View>

        {/* Bottom Sheet Frame */}
        <View style={styles.sheetFrame}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            
            {/* Added Items Section */}
            {items.length > 0 && (
              <View style={styles.cartSection}>
                <Text style={styles.sectionLabel}>{t('newOrder.orderItems')} ({items.length})</Text>
                {items.map((item, idx) => (
                  <TouchableOpacity key={idx} style={[styles.cartItem, editingItemIndex === idx && styles.cartItemEditing]} onPress={() => {
                      setEditingItemIndex(idx);
                      setSelectedCategory(item.category);
                      setSelectedProduct(item.product_name);
                      setQty(item.quantity);
                      setActiveUnit(item.unit);
                      if (item.weight) setWeight(item.weight);
                      setGift(item.gift || null);
                      setOtherGift(item.other_gift || '');
                  }}>
                    <View style={{flex: 1}}>
                      <Text style={styles.cartItemCategory}>{t(`category.${item.category.replace(' ', '')}`) || item.category}</Text>
                      <Text style={styles.cartItemTitle}>{item.product_name}</Text>
                      <Text style={styles.cartItemQty}>{item.quantity} {item.unit} {item.weight ? `• ${item.weight} kg` : ''}</Text>
                      {item.gift && (
                         <Text style={{fontSize: 12, color: theme.colors.textSecondary, marginTop: 4}}>
                           Gift: {item.gift === 'Others' ? item.other_gift : item.gift}
                         </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => handleRemoveItem(idx, item.product_id)}>
                       <Trash2 size={24} color={theme.colors.error} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Category Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('newOrder.selectCategory')}</Text>
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
              <Text style={styles.sectionLabel}>{t('newOrder.selectProduct')}</Text>
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
                <Text style={{color: theme.colors.textSecondary}}>{t('newOrder.noProducts')}</Text>
              )}
            </ScrollView>

            {/* Quantity Stepper */}
            <View style={styles.qtySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>{t('newOrder.quantityUnit')}</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity onPress={() => setActiveUnit('Bags')} style={activeUnit === 'Bags' ? styles.unitActive : styles.unitInactive}>
                    <Text style={activeUnit === 'Bags' ? styles.unitTextActive : styles.unitTextInactive}>Bags</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveUnit('MT')} style={activeUnit === 'MT' ? styles.unitActive : styles.unitInactive}>
                    <Text style={activeUnit === 'MT' ? styles.unitTextActive : styles.unitTextInactive}>MT</Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.stepperBox}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(Math.max(1, qty - 1))}>
                  <Minus size={24} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4}}>
                    <Text style={styles.stepperValue}>{qty}</Text>
                    <Text style={styles.stepperLabel}>{activeUnit}</Text>
                  </View>
                </View>
                <TouchableOpacity style={[styles.stepperBtn, {backgroundColor: theme.colors.primary}]} onPress={() => setQty(qty + 1)}>
                  <Plus size={24} color={theme.colors.white} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Weight Selection */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>{t('newOrder.weight')}: {weight} kg</Text>
              <View style={{flexDirection: 'row', gap: 8}}>
                <TouchableOpacity onPress={() => setWeight(Math.max(1, weight - 1))} style={{backgroundColor: '#F9FAFB', borderRadius: 8, padding: 4, borderWidth: 1, borderColor: theme.colors.border}}>
                   <Minus size={20} color={theme.colors.textPrimary} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setWeight(weight + 1)} style={{backgroundColor: theme.colors.primary, borderRadius: 8, padding: 4}}>
                   <Plus size={20} color={theme.colors.white} />
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
              <Text style={styles.sectionLabel}>{t('profile.language') === 'Language' ? 'Select Gift (Optional)' : 'गिफ्ट चुनें (वैकल्पिक)'}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap: 8, paddingBottom: 16}}>
              {GIFT_OPTIONS.map(g => (
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
                  style={{ backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: theme.colors.border, color: theme.colors.textPrimary }}
                  placeholder={t('profile.language') === 'Language' ? 'Enter gift name' : 'गिफ्ट का नाम दर्ज करें'}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={otherGift}
                  onChangeText={setOtherGift}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionBlock}>
              <TouchableOpacity style={styles.addBtn} onPress={handleAddProduct}>
                {editingItemIndex !== null ? (
                  <Edit2 size={20} color={theme.colors.primary} />
                ) : (
                  <ShoppingCart size={20} color={theme.colors.primary} />
                )}
                <Text style={styles.addBtnText}>{editingItemIndex !== null ? t('newOrder.updateItem') : t('newOrder.addLine')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.saveBtn, items.length === 0 && {opacity: 0.5}]} onPress={handleSave}>
                <CheckCircle size={22} color={theme.colors.white} />
                <Text style={styles.saveBtnText}>{t('newOrder.saveOrder')}</Text>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contextBox: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  contextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contextActive: { ...theme.typography.label, color: theme.colors.primary, letterSpacing: 0.5 },
  contextContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contextTitle: { ...theme.typography.sectionTitle, color: theme.colors.textPrimary },
  contextSubtitle: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary, marginTop: 4 },

  sheetFrame: { flex: 1, backgroundColor: theme.colors.surface, borderRadius: 12, elevation: 5, overflow: 'hidden' },
  sheetScroll: { padding: 16, paddingBottom: 40 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { ...theme.typography.body, fontWeight: 'bold', color: theme.colors.textPrimary },

  cartSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16, borderColor: theme.colors.border, borderWidth: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  cartItemEditing: { borderWidth: 2, borderColor: theme.colors.primary },
  cartItemCategory: { fontSize: 10, color: theme.colors.primary, fontWeight: 'bold', textTransform: 'uppercase' },
  cartItemTitle: { fontSize: 16, fontWeight: 'bold', color: theme.colors.textPrimary, marginVertical: 2 },
  cartItemQty: { fontSize: 14, color: theme.colors.textSecondary },

  qtySection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 16, marginTop: 8 },
  unitToggle: { flexDirection: 'row', backgroundColor: theme.colors.border, borderRadius: 12, padding: 2 },
  unitActive: { backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unitInactive: { paddingHorizontal: 8, paddingVertical: 2 },
  unitTextActive: { fontSize: 11, fontWeight: 'bold', color: theme.colors.white },
  unitTextInactive: { fontSize: 11, color: theme.colors.textSecondary },
  stepperBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.surface, borderRadius: 12, padding: 6, elevation: 1, marginBottom: 4 },
  stepperBtn: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  stepperValueBox: { alignItems: 'center' },
  stepperValue: { fontSize: 26, fontWeight: '800', color: theme.colors.textPrimary },
  stepperLabel: { ...theme.typography.label, color: theme.colors.textSecondary },

  dateChipActive: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: theme.colors.primary, justifyContent: 'center', elevation: 1 },
  dateChipInactive: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: '#F9FAFB', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
  dateTextActive: { ...theme.typography.bodyMedium, fontWeight: 'bold', color: theme.colors.white },
  dateTextInactive: { ...theme.typography.bodyMedium, color: theme.colors.textPrimary },

  actionBlock: { gap: 12, marginTop: 8 },
  addBtn: { height: 50, backgroundColor: theme.colors.surface, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border },
  addBtnText: { ...theme.typography.body, fontWeight: 'bold', color: theme.colors.primary },
  saveBtn: { height: 56, backgroundColor: theme.colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { ...theme.typography.body, fontWeight: 'bold', color: theme.colors.white, textTransform: 'uppercase' },
});
