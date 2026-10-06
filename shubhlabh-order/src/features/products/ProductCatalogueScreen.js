import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, 
  TouchableOpacity, ActivityIndicator, Alert 
} from 'react-native';
import { supabase } from '../../core/api/supabase';
import { Search, Plus, Minus, MessageCircle, Package, ShoppingCart } from 'lucide-react-native';
import { useOrderList } from '../orders/OrderListContext';

export default function ProductCatalogueScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { addToOrderList, totalBags } = useOrderList();

  // Local state to track quantities per product ID BEFORE adding to order list
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: dbError } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });

      if (dbError) throw dbError;
      
      setProducts(data || []);
      
      const initialQuantities = {};
      (data || []).forEach(p => {
        initialQuantities[p.id] = 1;
      });
      setQuantities(initialQuantities);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      (p.name && p.name.toLowerCase().includes(query)) || 
      (p.category && p.category.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const updateQuantity = (id, delta) => {
    setQuantities(prev => {
      const current = prev[id] || 1;
      const next = current + delta;
      return { ...prev, [id]: Math.max(1, next) }; 
    });
  };

  const handleAddToOrder = (product) => {
    const qty = quantities[product.id] || 1;
    addToOrderList(product, qty);
    // Reset local qty to 1 after adding
    setQuantities(prev => ({ ...prev, [product.id]: 1 }));
    // Lightweight confirmation
    Alert.alert("Success", "Product order list mein jod diya gaya hai.");
  };

  const handleWhatsApp = () => {
    Alert.alert("Contact Support", "Opening WhatsApp...");
  };

  const navigateToDetail = (product) => {
    navigation.navigate('ProductDetail', { product });
  };

  const renderProduct = ({ item }) => {
    const qty = quantities[item.id] || 1;

    return (
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardHeader} onPress={() => navigateToDetail(item)}>
          <View style={styles.imagePlaceholder}>
            <Package color="#9CA3AF" size={40} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productMeta}>
              {item.category ? `${item.category} • ` : ''}
              {item.unit_of_measure || 'Bags'}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <View style={styles.qtyContainer}>
            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, -1)}>
              <Minus color="#4B5563" size={24} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(item.id, 1)}>
              <Plus color="#4B5563" size={24} />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity style={styles.addButton} onPress={() => handleAddToOrder(item)}>
            <Text style={styles.addButtonText}>ORDER MEIN JODEIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Products load ho rahe hain...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Products Load Nahi Ho Paaye</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>DOBARA KOSHISH KAREIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Products</Text>
        <TouchableOpacity style={styles.cartIconContainer} onPress={() => navigation.navigate('MeriOrderList')}>
          <ShoppingCart color="#111827" size={28} />
          {totalBags > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalBags}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Search color="#6B7280" size={20} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Product ka naam likhein"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? "Product Nahi Mila. Dusra Product Naam Try Karein" : "Abhi Koi Product Available Nahi Hai"}
            </Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={handleWhatsApp}>
        <MessageCircle color="#FFFFFF" size={28} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4B5563' },
  errorText: { fontSize: 18, color: '#DC2626', marginBottom: 16, textAlign: 'center', fontWeight: 'bold' },
  retryButton: { backgroundColor: '#F97316', padding: 16, borderRadius: 12 },
  retryButtonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  cartIconContainer: { position: 'relative', padding: 8 },
  cartBadge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#DC2626', borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  cartBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', margin: 16, borderRadius: 12, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#111827' },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  imagePlaceholder: { width: 80, height: 80, backgroundColor: '#F3F4F6', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  productMeta: { fontSize: 15, color: '#6B7280' },
  
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 16 },
  
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyButton: { padding: 12, minWidth: 52, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 8, minWidth: 24, textAlign: 'center' },
  
  addButton: { backgroundColor: '#F97316', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, marginLeft: 16, flex: 1, alignItems: 'center' },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#6B7280', textAlign: 'center', lineHeight: 24 },
  
  fab: { position: 'absolute', bottom: 20, right: 20, backgroundColor: '#10B981', width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }
});
