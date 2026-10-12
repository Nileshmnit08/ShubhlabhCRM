import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Linking, ActivityIndicator } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import SLWhatsAppFAB from '../../shared/components/SLWhatsAppFAB';
import SLHeader from '../../shared/components/SLHeader';
import { supabase } from '../../core/api/supabase';
import { getLatestOrder, getOrderSummaryCounts } from '../orders/OrderService';
import SLCard from '../../shared/components/SLCard';
import SLButton from '../../shared/components/SLButton';
import SLText from '../../shared/components/SLText';
import SLScreen from '../../shared/components/SLScreen';
import SLSectionHeader from '../../shared/components/SLSectionHeader';
import SLStatusBadge from '../../shared/components/SLStatusBadge';
import { useTranslation } from '../../shared/localization/i18n';
import { 
  Check, 
  ArrowRight, 
  PlusCircle, 
  Package, 
  LineChart, 
  Award, 
  Clock, 
  Truck, 
  CheckCircle2, 
  User, 
  RefreshCw 
} from 'lucide-react-native';
import HomeWeatherWidget from '../weather/HomeWeatherWidget';
import NotificationBell from '../notifications/NotificationBell';
import { useNotifications } from '../notifications/NotificationContext';

export const SUPPORT_PHONE_NUMBER = '9461924461';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { userProfile, customerProfile } = useAuth();
  const navigation = useNavigation();
  const { notifications, loading: notificationsLoading, error: notificationsError, refreshNotifications } = useNotifications();

  const [latestOrder, setLatestOrder] = useState(null);
  const [orderCounts, setOrderCounts] = useState({ inProgress: 0, dispatched: 0, delivered: 0, total: 0 });
  const [countsLoaded, setCountsLoaded] = useState(false);
  
  // Real business updates state
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [updatesError, setUpdatesError] = useState(false);

  const isFetchingUpdatesRef = useRef(false);
  const isFetchingHomeDataRef = useRef(false);
  const refreshNotificationsRef = useRef(refreshNotifications);
  refreshNotificationsRef.current = refreshNotifications;

  // Synchronize latest update with canonical NotificationContext
  useEffect(() => {
    if (Array.isArray(notifications) && notifications.length > 0) {
      setLatestUpdate(notifications[0]);
      setUpdatesLoading(false);
      setUpdatesError(false);
    } else if (!notificationsLoading) {
      setUpdatesLoading(false);
    }
  }, [notifications, notificationsLoading]);

  const fetchHomeData = useCallback(async () => {
    if (!customerProfile?.id || isFetchingHomeDataRef.current) return;
    isFetchingHomeDataRef.current = true;
    try {
      const [order, counts] = await Promise.all([
        getLatestOrder(customerProfile.id).catch(() => null),
        getOrderSummaryCounts(customerProfile.id).catch(() => null)
      ]);
      setLatestOrder(order);
      if (counts) {
        setOrderCounts(counts);
        setCountsLoaded(true);
      }
    } catch (e) {
      console.warn('Failed to fetch home data:', e);
    } finally {
      isFetchingHomeDataRef.current = false;
    }
  }, [customerProfile?.id]);

  const fetchLatestUpdate = useCallback(async (isSilent = false) => {
    if (isFetchingUpdatesRef.current) return;
    isFetchingUpdatesRef.current = true;

    if (!isSilent) {
      setUpdatesLoading(true);
    }
    setUpdatesError(false);

    try {
      const { data, error } = await supabase
        .from('business_updates')
        .select(`
          id, title, message, type, published_at, image_url,
          business_update_recipients ( id, customer_id, read_at )
        `)
        .eq('status', 'PUBLISHED')
        .order('published_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }
      if (data) {
        setLatestUpdate(data);
      }
    } catch (e) {
      console.warn('Error fetching latest business update for home screen:', e);
      setUpdatesError(true);
    } finally {
      setUpdatesLoading(false);
      isFetchingUpdatesRef.current = false;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHomeData();
      fetchLatestUpdate(true);
      refreshNotificationsRef.current?.();
    }, [fetchHomeData, fetchLatestUpdate])
  );

  const buyerName = userProfile?.display_name || customerProfile?.name || '';
  const shopName = customerProfile?.shop_name || '';
  const displayName = buyerName || shopName || (t('profile.language') === 'Language' ? 'Valued Customer' : 'सम्मानित ग्राहक');

  const handleReorder = () => {
    if (latestOrder) {
      navigation.navigate('NewOrderTab', {
        screen: 'NewOrderMain',
        params: { previousOrder: latestOrder, mode: 'reorder', ts: Date.now() },
      });
    } else {
      alert(t('profile.language') === 'Language' ? 'No previous order found.' : 'कोई पिछला ऑर्डर नहीं मिला।');
    }
  };

  const handleOpenWhatsApp = () => {
    const message = encodeURIComponent(`Hello Shubh Labh Team, I have a query regarding my buyer account (${displayName}).`);
    const url = `whatsapp://send?phone=+91${SUPPORT_PHONE_NUMBER}&text=${message}`;
    Linking.canOpenURL(url)
      .then(supported => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          return Linking.openURL(`tel:+91${SUPPORT_PHONE_NUMBER}`);
        }
      })
      .catch(() => {
        Linking.openURL(`tel:+91${SUPPORT_PHONE_NUMBER}`);
      });
  };

  return (
    <SLScreen noPadding backgroundColor={theme.colors.background}>
      <SLHeader 
        title="Shubh Labh" 
        showBack={false} 
        rightComponent={
          <View style={styles.headerRightActions}>
            <NotificationBell 
              onPress={() => navigation.navigate('NotificationInbox')} 
            />
            <TouchableOpacity 
              onPress={() => navigation.navigate('ProfileTab')}
              style={styles.profileHeaderBtn}
              accessibilityLabel="Profile"
            >
              <User color={theme.colors.textPrimary} size={22} />
            </TouchableOpacity>
          </View>
        } 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Brand Greeting Header */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingAvatar}>
            <Image 
              source={require('../../../assets/icon.png')} 
              style={styles.brandIcon} 
              resizeMode="contain" 
            />
          </View>
          <View style={styles.greetingTextContainer}>
            <SLText style={styles.greetingSub}>
              {t('profile.language') === 'Language' ? 'Welcome back,' : 'स्वागत है,'}
            </SLText>
            <SLText style={styles.customerName} numberOfLines={1}>{displayName}</SLText>
            <View style={styles.verifiedRow}>
              <Check color={theme.colors.success} size={14} />
              <SLText style={styles.verifiedText}>
                {t('profile.language') === 'Language' ? ' Verified Buyer' : ' सत्यापित खरीदार'}
              </SLText>
            </View>
          </View>
        </View>

        {/* Primary CTA: Place New Order */}
        <TouchableOpacity 
          style={styles.primaryCta}
          onPress={() => navigation.navigate("NewOrderTab", { screen: 'NewOrderMain', params: { mode: 'create', ts: Date.now() }})}
          activeOpacity={0.9}
        >
          <View style={styles.primaryCtaContent}>
            <View style={{ flex: 1 }}>
              <SLText style={styles.primaryCtaTitle}>
                {t('home.placeNewOrder')}
              </SLText>
              <SLText style={styles.primaryCtaSubtitle}>
                {t('profile.language') === 'Language' ? 'Order cattle feed & supplements directly' : 'पशु आहार एवं सप्लीमेंट्स सीधे ऑर्डर करें'}
              </SLText>
            </View>
            <View style={styles.arrowCircle}>
              <ArrowRight color={theme.colors.primary} size={20} />
            </View>
          </View>
        </TouchableOpacity>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsSection}>
          <SLText style={styles.sectionHeaderTitle}>
            {t('home.quickActions') || 'QUICK ACTIONS'}
          </SLText>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("NewOrderTab", { screen: 'NewOrderMain', params: { mode: 'create', ts: Date.now() }})}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#FFF7ED' }]}>
                <PlusCircle size={22} color={theme.colors.primary} />
              </View>
              <SLText style={styles.quickActionTitle}>{t('home.placeNewOrder')}</SLText>
              <SLText style={styles.quickActionSubtitle}>
                {t('profile.language') === 'Language' ? 'Bulk demand' : 'नया ऑर्डर'}
              </SLText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders" })}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#EFF6FF' }]}>
                <Package size={22} color="#2563EB" />
              </View>
              <SLText style={styles.quickActionTitle}>{t('home.myOrders')}</SLText>
              <SLText style={styles.quickActionSubtitle}>
                {t('profile.language') === 'Language' ? 'Track history' : 'ऑर्डर इतिहास'}
              </SLText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("MarketPricesTab")}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#F0FDF4' }]}>
                <LineChart size={22} color="#16A34A" />
              </View>
              <SLText style={styles.quickActionTitle}>{t('home.marketPrices') || 'Market Prices'}</SLText>
              <SLText style={styles.quickActionSubtitle}>
                {t('profile.language') === 'Language' ? 'Live rates' : 'ताज़ा भाव'}
              </SLText>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("ProfileTab", { screen: "MyRewardSchemes" })}
              activeOpacity={0.8}
            >
              <View style={[styles.quickActionIconWrap, { backgroundColor: '#FAF5FF' }]}>
                <Award size={22} color="#9333EA" />
              </View>
              <SLText style={styles.quickActionTitle}>{t('home.rewardSchemes') || 'Reward Schemes'}</SLText>
              <SLText style={styles.quickActionSubtitle}>
                {t('profile.language') === 'Language' ? 'Gifts & perks' : 'योजना लाभ'}
              </SLText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Summary Strip (Live Canonical Data) */}
        {countsLoaded && (
          <View style={styles.summarySection}>
            <View style={styles.summaryHeaderRow}>
              <SLText style={styles.sectionHeaderTitle}>
                {t('home.orderSummary') || 'ORDER SUMMARY'}
              </SLText>
              <TouchableOpacity onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders" })}>
                <SLText style={styles.viewAllSummaryText}>
                  {t('profile.language') === 'Language' ? 'View All' : 'सभी देखें'} →
                </SLText>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryRow}>
              <TouchableOpacity 
                style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}
                onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders", params: { initialTab: 'ACTIVE' } })}
                activeOpacity={0.8}
              >
                <View style={styles.summaryCardTop}>
                  <Clock size={16} color="#D97706" />
                  <SLText style={styles.summaryCount}>{orderCounts.inProgress}</SLText>
                </View>
                <SLText style={styles.summaryLabel}>
                  {t('home.inProgress') || 'In Progress'}
                </SLText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}
                onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders", params: { initialTab: 'RECEIVED' } })}
                activeOpacity={0.8}
              >
                <View style={styles.summaryCardTop}>
                  <Truck size={16} color="#059669" />
                  <SLText style={styles.summaryCount}>{orderCounts.dispatched}</SLText>
                </View>
                <SLText style={styles.summaryLabel}>
                  {t('home.dispatched') || 'Dispatched'}
                </SLText>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.summaryCard, { borderLeftColor: '#3B82F6' }]}
                onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders", params: { initialTab: 'RECEIVED' } })}
                activeOpacity={0.8}
              >
                <View style={styles.summaryCardTop}>
                  <CheckCircle2 size={16} color="#2563EB" />
                  <SLText style={styles.summaryCount}>{orderCounts.delivered}</SLText>
                </View>
                <SLText style={styles.summaryLabel}>
                  {t('home.delivered') || 'Delivered'}
                </SLText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Current Order Section */}
        <SLSectionHeader 
          title={t('home.currentOrder')} 
          actionTitle={latestOrder ? t('home.reorder') : undefined}
          onActionPress={latestOrder ? handleReorder : undefined}
          style={{ marginBottom: 8, marginTop: 4 }} 
        />
        {latestOrder ? (
          <SLCard style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <SLText style={styles.orderCardTitle}>
                  Order #{latestOrder.order_no || latestOrder.id?.substring(0,6)}
                </SLText>
                <SLText style={styles.orderDate}>
                  {new Date(latestOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </SLText>
              </View>
              <SLStatusBadge 
                status={
                  latestOrder.status === 'DISPATCHED' || latestOrder.status === 'DELIVERED' 
                    ? 'success' 
                    : latestOrder.status === 'PARTIALLY DISPATCHED'
                    ? 'info'
                    : latestOrder.status === 'CANCELLED'
                    ? 'error'
                    : 'warning'
                } 
                text={latestOrder.status?.toUpperCase() || 'CONFIRMED'} 
              />
            </View>

            <View style={styles.orderItems}>
               {latestOrder.items?.slice(0, 2).map((item, idx) => (
                 <View key={idx} style={styles.itemRow}>
                   <SLText style={styles.itemName}>{item.product_name}</SLText>
                   <SLText style={styles.itemQuantity}>{item.quantity} {item.unit || 'Bags'}</SLText>
                 </View>
               ))}
               {(latestOrder.items?.length || 0) > 2 && (
                 <SLText style={styles.moreItemsText}>+ {(latestOrder.items?.length || 0) - 2} more items</SLText>
               )}
            </View>
            
            <View style={styles.orderFooter}>
              <TouchableOpacity 
                style={styles.viewOrderBtn}
                onPress={() => navigation.navigate("OrdersStack", { screen: "OrderDetail", params: { orderId: latestOrder.id, order: latestOrder } })}
              >
                <SLText style={styles.viewOrderLink}>{t('order.viewOrder')} →</SLText>
              </TouchableOpacity>
              
              {(latestOrder.status === 'DISPATCHED' || latestOrder.status === 'DELIVERED') && (
                <TouchableOpacity style={styles.quickReorderBtn} onPress={handleReorder}>
                  <SLText style={styles.quickReorderText}>Repeat Order</SLText>
                </TouchableOpacity>
              )}
            </View>
          </SLCard>
        ) : (
          <SLCard style={styles.emptyOrderCard}>
            <SLText style={styles.emptyOrderTitle}>
              {t('profile.language') === 'Language' ? 'No active orders' : 'कोई सक्रिय ऑर्डर नहीं'}
            </SLText>
            <SLText style={styles.emptyOrderSubtitle}>
              {t('profile.language') === 'Language' ? 'Your next order is just a tap away.' : 'आपका अगला ऑर्डर बस एक टैप दूर है।'}
            </SLText>
            <SLButton 
              title={t('home.placeNewOrder')} 
              onPress={() => navigation.navigate("NewOrderTab")} 
              style={styles.emptyOrderBtn}
            />
          </SLCard>
        )}

        {/* Weather & Farming Intelligence Widget */}
        <HomeWeatherWidget 
          shopLocation={userProfile?.shopLocation || customerProfile?.shopLocation}
          deliveryLocation={userProfile?.deliveryAddress}
        />

        {/* Shubh Labh Updates (Dynamic Supabase Integration) */}
        <SLSectionHeader 
          title={t('home.updates')} 
          actionTitle={t('home.viewAll') || 'View All'} 
          onActionPress={() => navigation.navigate('NotificationInbox')} 
          style={{ marginBottom: 8, marginTop: 4 }}
        />
        
        {updatesLoading && !latestUpdate ? (
          <SLCard style={styles.updateCardLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <SLText style={styles.loadingUpdateText}>
              {t('common.loading') || 'Loading updates...'}
            </SLText>
          </SLCard>
        ) : updatesError && !latestUpdate ? (
          <SLCard style={styles.updateCardError}>
            <SLText style={styles.errorUpdateText}>
              {t('home.retryUpdates') || 'Could not load updates. Tap to retry.'}
            </SLText>
            <TouchableOpacity onPress={() => fetchLatestUpdate(false)} style={styles.retryUpdateBtn}>
              <RefreshCw size={16} color={theme.colors.primary} />
              <SLText style={styles.retryUpdateText}>{t('common.retry') || 'Retry'}</SLText>
            </TouchableOpacity>
          </SLCard>
        ) : latestUpdate ? (
          <TouchableOpacity 
            activeOpacity={0.85}
            onPress={() => navigation.navigate('BusinessUpdateDetail', { updateId: latestUpdate.id })}
          >
            <SLCard style={styles.updateCard}>
              <View style={styles.updateCardHeader}>
                <View style={styles.updateTitleRow}>
                  <SLText style={styles.updateBadge}>
                    {(latestUpdate.type || 'NOTICE').replace(/_/g, ' ')}
                  </SLText>
                  {(latestUpdate.is_read === false || (!latestUpdate.business_update_recipients || latestUpdate.business_update_recipients.length === 0 || !latestUpdate.business_update_recipients[0]?.read_at)) && (
                    <View style={styles.newBadge}>
                      <SLText style={styles.newBadgeText}>NEW</SLText>
                    </View>
                  )}
                </View>
                {latestUpdate.published_at && (
                  <SLText style={styles.updateDate}>
                    {new Date(latestUpdate.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </SLText>
                )}
              </View>

              <SLText style={styles.updateTitle} numberOfLines={1}>
                {latestUpdate.title}
              </SLText>
              
              <SLText style={styles.updateDesc} numberOfLines={2}>
                {latestUpdate.message}
              </SLText>

              <View style={styles.updateCardFooter}>
                <SLText style={styles.readMoreText}>
                  {t('profile.language') === 'Language' ? 'Read full announcement →' : 'पूरी सूचना पढ़ें →'}
                </SLText>
              </View>
            </SLCard>
          </TouchableOpacity>
        ) : (
          <SLCard style={styles.emptyUpdateCard}>
            <SLText style={styles.emptyUpdatesText}>
              {t('home.noUpdates') || 'No updates at this time.'}
            </SLText>
          </SLCard>
        )}
        
        {/* Safe Spacing for Bottom Tab and Support FAB */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Floating WhatsApp Action Button */}
      <SLWhatsAppFAB onPress={handleOpenWhatsApp} style={styles.fab} />
    </SLScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileHeaderBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
  },
  greetingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  greetingAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  brandIcon: {
    width: 32,
    height: 32,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingSub: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 1,
  },
  customerName: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.success,
    marginLeft: 2,
  },
  primaryCta: {
    backgroundColor: theme.colors.primary,
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
    ...theme.elevation.md,
  },
  primaryCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCtaTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: 3,
  },
  primaryCtaSubtitle: {
    fontSize: 13,
    color: theme.colors.white,
    opacity: 0.9,
  },
  arrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  quickActionsSection: {
    marginBottom: 18,
  },
  sectionHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionCard: {
    width: '48%',
    backgroundColor: theme.colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.sm,
  },
  quickActionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  quickActionSubtitle: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  summarySection: {
    marginBottom: 18,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  viewAllSummaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderLeftWidth: 4,
    ...theme.elevation.sm,
  },
  summaryCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  orderCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  orderDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  orderItems: {
    marginBottom: 14,
    backgroundColor: theme.colors.background,
    padding: 10,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 3,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginLeft: 12,
  },
  moreItemsText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 12,
  },
  viewOrderBtn: {
    paddingVertical: 4,
  },
  viewOrderLink: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  quickReorderBtn: {
    backgroundColor: '#FFF7ED',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  quickReorderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyOrderCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 14,
  },
  emptyOrderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyOrderSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 14,
    textAlign: 'center',
  },
  emptyOrderBtn: {
    width: 'auto',
    paddingHorizontal: 20,
    height: 38,
  },
  updateCard: {
    padding: 14,
    marginBottom: 16,
    borderRadius: 14,
  },
  updateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  updateTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  updateBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.white,
  },
  updateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  updateDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  updateDate: {
    fontSize: 11,
    color: theme.colors.textMuted,
  },
  updateCardFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 8,
  },
  readMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  updateCardLoading: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 14,
  },
  loadingUpdateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  updateCardError: {
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 14,
  },
  errorUpdateText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  retryUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
  },
  retryUpdateText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyUpdateCard: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderRadius: 14,
  },
  emptyUpdatesText: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontStyle: 'italic',
  },
  fab: {
    bottom: 24,
  }
});
