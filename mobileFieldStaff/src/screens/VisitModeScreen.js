import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function VisitModeScreen({ navigation }) {
  const [elapsedTime, setElapsedTime] = useState('14:32');
  const [outcomes, setOutcomes] = useState({
    metCustomer: true,
    demandAdded: true,
    paymentTalk: false,
    followUpSet: true,
    priceList: false,
    mandiIntel: false,
    ownerUnavailable: false
  });

  const toggleOutcome = (key) => {
    setOutcomes(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
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
              <Text style={styles.visitCustomerText} numberOfLines={1}>Shree Ganesh Fertilisers (Rajesh Patel)</Text>
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
                <Text style={styles.metaTitle}>Shree Ganesh Fertilisers & Seeds</Text>
                <MaterialIcons name="verified" size={20} color={colors.primary} />
              </View>
              <Text style={styles.metaDesc}>Shop 14, Krishi Upaj Mandi, Loha Bazar • GSTIN: 23AAGCS1249L1Z8</Text>
            </View>
            <TouchableOpacity style={styles.storeBtn}><MaterialIcons name="storefront" size={20} color={colors.primary} /></TouchableOpacity>
          </View>
          <View style={styles.geoStrip}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1}}>
              <MaterialIcons name="verified-user" size={18} color="#0d5c3a" />
              <Text style={styles.geoText}>Geofence Lock: <Text style={{fontWeight: 'bold', color: colors.primary}}>12m from counter</Text></Text>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <MaterialIcons name="my-location" size={15} color={colors.onSurfaceVariant} />
              <Text style={styles.coordText}>22.7196° N, 75.8577° E</Text>
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
            <View style={styles.selectedBadge}><Text style={styles.selectedBadgeText}>3 SELECTED</Text></View>
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
              <View style={styles.demandCounter}><Text style={styles.demandCounterText}>+1</Text></View>
            </TouchableOpacity>

            <TouchableOpacity style={outcomes.paymentTalk ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('paymentTalk')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Payment Talk</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>भुगतान वसूली</Text>
              </View>
              <MaterialIcons name="payments" size={22} color={outcomes.paymentTalk ? colors.onPrimary : colors.outline} />
            </TouchableOpacity>

            <TouchableOpacity style={outcomes.followUpSet ? styles.outcomeBtnActive : styles.outcomeBtnInactive} onPress={() => toggleOutcome('followUpSet')}>
              <View style={{flex: 1, paddingRight: 4}}>
                <Text style={styles.outcomeTitle} numberOfLines={1}>Follow-up Set</Text>
                <Text style={styles.outcomeSub} numberOfLines={1}>फॉलो-अप तय</Text>
              </View>
              <MaterialIcons name="event-available" size={22} color={outcomes.followUpSet ? colors.onPrimary : colors.outline} />
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
          <TouchableOpacity style={styles.voiceBtnBig}>
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
            
            <TouchableOpacity style={styles.quickActionBtn}>
              <MaterialIcons name="photo-camera" size={20} color="#904d00" />
              <Text style={styles.quickActionTitle}>+ Proof Pic</Text>
              <Text style={styles.quickActionSub}>दुकान फ़ोटो</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionBtn}>
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
            <Text style={styles.feedHeaderCount}>3 items saved</Text>
          </View>

          <View style={styles.feedCard}>
            <View style={styles.feedIconBox}><MaterialIcons name="inventory-2" size={22} color={colors.primary} /></View>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
                <Text style={styles.feedItemTitle}>Zinc Sulphate 21% (Mono)</Text>
                <Text style={styles.feedItemPrice}>₹38,500</Text>
              </View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2}}>
                <View style={styles.feedItemBadge}><Text style={styles.feedItemBadgeText}>25 HDPE Bags (50kg)</Text></View>
                <Text style={styles.feedItemDesc}>Dispatch: 18 May</Text>
              </View>
            </View>
            <View style={{flexDirection: 'row', gap: 4, marginLeft: 8}}>
              <MaterialIcons name="edit" size={18} color={colors.outline} />
              <MaterialIcons name="delete" size={18} color={colors.outline} />
            </View>
          </View>

          <View style={styles.feedCard}>
            <View style={{width: '100%'}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <View style={styles.voiceSmallIconBox}><MaterialIcons name="mic" size={18} color="#904d00" /></View>
                  <Text style={styles.feedItemTitle}>Voice Note Transcription</Text>
                </View>
                <View style={styles.feedTimeBadge}><Text style={styles.feedTimeText}>18s • 10:44 AM</Text></View>
              </View>
              <View style={styles.quoteBox}>
                <MaterialIcons name="format-quote" size={18} color={colors.primary} style={{marginTop: 2}} />
                <Text style={styles.quoteText}>"राजेश जी ने कहा कि यूरिया सब्स्टीट्यूट के 50 बैग अगले मंगलवार तक भिजवा दो, पिछला बकाया ₹15,000 चेक से शनिवार को क्लियर करेंगे।"</Text>
              </View>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingHorizontal: 4}}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <View style={styles.aiDot} />
                  <Text style={styles.aiText}>AI Action: Follow-up created for Saturday</Text>
                </View>
                <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 2}}>
                  <MaterialIcons name="play-circle" size={16} color={colors.primary} />
                  <Text style={styles.playText}>Play Audio</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.feedCard}>
            <View style={styles.imgBox}>
              <Image source={{uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGNU4AsPGZz1qg_Q78S1PbeI39S6gISdGb4DjGimPXAXyE44MMtcUMTuJ3u7B-8HtuK8juiW5cFzy-lecBB2K8t2TAtTCictdEIMymGsS3qTfZzWWZMtlFlJI1C_Zp4QkcruLBwugQGdX31Eac4Ptut_Yt0hHCY69G9PsMVAP02oY915tWJpVjtj6drA5xXIc-DZjQlw_cTcP7u1Wj5MTI5aBSgU6bH6AQ0cjOhQ36GwSEvVqFu-YK'}} style={{width: '100%', height: '100%', resizeMode: 'cover'}} />
              <View style={styles.imgGpsTag}><Text style={styles.imgGpsText}>GPS</Text></View>
            </View>
            <View style={{flex: 1}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <MaterialIcons name="location-on" size={16} color={colors.primary} />
                <Text style={styles.feedStoreTitle}>STOREFRONT CAPTURED</Text>
              </View>
              <Text style={styles.feedItemTitle}>Shree Ganesh Fertilisers Shop Banner</Text>
              <Text style={styles.feedItemDescSmall}>Accuracy: 3.2m • Lat 22.7196, Lon 75.8577</Text>
            </View>
            <TouchableOpacity style={styles.fullScreenBtn}><MaterialIcons name="fullscreen" size={18} color={colors.onSurface} /></TouchableOpacity>
          </View>
        </View>

        {/* Outstanding Account Mini Card */}
        <View style={styles.outstandingCard}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <View style={styles.outstandingIconBox}><MaterialIcons name="account-balance-wallet" size={20} color="#93000a" /></View>
            <View>
              <Text style={styles.outstandingLabel}>CURRENT OUTSTANDING DUES</Text>
              <Text style={styles.outstandingAmt}>₹42,800</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.ledgerBtn}><Text style={styles.ledgerBtnText}>View Ledger</Text></TouchableOpacity>
        </View>
      </ScrollView>

      {/* Persistent Tactile Bottom Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.finishBtn}>
          <MaterialIcons name="task-alt" size={24} color={colors.onPrimary} />
          <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 6}}>
            <Text style={styles.finishTitle}>FINISH VISIT</Text>
            <Text style={styles.finishSub}>/ विज़िट पूरी करें</Text>
          </View>
          <View style={styles.checkoutTag}><Text style={styles.checkoutTagText}>Check-out</Text></View>
        </TouchableOpacity>
        <View style={styles.secondaryActions}>
          <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4}}>
            <MaterialIcons name="cancel" size={16} color={colors.error} />
            <Text style={styles.cancelText}>Cancel Visit</Text>
          </TouchableOpacity>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4}}>
              <MaterialIcons name="pause-circle" size={16} color={colors.onSurfaceVariant} />
              <Text style={styles.pauseText}>Pause (चाय ब्रेक)</Text>
            </TouchableOpacity>
            <Text style={{color: colors.outline, fontSize: 12}}>•</Text>
            <TouchableOpacity style={{flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4}}>
              <MaterialIcons name="navigation" size={16} color={colors.primary} />
              <Text style={styles.nextText}>Next Mandi Stop</Text>
            </TouchableOpacity>
          </View>
        </View>
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
  metaDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  storeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  geoStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', borderRadius: 8, padding: 8 },
  geoText: { fontSize: 11, color: colors.onSurface },
  coordText: { fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant },

  gridCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 12 },
  gridHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  gridTitle: { ...typography.headlineMd, fontWeight: 'bold', color: colors.onSurface },
  gridSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  selectedBadge: { backgroundColor: '#a9f3c5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  selectedBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#002111' },

  outcomesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 },
  outcomeBtnActive: { width: '48.5%', minHeight: 58, backgroundColor: colors.primary, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  outcomeBtnInactive: { width: '48.5%', minHeight: 58, backgroundColor: '#eff4ff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  outcomeTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  outcomeSub: { ...typography.bodySm, color: 'rgba(255,255,255,0.9)' },
  demandCounter: { height: 24, paddingHorizontal: 6, borderRadius: 12, backgroundColor: '#fe932c', alignItems: 'center', justifyContent: 'center' },
  demandCounterText: { fontSize: 11, fontWeight: 'bold', color: '#663500' },

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
  feedHeaderCount: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  feedCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 12, elevation: 1, marginBottom: 8 },
  feedIconBox: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center' },
  feedItemTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onSurface },
  feedItemPrice: { ...typography.labelLg, fontWeight: 'extrabold', color: colors.primary },
  feedItemBadge: { backgroundColor: '#e5eeff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  feedItemBadgeText: { fontSize: 11, color: colors.onSurfaceVariant },
  feedItemDesc: { ...typography.bodySm, color: colors.onSurfaceVariant },
  voiceSmallIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  feedTimeBadge: { backgroundColor: '#eff4ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  feedTimeText: { fontSize: 11, color: colors.onSurfaceVariant },
  quoteBox: { backgroundColor: '#eff4ff', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  quoteText: { ...typography.bodyMd, fontStyle: 'italic', color: colors.onSurfaceVariant, flex: 1 },
  aiDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  aiText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  playText: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  imgBox: { width: 64, height: 64, borderRadius: 8, backgroundColor: '#e5eeff', overflow: 'hidden' },
  imgGpsTag: { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(33,49,69,0.8)', paddingHorizontal: 4, borderRadius: 4 },
  imgGpsText: { fontSize: 9, fontFamily: 'monospace', color: '#eaf1ff' },
  feedStoreTitle: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  feedItemDescSmall: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 2 },
  fullScreenBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center' },

  outstandingCard: { backgroundColor: '#e5eeff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  outstandingIconBox: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#ffdad6', alignItems: 'center', justifyContent: 'center' },
  outstandingLabel: { fontSize: 11, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  outstandingAmt: { fontSize: 26, fontWeight: '800', color: colors.error, marginTop: -2 },
  ledgerBtn: { backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, elevation: 1 },
  ledgerBtnText: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24, elevation: 16, gap: 8 },
  finishBtn: { minHeight: 56, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  finishTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onPrimary, letterSpacing: -0.5 },
  finishSub: { ...typography.labelMd, color: '#a9f3c5' },
  checkoutTag: { backgroundColor: '#0d5c3a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 4 },
  checkoutTagText: { fontSize: 11, color: '#a9f3c5' },
  secondaryActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  cancelText: { ...typography.labelMd, fontWeight: '600', color: colors.error },
  pauseText: { ...typography.labelMd, fontWeight: '600', color: colors.onSurfaceVariant },
  nextText: { ...typography.labelMd, fontWeight: '600', color: colors.primary },
});
