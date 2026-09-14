import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';
import { StatusChip } from '../components';

export function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('visits');

  const renderTabContent = () => {
    switch(activeTab) {
      case 'visits':
        return (
          <View style={styles.tabContent}>
            {/* Merchant Card 1 */}
            <View style={styles.merchantCard}>
              <View style={styles.merchantHeader}>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantTags}>
                    <View style={styles.tagSlot}><Text style={styles.tagSlotText}>2:00 PM Slot</Text></View>
                    <Text style={styles.tagDistance}>1.8 km</Text>
                  </View>
                  <Text style={styles.merchantTitle} numberOfLines={1}>Patidar Agri Mart</Text>
                  <Text style={styles.merchantSub}>Rau Circle • Hybrid Wheat Seed Sample Review</Text>
                </View>
                <View style={styles.merchantBal}>
                  <Text style={styles.balLabel}>Credit Balance</Text>
                  <Text style={styles.balAmount}>₹12,400</Text>
                </View>
              </View>
              <View style={styles.merchantActions}>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity style={styles.actionBtnSecondary}>
                    <MaterialIcons name="location-on" size={16} color={colors.onSurface} />
                    <Text style={styles.actionBtnSecondaryText}>Map Route</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtnSecondary}>
                    <MaterialIcons name="edit-note" size={16} color={colors.onSurface} />
                    <Text style={styles.actionBtnSecondaryText}>Notes (2)</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('CustomerProfile', { id: '1' })}>
                  <Text style={styles.actionBtnPrimaryText}>Start</Text>
                  <MaterialIcons name="chevron-right" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Merchant Card 2 */}
            <View style={styles.merchantCard}>
              <View style={styles.merchantHeader}>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantTags}>
                    <View style={styles.tagSlot}><Text style={styles.tagSlotText}>4:15 PM Slot</Text></View>
                    <Text style={styles.tagDistance}>3.4 km</Text>
                  </View>
                  <Text style={styles.merchantTitle} numberOfLines={1}>Narmada Khad Bhandar</Text>
                  <Text style={styles.merchantSub}>Sanwer Road • Zinc & Urea Restock Order</Text>
                </View>
                <View style={styles.merchantBal}>
                  <Text style={styles.balLabelError}>Overdue Ledger</Text>
                  <Text style={styles.balAmountError}>₹1,14,000</Text>
                </View>
              </View>
              <View style={styles.merchantActions}>
                <View style={{flexDirection: 'row', gap: 8}}>
                  <TouchableOpacity style={styles.actionBtnSecondary}>
                    <MaterialIcons name="call" size={16} color={colors.onSurface} />
                    <Text style={styles.actionBtnSecondaryText}>Call Dealer</Text>
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('CustomerProfile', { id: '2' })}>
                  <Text style={styles.actionBtnPrimaryText}>Check-in</Text>
                  <MaterialIcons name="chevron-right" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      case 'tasks':
        return <View style={styles.tabContent}><Text style={{textAlign: 'center', marginTop: 20}}>Assigned Work</Text></View>;
      case 'leads':
        return <View style={styles.tabContent}><Text style={{textAlign: 'center', marginTop: 20}}>Requirements</Text></View>;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Logo omitted for layout, using text matching style */}
          <View style={styles.headerTitleBox}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={styles.headerLogoText}>SHUBH LABH</Text>
              <View style={styles.headerSubBadge}><Text style={styles.headerSubBadgeText}>FIELD</Text></View>
            </View>
            <Text style={styles.headerPageTitle}>Home</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.syncBtn}>
            <View style={styles.syncPulse} />
            <Text style={styles.syncText}>Online</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.langText}>अ/A</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><MaterialIcons name="notifications" size={22} color={colors.onSurfaceVariant} /></TouchableOpacity>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Micro Sync & Hardware State Band */}
        <View style={styles.syncBand}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <View style={styles.syncDotSmall} />
            <Text style={styles.syncBandText}>All 12 synced <Text style={{fontWeight: 'normal', color: colors.onSurfaceVariant}}>| सभी सिंक हैं</Text></Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
            <MaterialIcons name="near-me" size={16} color={colors.primary} />
            <Text style={styles.gpsAccText}>GPS Acc: 4m</Text>
          </View>
        </View>

        {/* Agent Shift & Tactical Context */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftHeader}>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialIcons name="wb-twilight" size={18} color="#904d00" />
                <Text style={styles.greetingText}>Good Morning, Rahul</Text>
              </View>
              <Text style={styles.zoneText}>Zone: Indore North (इंदौर उत्तर)</Text>
            </View>
            <View style={styles.shiftActiveBadge}>
              <MaterialIcons name="verified" size={14} color={colors.primary} />
              <Text style={styles.shiftActiveText}>Shift Active</Text>
            </View>
          </View>
          <View style={styles.progressSection}>
            <View style={styles.progressRow}>
              <Text style={styles.progressLabel}>Daily Goal (दैनिक लक्ष्य)</Text>
              <Text style={styles.progressValue}>4 / 8 Visits Done (50%)</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, {width: '50%'}]} />
            </View>
          </View>
        </View>

        {/* Hero Decision Engine */}
        <View style={styles.heroEngine}>
          <View style={styles.heroEngineHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <MaterialIcons name="explore" size={20} color="#a9f3c5" />
              <View>
                <Text style={styles.heroEngineTitle}>NEXT BEST ACTION</Text>
                <Text style={styles.heroEngineSub}>मुझे आगे क्या करना है?</Text>
              </View>
            </View>
            <View style={styles.priorityBadge}><Text style={styles.priorityText}>High Priority</Text></View>
          </View>
          <View style={styles.heroEngineContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <View>
                <Text style={styles.distanceAlert}>● 0.4 km away (नजदीक)</Text>
                <Text style={styles.heroTarget}>Shree Ganesh Fertilisers</Text>
                <Text style={styles.heroContext}>Order Confirmation • Due 11:30 AM</Text>
              </View>
              <TouchableOpacity style={styles.micBtn}><MaterialIcons name="mic" size={20} color={colors.primary} /></TouchableOpacity>
            </View>
            <View style={styles.heroActionGrid}>
              <TouchableOpacity style={styles.heroStartBtn} onPress={() => navigation.navigate('VisitMode')}>
                <MaterialIcons name="navigation" size={18} color={colors.onPrimary} />
                <Text style={styles.heroStartText}>Start Visit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroSecondBtn}>
                <MaterialIcons name="call" size={18} color={colors.onSurface} />
                <Text style={styles.heroSecondText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroSecondBtn}>
                <MaterialIcons name="chat" size={18} color={colors.onSurface} />
                <Text style={styles.heroSecondText}>WhatsApp</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Urgent Overdue Alert */}
        <View style={styles.overdueEngine}>
          <View style={styles.overdueHeader}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <MaterialIcons name="warning" size={20} color={colors.error} />
              <Text style={styles.overdueTitle}>OVERDUE BY 2 HOURS</Text>
            </View>
            <View style={styles.urgentBadge}><Text style={styles.urgentText}>अति आवश्यक</Text></View>
          </View>
          <View style={styles.heroEngineContent}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
              <View style={{flex: 1}}>
                <Text style={styles.heroTarget}>Kalyan Agro Enterprises</Text>
                <Text style={styles.heroContext}>Indore Bypass • Cheque Pickup Delayed</Text>
              </View>
              <Text style={styles.overdueAmount}>₹78,400</Text>
            </View>
            <View style={styles.heroActionGrid}>
              <TouchableOpacity style={[styles.heroStartBtn, {backgroundColor: colors.error, flex: 1}]} onPress={() => navigation.navigate('VisitMode')}>
                <MaterialIcons name="near-me" size={18} color={colors.onError} />
                <Text style={styles.heroStartText}>Visit Now (विज़िट करें)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.heroSecondBtn, {width: 48, flex: 0}]}>
                <MaterialIcons name="phone-forwarded" size={20} color={colors.onSurface} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Interactive Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={{marginBottom: 12}}>
          <TouchableOpacity style={activeTab === 'visits' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('visits')}>
            <Text style={activeTab === 'visits' ? styles.tabTextActive : styles.tabTextInactive}>Priority Visits</Text>
            <View style={activeTab === 'visits' ? styles.tabBadgeActive : styles.tabBadgeInactive}><Text style={activeTab === 'visits' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeTab === 'tasks' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('tasks')}>
            <Text style={activeTab === 'tasks' ? styles.tabTextActive : styles.tabTextInactive}>Assigned Work (कार्य)</Text>
            <View style={activeTab === 'tasks' ? styles.tabBadgeActive : styles.tabBadgeInactive}><Text style={activeTab === 'tasks' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive}>2</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeTab === 'leads' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('leads')}>
            <Text style={activeTab === 'leads' ? styles.tabTextActive : styles.tabTextInactive}>Requirements (मांग)</Text>
            <View style={activeTab === 'leads' ? styles.tabBadgeActive : styles.tabBadgeInactive}><Text style={activeTab === 'leads' ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive}>3</Text></View>
          </TouchableOpacity>
        </ScrollView>

        {renderTabContent()}

        {/* Field Insights Banner */}
        <View style={styles.voiceBanner}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <View style={styles.voiceIconBox}><MaterialIcons name="record-voice-over" size={22} color={colors.onPrimary} /></View>
            <View>
              <Text style={styles.voiceTitle}>Voice Fast Capture</Text>
              <Text style={styles.voiceSub}>Tap to speak Hindi / Hinglish order</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.voiceStartBtn}>
            <MaterialIcons name="mic" size={18} color={colors.onPrimary} />
            <Text style={styles.voiceStartText}>बोलें</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Floating Add Customer */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCustomer')}>
          <MaterialIcons name="person-add" size={22} color={colors.onPrimary} />
          <View>
            <Text style={styles.fabTitle}>+ Customer</Text>
            <Text style={styles.fabSub}>त्वरित नया ग्राहक</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitleBox: { flexDirection: 'col' },
  headerLogoText: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface, letterSpacing: -0.5 },
  headerSubBadge: { backgroundColor: '#dce9ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  headerSubBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#404942', letterSpacing: 1 },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.primary },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 10, height: 32, borderRadius: 16, gap: 6 },
  syncPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  syncText: { ...typography.labelSm, color: '#005232' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  langText: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  syncBand: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginBottom: 16 },
  syncDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  syncBandText: { ...typography.labelSm, color: colors.onSurface },
  gpsAccText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: 'bold' },
  shiftCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 16 },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greetingText: { ...typography.labelMd, color: colors.onSurface },
  zoneText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  shiftActiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5eeff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  shiftActiveText: { ...typography.labelSm, color: colors.onSurface },
  progressSection: { gap: 6 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  progressValue: { ...typography.labelMd, color: colors.primary, fontWeight: 'bold' },
  progressBarBg: { height: 10, backgroundColor: '#e5eeff', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  heroEngine: { backgroundColor: '#0d5c3a', borderRadius: 12, padding: 16, elevation: 2, marginBottom: 16 },
  heroEngineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  heroEngineTitle: { ...typography.labelMd, color: '#a9f3c5' },
  heroEngineSub: { fontSize: 10, color: '#a9f3c5', opacity: 0.8 },
  priorityBadge: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  priorityText: { ...typography.labelSm, color: '#a9f3c5' },
  heroEngineContent: { backgroundColor: '#ffffff', borderRadius: 8, padding: 14, elevation: 1 },
  distanceAlert: { ...typography.labelSm, color: '#904d00', fontWeight: 'bold', marginBottom: 4 },
  heroTarget: { ...typography.headlineSm, color: colors.onSurface },
  heroContext: { ...typography.bodySm, color: colors.onSurfaceVariant, marginBottom: 12 },
  micBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  heroActionGrid: { flexDirection: 'row', gap: 8 },
  heroStartBtn: { flex: 2, height: 44, backgroundColor: colors.primary, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  heroStartText: { ...typography.labelMd, color: colors.onPrimary },
  heroSecondBtn: { flex: 1, height: 44, backgroundColor: '#e5eeff', borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  heroSecondText: { ...typography.labelMd, color: colors.onSurface },
  overdueEngine: { backgroundColor: '#ffdad6', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 16 },
  overdueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  overdueTitle: { ...typography.labelMd, color: '#93000a', fontWeight: 'bold' },
  urgentBadge: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  urgentText: { ...typography.labelSm, color: colors.error, fontWeight: 'bold' },
  overdueAmount: { fontFamily: 'Inter', fontSize: 20, fontWeight: 'bold', color: colors.error },
  tabsScroll: { gap: 8, paddingBottom: 4 },
  tabActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5eeff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tabTextActive: { ...typography.labelMd, color: colors.onPrimary },
  tabTextInactive: { ...typography.labelMd, color: colors.onSurfaceVariant },
  tabBadgeActive: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#0d5c3a', alignItems: 'center', justifyContent: 'center' },
  tabBadgeInactive: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#dce9ff', alignItems: 'center', justifyContent: 'center' },
  tabBadgeTextActive: { fontSize: 11, fontWeight: 'bold', color: '#a9f3c5' },
  tabBadgeTextInactive: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface },
  tabContent: { gap: 12, marginBottom: 16 },
  merchantCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1 },
  merchantHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  merchantInfo: { flex: 1 },
  merchantTags: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  tagSlot: { backgroundColor: '#e5eeff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  tagSlotText: { ...typography.labelSm, color: colors.onSurface },
  tagDistance: { ...typography.labelSm, color: colors.onSurfaceVariant },
  merchantTitle: { ...typography.headlineSm, color: colors.onSurface },
  merchantSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  merchantBal: { alignItems: 'flex-end', marginLeft: 12 },
  balLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  balAmount: { ...typography.labelLg, color: colors.primary, fontWeight: 'bold' },
  balLabelError: { ...typography.labelSm, color: colors.error, fontWeight: 'bold' },
  balAmountError: { fontFamily: 'Inter', fontSize: 20, fontWeight: 'bold', color: colors.error },
  merchantActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actionBtnSecondary: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5eeff', paddingHorizontal: 12, height: 36, borderRadius: 18, gap: 4 },
  actionBtnSecondaryText: { ...typography.labelSm, color: colors.onSurface },
  actionBtnPrimary: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, height: 36, borderRadius: 18, gap: 4 },
  actionBtnPrimaryText: { ...typography.labelSm, color: colors.onPrimary },
  voiceBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#e5eeff', padding: 16, borderRadius: 12 },
  voiceIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  voiceTitle: { ...typography.labelMd, color: colors.onSurface },
  voiceSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  voiceStartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, height: 40, borderRadius: 20, gap: 4, elevation: 1 },
  voiceStartText: { ...typography.labelMd, color: colors.onPrimary },
  fabContainer: { position: 'absolute', bottom: 24, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 16, paddingRight: 20, height: 52, borderRadius: 26, gap: 8, elevation: 4 },
  fabTitle: { ...typography.labelLg, color: colors.onPrimary, lineHeight: 20 },
  fabSub: { ...typography.labelSm, color: '#8ad2a7', lineHeight: 14 },
});
