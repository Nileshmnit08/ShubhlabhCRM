import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { ArrowLeft, Plus, Minus, Trash2 } from 'lucide-react-native';
import { useOrderList } from './OrderListContext';

export default function MeriOrderListScreen({ navigation }) {
  const { orderItems, updateQuantity, removeFromOrderList, totalBags, totalAmount } = useOrderList();

  const handleRemove = (productId) => {
    Alert.alert(
      "Remove Product",
      "Is product ko order list se hatana hai?",
      [
        { text: "Nahi", style: "cancel" },
        { text: "Haan, Hatayein", onPress: () => removeFromOrderList(productId), style: "destructive" }
      ]
    );
  };

  const handleUpdateQuantity = (productId, currentQty, delta) => {
    const nextQty = currentQty + delta;
    if (nextQty < 1) {
      handleRemove(productId);
    } else {
      updateQuantity(productId, nextQty);
    }
  };

  const handleConfirmOrder = () => {
    navigation.navigate('OrderReview');
  };

  if (orderItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color="#111827" size={28} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Meri Order List</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Abhi Aapne Koi Product Nahi Chuna</Text>
          <TouchableOpacity 
            style={styles.primaryCTA} 
            onPress={() => navigation.navigate("Catalogue")}
          >
            <Text style={styles.primaryCTAText}>NAYA ORDER LAGAO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meri Order List</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {orderItems.map((item) => (
          <View key={item.product.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.product.name}</Text>
                <Text style={styles.productMeta}>
                  {item.product.unit_of_measure || 'Bags'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleRemove(item.product.id)} style={styles.removeIcon}>
                <Trash2 color="#EF4444" size={24} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.qtyContainer}>
                <TouchableOpacity style={styles.qtyButton} onPress={() => handleUpdateQuantity(item.product.id, item.quantity, -1)}>
                  <Minus color="#4B5563" size={24} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyButton} onPress={() => handleUpdateQuantity(item.product.id, item.quantity, 1)}>
                  <Plus color="#4B5563" size={24} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={styles.addMoreButton} 
          onPress={() => navigation.navigate("Catalogue")}
        >
          <Plus color="#4B5563" size={20} style={{ marginRight: 8 }} />
          <Text style={styles.addMoreText}>AUR PRODUCT JODEIN</Text>
        </TouchableOpacity>

        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>Total Products: {orderItems.length}</Text>
          <Text style={styles.summaryText}>Total Bags: {totalBags}</Text>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryCTA} onPress={handleConfirmOrder}>
          <Text style={styles.primaryCTAText}>ORDER CONFIRM KAREIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  backButton: { padding: 8, marginLeft: -8 },
  
  content: { padding: 16, paddingBottom: 100 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyTitle: { fontSize: 18, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  productMeta: { fontSize: 15, color: '#6B7280' },
  removeIcon: { padding: 4 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  qtyButton: { padding: 12, minWidth: 48, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginHorizontal: 8, minWidth: 24, textAlign: 'center' },
  
  addMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#D1D5DB', marginBottom: 24 },
  addMoreText: { fontSize: 16, fontWeight: 'bold', color: '#4B5563' },
  
  summaryBox: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 24 },
  summaryText: { fontSize: 16, color: '#1F2937', marginBottom: 8, fontWeight: '500' },
  
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryCTA: { backgroundColor: '#F97316', paddingVertical: 18, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  primaryCTAText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
