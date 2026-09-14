import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography } from '../theme/tokens';
import { Button, EmptyState, BottomSheetFoundation } from '../components';
import { supabase } from '../lib/supabase';
import { useSync } from '../context/SyncContext';

export function CustomerProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const customerId = route.params?.id;
  const { isOnline } = useSync();

  const [customer, setCustomer] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [demandSheetVisible, setDemandSheetVisible] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);

  const fetchCustomerProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data: custData, error: custError } = await supabase
        .from('crm_parties')
        .select('*')
        .eq('id', customerId)
        .single();

      if (custError) throw custError;
      setCustomer(custData);

      const { data: finData } = await supabase
        .from('v_customer_360')
        .select('*')
        .eq('customer_id', customerId)
        .single();
        
      if (finData) setFinancials(finData);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) fetchCustomerProfile();
    else { setError(t('customers.profile.notFound')); setLoading(false); }
  }, [customerId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerSafe}>
        <EmptyState title="Loading Profile..." message="" icon="sync" />
      </SafeAreaView>
    );
  }

  if (error || !customer) {
    return (
      <SafeAreaView style={styles.centerSafe}>
        <EmptyState title="Error" message={error} icon="error-outline" />
        <View style={{ marginTop: 16 }}><Button title="Retry" onPress={fetchCustomerProfile} /></View>
      </SafeAreaView>
    );
  }

  const formatCurrency = (val) => val ? `₹${Number(val).toLocaleString('en-IN')}` : '₹0';
  const creditLimit = financials?.crm_credit_limit_amount || 0;
  const outstanding = financials?.crm_credit_outstanding_amount || 0;
  
  // The backend might provide these in the future
  const hasGeofence = customer.latitude && customer.longitude;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerSubtitle}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerTitle}>Customer Detail</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={isOnline ? styles.syncBadge : styles.offlineBadge}>
            <View style={isOnline ? styles.syncDot : styles.offlineDot} />
            <Text style={isOnline ? styles.syncText : styles.offlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </View>
          <View style={styles.userIcon}>
            <MaterialIcons name="person" size={18} color={colors.onPrimary} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Hero Summary Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroStripe} />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.badges}>
                <View style={styles.badgePrimary}>
                  <MaterialIcons name="verified" size={13} color={colors.onPrimaryFixed} style={{marginRight: 4}} />
                  <Text style={styles.badgePrimaryText}>Active Dealer</Text>
                </View>
              </View>
              {hasGeofence && (
                <View style={styles.distanceBadge}>
                   <MaterialIcons name="my-location" size={15} color={colors.primary} />
                   <Text style={styles.distanceText}>Geofence Active</Text>
                </View>
              )}
            </View>

            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroName}>{customer.display_name || 'Customer'}</Text>
            </View>

            <View style={styles.geoBlock}>
              <View style={styles.geoRow}>
                <MaterialIcons name="storefront" size={16} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.geoText} numberOfLines={1}>{customer.city || 'No Address'}</Text>
              </View>
              <View style={styles.gstRow}>
                <Text style={styles.limitText}>Limit: {formatCurrency(creditLimit)}</Text>
              </View>
            </View>

            <View style={styles.duesBar}>
              <View>
                <Text style={styles.duesLabel}>Pending Dues / बकाया राशि</Text>
                <Text style={styles.duesAmount}>{formatCurrency(outstanding)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Primary Action Row */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.startVisitBtn} onPress={() => navigation.navigate('VisitMode', { customerId: customer.id, customerName: customer.display_name, latitude: customer.latitude, longitude: customer.longitude })}>
            <View style={styles.startVisitDotContainer}>
              <View style={styles.startVisitDotPing} />
              <View style={styles.startVisitDot} />
            </View>
            <MaterialIcons name="location-on" size={22} color={colors.onPrimary} />
            <Text style={styles.startVisitText}>START VISIT (विज़िट शुरू करें)</Text>
            <Text style={styles.startVisitSub}>• GPS Auto-Checkin</Text>
          </TouchableOpacity>

          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL(`tel:${customer.mobile || ''}`)}>
              <MaterialIcons name="call" size={20} color={colors.primary} />
              <Text style={styles.quickBtnText}>Call / कॉल</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setDemandSheetVisible(true)}>
              <MaterialIcons name="add-shopping-cart" size={20} color="#904d00" />
              <Text style={styles.quickBtnText}>+ Demand</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, voiceActive && {backgroundColor: colors.error}]} onPress={() => setVoiceActive(!voiceActive)}>
              <MaterialIcons name="mic" size={20} color={voiceActive ? colors.onError : colors.error} />
              <Text style={[styles.quickBtnText, voiceActive && {color: colors.onError}]}>Voice / नोट</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Operational Radar Bento Matrix */}
        <View style={styles.bentoSection}>
          <View style={styles.bentoHeader}>
            <Text style={styles.bentoTitle}>Operational Radar</Text>
          </View>
          <EmptyState title="No Active Tasks" message="No pending tasks or requirements for this customer." icon="assignment-turned-in" />
        </View>

        {/* Recent Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.bentoTitle}>Recent Timeline / हालिया गतिविधियां</Text>
          </View>
          <EmptyState title="No Recent Activity" message="No visits or transactions recorded yet." icon="history" />
        </View>

      </ScrollView>

      {/* Embedded Demand Bottom Sheet */}
      <BottomSheetFoundation visible={demandSheetVisible} onClose={() => setDemandSheetVisible(false)} height="40%">
        <View style={styles.sheetContent}>
          <View style={styles.sheetContextBar}>
            <View>
              <Text style={styles.sheetContextTitle}>TARGET CUSTOMER</Text>
              <Text style={styles.sheetContextName}>{customer.display_name}</Text>
            </View>
          </View>
          
          <Text style={typography.headlineSm}>Quick Demand Note</Text>
          <Text style={{...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: 16}}>This feature is not yet connected to the backend.</Text>

          <View style={{flexDirection: 'row', gap: 8, marginTop: 16}}>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setDemandSheetVisible(false)}>
              <Text style={styles.sheetCancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetFoundation>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  centerSafe: { flex: 1, backgroundColor: '#f8f9ff', justifyContent: 'center', alignItems: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerSubtitle: { ...typography.labelSm, color: colors.onSurfaceVariant },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 8, height: 32, borderRadius: 16, gap: 4 },
  syncDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  syncText: { ...typography.labelSm, color: '#005232' },
  offlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffdad6', paddingHorizontal: 8, height: 32, borderRadius: 16, gap: 4 },
  offlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  offlineText: { ...typography.labelSm, color: '#93000a' },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  heroStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: colors.primary },
  heroContent: { padding: 16, paddingLeft: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 6 },
  badgePrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  badgePrimaryText: { ...typography.labelSm, color: '#005232', fontWeight: 'bold' },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(142, 214, 170, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, gap: 4 },
  distanceText: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  heroTitleContainer: { marginBottom: 12 },
  heroName: { ...typography.headlineMd, color: colors.onSurface, lineHeight: 28 },
  geoBlock: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 8, marginBottom: 12 },
  geoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  geoText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  gstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  limitText: { ...typography.labelSm, color: '#904d00', fontWeight: 'bold' },
  duesBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 218, 214, 0.4)', padding: 10, borderRadius: 8 },
  duesLabel: { ...typography.labelSm, color: '#93000a', textTransform: 'uppercase' },
  duesAmount: { fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.error, marginTop: 2 },
  actionSection: { marginBottom: 16 },
  startVisitBtn: { width: '100%', height: 52, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', elevation: 2, marginBottom: 8 },
  startVisitDotContainer: { relative: true, width: 12, height: 12, marginRight: 4, alignItems: 'center', justifyContent: 'center' },
  startVisitDotPing: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#a9f3c5', opacity: 0.75 },
  startVisitDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#a9f3c5' },
  startVisitText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold', marginLeft: 4 },
  startVisitSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginLeft: 4 },
  quickGrid: { flexDirection: 'row', gap: 6 },
  quickBtn: { flex: 1, height: 52, backgroundColor: '#ffffff', borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  quickBtnText: { ...typography.labelSm, color: colors.onSurface, marginTop: 2 },
  bentoSection: { marginBottom: 16 },
  bentoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, paddingHorizontal: 4 },
  bentoTitle: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: 'bold', textTransform: 'uppercase' },
  timelineSection: { marginBottom: 24 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  sheetContent: { flex: 1 },
  sheetContextBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  sheetContextTitle: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  sheetContextName: { ...typography.labelMd, color: colors.onSurface, fontWeight: 'bold' },
  sheetCancelBtn: { flex: 1, height: 52, backgroundColor: '#e5eeff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetCancelBtnText: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
});
