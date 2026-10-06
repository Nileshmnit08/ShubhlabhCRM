import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image, SafeAreaView, Alert } from 'react-native';
import { supabase } from '../../core/api/supabase';
import { useTranslation } from '../../shared/localization/i18n';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { SLCard } from '../../shared/components/SLCard';
import { SLButton } from '../../shared/components/SLButton';
import { Search, Plus, Minus, ShoppingCart } from 'lucide-react-native';
import { useOrderList } from '../orders/OrderListContext';

export default function ProductCatalogueScreen({ navigation }) {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantities, setQuantities] = useState({});
  const { addToOrderList, totalBags } = useOrderList();
  const [activeCategory, setActiveCategory] = useState('category.cattleFeed');

  const categories = [
    'category.cattleFeed',
    'category.mineralMixture',
    'category.feedSupplements',
    'category.specialProducts'
  ];

  const MOCK_PRODUCTS = [
    { id: '1', name: 'Dairy Special', category: 'category.cattleFeed', unit_of_measure: '50 KG Bag', price: 1450, scheme: 'Buy 10 get 1 free' },
    { id: '2', name: 'Calf Starter', category: 'category.cattleFeed', unit_of_measure: '50 KG Bag', price: 1250 },
    { id: '3', name: 'Mineral Product', category: 'category.mineralMixture', unit_of_measure: '25 KG Bag', price: 800 },
    { id: '4', name: 'Calcium Supplement', category: 'category.feedSupplements', unit_of_measure: '5 Ltr', price: 500 },
    { id: '5', name: 'Energy Booster', category: 'category.specialProducts', unit_of_measure: '1 Ltr', price: 300 }
  ];

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    setTimeout(() => {
      setProducts(MOCK_PRODUCTS);
      const initialQuantities = {};
      MOCK_PRODUCTS.forEach(p => {
        initialQuantities[p.id] = 1;
      });
      setQuantities(initialQuantities);
      setLoading(false);
    }, 500);
  }, []);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(p => p.category === activeCategory);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => p.name && p.name.toLowerCase().includes(query));
    }
    return filtered;
  }, [products, searchQuery, activeCategory]);

  const updateQty = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleAdd = (product) => {
    const qty = quantities[product.id] || 0;
    if (qty > 0) {
      addToOrderList(product, qty);
      // Reset back to 1 (or 0) after adding? "Result: 8 bags" is handled in OrderListContext.
      // Product Catalogue should probably reset it so they can add more, or keep it at 1. Let's keep it at 1 to match UX.
      setQuantities(prev => ({ ...prev, [product.id]: 1 }));
      Alert.alert(t('common.confirm'), t('order.confirmed'));
    }
  };

  const renderProduct = ({ item }) => {
    const qty = quantities[item.id] || 1;
    return (
      <SLCard style={styles.productCard}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => navigation.navigate('ProductDetail', { product: item })}>
          <View style={styles.imagePlaceholder}>
            {/* If product has image_url, we'd use Image */}
            <Text style={{ color: theme.colors.disabled }}>IMG</Text>
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.packSize}>{t('product.packSize')}: {item.unit_of_measure || '1 Bag'}</Text>
            <Text style={styles.price}>{t('product.price')}: ₹{item.price || '0'}</Text>
            {item.scheme && <Text style={styles.schemeText}>{t('product.scheme')}: {item.scheme}</Text>}
          </View>
        </TouchableOpacity>
        
        <View style={styles.actionRow}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity onPress={() => updateQty(item.id, -1)} style={styles.qtyBtn}>
              <Minus size={20} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity onPress={() => updateQty(item.id, 1)} style={styles.qtyBtn}>
              <Plus size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          <SLButton 
            title={t('product.addToOrder')} 
            onPress={() => handleAdd(item)} 
            style={styles.addBtn}
          />
        </View>
      </SLCard>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <SLHeader 
        title={t('profile.language') === 'Language' ? 'Product Catalogue' : 'उत्पाद सूची'} 
        showBack={false}
        rightComponent={
          <TouchableOpacity onPress={() => navigation.navigate('OrdersTab')}>
            <ShoppingCart color={theme.colors.text} size={24} />
            {totalBags > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{totalBags}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />
      
      <View style={styles.categoriesWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={categories}
          keyExtractor={item => item}
          contentContainerStyle={styles.categoriesContainer}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[styles.categoryChip, activeCategory === item && styles.categoryChipActive]}
              onPress={() => setActiveCategory(item)}
            >
              <Text style={[styles.categoryText, activeCategory === item && styles.categoryTextActive]}>
                {t(item)}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.searchContainer}>
        <Search color={theme.colors.textSecondary} size={20} />
        <TextInput 
          style={styles.searchInput}
          placeholder={t('profile.language') === 'Language' ? 'Search products...' : 'उत्पाद खोजें...'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>{t('product.emptyState')}</Text>
              <Text style={styles.emptySubtitle}>{t('product.emptyContact')}</Text>
              <SLButton 
                title={t('product.contactSupport')} 
                onPress={() => navigation.navigate('ProfileTab', { screen: 'ComplaintCenter' })}
                style={styles.contactBtn}
              />
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    height: 48,
  },
  categoriesWrapper: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  categoriesContainer: {
    paddingHorizontal: theme.spacing.md,
  },
  categoryChip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: theme.spacing.sm,
  },
  categoryChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    ...theme.typography.bodyMedium,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: theme.colors.white,
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    ...theme.typography.bodyLarge,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: theme.colors.alert,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: theme.colors.white, fontSize: 10, fontWeight: 'bold' },
  listContent: { padding: theme.spacing.md },
  productCard: { padding: theme.spacing.md },
  cardHeader: { flexDirection: 'row', marginBottom: theme.spacing.md },
  imagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  productInfo: { flex: 1 },
  productName: { ...theme.typography.h3, marginBottom: 4 },
  packSize: { ...theme.typography.bodyMedium, color: theme.colors.textSecondary },
  price: { ...theme.typography.bodyLarge, fontWeight: '600', marginTop: 4 },
  schemeText: { ...theme.typography.bodyMedium, color: theme.colors.green, marginTop: 2 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surface,
  },
  qtyBtn: { padding: theme.spacing.sm },
  qtyText: { ...theme.typography.bodyLarge, fontWeight: '600', minWidth: 32, textAlign: 'center' },
  addBtn: { flex: 1, marginLeft: theme.spacing.md },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100, paddingHorizontal: theme.spacing.xl },
  emptyTitle: { ...theme.typography.h3, color: theme.colors.text, textAlign: 'center', marginBottom: theme.spacing.sm },
  emptySubtitle: { ...theme.typography.bodyLarge, color: theme.colors.textSecondary, textAlign: 'center', marginBottom: theme.spacing.xl },
  contactBtn: { width: '100%' },
});
