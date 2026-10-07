import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClipboardList, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../core/api/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';

export default function MyOrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { customerProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [customerProfile])
  );

  const fetchOrders = async () => {
    setLoading(true);
    setError(false);
    try {
      // where RLS automatically restricts to own orders, but we also enforce it client-side.
      const { data, error: dbError } = await supabase
        .from('buyer_orders')
        .select('*, requirement_items:buyer_order_items(*, product:products(name, category))')
        .eq('customer_id', customerProfile?.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      
      const mappedData = (data || []).map(order => {
        let extras = {};
        let parsedAddress = order.delivery_address;
        try {
          const parsed = JSON.parse(order.delivery_address);
          if (parsed && parsed.extras) {
            extras = parsed.extras;
            parsedAddress = parsed.address;
          }
        } catch(e) {}

        return {
          ...order,
          delivery_address: parsedAddress,
          requirement_items: order.requirement_items?.map(item => ({
             ...item,
             product_name: item.product?.name || 'Unknown Product',
             category: item.product?.category || 'Unknown',
             unit: extras[item.product_id]?.unit || 'Bags',
             weight: extras[item.product_id]?.weight || null,
             gift: extras[item.product_id]?.gift || null,
             other_gift: extras[item.product_id]?.other_gift || null
          }))
        };
      });
      setOrders(mappedData);
    } catch (err) {
      console.warn('Error fetching orders:', err);
      setError(true);
      setOrders([]);

    } finally {
      setLoading(false);
    }
  };

  const renderOrder = ({ item }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>Order #{item.order_no}</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardBody}>
          <View>
            <Text style={styles.details}>{item.total_bags} Bags</Text>
            <Text style={styles.amount}>₹{item.final_amount?.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.actionText}>{t('profile.language') === 'Language' ? 'VIEW ORDER' : 'ऑर्डर देखें'}</Text>
          <ChevronRight color="#F28C28" size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#F28C28" />
        <Text style={styles.loadingText}>{t('profile.language') === 'Language' ? 'Loading orders...' : 'ऑर्डर लोड हो रहे हैं...'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.backButton}>
          <ArrowLeft color="#111827" size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <ClipboardList color="#9CA3AF" size={64} style={{ marginBottom: 16 }} />
            {error ? (
              <>
                <Text style={styles.emptyTitle}>{t('profile.language') === 'Language' ? 'Unable to load your orders' : 'आपके ऑर्डर लोड नहीं हो सके'}</Text>
                <TouchableOpacity style={styles.primaryCTA} onPress={fetchOrders}>
                  <Text style={styles.primaryCTAText}>{t('profile.language') === 'Language' ? 'Retry' : 'पुनः प्रयास करें'}</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>{t('profile.language') === 'Language' ? 'No orders found' : 'कोई ऑर्डर नहीं मिला'}</Text>
                <TouchableOpacity 
                  style={styles.primaryCTA} 
                  onPress={() => navigation.navigate('NewOrderTab')}
                >
                  <Text style={styles.primaryCTAText}>{t('profile.language') === 'Language' ? 'PLACE NEW ORDER' : 'नया ऑर्डर करें'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: '#4B5563' },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  backButton: { padding: 8, marginLeft: -8 },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#F9FAFB', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  orderNo: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  orderDate: { fontSize: 14, color: '#6B7280' },
  
  divider: { height: 1, backgroundColor: '#E5E7EB' },
  
  cardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  details: { fontSize: 15, color: '#4B5563', marginBottom: 4 },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  
  statusBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#D97706', fontSize: 12, fontWeight: 'bold' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  actionText: { color: '#F28C28', fontSize: 14, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: 60 },
  emptyTitle: { fontSize: 18, color: '#6B7280', marginBottom: 24, textAlign: 'center' },
  
  primaryCTA: { backgroundColor: '#F28C28', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12 },
  primaryCTAText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' }
});
