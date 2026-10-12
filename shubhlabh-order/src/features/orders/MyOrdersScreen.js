import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ClipboardList, ChevronRight, ArrowLeft, Package, Truck, Calendar } from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getOrdersByParty } from './OrderService';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../../shared/localization/i18n';
import { theme } from '../../shared/theme';
import SLStatusBadge from '../../shared/components/SLStatusBadge';

export default function MyOrdersScreen({ navigation }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const { customerProfile } = useAuth();

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [customerProfile])
  );

  const fetchOrders = async () => {
    if (!customerProfile?.id) {
      console.warn('No customer identity found for My Orders');
      setError(true);
      setLoading(false);
      return;
    }

    try {
      setError(false);
      const mappedData = await getOrdersByParty(customerProfile?.id);
      setOrders(mappedData || []);
    } catch (err) {
      console.warn('Error fetching orders:', err);
      setError(true);
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusBadgeType = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DISPATCHED' || s === 'DELIVERED' || s === 'RECEIVED') return 'success';
    if (s === 'PARTIALLY DISPATCHED') return 'info';
    if (s === 'NEW' || s === 'CONFIRMED' || s === 'PROCESSING') return 'warning';
    if (s === 'CANCELLED') return 'error';
    return 'default';
  };

  const getStatusDisplayLabel = (status) => {
    const s = (status || 'NEW').toUpperCase();
    const isHi = t('profile.language') !== 'Language';
    switch (s) {
      case 'NEW': return isHi ? 'नया ऑर्डर' : 'NEW';
      case 'CONFIRMED': return isHi ? 'स्वीकृत' : 'CONFIRMED';
      case 'PROCESSING': return isHi ? 'तैयार हो रहा है' : 'PROCESSING';
      case 'PARTIALLY DISPATCHED': return isHi ? 'आंशिक भेजा गया' : 'PARTIALLY DISPATCHED';
      case 'DISPATCHED': return isHi ? 'भेज दिया गया' : 'DISPATCHED';
      case 'DELIVERED': return isHi ? 'डिलीवर हुआ' : 'DELIVERED';
      case 'RECEIVED': return isHi ? 'प्राप्त हुआ' : 'RECEIVED';
      case 'CANCELLED': return isHi ? 'रद्द' : 'CANCELLED';
      default: return s;
    }
  };

  // Lifecycle tab separation:
  // Active: Orders still requiring action or in progress (New, Confirmed, Processing, Partially Dispatched)
  // Received: Orders dispatched, delivered, or completed
  const activeOrders = orders.filter(o => {
    const s = (o.status || '').toUpperCase();
    return s === 'NEW' || s === 'CONFIRMED' || s === 'PROCESSING' || s === 'PARTIALLY DISPATCHED';
  });

  const receivedOrders = orders.filter(o => {
    const s = (o.status || '').toUpperCase();
    return s === 'DISPATCHED' || s === 'DELIVERED' || s === 'RECEIVED' || s === 'CLOSED' || s === 'CANCELLED';
  });

  const displayedOrders = activeTab === 'ACTIVE' ? activeOrders : receivedOrders;

  const renderOrder = ({ item }) => {
    const formattedDate = item.created_at ? new Date(item.created_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }) : '';

    const items = item.items || [];
    const displayItems = items.slice(0, 2);
    const remainingCount = items.length - 2;
    const isDispatched = item.status === 'DISPATCHED' || item.status === 'DELIVERED' || item.status === 'PARTIALLY DISPATCHED';
    const latestDisp = item.latest_dispatch;

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id, order: item })}
        activeOpacity={0.85}
      >
        {/* Card Header: Order No, Date, Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.orderNo}>Order #{item.order_no || item.id?.substring(0,6)}</Text>
            <View style={styles.dateRow}>
              <Calendar size={13} color={theme.colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.orderDate}>{formattedDate}</Text>
            </View>
          </View>
          <SLStatusBadge 
            status={getStatusBadgeType(item.status)} 
            text={getStatusDisplayLabel(item.status)} 
          />
        </View>

        {/* Card Summary Strip: Product Count and Total Bags */}
        <View style={styles.summaryStrip}>
          <View style={styles.summaryItem}>
            <Package size={15} color={theme.colors.primary} style={{ marginRight: 5 }} />
            <Text style={styles.summaryText}>
              {items.length} {items.length === 1 ? (t('profile.language') === 'Language' ? 'item' : 'आइटम') : (t('profile.language') === 'Language' ? 'items' : 'आइटम')}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.totalBagsText}>
              {item.totalQuantity} {items[0]?.unit || 'Bags'}
            </Text>
          </View>
        </View>

        {/* Card Body: Products Preview */}
        <View style={styles.cardBody}>
          {displayItems.map((prod, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {prod.category && prod.product_name ? `${prod.category} · ${prod.product_name}` : prod.product_name}
              </Text>
              <Text style={styles.itemQuantity}>
                {prod.quantity} {prod.unit || 'Bags'}
              </Text>
            </View>
          ))}
          {remainingCount > 0 && (
            <Text style={styles.moreItemsText}>
              + {remainingCount} {t('profile.language') === 'Language' ? 'more items' : 'और आइटम'}
            </Text>
          )}

          {/* Dispatch Notice if Dispatched */}
          {isDispatched && latestDisp && (
            <View style={styles.dispatchNotice}>
              <Truck size={14} color={theme.colors.success || '#16A34A'} style={{ marginRight: 6 }} />
              <Text style={styles.dispatchNoticeText}>
                {latestDisp.status === 'Delivered' 
                  ? (t('profile.language') === 'Language' ? `Delivered on ${latestDisp.actual_delivery_date || latestDisp.dispatch_date}` : `डिलीवर हुआ: ${latestDisp.actual_delivery_date || latestDisp.dispatch_date}`)
                  : (t('profile.language') === 'Language' ? `Dispatched: ${latestDisp.quantity} ${latestDisp.unit} on ${latestDisp.dispatch_date}` : `भेजा गया: ${latestDisp.quantity} ${latestDisp.unit} (${latestDisp.dispatch_date})`)}
              </Text>
            </View>
          )}
        </View>

        {/* Card Footer: View Order Action */}
        <View style={styles.cardFooter}>
          <Text style={styles.actionText}>
            {t('profile.language') === 'Language' ? 'View Details' : 'विवरण देखें'}
          </Text>
          <ChevronRight color={theme.colors.primary} size={18} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('MainTabs')} 
          style={styles.backButton}
        >
          <ArrowLeft color={theme.colors.textPrimary} size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language') === 'Language' ? 'My Orders' : 'मेरे ऑर्डर'}</Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Segmented Tabs: ACTIVE and RECEIVED */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'ACTIVE' && styles.tabButtonActive]}
          onPress={() => setActiveTab('ACTIVE')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'ACTIVE' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? 'ACTIVE' : 'सक्रिय'}
            {activeOrders.length > 0 ? ` (${activeOrders.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'RECEIVED' && styles.tabButtonActive]}
          onPress={() => setActiveTab('RECEIVED')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'RECEIVED' && styles.tabTextActive]}>
            {t('profile.language') === 'Language' ? 'RECEIVED' : 'प्राप्त / पूर्ण'}
            {receivedOrders.length > 0 ? ` (${receivedOrders.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List / Empty / Loading State */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            {t('profile.language') === 'Language' ? 'Loading orders...' : 'ऑर्डर लोड हो रहे हैं...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayedOrders}
          keyExtractor={item => item.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <ClipboardList color={theme.colors.textMuted || '#9CA3AF'} size={56} style={{ marginBottom: 16 }} />
              {error ? (
                <>
                  <Text style={styles.emptyTitle}>
                    {t('profile.language') === 'Language' ? 'Unable to load your orders' : 'आपके ऑर्डर लोड नहीं हो सके'}
                  </Text>
                  <TouchableOpacity style={styles.primaryCTA} onPress={fetchOrders}>
                    <Text style={styles.primaryCTAText}>
                      {t('profile.language') === 'Language' ? 'Retry' : 'पुनः प्रयास करें'}
                    </Text>
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
                      ? (t('profile.language') === 'Language' ? 'New orders being prepared will appear here.' : 'तैयार हो रहे नए ऑर्डर यहाँ दिखाई देंगे।')
                      : (t('profile.language') === 'Language' ? 'Dispatched and completed orders will appear here.' : 'भेजे गए और पूरे हुए ऑर्डर यहाँ दिखाई देंगे।')}
                  </Text>
                  {activeTab === 'ACTIVE' && (
                    <TouchableOpacity 
                      style={styles.primaryCTA} 
                      onPress={() => navigation.navigate('MainTabs', { screen: 'NewOrderTab', params: { screen: 'NewOrderMain', params: { mode: 'create', ts: Date.now() } } })}
                    >
                      <Text style={styles.primaryCTAText}>
                        {t('profile.language') === 'Language' ? 'Place New Order' : 'नया ऑर्डर करें'}
                      </Text>
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
  loadingText: { marginTop: 16, fontSize: 15, color: theme.colors.textSecondary },
  
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingTop: 54, 
    paddingBottom: 16, 
    backgroundColor: theme.colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.textPrimary },
  backButton: { padding: 6, marginLeft: -6 },
  
  tabContainer: { 
    flexDirection: 'row', 
    backgroundColor: theme.colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: theme.colors.border 
  },
  tabButton: { 
    flex: 1, 
    paddingVertical: 14, 
    alignItems: 'center', 
    borderBottomWidth: 3, 
    borderBottomColor: 'transparent' 
  },
  tabButtonActive: { borderBottomColor: theme.colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: theme.colors.textSecondary },
  tabTextActive: { color: theme.colors.primary },
  
  listContent: { padding: 16, paddingBottom: 120 },
  
  card: { 
    backgroundColor: theme.colors.surface, 
    borderRadius: 14, 
    marginBottom: 16, 
    borderWidth: 1, 
    borderColor: theme.colors.border, 
    overflow: 'hidden', 
    ...theme.elevation.sm 
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start',
    padding: 16, 
    paddingBottom: 10 
  },
  headerLeft: { flex: 1, marginRight: 10 },
  orderNo: { fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  orderDate: { fontSize: 13, color: theme.colors.textSecondary },
  
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryItem: { flexDirection: 'row', alignItems: 'center' },
  summaryDivider: { width: 1, height: 14, backgroundColor: '#CBD5E1', marginHorizontal: 12 },
  summaryText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  totalBagsText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  
  cardBody: { paddingHorizontal: 16, paddingBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  itemName: { fontSize: 14, color: theme.colors.textPrimary, flex: 1, paddingRight: 8 },
  itemQuantity: { fontSize: 14, fontWeight: '600', color: theme.colors.textPrimary },
  moreItemsText: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2, fontStyle: 'italic' },
  
  dispatchNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  dispatchNoticeText: { fontSize: 12, color: '#166534', fontWeight: '500' },
  
  cardFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    paddingVertical: 12, 
    borderTopWidth: 1, 
    borderTopColor: theme.colors.border, 
    backgroundColor: '#FAFAFA' 
  },
  actionText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600' },
  
  emptyContainer: { alignItems: 'center', padding: 40, marginTop: 40 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 24, textAlign: 'center', lineHeight: 20 },
  
  primaryCTA: { backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 22, borderRadius: theme.radius.button },
  primaryCTAText: { color: theme.colors.white, fontSize: 15, fontWeight: '700' },
});

