import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle } from 'lucide-react-native';

export default function OrderSuccessScreen({ route, navigation }) {
  const { orderNo, amount, bags } = route.params;

  const navigateToOrders = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }], // Assuming MainTabs is the root navigator, but we'll adapt.
    });
    // In our nested structure, we might need a specific action. For now, we go back to catalogue and let the user tap 'Orders'
    navigation.navigate('Catalogue');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <CheckCircle color="#10B981" size={80} style={{ marginBottom: 24 }} />
        
        <Text style={styles.title}>Order Ho Gaya! ✓</Text>
        <Text style={styles.subtitle}>Aapka order successfully bhej diya gaya hai.</Text>

        <View style={styles.orderCard}>
          <Text style={styles.label}>Order No:</Text>
          <Text style={styles.orderNo}>{orderNo}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.row}>
            <Text style={styles.details}>{bags} Bags</Text>
            <Text style={styles.amount}>₹{amount?.toLocaleString('en-IN')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.primaryCTA} onPress={navigateToOrders}>
          <Text style={styles.primaryCTAText}>HOME PAR JAYEIN</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 40 },
  
  orderCard: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center' },
  label: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  orderNo: { fontSize: 24, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  
  divider: { height: 1, width: '100%', backgroundColor: '#E5E7EB', marginBottom: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', alignItems: 'center' },
  details: { fontSize: 18, color: '#4B5563', fontWeight: '500' },
  amount: { fontSize: 20, color: '#111827', fontWeight: 'bold' },
  
  bottomBar: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  primaryCTA: { backgroundColor: '#F97316', paddingVertical: 18, borderRadius: 16, alignItems: 'center' },
  primaryCTAText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});
