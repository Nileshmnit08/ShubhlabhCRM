import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../core/api/supabase';

export default function OrderDetailScreen({ route, navigation }) {
  const initialOrder = route.params?.order || {};
  const orderId = route.params?.orderId || initialOrder.id;
  
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(!initialOrder.id);

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails();
    }
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('buyer_orders')
        .select('*, requirement_items:buyer_order_items(*, product:products(name, category))')
        .eq('id', orderId)
        .single();
        
      if (data) {
        let extras = {};
        let parsedAddress = data.delivery_address;
        try {
          const parsed = JSON.parse(data.delivery_address);
          if (parsed && parsed.extras) {
            extras = parsed.extras;
            parsedAddress = parsed.address;
          }
        } catch(e) {}

        const mappedOrder = {
          ...data,
          delivery_address: parsedAddress,
          requirement_items: data.requirement_items?.map(item => ({
             ...item,
             product_name: item.product?.name || 'Unknown Product',
             category: item.product?.category || 'Unknown',
             unit: extras[item.product_id]?.unit || 'Bags',
             weight: extras[item.product_id]?.weight || null,
             gift: extras[item.product_id]?.gift || null,
             other_gift: extras[item.product_id]?.other_gift || null
          }))
        };
        setOrder(mappedOrder);
      }
    } catch (err) {
      console.warn('Failed to fetch order details:', err);
    } finally {
      setLoading(false);
    }
  };

  let formattedDate = 'Unknown Date';
  if (order.created_at) {
    const d = new Date(order.created_at);
    // Format: 06 Oct 2026 • 4:18 PM
    const datePart = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timePart = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    formattedDate = `${datePart} • ${timePart}`;
  }

  let items = order.requirement_items || order.items || order.order_items || [];
  if (typeof items === 'string') {
    try { items = JSON.parse(items); } catch(e){}
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Detail</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
          <ActivityIndicator size="large" color="#F28C28" />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Order No:</Text>
            <Text style={styles.value}>{order.order_no}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{formattedDate}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Status:</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{order.status}</Text>
            </View>
          </View>
        </View>

        {items && items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Items</Text>
            {items.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={{flex: 1}}>
                  <Text style={styles.itemTitle}>{item.product_name}</Text>
                  <Text style={styles.itemSub}>{item.quantity} {item.unit || 'Bags'} {item.weight ? `• ${item.weight} KG` : ''}</Text>
                  {item.gift && (
                    <Text style={styles.itemGift}>Gift: {item.gift === 'Others' ? item.other_gift : item.gift}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Total Bags:</Text>
            <Text style={styles.value}>{order.total_bags}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.label}>Final Amount:</Text>
            <Text style={styles.finalAmount}>₹{order.final_amount?.toLocaleString('en-IN')}</Text>
          </View>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery</Text>
          <Text style={styles.value}>{order.delivery_address || 'Saved Address'}</Text>
        </View>

        {order.status !== 'DISPATCHED' && order.status !== 'DELIVERED' && order.status !== 'RECEIVED' && (
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => navigation.navigate('NewOrderTab', { screen: 'NewOrderMain', params: { previousOrder: order } })}
          >
            <Text style={styles.editBtnText}>Edit Order</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  backButton: { padding: 8, marginLeft: -8 },
  
  content: { padding: 16, paddingBottom: 40 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 16 },
  
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, color: '#6B7280' },
  value: { fontSize: 16, color: '#111827', fontWeight: '500' },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  
  statusBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
  
  finalAmount: { fontSize: 18, fontWeight: 'bold', color: '#F28C28' },
  
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  itemSub: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  itemGift: { fontSize: 13, color: '#4B5563', marginTop: 4, fontStyle: 'italic' },
  
  editBtn: { backgroundColor: '#F28C28', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  editBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
