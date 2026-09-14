import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Linking, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded } from '../theme/tokens';
import { Button, EmptyState, BottomSheetFoundation } from '../components';
import { supabase } from '../lib/supabase';

export function CustomerProfileScreen({ navigation, route }) {
  const { t } = useTranslation();
  const customerId = route.params?.id;

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
  const creditLimit = financials?.crm_credit_limit_amount || 500000;
  const outstanding = financials?.crm_credit_outstanding_amount || 124500;
  const gst = '23AABCS1429B1Z';

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
          <View style={styles.syncBadge}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>Synced</Text>
          </View>
          <View style={styles.userIcon}>
            <MaterialIcons name="person" size={18} color={colors.onPrimary} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* 10-Sec Executive Brief Banner */}
        <View style={styles.briefBanner}>
          <View style={styles.briefBannerLeft}>
            <View style={styles.pingDot} />
            <Text style={styles.briefBannerText}>10-SEC EXECUTIVE BRIEF / तीव्र समीक्षा</Text>
          </View>
          <Text style={styles.dealerId}>Dealer ID: #IN-MP-{customer.id?.substring(0,4) || '7782'}</Text>
        </View>

        {/* Hero Summary Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroStripe} />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <View style={styles.badges}>
                <View style={styles.badgePrimary}>
                  <MaterialIcons name="verified" size={13} color={colors.onPrimaryFixed} style={{marginRight: 4}} />
                  <Text style={styles.badgePrimaryText}>Active Dealer (श्रेणी-A)</Text>
                </View>
                <View style={styles.badgeSecondary}>
                  <Text style={styles.badgeSecondaryText}>GST Verified</Text>
                </View>
              </View>
              <View style={styles.distanceBadge}>
                <MaterialIcons name="directions-walk" size={15} color={colors.primary} />
                <Text style={styles.distanceText}>0.4 km (3m)</Text>
              </View>
            </View>

            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroName}>{customer.display_name || 'Shree Ganesh Fertilisers & Seeds'}</Text>
              <Text style={styles.heroSubname}>श्री गणेश फर्टिलाइजर्स एंड सीड्स • प्रो: <Text style={{fontWeight: 'bold'}}>Rajesh Patel</Text></Text>
            </View>

            <View style={styles.geoBlock}>
              <View style={styles.geoRow}>
                <MaterialIcons name="storefront" size={16} color={colors.primary} style={{marginRight: 6}} />
                <Text style={styles.geoText} numberOfLines={1}>{customer.city || 'Shop 14, Loha Mandi, Indore'}</Text>
              </View>
              <View style={styles.gstRow}>
                <Text style={styles.gstText}>GSTIN: <Text style={{fontFamily: 'monospace', fontWeight: 'bold', color: colors.onSurface}}>{gst}</Text></Text>
                <Text style={styles.limitText}>Limit: {formatCurrency(creditLimit)}</Text>
              </View>
            </View>

            <View style={styles.duesBar}>
              <View>
                <Text style={styles.duesLabel}>Pending Dues / बकाया राशि</Text>
                <Text style={styles.duesAmount}>{formatCurrency(outstanding)}</Text>
              </View>
              <View style={{alignItems: 'flex-end'}}>
                <View style={styles.dueBadge}><Text style={styles.dueBadgeText}>Due in 4 Days</Text></View>
                <Text style={styles.billText}>Bill: #INV-24-998</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Primary Action Row */}
        <View style={styles.actionSection}>
          <TouchableOpacity style={styles.startVisitBtn} onPress={() => navigation.navigate('VisitMode')}>
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
            <TouchableOpacity style={styles.quickBtn} onPress={() => {}}>
              <MaterialIcons name="chat" size={20} color={colors.primary} />
              <Text style={styles.quickBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn} onPress={() => setDemandSheetVisible(true)}>
              <MaterialIcons name="add-shopping-cart" size={20} color="#904d00" />
              <Text style={styles.quickBtnText}>+ Demand</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickBtn}>
              <MaterialIcons name="calendar-today" size={20} color={colors.onSurfaceVariant} />
              <Text style={styles.quickBtnText}>+ Follow</Text>
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
            <Text style={styles.bentoTitle}>Operational Radar (10 सेकंड इनसाइट्स)</Text>
            <Text style={styles.bentoPriority}>Priority: High</Text>
          </View>
          <View style={styles.bentoGrid}>
            {/* Card 1 */}
            <View style={styles.bentoCard}>
              <View style={styles.bentoCardTop}>
                <MaterialIcons name="history" size={16} color="#0d5c3a" />
                <Text style={[styles.bentoCardTitle, {color: colors.onSurfaceVariant}]}>LAST INTERACTION</Text>
              </View>
              <Text style={styles.bentoCardDesc}>Met Rajesh-ji; gave 10kg Bio-NPK sample. Very receptive to trial.</Text>
              <View style={styles.bentoCardBottom}>
                <Text style={styles.bentoCardDate}>2 days ago</Text>
                <Text style={styles.bentoCardAuthor}>By You</Text>
              </View>
            </View>
            {/* Card 2 */}
            <View style={[styles.bentoCard, {backgroundColor: 'rgba(254, 147, 44, 0.2)'}]}>
              <View style={styles.bentoCardTop}>
                <MaterialIcons name="alarm" size={16} color="#904d00" />
                <Text style={[styles.bentoCardTitle, {color: '#663500'}]}>FOLLOW-UP TODAY</Text>
              </View>
              <Text style={styles.bentoCardDesc}>Confirm bulk booking for 50 bags Urea substitute.</Text>
              <View style={[styles.bentoCardBottom, {borderColor: 'rgba(254, 147, 44, 0.3)'}]}>
                <Text style={[styles.bentoCardDate, {color: '#904d00', fontWeight: 'bold'}]}>Today, 11:30 AM</Text>
                <MaterialIcons name="arrow-forward" size={16} color="#904d00" />
              </View>
            </View>
            {/* Card 3 */}
            <View style={styles.bentoCard}>
              <View style={[styles.bentoCardTop, {justifyContent: 'space-between', width: '100%'}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <MaterialIcons name="inventory" size={16} color={colors.primary} />
                  <Text style={[styles.bentoCardTitle, {color: colors.onSurfaceVariant}]}>OPEN DEMAND</Text>
                </View>
                <View style={styles.countBadge}><Text style={styles.countBadgeText}>1 Req</Text></View>
              </View>
              <Text style={styles.bentoCardDesc}>25 Bags Zinc Sulphate (21% Granular Grade).</Text>
              <View style={styles.bentoCardBottom}>
                <Text style={[styles.bentoCardDate, {color: colors.error, fontWeight: 'bold'}]}>Needed: 20 Nov</Text>
                <Text style={styles.bentoCardAuthor}>₹38,500</Text>
              </View>
            </View>
            {/* Card 4 */}
            <View style={styles.bentoCard}>
              <View style={[styles.bentoCardTop, {justifyContent: 'space-between', width: '100%'}]}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <MaterialIcons name="assignment-late" size={16} color={colors.error} />
                  <Text style={[styles.bentoCardTitle, {color: colors.onSurfaceVariant}]}>MANDATORY TASK</Text>
                </View>
                <View style={[styles.countBadge, {backgroundColor: '#ffdad6'}]}><Text style={[styles.countBadgeText, {color: '#93000a'}]}>1 Due</Text></View>
              </View>
              <Text style={styles.bentoCardDesc}>Collect signed physical balance confirmation letter.</Text>
              <View style={styles.bentoCardBottom}>
                <Text style={styles.bentoCardDate}>Audit Req.</Text>
                <MaterialIcons name="check-box-outline-blank" size={15} color={colors.error} />
              </View>
            </View>
          </View>
        </View>

        {/* Geo Verification */}
        <View style={styles.geoProof}>
          <View style={styles.geoImageContainer}>
            <View style={styles.geoImageMock} />
            <View style={styles.geoImageOverlay}><Text style={styles.geoImageOverlayText}>VERIFIED</Text></View>
          </View>
          <View style={styles.geoProofContent}>
            <View style={styles.geoProofHeader}>
              <Text style={styles.geoProofTitle}>Shop Front Geotag</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialIcons name="pin-drop" size={13} color={colors.primary} />
                <Text style={styles.geoProofAcc}>Accurate (4m)</Text>
              </View>
            </View>
            <Text style={styles.geoProofStamp}>Geo-stamp: 22.7196° N, 75.8577° E</Text>
            <Text style={styles.geoProofDate}>Photo updated by Area Officer: 14 Oct 2024</Text>
          </View>
        </View>

        {/* Recent Timeline */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.bentoTitle}>Recent Timeline / हालिया गतिविधियां</Text>
            <Text style={styles.timelineLink}>View History</Text>
          </View>
          <View style={styles.timelineCard}>
            <View style={styles.timelineItem}>
              <View style={styles.timelineIcon}><MaterialIcons name="how-to-reg" size={16} color={colors.onPrimaryFixed} /></View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Text style={styles.timelineItemTitle}>Physical Visit & Demo</Text>
                  <Text style={styles.timelineItemDate}>16 Nov, 04:15 PM</Text>
                </View>
                <Text style={styles.timelineItemDesc}>GPS Validated check-in (24 mins spent). Handed over 10kg Bio-NPK product kit.</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* Embedded Demand Bottom Sheet */}
      <BottomSheetFoundation visible={demandSheetVisible} onClose={() => setDemandSheetVisible(false)} height="55%">
        <View style={styles.sheetContent}>
          <View style={styles.sheetContextBar}>
            <View>
              <Text style={styles.sheetContextTitle}>TARGET CUSTOMER</Text>
              <Text style={styles.sheetContextName}>Shree Ganesh Fertilisers (Rajesh Patel)</Text>
            </View>
            <View style={styles.sheetContextId}><Text style={styles.sheetContextIdText}>#IN-MP-7782</Text></View>
          </View>
          
          <Text style={typography.headlineSm}>Quick Demand Note (+ मांग प्रविष्टि)</Text>
          <Text style={{...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: 16}}>Add SKU demand directly to dispatch order queue.</Text>

          <Text style={styles.inputLabel}>Product SKU / उत्पाद चुनें</Text>
          <View style={styles.inputMock}><Text style={typography.bodyMd}>Bio-NPK Granules 50kg (Special Rabi)</Text></View>

          <View style={{flexDirection: 'row', gap: 12, marginTop: 12, marginBottom: 24}}>
            <View style={{flex: 1}}>
              <Text style={styles.inputLabel}>Quantity (Bags)</Text>
              <View style={[styles.inputMock, {justifyContent: 'center'}]}><Text style={[typography.headlineSm, {textAlign: 'center'}]}>25</Text></View>
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.inputLabel}>Delivery Due</Text>
              <View style={styles.inputMock}><Text style={typography.bodyMd}>2024-11-20</Text></View>
            </View>
          </View>

          <View style={{flexDirection: 'row', gap: 8}}>
            <TouchableOpacity style={styles.sheetCancelBtn} onPress={() => setDemandSheetVisible(false)}>
              <Text style={styles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetSaveBtn} onPress={() => setDemandSheetVisible(false)}>
              <Text style={styles.sheetSaveBtnText}>Save Demand (दर्ज करें)</Text>
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
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  briefBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eff4ff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  briefBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pingDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  briefBannerText: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  dealerId: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '500' },
  heroCard: { backgroundColor: '#ffffff', borderRadius: 12, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  heroStripe: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 8, backgroundColor: colors.primary },
  heroContent: { padding: 16, paddingLeft: 20 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  badges: { flexDirection: 'row', gap: 6 },
  badgePrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 12 },
  badgePrimaryText: { ...typography.labelSm, color: '#005232', fontWeight: 'bold' },
  badgeSecondary: { backgroundColor: '#e5eeff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeSecondaryText: { ...typography.labelSm, color: colors.onSurface },
  distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(142, 214, 170, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, gap: 4 },
  distanceText: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  heroTitleContainer: { marginBottom: 12 },
  heroName: { ...typography.headlineMd, color: colors.onSurface, lineHeight: 28 },
  heroSubname: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  geoBlock: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 8, marginBottom: 12 },
  geoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  geoText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  gstRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gstText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  limitText: { ...typography.labelSm, color: '#904d00', fontWeight: 'bold' },
  duesBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255, 218, 214, 0.4)', padding: 10, borderRadius: 8 },
  duesLabel: { ...typography.labelSm, color: '#93000a', textTransform: 'uppercase' },
  duesAmount: { fontFamily: 'Inter', fontSize: 26, fontWeight: '800', color: colors.error, marginTop: 2 },
  dueBadge: { backgroundColor: colors.error, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginBottom: 2 },
  dueBadgeText: { ...typography.labelSm, color: colors.onError, fontWeight: 'bold' },
  billText: { ...typography.bodySm, color: '#93000a' },
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
  bentoPriority: { ...typography.labelSm, color: colors.primary, fontWeight: '600' },
  bentoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bentoCard: { width: '48.5%', backgroundColor: '#ffffff', borderRadius: 12, padding: 12, elevation: 1 },
  bentoCardTop: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  bentoCardTitle: { ...typography.labelSm, fontWeight: 'bold' },
  bentoCardDesc: { ...typography.bodySm, color: colors.onSurface, fontWeight: '500', minHeight: 40 },
  bentoCardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#e5eeff' },
  bentoCardDate: { ...typography.labelSm, color: colors.onSurfaceVariant },
  bentoCardAuthor: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  countBadge: { backgroundColor: '#e5eeff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  countBadgeText: { ...typography.labelSm, color: colors.onSurface, fontWeight: 'bold' },
  geoProof: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 12, borderRadius: 12, elevation: 1, marginBottom: 16, alignItems: 'center', gap: 12 },
  geoImageContainer: { width: 64, height: 64, borderRadius: 8, overflow: 'hidden', backgroundColor: '#e5eeff' },
  geoImageMock: { flex: 1, backgroundColor: '#cbd5e1' },
  geoImageOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,67,40,0.8)', paddingVertical: 2 },
  geoImageOverlayText: { fontSize: 8, color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
  geoProofContent: { flex: 1 },
  geoProofHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  geoProofTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  geoProofAcc: { ...typography.labelSm, color: colors.primary, fontWeight: '600', marginLeft: 2 },
  geoProofStamp: { ...typography.bodySm, color: colors.onSurfaceVariant },
  geoProofDate: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2 },
  timelineSection: { marginBottom: 24 },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingHorizontal: 4 },
  timelineLink: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  timelineCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, elevation: 1 },
  timelineItem: { flexDirection: 'row', gap: 12 },
  timelineIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#a9f3c5', alignItems: 'center', justifyContent: 'center' },
  timelineContent: { flex: 1 },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  timelineItemTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  timelineItemDate: { ...typography.bodySm, color: colors.onSurfaceVariant },
  timelineItemDesc: { ...typography.bodySm, color: colors.onSurfaceVariant },
  sheetContent: { flex: 1 },
  sheetContextBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 16 },
  sheetContextTitle: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  sheetContextName: { ...typography.labelMd, color: colors.onSurface, fontWeight: 'bold' },
  sheetContextId: { backgroundColor: '#a9f3c5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sheetContextIdText: { ...typography.labelSm, color: '#005232', fontWeight: '600' },
  inputLabel: { ...typography.labelSm, color: colors.onSurface, marginBottom: 4 },
  inputMock: { height: 48, backgroundColor: '#eff4ff', borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  sheetCancelBtn: { flex: 1, height: 52, backgroundColor: '#e5eeff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sheetCancelBtnText: { ...typography.labelLg, color: colors.onSurface, fontWeight: '600' },
  sheetSaveBtn: { flex: 2, height: 52, backgroundColor: colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  sheetSaveBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
});
