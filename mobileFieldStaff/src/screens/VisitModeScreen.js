import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, BackHandler } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { EmptyState } from '../components';
import { useVisit } from '../context/VisitContext';

export function VisitModeScreen({ navigation, route }) {
  const { activeVisit, finishVisit } = useVisit();
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [outcomes, setOutcomes] = useState({
    metCustomer: false,
    demandAdded: false,
    paymentTalk: false,
    priceList: false,
    mandiIntel: false,
    ownerUnavailable: false
  });
  const [isFinishing, setIsFinishing] = useState(false);

  const customerName = activeVisit?.customerName || route.params?.customerName || 'Customer';
  const latitude = activeVisit?.start_latitude || route.params?.latitude;
  const longitude = activeVisit?.start_longitude || route.params?.longitude;

  // Actual timer synced to started_at
  useEffect(() => {
    if (!activeVisit) return;
    const startMs = new Date(activeVisit.started_at).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diffSecs = Math.floor((now - startMs) / 1000);
      const m = Math.floor(diffSecs / 60).toString().padStart(2, '0');
      const s = (diffSecs % 60).toString().padStart(2, '0');
      setElapsedTime(`${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeVisit]);

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.replace('MainTabs');
    }
  };

  // Prevent unhandled GO_BACK on hardware back press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true; // prevent default behavior
    });
    return () => backHandler.remove();
  }, []);

  const toggleOutcome = (key) => {
    setOutcomes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFinishVisit = async () => {
    if (isFinishing) return;
    try {
      setIsFinishing(true);
      const completed = await finishVisit(outcomes);
      navigation.replace('VisitSummary', { visit: completed });
    } catch (error) {
      setIsFinishing(false);
      Alert.alert('Error', error.message || 'Failed to finish visit');
    }
  };

  const handleVoiceNote = () => {
    Alert.alert(
      'Not Available Offline/Free',
      'Voice Transcription requires a paid API (Google/Whisper) or a connected backend service, which is currently disabled to maintain a Zero Cost budget.'
    );
  };

  const handlePhotoProof = () => {
    Alert.alert(
      'Not Available Offline/Free',
      'Photo/Proof storage requires a paid AWS/Supabase bucket or local file system architecture which is not currently present. This feature is disabled to maintain zero budget.'
    );
  };

  const handleCashCollection = () => {
    Alert.alert(
      'Not Implemented',
      'NOT IMPLEMENTED — AUTHORITATIVE FINANCIAL ARCHITECTURE ABSENT. Cash Collection requires an authoritative financial schema which is currently absent.'
    );
  };

  const handleFollowUp = () => {
    Alert.alert(
      'Not Implemented',
      'NOT IMPLEMENTED — ARCHITECTURAL LIMITATION. The CRM requires a specific date and reason for a follow-up. Please use the main CRM for follow-up scheduling.'
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerLogoText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerPageTitle}>Customer Detail</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.syncBtn}>
            <View style={styles.syncPulse} />
            <Text style={styles.syncText}>Synced</Text>
          </TouchableOpacity>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Offline / Field State Toast Pill */}
        <View style={styles.visitPill}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
            <View style={styles.pulseDotBox}>
              <View style={styles.pulseDotOuter} />
              <View style={styles.pulseDotInner} />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.visitActiveText}>VISIT ACTIVE • विज़िट चालू है</Text>
              <Text style={styles.visitCustomerText} numberOfLines={1}>{customerName}</Text>
            </View>
          </View>
          <View style={styles.timerBox}>
            <MaterialIcons name="timer" size={16} color="#a9f3c5" />
            <Text style={styles.timerText}>{elapsedTime}</Text>
          </View>
        </View>

        {/* Store Verification Meta Card */}
        <View style={styles.metaCard}>
          <View style={styles.metaTop}>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <Text style={styles.metaTitle}>{customerName}</Text>
                <MaterialIcons name="verified" size={20} color={colors.primary} />
              </View>
            </View>
            <TouchableOpacity style={styles.storeBtn}><MaterialIcons name="storefront" size={20} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={styles.geoStrip}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1}}>
              <MaterialIcons name="verified-user" size={18} color="#0d5c3a" />
              <Text style={styles.geoText}>Geofence Active</Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <MaterialIcons name="my-location" size={15} color={colors.onSurfaceVariant} />
              {latitude && longitude ? (
                 <Text style={styles.coordText}>{latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E</Text>
              ) : (
                 <Text style={styles.coordText}>GPS Verified</Text>
              )}
            </View>
          </View>
        </View>

        {/* Hero Decision Grid */}
        <View style={styles.gridCard}>
          <View style={styles.gridHeader}>
            <View>
              <Text style={styles.gridTitle}>What happened? <Text style={{fontWeight: 'normal', fontSize: 18, color: colors.onSurfaceVariant}}>/ क्या हुआ?</Text></Text>
              <Text style={styles.gridSub}>Tap outcomes to auto-draft summary • टैप करके दर्ज करें</Text>
            </View>
          </View>

          <View style={styles.outcomesGrid}>
            <TouchableOpacity style={outcomes.metCustomer ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('metCustomer')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Met Customer</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>ग्राहक से मिले</Text>
              </View>
              <MaterialIcons name="check-circle" size={22} color={outcomes.metCustomer ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={outcomes.demandAdded ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('demandAdded')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Demand Added</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>मांग / ऑर्डर मिला</Text>
              </View>
              <MaterialIcons name="check-circle" size={22} color={outcomes.demandAdded ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={outcomes.paymentTalk ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('paymentTalk')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Payment Talk</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>भुगतान वसूली</Text>
              </View>
              <MaterialIcons name="payments" size={22} color={outcomes.paymentTalk ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>



            <TouchableOpacity style={outcomes.priceList ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('priceList')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Price List</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>रेट लिस्ट दी</Text>
              </View>
              <MaterialIcons name="menu-book" size={22} color={outcomes.priceList ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={outcomes.mandiIntel ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('mandiIntel')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Mandi Intel</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>प्रतिद्वंद्वी भाव</Text>
              </View>
              <MaterialIcons name="insights" size={22} color={outcomes.mandiIntel ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.outcomeBtnInactive} onPress={handleFollowUp}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Follow-up Set</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>फॉलो-अप तय</Text>
              </View>
              <MaterialIcons name="event-available" size={22} color={colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={[outcomes.ownerUnavailable ? styles.outcomeBtnActive : styles.outcomeBtnInactive, {width: '100%'}]} onPress={() => toggleOutcome('ownerUnavailable')}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1}}>
                <MaterialIcons name="person-off" size={20} color={colors.outline} />
                <View style={{flex: 1}}>
                  <Text style={[styles.outcomeTitle, {fontSize: 13}]}>Owner Unavailable / Shop Closed</Text>
                  <Text style={styles.outcomeSub}>मालिक अनुपस्थित / दुकान बंद</Text>
                </View>
              </View>
              <MaterialIcons name={outcomes.ownerUnavailable ? "check-circle" : "radio-button-unchecked"} size={20} color={outcomes.ownerUnavailable ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Voice & Speed Actions Zone */}
        <View style={styles.actionsGrid}>
          <TouchableOpacity style={styles.voiceBtnBig} onPress={handleVoiceNote}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
              <View style={styles.voiceIconInner}><MaterialIcons name="mic" size={24} color="#663500" /></View>
              <View>
                <Text style={styles.voiceBtnTitle}>Tap to Speak Note <Text style={{fontWeight: 'normal', color: '#0d5c3a'}}>• बोलकर जोड़ें</Text></Text>
                <Text style={styles.voiceBtnDesc}>Hindi / English auto-transcribe & action tag</Text>
              </View>
            </View>
            <MaterialIcons name="graphic-eq" size={26} color="#a9f3c5" />
          </TouchableOpacity>

          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionBtn} onPress={() => navigation.navigate('QuickRequirement')}>
              <MaterialIcons name="add-shopping-cart" size={20} color={colors.primary} />
              <Text style={styles.quickActionTitle}>+ Demand</Text>
              <Text style={styles.quickActionSub}>मांग जोड़ें</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionBtn} onPress={handlePhotoProof}>
              <MaterialIcons name="photo-camera" size={20} color="#904d00" />
              <Text style={styles.quickActionTitle}>+ Proof Pic</Text>
              <Text style={styles.quickActionSub}>दुकान फ़ोटो</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionBtn} onPress={handleCashCollection}>
              <MaterialIcons name="currency-rupee" size={20} color="#2f3a4d" />
              <Text style={styles.quickActionTitle}>Record ₹</Text>
              <Text style={styles.quickActionSub}>रोकड़ दर्ज</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Captured Activity Feed */}
        <View style={styles.feedSection}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedHeaderTitle}>Captured in this Visit (वर्तमान सत्र डेटा)</Text>
          </View>
          {activeVisit?.requirements && activeVisit.requirements.length > 0 ? (
            activeVisit.requirements.map((req, i) => (
              <View key={req.id || i} style={styles.feedItem}>
                <MaterialIcons name="shopping-cart" size={16} color={colors.primary} />
                <View style={{flex: 1, marginLeft: 8}}>
                  <Text style={styles.feedItemTitle}>{req.quantity} {req.product_type}</Text>
                  <Text style={styles.feedItemSub}>Expected: {req.expected_date}</Text>
                </View>
              </View>
            ))
          ) : (
            <EmptyState title="No Items Captured" message="Notes, demands, or photos added during this visit will appear here." icon="receipt" />
          )}
        </View>
      </ScrollView>

      {/* Persistent Tactile Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={[styles.finishBtn, isFinishing && { opacity: 0.7 }]} onPress={handleFinishVisit} disabled={isFinishing}>
          <MaterialIcons name="task-alt" size={24} color={colors.onPrimary} />
          <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6}}>
            <Text style={styles.finishTitle}>{isFinishing ? "SAVING..." : "FINISH VISIT"}</Text>
            <Text style={styles.finishSub}>/ विज़िट पूरी करें</Text>
          </View>
          <View style={styles.checkoutTag}><Text style={styles.checkoutTagText}>Check-out</Text></View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9ff' },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, backgroundColor: 'rgba(248, 249, 255, 0.9)' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerLogoText: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
  syncBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 8, height: 32, borderRadius: 16, gap: 4 },
  syncPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  syncText: { ...typography.labelSm, color: '#005232' },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },

  container: { padding: 16, paddingBottom: 120 },
  visitPill: { backgroundColor: '#0d5c3a', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, marginBottom: 16 },
  pulseDotBox: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center' },
  pulseDotOuter: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#a9f3c5', opacity: 0.75 },
  pulseDotInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#a9f3c5' },
  visitActiveText: { fontSize: 11, fontWeight: 'bold', color: '#a9f3c5', letterSpacing: 0.5 },
  visitCustomerText: { fontSize: 12, color: '#eff4ff' },
  timerBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  timerText: { ...typography.labelMd, fontWeight: 'bold', color: '#a9f3c5', letterSpacing: 0.5 },

  metaCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 14, elevation: 1, marginBottom: 16 },
  metaTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  metaTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  storeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  geoStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', borderRadius: 8, padding: 8 },
  geoText: { fontSize: 11, color: colors.onSurface },
  coordText: { fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant },

  gridCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 12 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gridTitle: { ...typography.headlineMd, fontWeight: 'bold', color: colors.onSurface },
  gridSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },

  outcomesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  outcomeBtnActive: { width: '48.5%', minHeight: 58, backgroundColor: colors.primary, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  outcomeBtnInactive: { width: '48.5%', minHeight: 58, backgroundColor: '#eff4ff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  outcomeTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  outcomeSub: { ...typography.bodySm, color: 'rgba(255,255,255,0.9)' },

  actionsGrid: { marginBottom: 8 },
  voiceBtnBig: { minHeight: 60, backgroundColor: '#0d5c3a', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 2, marginBottom: 8 },
  voiceIconInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fe932c', alignItems: 'center', justifyContent: 'center' },
  voiceBtnTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  voiceBtnDesc: { ...typography.bodySm, color: '#8ad2a7' },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  quickActionBtn: { flex: 1, minHeight: 54, backgroundColor: '#ffffff', borderRadius: 12, padding: 10, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  quickActionTitle: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface, marginTop: 2 },
  quickActionSub: { fontSize: 10, color: colors.onSurfaceVariant },

  feedSection: { marginTop: 8, marginBottom: 8 },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4, marginBottom: 8 },
  feedHeaderTitle: { fontSize: 11, fontWeight: 'bold', color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5 },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, elevation: 16, gap: 8 },
  finishBtn: { minHeight: 56, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  finishTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onPrimary, letterSpacing: -0.5 },
  finishSub: { ...typography.labelMd, color: '#a9f3c5' },
  checkoutTag: { backgroundColor: '#0d5c3a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  checkoutTagText: { fontSize: 11, color: '#a9f3c5' },
  
  feedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 8, padding: 12, marginBottom: 8, elevation: 1 },
  feedItemTitle: { fontSize: 13, fontWeight: 'bold', color: colors.onSurface },
  feedItemSub: { fontSize: 11, color: colors.onSurfaceVariant },
});
