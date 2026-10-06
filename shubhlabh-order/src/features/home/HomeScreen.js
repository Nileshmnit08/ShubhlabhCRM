import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../../shared/theme';
import SLWhatsAppFAB from '../../shared/components/SLWhatsAppFAB';
import SLHeader from '../../shared/components/SLHeader';
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

  // Mock data for UI only
  const banner = null;
  const currentOrder = { reference: 'ORD-8923', status: t('track.inTransit') };
  const latestUpdate = { title: "Diwali Special Scheme", description: "Get 10% extra on bulk orders." };

  const buyerName = userProfile?.display_name || customerProfile?.name || "";
  const shopName = customerProfile?.shop_name || "";

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
          onPress={() => navigation.navigate("ProductsTab")} 
          style={styles.mainCta}
        />

        <View style={styles.actionRow}>
          <SLButton 
            title={t('home.reorder')} 
            variant="outline" 
            onPress={() => navigation.navigate("OrdersTab")} 
            style={styles.halfBtn}
          />
          <SLButton 
            title={t('home.myOrders')} 
            variant="outline" 
            onPress={() => navigation.navigate("OrdersTab")} 
            style={styles.halfBtn}
          />
        </View>

        {/* Current Order */}
        <SLCard variant="highlight">
          <SLSectionHeader title={t('home.currentOrder')} />
          {currentOrder ? (
            <View>
              <SLText variant="body" style={{ fontWeight: '600' }}>{currentOrder.reference}</SLText>
              <SLStatusBadge status="warning" text={currentOrder.status} style={styles.statusBadge} />
              
              <SLButton 
                title={t('order.trackOrder')} 
                variant="secondary" 
                onPress={() => navigation.navigate("OrdersTab")} 
                style={styles.trackButton}
              />
            </View>
          ) : (
            <SLText variant="bodyMedium" color={theme.colors.textMuted}>No active orders.</SLText>
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
