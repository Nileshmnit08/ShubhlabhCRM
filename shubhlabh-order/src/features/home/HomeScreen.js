import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import SLWhatsAppFAB from '../../shared/components/SLWhatsAppFAB';
import SLHeader from '../../shared/components/SLHeader';
import { supabase } from '../../core/api/supabase';
import SLCard from '../../shared/components/SLCard';
import SLButton from '../../shared/components/SLButton';
import SLText from '../../shared/components/SLText';
import SLScreen from '../../shared/components/SLScreen';
import SLSectionHeader from '../../shared/components/SLSectionHeader';
import SLStatusBadge from '../../shared/components/SLStatusBadge';
import { useTranslation } from '../../shared/localization/i18n';
import { Bell, Check, ArrowRight } from 'lucide-react-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { userProfile, customerProfile } = useAuth();
  const navigation = useNavigation();

  const [latestOrder, setLatestOrder] = useState(null);
  
  // Mock data for UI only
  const latestUpdate = { title: "Diwali Special Scheme", description: "Get 10% extra on bulk orders", date: "08 Oct 2026", isNew: true };

  useFocusEffect(
    useCallback(() => {
      if (customerProfile?.id) {
        fetchLatestOrder();
      }
    }, [customerProfile])
  );

  const fetchLatestOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select('*, requirement_items(*)')
        .eq('party_id', customerProfile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      if (data) {
        let extras = {};
        let parsedAddress = data.notes || '';
        try {
          const parsed = JSON.parse(data.notes);
          if (parsed && parsed.extras) {
            extras = parsed.extras;
            parsedAddress = parsed.address;
          }
        } catch(e) {}

        const mappedOrder = {
          ...data,
          order_no: data.demand_ref || 'PENDING',
          delivery_address: parsedAddress,
          requirement_items: data.requirement_items?.map(item => {
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
        setLatestOrder(mappedOrder);
      } else {
        setLatestOrder(null);
      }
    } catch (e) {
      console.warn('Failed to fetch latest order for home widget', e);
    }
  };

  const buyerName = userProfile?.display_name || customerProfile?.name || "";
  const shopName = customerProfile?.shop_name || "";
  const displayName = buyerName || shopName || "Verified Customer";

  const handleReorder = () => {
    if (latestOrder) {
      // Navigate to the NewOrderTab tab, and within it navigate to NewOrderMain
      // with the previousOrder params. React Navigation nested params require
      // specifying the screen within the nested navigator.
      navigation.navigate('NewOrderTab', {
        screen: 'NewOrderMain',
        params: { previousOrder: latestOrder },
      });
    } else {
      alert(t('profile.language') === 'Language' ? "No previous order found." : "कोई पिछला ऑर्डर नहीं मिला।");
    }
  };

  return (
    <SLScreen noPadding backgroundColor={theme.colors.background}>
      <SLHeader 
        title="Shubh Labh" 
        showBack={false} 
        rightComponent={<Bell color={theme.colors.textPrimary} size={24} />} 
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Identity Section */}
        <View style={styles.identitySection}>
          <SLText style={styles.customerName}>{displayName}</SLText>
          <View style={styles.verifiedRow}>
            <Check color={theme.colors.success} size={16} />
            <SLText style={styles.verifiedText}>{t('profile.language') === 'Language' ? ' Verified Customer' : ' सत्यापित ग्राहक'}</SLText>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity 
          style={styles.primaryCta}
          onPress={() => navigation.navigate("NewOrderTab")}
          activeOpacity={0.9}
        >
          <View style={styles.primaryCtaContent}>
            <View>
              <SLText style={styles.primaryCtaTitle}>
                {t('profile.language') === 'Language' ? 'PLACE NEW ORDER' : 'नया ऑर्डर करें'}
              </SLText>
              <SLText style={styles.primaryCtaSubtitle}>
                {t('profile.language') === 'Language' ? 'Order your regular feed quickly' : 'अपना नियमित फ़ीड जल्दी ऑर्डर करें'}
              </SLText>
            </View>
            <ArrowRight color={theme.colors.white} size={24} />
          </View>
        </TouchableOpacity>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryActionCard, { marginRight: 8 }]} onPress={handleReorder}>
            <SLText style={styles.secondaryActionTitle}>{t('home.reorder')}</SLText>
            <SLText style={styles.secondaryActionSubtitle}>
              {t('profile.language') === 'Language' ? 'Last order' : 'पिछला ऑर्डर'}
            </SLText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryActionCard, { marginLeft: 8 }]} onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders" })}>
            <SLText style={styles.secondaryActionTitle}>{t('home.myOrders')}</SLText>
            <SLText style={styles.secondaryActionSubtitle}>
              {t('profile.language') === 'Language' ? 'View all orders' : 'सभी ऑर्डर देखें'}
            </SLText>
          </TouchableOpacity>
        </View>

        {/* Current Order */}
        <SLSectionHeader title={t('profile.language') === 'Language' ? 'CURRENT ORDER' : 'वर्तमान ऑर्डर'} style={{marginBottom: 8}} />
        {latestOrder ? (
          <SLCard style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View>
                <SLText style={styles.orderCardTitle}>Order #{latestOrder.order_no || latestOrder.id?.substring(0,6)}</SLText>
                <SLText style={styles.orderDate}>
                  {new Date(latestOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </SLText>
              </View>
              <SLStatusBadge 
                status={latestOrder.status === 'DISPATCHED' || latestOrder.status === 'DELIVERED' ? 'success' : 'warning'} 
                text={latestOrder.status?.toUpperCase() || 'CONFIRMED'} 
              />
            </View>

            <View style={styles.orderItems}>
               {latestOrder.requirement_items?.slice(0, 2).map((item, idx) => (
                 <View key={idx} style={styles.itemRow}>
                   <SLText style={styles.itemName}>{item.product_name}</SLText>
                   <SLText style={styles.itemQuantity}>{item.quantity} {item.unit}</SLText>
                 </View>
               ))}
               {(latestOrder.requirement_items?.length || 0) > 2 && (
                 <SLText style={styles.moreItemsText}>+ {(latestOrder.requirement_items?.length || 0) - 2} more items</SLText>
               )}
            </View>
            
            <View style={styles.orderFooter}>
              <TouchableOpacity onPress={() => navigation.navigate("OrdersStack", { screen: "OrderDetail", params: { orderId: latestOrder.id, order: latestOrder } })}>
                <SLText style={styles.viewOrderLink}>{t('order.viewOrder')} →</SLText>
              </TouchableOpacity>
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

        {/* Shubh Labh Updates */}
        <SLSectionHeader 
          title={t('home.updates')} 
          actionTitle={t('profile.language') === 'Language' ? 'View All' : 'सभी देखें'} 
          onActionPress={() => {}} 
          style={{marginTop: 8, marginBottom: 8}}
        />
        {latestUpdate ? (
          <SLCard style={styles.updateCard}>
            <View style={styles.updateCardHeader}>
              <SLText style={styles.updateTitle}>
                {latestUpdate.title}
              </SLText>
              {latestUpdate.isNew && (
                <View style={styles.newBadge}>
                  <SLText style={styles.newBadgeText}>NEW</SLText>
                </View>
              )}
            </View>
            <SLText style={styles.updateDesc}>{latestUpdate.description}</SLText>
            {latestUpdate.date && (
               <SLText style={styles.updateDate}>{latestUpdate.date}</SLText>
            )}
          </SLCard>
        ) : (
          <SLText style={styles.emptyUpdatesText}>No recent updates.</SLText>
        )}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      <SLWhatsAppFAB onPress={() => {}} style={styles.fab} />
    </SLScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  identitySection: {
    marginBottom: 20,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 13,
    color: theme.colors.success,
  },
  primaryCta: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...theme.elevation.md,
  },
  primaryCtaContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  primaryCtaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.white,
    marginBottom: 4,
  },
  primaryCtaSubtitle: {
    fontSize: 14,
    color: theme.colors.white,
    opacity: 0.9,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  secondaryActionCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.elevation.none,
  },
  secondaryActionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  secondaryActionSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  orderCard: {
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  orderCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  orderDate: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  orderItems: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  itemQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginLeft: 16,
  },
  moreItemsText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  orderFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: 16,
    alignItems: 'flex-start',
  },
  viewOrderLink: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyOrderCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyOrderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  emptyOrderSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  emptyOrderBtn: {
    width: 'auto',
    paddingHorizontal: 24,
    height: 40,
  },
  updateCard: {
    padding: 16,
    marginBottom: 16,
  },
  updateCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  updateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  newBadge: {
    backgroundColor: '#FFF8F0', // Light orange
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  updateDesc: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  updateDate: {
    fontSize: 12,
    color: theme.colors.textMuted,
  },
  emptyUpdatesText: {
    fontSize: 14,
    color: theme.colors.textMuted,
  },
  fab: {
    transform: [{ scale: 0.9 }],
    bottom: 24,
  }
});

