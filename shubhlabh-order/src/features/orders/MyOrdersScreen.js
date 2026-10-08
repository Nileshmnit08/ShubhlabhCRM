import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClipboardList, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../../core/api/supabase';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';
import { theme } from '../../shared/theme';
import SLStatusBadge from '../../shared/components/SLStatusBadge';

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

    if (!customerProfile?.id) {
      console.warn('No customer identity found for My Orders');
      setError(true);
      setLoading(false);
      return;
    }

    try {
      const { data, error: dbError } = await supabase
        .from('requirements')
        .select('*, requirement_items(*)')
        .eq('party_id', customerProfile?.id)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;
      
      const mappedData = (data || []).map(order => {
        let extras = {};
        let parsedAddress = order.notes || '';
        try {
          const parsed = JSON.parse(order.notes);
          if (parsed && parsed.extras) {
            extras = parsed.extras;
            parsedAddress = parsed.address;
          }
        } catch(e) {}

        return {
          ...order,
          order_no: order.demand_ref || 'PENDING',
          delivery_address: parsedAddress,
          requirement_items: order.requirement_items?.map(item => {
             const key = `${item.category}_${item.product_name}`;
             return {
               ...item,
               product_name: item.product_name || 'Unknown Product',
               category: item.category || 'Unknown',
               unit: item.unit || extras[key]?.unit || 'Bags',
               quantity: item.quantity,
               weight: extras[key]?.weight || null,
               gift: extras[key]?.gift || null,
               other_gift: extras[key]?.other_gift || null
             };
          })
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

  const getStatusColor = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISPATCHED' || s === 'DELIVERED' || s === 'RECEIVED') return 'success';
    if (s === 'NEW' || s === 'CONFIRMED' || s === 'PROCESSING') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  const renderOrder = ({ item }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const items = item.requirement_items || [];
    const displayItems = items.slice(0, 2);
    const remainingCount = items.length - 2;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}
        activeOpacity={0.8}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderNo}>Order #{item.order_no || item.id?.substring(0,6)}</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
        </View>

        <View style={styles.cardBody}>
          {displayItems.map((prod, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {prod.category && prod.product_name ? `${prod.category} · ${prod.product_name}` : prod.product_name}
              </Text>
              <Text style={styles.itemQuantity}>
                {prod.quantity} {prod.unit || 'Bags'}
              </Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <Text style={styles.moreItemsText}>+ {remainingCount} more items</Text>
          )}

          <View style={styles.statusRow}>
            <SLStatusBadge status={getStatusColor(item.status)} text={(item.status || 'NEW').toUpperCase()} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.actionText}>{t('profile.language') === 'Language' ? 'View Order' : 'ऑर्डर देखें'}</Text>
          <ChevronRight color={theme.colors.primary} size={20} />
        </View>
      </TouchableOpacity>
    );
  };

  const [activeTab, setActiveTab] = useState('ACTIVE');

  const activeOrders = orders.filter(o => {
    const status = (o.status || '').toUpperCase();
    return status !== 'DISPATCHED' && status !== 'DELIVERED' && status !== 'RECEIVED' && status !== 'CANCELLED';
  });

  const receivedOrders = orders.filter(o => {
    const status = (o.status || '').toUpperCase();
    return status === 'DISPATCHED' || status === 'DELIVERED' || status === 'RECEIVED';
  });

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : receivedOrders;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} style={styles.backButton}>
          <ArrowLeft color={theme.colors.textPrimary} size={28} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर'}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? 'ACTIVE' : 'सक्रिय'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'RECEIVED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('RECEIVED')}
        >
          <Text style={[styles.tabText, activeTab === 'RECEIVED' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? 'RECEIVED' : 'प्राप्त'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{t('profile.language') === 'Language' ? 'Loading orders...' : 'ऑर्डर लोड हो रहे हैं...'}</Text>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          onRefresh={fetchOrders}
          refreshing={loading}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <ClipboardList color={theme.colors.textMuted} size={64} style={{ marginBottom: 16 }} />
              {error ? (
                <>
                  <Text style={styles.emptyTitle}>{t('profile.language') === 'Language' ? 'Unable to load your orders' : 'आपके ऑर्डर लोड नहीं हो सके'}</Text>
                  <TouchableOpacity style={styles.primaryCTA} onPress={fetchOrders}>
                    <Text style={styles.primaryCTAText}>{t('profile.language') === 'Language' ? 'Retry' : 'पुनः प्रयास करें'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'ACTIVE' 
                      ? (t('profile.language') === 'Language' ? 'No active orders' : 'कोई सक्रिय ऑर्डर नहीं') 
                      : (t('profile.language') === 'Language' ? 'No received orders yet' : 'अभी तक कोई प्राप्त ऑर्डर नहीं')}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'ACTIVE'
                      ? (t('profile.language') === 'Language' ? 'Your new order will appear here once placed.' : 'आपका नया ऑर्डर यहाँ दिखाई देगा।')
                      : (t('profile.language') === 'Language' ? 'Your dispatched orders will appear here.' : 'आपके भेजे गए ऑर्डर यहाँ दिखाई देंगे।')}
                  </Text>
                  {activeTab === 'ACTIVE' && (
                    <TouchableOpacity 
                      style={styles.primaryCTA} 
                      onPress={() => navigation.navigate('NewOrderTab')}
                    >
                      <Text style={styles.primaryCTAText}>{t('profile.language') === 'Language' ? 'Place New Order' : 'नया ऑर्डर करें'}</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background, padding: 20 },
  loadingText: { marginTop: 16, fontSize: 16, color: theme.colors.textSecondary },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 60, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.textPrimary },
  backButton: { padding: 8, marginLeft: -8 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  tabButton: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: 'bold', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  
  listContent: { padding: 16, paddingBottom: 100 },
  
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.card, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', ...theme.elevation.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingBottom: 12 },
  orderNo: { fontSize: 16, fontWeight: '600', color: theme.colors.textPrimary },
  orderDate: { fontSize: 13, color: theme.colors.textSecondary },
  
  cardBody: { paddingHorizontal: 16, paddingBottom: 16 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  itemName: { fontSize: 15, color: theme.colors.textPrimary, flex: 1, paddingRight: 8 },
  itemQuantity: { fontSize: 14, fontWeight: '500', color: theme.colors.textPrimary },
  moreItemsText: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  
  statusRow: { marginTop: 12, alignItems: 'flex-start' },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border, backgroundColor: theme.colors.surface },
  actionText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 24, textAlign: 'center' },
  
  primaryCTA: { backgroundColor: theme.colors.primary, paddingVertical: 14, paddingHorizontal: 24, borderRadius: theme.radius.button },
  primaryCTAText: { color: theme.colors.white, fontSize: 16, fontWeight: '600' },
});
