import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
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
import { Bell } from 'lucide-react-native';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { userProfile, customerProfile } = useAuth();
  const navigation = useNavigation();

  const [latestOrder, setLatestOrder] = useState(null);
  
  // Mock data for UI only
  const banner = null;
  const latestUpdate = { title: "Diwali Special Scheme", description: "Get 10% extra on bulk orders." };

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
        .from('buyer_orders')
        .select('*, requirement_items:buyer_order_items(*, product:products(name, category))')
        .eq('customer_id', customerProfile.id)
        .order('created_at', { ascending: false })
        .limit(1)
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
          <SLText variant="display">{t('home.welcome')}{buyerName ? `, ${buyerName}` : ''}</SLText>
          {!!shopName && <SLText variant="sectionTitle" color={theme.colors.textSecondary} style={styles.shopText}>{shopName}</SLText>}
        </View>

        {/* Banner Section */}
        {banner && (
          <Image source={{ uri: banner }} style={styles.bannerImage} />
        )}

        {/* Primary Actions */}
        <SLButton 
          title={t('home.placeNewOrder')} 
          onPress={() => navigation.navigate("NewOrderTab")} 
          style={styles.mainCta}
        />

        <View style={styles.actionRow}>
          <SLButton 
            title={t('home.reorder')} 
            variant="outline" 
            onPress={handleReorder} 
            style={styles.halfBtn}
          />
          <SLButton 
            title={t('home.myOrders')} 
            variant="outline" 
            onPress={() => navigation.navigate("OrdersStack", { screen: "MyOrders" })} 
            style={styles.halfBtn}
          />
        </View>

        {/* Current Order */}
        <SLCard variant="highlight">
          <SLSectionHeader title={t('profile.language') === 'Language' ? 'Recent Order' : 'हाल का ऑर्डर'} />
          {latestOrder ? (
            <View>
              <SLText variant="body" style={{ fontWeight: '600' }}>Order #{latestOrder.order_no}</SLText>
              <SLText variant="bodySmall" color={theme.colors.textSecondary} style={{ marginBottom: 8 }}>
                {new Date(latestOrder.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </SLText>
              <SLStatusBadge status="warning" text={latestOrder.status || 'Pending'} style={styles.statusBadge} />
              
              <SLButton 
                title={t('order.viewOrder')} 
                variant="secondary" 
                onPress={() => navigation.navigate("OrdersStack", { screen: "OrderDetail", params: { orderId: latestOrder.id, order: latestOrder } })} 
                style={styles.trackButton}
              />
            </View>
          ) : (
            <SLText variant="bodyMedium" color={theme.colors.textMuted}>{t('profile.language') === 'Language' ? 'No active orders.' : 'कोई सक्रिय ऑर्डर नहीं।'}</SLText>
          )}
        </SLCard>

        {/* Shubh Labh Updates */}
        <SLCard>
          <SLSectionHeader title={t('home.updates')} />
          {latestUpdate ? (
            <View>
              <SLText variant="cardTitle">{latestUpdate.title}</SLText>
              <SLText variant="bodyMedium" color={theme.colors.textSecondary} style={styles.updateDesc}>{latestUpdate.description}</SLText>
            </View>
          ) : (
            <SLText variant="bodyMedium" color={theme.colors.textMuted}>No recent updates.</SLText>
          )}
        </SLCard>
        
        <View style={{ height: 80 }} />
      </ScrollView>

      <SLWhatsAppFAB onPress={() => {}} />
    </SLScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: theme.spacing.md,
  },
  identitySection: {
    marginBottom: theme.spacing.xl,
    paddingTop: theme.spacing.md,
  },
  shopText: {
    marginTop: theme.spacing.xs,
  },
  bannerImage: {
    width: '100%',
    height: 140,
    borderRadius: theme.radius.medium,
    marginBottom: theme.spacing.lg,
  },
  mainCta: {
    marginBottom: theme.spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.xl,
  },
  halfBtn: {
    width: '48%',
  },
  statusBadge: {
    marginTop: theme.spacing.xs,
  },
  trackButton: {
    marginTop: theme.spacing.md,
  },
  updateDesc: {
    marginTop: theme.spacing.xs,
  },
});
