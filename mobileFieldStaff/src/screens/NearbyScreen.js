import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

const { width } = Dimensions.get('window');

export function NearbyScreen({ navigation }) {
  const [activeRadius, setActiveRadius] = useState('1km');

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
            <Text style={styles.headerPageTitle}>Nearby Customers</Text>
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
        {/* Offline / GPS Diagnostic Strip */}
        <View style={styles.gpsStrip}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <View style={styles.gpsPulse} />
            <Text style={styles.gpsText}>GPS Live: ±3m • Krishi Mandi Sector-B</Text>
          </View>
          <View style={styles.gpsBadge}>
            <MaterialIcons name="satellite-alt" size={14} color="#0d5c3a" />
            <Text style={styles.gpsBadgeText}>High Accuracy</Text>
          </View>
        </View>

        {/* Screen Context / Value Proposition */}
        <View style={styles.contextBox}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={styles.contextTitle}>Nearby Customers <Text style={{fontWeight: 'normal', fontSize: 15, color: colors.onSurfaceVariant}}>• नजदीक के ग्राहक</Text></Text>
            <View style={styles.slotBadge}><Text style={styles.slotBadgeText}>Free 45 Min Slot</Text></View>
          </View>
          <Text style={styles.contextDesc}>Maximize your downtime: Squeeze an unplanned visit right now (अतिरिक्त समय का सदुपयोग करें).</Text>
        </View>

        {/* Radius Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.radiusScroll} style={{marginBottom: 12}}>
          <TouchableOpacity style={activeRadius === '1km' ? styles.radiusActive : styles.radiusInactive} onPress={() => setActiveRadius('1km')}>
            <MaterialIcons name="near-me" size={18} color={activeRadius === '1km' ? colors.onPrimary : colors.onSurface} />
            <Text style={activeRadius === '1km' ? styles.radiusTextActive : styles.radiusTextInactive}>{'<'} 1 km</Text>
            <View style={activeRadius === '1km' ? styles.radiusCountActive : styles.radiusCountInactive}><Text style={activeRadius === '1km' ? styles.radiusCountTextActive : styles.radiusCountTextInactive}>5</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeRadius === '2km' ? styles.radiusActive : styles.radiusInactive} onPress={() => setActiveRadius('2km')}>
            <Text style={activeRadius === '2km' ? styles.radiusTextActive : styles.radiusTextInactive}>{'<'} 2 km</Text>
            <View style={activeRadius === '2km' ? styles.radiusCountActive : styles.radiusCountInactive}><Text style={activeRadius === '2km' ? styles.radiusCountTextActive : styles.radiusCountTextInactive}>12</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeRadius === '5km' ? styles.radiusActive : styles.radiusInactive} onPress={() => setActiveRadius('5km')}>
            <Text style={activeRadius === '5km' ? styles.radiusTextActive : styles.radiusTextInactive}>{'<'} 5 km</Text>
            <View style={activeRadius === '5km' ? styles.radiusCountActive : styles.radiusCountInactive}><Text style={activeRadius === '5km' ? styles.radiusCountTextActive : styles.radiusCountTextInactive}>24</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeRadius === 'route' ? styles.radiusActive : styles.radiusInactive} onPress={() => setActiveRadius('route')}>
            <MaterialIcons name="alt-route" size={16} color={activeRadius === 'route' ? colors.onPrimary : '#904d00'} />
            <Text style={activeRadius === 'route' ? styles.radiusTextActive : styles.radiusTextInactive}>In Beat Route</Text>
            <View style={activeRadius === 'route' ? styles.radiusCountActive : styles.radiusCountInactive}><Text style={activeRadius === 'route' ? styles.radiusCountTextActive : [styles.radiusCountTextInactive, {color: '#904d00'}]}>8</Text></View>
          </TouchableOpacity>
        </ScrollView>

        {/* Quick Sorting Strip */}
        <View style={styles.sortStrip}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1}}>
            <MaterialIcons name="sort" size={18} color={colors.onSurfaceVariant} />
            <Text style={styles.sortLabel}>Sort By:</Text>
            <Text style={styles.sortValue} numberOfLines={1}>Closest First / नजदीकी पहले</Text>
          </View>
          <View style={{flexDirection: 'row', gap: 4}}>
            <View style={styles.sortTag}><Text style={styles.sortTagText}>Payment Due</Text></View>
            <View style={styles.sortTag}><Text style={styles.sortTagText}>{'>'}15 Days Visited</Text></View>
          </View>
        </View>

        {/* Radar Map (Visual Mock) */}
        <View style={styles.mapContainer}>
          <View style={styles.mapCanvas}>
            {/* Grid lines mocked */}
            <View style={[styles.mapLine, {top: '30%', width: '100%'}]} />
            <View style={[styles.mapLine, {left: '40%', height: '100%', width: 1}]} />
            {/* Center Pulse */}
            <View style={styles.mapCenter}>
              <View style={styles.mapPulseOuter} />
              <View style={styles.mapPulseInner} />
              <View style={styles.mapLabel}><Text style={styles.mapLabelText}>You are here</Text></View>
            </View>
            {/* Pins */}
            <View style={[styles.pinWrapper, {top: '34%', left: '58%'}]}>
              <View style={styles.pinTag}><View style={[styles.pinDot, {backgroundColor: colors.primary}]}><Text style={styles.pinDotText}>1</Text></View><Text style={styles.pinTagText}>250m</Text></View>
            </View>
            <View style={[styles.pinWrapper, {top: '66%', left: '38%'}]}>
              <View style={styles.pinTag}><View style={[styles.pinDot, {backgroundColor: '#904d00'}]}><Text style={styles.pinDotText}>2</Text></View><Text style={styles.pinTagText}>450m</Text></View>
            </View>
            <View style={[styles.pinWrapper, {top: '60%', left: '78%'}]}>
              <View style={styles.pinTag}><View style={[styles.pinDot, {backgroundColor: '#2f3a4d'}]}><Text style={styles.pinDotText}>3</Text></View><Text style={styles.pinTagText}>800m</Text></View>
            </View>
            
            <View style={styles.mapTopBadge}>
              <MaterialIcons name="radar" size={16} color={colors.primary} />
              <Text style={styles.mapTopBadgeText}>Radar: 1 km cluster</Text>
            </View>
            <View style={styles.mapRecenterBtn}>
              <MaterialIcons name="my-location" size={20} color={colors.primary} />
            </View>
          </View>
          <View style={styles.mapBottomStrip}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <MaterialIcons name="verified" size={18} color={colors.primary} />
              <Text style={styles.mapBottomText}>8 Verified Customers within 2 km radius</Text>
            </View>
            <Text style={styles.mapBottomSub}>Indore Krishi Mandi Hub</Text>
          </View>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <Text style={styles.sectionTitle}>Nearest Opportunities</Text>
            <View style={styles.sectionActiveBadge}><Text style={styles.sectionActiveText}>Active</Text></View>
          </View>
          <Text style={styles.sectionSub}>Tap to Start Visit</Text>
        </View>

        {/* Customer Cards */}
        {/* Card 1: Shree Ganesh */}
        <View style={styles.card}>
          <View style={[styles.cardBorder, {backgroundColor: colors.primary}]} />
          <View style={styles.cardTop}>
            <View style={{flex: 1, paddingRight: 8}}>
              <Text style={styles.cardTitle}>Shree Ganesh Fertilisers & Seeds</Text>
              <Text style={styles.cardDesc}>Prop. Rajesh Patel • Gate No. 4, Mandi Complex</Text>
            </View>
            <View style={styles.distBadge}><MaterialIcons name="directions-walk" size={16} color="#002111" /><Text style={styles.distBadgeText}>250m • 3 min</Text></View>
          </View>
          <View style={styles.cardMiddle}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <MaterialIcons name="schedule" size={16} color={colors.primary} />
                <Text style={styles.cardMiddleTitle}>Today 11:30 AM Slot Available</Text>
              </View>
              <View style={styles.overdueBadge}><Text style={styles.overdueBadgeText}>Overdue</Text></View>
            </View>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end'}}>
              <Text style={styles.cardMiddleDesc}>Outstanding Ledger Balance:</Text>
              <Text style={styles.cardMiddleAmt}>₹1,24,500</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('VisitMode')}>
              <MaterialIcons name="play-circle" size={22} color={colors.onPrimary} />
              <Text style={styles.actionBtnPrimaryText}>START VISIT (विज़िट शुरू)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnIcon}><MaterialIcons name="call" size={22} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnIcon}><MaterialIcons name="directions" size={22} color={colors.primary} /></TouchableOpacity>
          </View>
        </View>

        {/* Card 2: Kisan Krishi */}
        <View style={styles.card}>
          <View style={[styles.cardBorder, {backgroundColor: '#fe932c'}]} />
          <View style={styles.cardTop}>
            <View style={{flex: 1, paddingRight: 8}}>
              <Text style={styles.cardTitle}>Kisan Krishi Seva Kendra</Text>
              <Text style={styles.cardDesc}>Prop. Mahesh Sharma • Shop 12, Shed B</Text>
            </View>
            <View style={[styles.distBadge, {backgroundColor: '#dce9ff'}]}><MaterialIcons name="directions-walk" size={16} color={colors.onSurface} /><Text style={[styles.distBadgeText, {color: colors.onSurface}]}>450m • 5 min</Text></View>
          </View>
          <View style={[styles.cardMiddle, {backgroundColor: 'rgba(255,220,195,0.3)'}]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4}}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                <MaterialIcons name="history" size={16} color="#663500" />
                <Text style={[styles.cardMiddleTitle, {color: '#663500'}]}>Last visited 18 days ago • No active orders</Text>
              </View>
              <View style={[styles.overdueBadge, {backgroundColor: '#fe932c'}]}><Text style={[styles.overdueBadgeText, {color: '#663500'}]}>Due</Text></View>
            </View>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <MaterialIcons name="lightbulb" size={16} color="#904d00" />
              <Text style={[styles.cardMiddleDesc, {color: colors.onSurface, fontWeight: '500'}]}>Quick Lead: Potential Urea substitute demand for sowing</Text>
            </View>
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity style={styles.actionBtnPrimary} onPress={() => navigation.navigate('VisitMode')}>
              <MaterialIcons name="play-circle" size={22} color={colors.onPrimary} />
              <Text style={styles.actionBtnPrimaryText}>START VISIT (विज़िट शुरू)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnIcon}><MaterialIcons name="call" size={22} color={colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtnIcon}><MaterialIcons name="chat" size={22} color="#0d5c3a" /></TouchableOpacity>
          </View>
        </View>
        
        {/* Ambient Voice Micro-Card */}
        <View style={styles.voiceCard}>
          <View style={styles.voiceIconBox}><MaterialIcons name="mic" size={20} color={colors.onPrimary} /></View>
          <View style={{flex: 1, paddingHorizontal: 10}}>
            <Text style={styles.voiceTitle}>Voice Search: "मंडी में खाद वाले डीलर"</Text>
            <Text style={styles.voiceDesc}>Tap mic or hold volume button to speak dealer name</Text>
          </View>
          <TouchableOpacity style={styles.voiceBtn}><Text style={styles.voiceBtnText}>Speak</Text></TouchableOpacity>
        </View>

      </ScrollView>

      {/* Floating Add Customer */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCustomer')}>
          <MaterialIcons name="person-add" size={24} color="#663500" />
          <Text style={styles.fabTitle}>+ Customer (त्वरित नया ग्राहक)</Text>
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
  container: { padding: 16, paddingBottom: 100 },
  gpsStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 12, marginBottom: 12, elevation: 1 },
  gpsPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#a9f3c5' },
  gpsText: { ...typography.labelSm, color: colors.onPrimary },
  gpsBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d5c3a', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4 },
  gpsBadgeText: { ...typography.labelSm, color: '#8ad2a7' },
  contextBox: { marginBottom: 12 },
  contextTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  slotBadge: { backgroundColor: '#ffdcc3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  slotBadgeText: { ...typography.labelSm, color: '#2f1500', fontWeight: 'bold' },
  contextDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  radiusScroll: { gap: 8, paddingBottom: 8 },
  radiusActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, height: 36, borderRadius: 18, gap: 6, elevation: 1 },
  radiusInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dce9ff', paddingHorizontal: 14, height: 36, borderRadius: 18, gap: 6 },
  radiusTextActive: { ...typography.labelMd, color: colors.onPrimary },
  radiusTextInactive: { ...typography.labelMd, color: colors.onSurface },
  radiusCountActive: { backgroundColor: '#0d5c3a', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  radiusCountInactive: { backgroundColor: '#ffffff', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 8 },
  radiusCountTextActive: { fontSize: 11, fontWeight: 'bold', color: '#8ad2a7' },
  radiusCountTextInactive: { fontSize: 11, fontWeight: 'bold', color: colors.onSurfaceVariant },
  sortStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginBottom: 12 },
  sortLabel: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface, textTransform: 'uppercase' },
  sortValue: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary, flex: 1 },
  sortTag: { backgroundColor: '#ffffff', paddingHorizontal: 8, height: 28, borderRadius: 8, justifyContent: 'center', elevation: 1 },
  sortTagText: { ...typography.labelSm, color: colors.onSurface },
  mapContainer: { backgroundColor: '#e5eeff', borderRadius: 16, overflow: 'hidden', elevation: 2, marginBottom: 16 },
  mapCanvas: { height: 176, backgroundColor: '#dce9ff', position: 'relative' },
  mapLine: { position: 'absolute', backgroundColor: '#cbdbf5' },
  mapCenter: { position: 'absolute', top: '50%', left: '50%', width: 32, height: 32, marginLeft: -16, marginTop: -16, alignItems: 'center', justifyContent: 'center' },
  mapPulseOuter: { position: 'absolute', width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,67,40,0.25)' },
  mapPulseInner: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.primary, borderWidth: 2, borderColor: '#ffffff' },
  mapLabel: { position: 'absolute', top: 32, backgroundColor: colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, elevation: 1 },
  mapLabelText: { fontSize: 10, color: colors.onPrimary },
  pinWrapper: { position: 'absolute', marginLeft: -12, marginTop: -12 },
  pinTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 2, paddingRight: 6, borderRadius: 12, elevation: 2, gap: 4 },
  pinDot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  pinDotText: { fontSize: 10, fontWeight: 'bold', color: '#ffffff' },
  pinTagText: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface },
  mapTopBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapTopBadgeText: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface },
  mapRecenterBtn: { position: 'absolute', bottom: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  mapBottomStrip: { backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mapBottomText: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurface },
  mapBottomSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.onSurface },
  sectionActiveBadge: { backgroundColor: '#a9f3c5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  sectionActiveText: { fontSize: 11, fontWeight: 'bold', color: '#002111' },
  sectionSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 14, elevation: 2, marginBottom: 12, paddingLeft: 20 },
  cardBorder: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  cardDesc: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  distBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  distBadgeText: { ...typography.labelMd, fontWeight: 'bold', color: '#002111' },
  cardMiddle: { backgroundColor: '#eff4ff', padding: 10, borderRadius: 12, marginBottom: 12 },
  cardMiddleTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  overdueBadge: { backgroundColor: '#ffdad6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  overdueBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#93000a' },
  cardMiddleDesc: { ...typography.bodySm, color: colors.onSurfaceVariant },
  cardMiddleAmt: { ...typography.headlineSm, fontWeight: 'extrabold', color: colors.error },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtnPrimary: { flex: 1, height: 52, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  actionBtnPrimaryText: { ...typography.labelLg, color: colors.onPrimary, letterSpacing: 0.5 },
  actionBtnIcon: { width: 52, height: 52, backgroundColor: '#e5eeff', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voiceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(220, 233, 255, 0.8)', padding: 12, borderRadius: 16, marginTop: 4 },
  voiceIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  voiceTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  voiceDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  voiceBtn: { backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, elevation: 1 },
  voiceBtnText: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary },
  fabContainer: { position: 'absolute', bottom: 20, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fe932c', paddingHorizontal: 20, height: 56, borderRadius: 28, gap: 8, elevation: 4, borderWidth: 2, borderColor: '#ffffff' },
  fabTitle: { ...typography.labelLg, fontWeight: 'bold', color: '#663500' },
});
