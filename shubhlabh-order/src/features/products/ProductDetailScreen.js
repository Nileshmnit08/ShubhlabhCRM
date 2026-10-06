import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Plus, Minus, Package, ShoppingCart } from 'lucide-react-native';
import { useOrderList } from '../orders/OrderListContext';

export default function ProductDetailScreen({ route, navigation }) {
  const { product } = route.params;
  const { addToOrderList } = useOrderList();
  
  const [quantity, setQuantity] = useState(1);

  const updateQuantity = (delta) => {
    setQuantity(prev => Math.max(1, prev + delta));
  };

  const handleAddToOrder = () => {
    addToOrderList(product, quantity);
    Alert.alert("Success", "Product order list mein jod diya gaya hai.", [
      { text: "Meri Order List Dekhein", onPress: () => navigation.navigate("MeriOrderList") },
      { text: "Aur Product Jodein", onPress: () => navigation.goBack(), style: "cancel" }
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Detail</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.imagePlaceholder}>
          <Package color="#9CA3AF" size={100} />
        </View>
        
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productMeta}>
          {product.category ? `${product.category} • ` : ''}
          {product.unit_of_measure || 'Bags'}
        </Text>

        <View style={styles.divider} />
        
        {/* Price safely omitted since it's not strictly available for this user on DB */}
        
        <View style={styles.quantitySection}>
          <Text style={styles.sectionTitle}>Quantity</Text>
          <View style={styles.qtyContainer}>
            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(-1)}>
              <Minus color="#4B5563" size={32} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyButton} onPress={() => updateQuantity(1)}>
              <Plus color="#4B5563" size={32} />
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryCTA} onPress={handleAddToOrder}>
          <ShoppingCart color="#FFFFFF" size={24} style={{ marginRight: 8 }} />
          <Text style={styles.primaryCTAText}>ORDER MEIN JODEIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  backButton: { padding: 8, marginLeft: -8 },
  
  content: { padding: 20, paddingBottom: 100 },
  
  imagePlaceholder: { width: '100%', height: 240, backgroundColor: '#F3F4F6', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  
  productName: { fontSize: 28, fontWeight: 'bold', color: '#1F2937', marginBottom: 8 },
  productMeta: { fontSize: 18, color: '#6B7280' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 24 },
  
  quantitySection: { alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#4B5563', marginBottom: 16 },
  
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyButton: { padding: 20, minWidth: 64, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginHorizontal: 16, minWidth: 40, textAlign: 'center' },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryCTA: { backgroundColor: '#F97316', paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  primaryCTAText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
