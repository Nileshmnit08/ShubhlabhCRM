import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function QuickRequirementScreen({ navigation }) {
  const [qty, setQty] = useState(50);
  const [activeCategory, setActiveCategory] = useState('fertiliser');
  const [activeDate, setActiveDate] = useState('friday');
  const [activeUnit, setActiveUnit] = useState('bags');

  const unitRate = 770;
  const totalValue = qty * unitRate;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header / App Bar (mocking the context under the sheet) */}
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

      <View style={styles.mainContainer}>
        {/* Dimmed Context Background Simulator */}
        <View style={styles.contextBox}>
          <View style={styles.contextTop}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <View style={styles.contextPulse} />
              <Text style={styles.contextActive}>ACTIVE VISIT • इन-स्टोर विज़िट</Text>
            </View>
            <View style={styles.gpsBadge}><Text style={styles.gpsBadgeText}>GPS Validated</Text></View>
          </View>
          <View style={styles.contextContent}>
            <View>
              <Text style={styles.contextTitle}>Shree Ganesh Fertilisers & Seeds</Text>
              <Text style={styles.contextDesc}>Prop. Rajesh Patel • Code: #IN-MP-7782</Text>
            </View>
            <MaterialIcons name="store" size={28} color={colors.outlineVariant} />
          </View>
        </View>

        {/* Bottom Sheet Frame */}
        <View style={styles.sheetFrame}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            
            {/* Sheet Header & Drag Pill */}
            <View style={styles.sheetHeader}>
              <View style={styles.dragPill} />
              <View style={styles.sheetHeaderRow}>
                <View style={{flex: 1, paddingRight: 8}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <MaterialIcons name="bolt" size={20} color={colors.primary} />
                    <Text style={styles.sheetTitle}>Quick Requirement / त्वरित मांग</Text>
                  </View>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2}}>
                    <Text style={styles.sheetSubText}>For:</Text>
                    <Text style={styles.sheetSubTitle} numberOfLines={1}>Shree Ganesh Fertilisers & Seeds</Text>
                    <MaterialIcons name="lock" size={14} color={colors.outline} />
                  </View>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fast Voice-First Capture Bar */}
            <TouchableOpacity style={styles.voiceBar}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1}}>
                <View style={styles.voiceIconBox}>
                  <MaterialIcons name="mic" size={22} color={colors.onPrimary} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.voiceTitle}>बोलकर मांग दर्ज करें</Text>
                  <Text style={styles.voiceHint} numberOfLines={1}>"50 बोरी यूरिया सब नेक्स्ट मंगलवार चाहिए..."</Text>
                </View>
              </View>
              <View style={styles.voiceWaves}>
                <View style={[styles.wave, {height: 12}]} />
                <View style={[styles.wave, {height: 20}]} />
                <View style={[styles.wave, {height: 8}]} />
              </View>
            </TouchableOpacity>

            {/* Category & Product Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Category / श्रेणी चुनें</Text>
                <Text style={styles.sectionAction}>Quick Tap</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                <TouchableOpacity style={activeCategory === 'fertiliser' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setActiveCategory('fertiliser')}>
                  <Text style={activeCategory === 'fertiliser' ? styles.catTextActive : styles.catTextInactive}>Fertiliser (उर्वरक)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={activeCategory === 'pesticide' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setActiveCategory('pesticide')}>
                  <Text style={activeCategory === 'pesticide' ? styles.catTextActive : styles.catTextInactive}>Pesticide (कीटनाशक)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={activeCategory === 'seeds' ? styles.catBtnActive : styles.catBtnInactive} onPress={() => setActiveCategory('seeds')}>
                  <Text style={activeCategory === 'seeds' ? styles.catTextActive : styles.catTextInactive}>Seeds (बीज)</Text>
                </TouchableOpacity>
              </ScrollView>

              <TouchableOpacity style={styles.productCard}>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1}}>
                  <View style={styles.productIconBox}><MaterialIcons name="inventory-2" size={24} color={colors.primary} /></View>
                  <View style={{flex: 1}}>
                    <Text style={styles.productTitle} numberOfLines={1}>Zinc Sulphate 21% (Granular)</Text>
                    <Text style={styles.productSub}>जिंक सल्फेट 21% • SKU: #ZN-GR-25KG</Text>
                  </View>
                </View>
                <View style={styles.swapIconBox}><MaterialIcons name="swap-vert" size={18} color={colors.onSurfaceVariant} /></View>
              </TouchableOpacity>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shortcutsScroll}>
                <Text style={styles.shortcutsLabel}>Shortcuts:</Text>
                <TouchableOpacity style={styles.shortcutBtn}><Text style={styles.shortcutText}>+ DAP 50kg</Text></TouchableOpacity>
                <TouchableOpacity style={styles.shortcutBtn}><Text style={styles.shortcutText}>+ Urea Sub 45kg</Text></TouchableOpacity>
                <TouchableOpacity style={styles.shortcutBtn}><Text style={styles.shortcutText}>+ NPK 12:32:16</Text></TouchableOpacity>
              </ScrollView>
            </View>

            {/* Quantity Stepper & Quick Presets */}
            <View style={styles.qtySection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Quantity & Unit / मात्रा और इकाई</Text>
                <View style={styles.unitToggle}>
                  <TouchableOpacity onPress={() => setActiveUnit('bags')} style={activeUnit === 'bags' ? styles.unitActive : styles.unitInactive}><Text style={activeUnit === 'bags' ? styles.unitTextActive : styles.unitTextInactive}>Bags (बोरी)</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => setActiveUnit('mt')} style={activeUnit === 'mt' ? styles.unitActive : styles.unitInactive}><Text style={activeUnit === 'mt' ? styles.unitTextActive : styles.unitTextInactive}>MT / Ton</Text></TouchableOpacity>
                </View>
              </View>
              
              <View style={styles.stepperBox}>
                <TouchableOpacity style={styles.stepperBtn} onPress={() => setQty(Math.max(1, qty - 5))}>
                  <MaterialIcons name="remove" size={24} color={colors.onSurface} />
                </TouchableOpacity>
                <View style={styles.stepperValueBox}>
                  <View style={{flexDirection: 'row', alignItems: 'baseline', gap: 4}}>
                    <Text style={styles.stepperValue}>{qty}</Text>
                    <Text style={styles.stepperLabel}>Bags</Text>
                  </View>
                  <Text style={styles.stepperSub}>बोरी</Text>
                </View>
                <TouchableOpacity style={[styles.stepperBtn, {backgroundColor: colors.primary}]} onPress={() => setQty(qty + 5)}>
                  <MaterialIcons name="add" size={24} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.presetGrid}>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setQty(qty + 10)}><Text style={styles.presetText}>+10</Text></TouchableOpacity>
                <TouchableOpacity style={styles.presetBtn} onPress={() => setQty(qty + 25)}><Text style={styles.presetText}>+25</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.presetBtn, qty === 50 ? styles.presetBtnActive : null]} onPress={() => setQty(50)}><Text style={[styles.presetText, qty === 50 ? styles.presetTextActive : null]}>50</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.presetBtn, qty === 100 ? styles.presetBtnActive : null]} onPress={() => setQty(100)}><Text style={[styles.presetText, qty === 100 ? styles.presetTextActive : null]}>100</Text></TouchableOpacity>
              </View>
            </View>

            {/* Delivery / Expected Date */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Delivery Expected / डिलीवरी कब चाहिए?</Text>
                <Text style={styles.sectionAction}>Standard SLA</Text>
              </View>
              
              <View style={styles.dateGrid}>
                <TouchableOpacity style={activeDate === 'immediate' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('immediate')}>
                  <View style={{flex: 1}}>
                    <Text style={activeDate === 'immediate' ? styles.dateTextActive : styles.dateTextInactive}>Immediate / तुरंत</Text>
                    <Text style={activeDate === 'immediate' ? styles.dateSubActive : styles.dateSubInactive}>Today Dispatch</Text>
                  </View>
                  <MaterialIcons name="bolt" size={18} color={activeDate === 'immediate' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
                <TouchableOpacity style={activeDate === 'friday' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('friday')}>
                  <View style={{flex: 1}}>
                    <Text style={activeDate === 'friday' ? styles.dateTextActive : styles.dateTextInactive}>Friday, 22 Nov</Text>
                    <Text style={activeDate === 'friday' ? styles.dateSubActive : styles.dateSubInactive}>इस सप्ताह (Weekly)</Text>
                  </View>
                  <MaterialIcons name="check-circle" size={18} color={activeDate === 'friday' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
              </View>
              <View style={styles.dateGrid}>
                <TouchableOpacity style={activeDate === 'tomorrow' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('tomorrow')}>
                  <Text style={activeDate === 'tomorrow' ? styles.dateTextActive : styles.dateTextInactive}>Tomorrow (कल)</Text>
                  <MaterialIcons name="calendar-today" size={18} color={activeDate === 'tomorrow' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
                <TouchableOpacity style={activeDate === 'custom' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('custom')}>
                  <Text style={activeDate === 'custom' ? styles.dateTextActive : styles.dateTextInactive}>Custom Date / तारीख</Text>
                  <MaterialIcons name="event" size={18} color={activeDate === 'custom' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Order Value / Rate Estimate & Dealer Ledger Context */}
            <View style={styles.valueSection}>
              <View style={styles.valueRow}>
                <View>
                  <Text style={styles.valueLabel}>Est. Rate: <Text style={{fontWeight: 'bold', color: colors.onSurface}}>₹{unitRate}</Text> / bag</Text>
                  <Text style={styles.valueTotal}>₹{totalValue.toLocaleString('en-IN')}</Text>
                </View>
                <View style={{alignItems: 'flex-end'}}>
                  <Text style={styles.valueTag}>DEMAND VALUATION</Text>
                  <Text style={styles.valueTitle}>अनुमानित कुल मूल्य</Text>
                </View>
              </View>
              <View style={styles.creditSafe}>
                <MaterialIcons name="verified" size={18} color={colors.primary} />
                <Text style={styles.creditText}>Credit Safe: Available <Text style={{fontWeight: 'bold', color: colors.onSurface}}>₹3,75,500</Text> (Limit: ₹5.0L)</Text>
              </View>
            </View>

            {/* Primary Action Button Block */}
            <View style={styles.actionBlock}>
              <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
                <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />
                <Text style={styles.saveBtnText}>SAVE REQUIREMENT (मांग सुरक्षित करें)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveAddBtn}>
                <MaterialIcons name="add-circle" size={18} color={colors.primary} />
                <Text style={styles.saveAddBtnText}>Save & Add Another Item (+ दूसरा उत्पाद जोड़ें)</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.offlineTag}>
              <View style={styles.offlinePulse} />
              <Text style={styles.offlineText}>Auto-locks offline • Syncs instantly on network</Text>
            </View>

          </ScrollView>
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
  
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contextBox: { backgroundColor: '#e5eeff', borderRadius: 12, padding: 16, marginBottom: 8 },
  contextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contextPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  contextActive: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.5 },
  gpsBadge: { backgroundColor: '#f8f9ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, elevation: 1 },
  gpsBadgeText: { fontSize: 11, fontWeight: 'bold', color: colors.onSurfaceVariant },
  contextContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contextTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  contextDesc: { ...typography.bodySm, color: colors.onSurfaceVariant },

  sheetFrame: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, overflow: 'hidden' },
  sheetScroll: { padding: 16, paddingBottom: 40 },
  sheetHeader: { marginBottom: 16 },
  dragPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: 4 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetTitle: { ...typography.headlineMd, fontWeight: 'bold', color: colors.onSurface },
  sheetSubText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  sheetSubTitle: { ...typography.labelMd, fontWeight: 'bold', color: colors.primary, flexShrink: 1 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center' },
  
  voiceBar: { backgroundColor: '#a9f3c5', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1, marginBottom: 16 },
  voiceIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', elevation: 1 },
  voiceTitle: { ...typography.labelLg, fontWeight: 'bold', color: '#005232' },
  voiceHint: { ...typography.bodySm, color: '#005232' },
  voiceWaves: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: 'rgba(255,255,255,0.8)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  wave: { width: 4, backgroundColor: colors.primary, borderRadius: 2 },

  section: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  sectionAction: { ...typography.labelSm, fontWeight: 'bold', color: '#904d00' },
  categoryScroll: { gap: 8, paddingBottom: 4 },
  catBtnActive: { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, elevation: 1 },
  catBtnInactive: { backgroundColor: '#eff4ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  catTextActive: { ...typography.labelMd, fontWeight: 'bold', color: colors.onPrimary },
  catTextInactive: { ...typography.labelMd, fontWeight: '500', color: colors.onSurface },
  
  productCard: { backgroundColor: '#eff4ff', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  productIconBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  productTitle: { ...typography.labelLg, fontWeight: 'bold', color: colors.onSurface },
  productSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  swapIconBox: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },

  shortcutsScroll: { gap: 6, paddingTop: 12, alignItems: 'center' },
  shortcutsLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginRight: 4 },
  shortcutBtn: { backgroundColor: '#e5eeff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  shortcutText: { ...typography.labelSm, color: colors.onSurface },

  qtySection: { backgroundColor: '#eff4ff', borderRadius: 12, padding: 12, marginBottom: 16 },
  unitToggle: { flexDirection: 'row', backgroundColor: '#e5eeff', borderRadius: 12, padding: 2 },
  unitActive: { backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  unitInactive: { paddingHorizontal: 8, paddingVertical: 2 },
  unitTextActive: { fontSize: 11, fontWeight: 'bold', color: colors.onPrimary },
  unitTextInactive: { fontSize: 11, color: colors.onSurfaceVariant },
  stepperBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', borderRadius: 12, padding: 6, elevation: 1, marginBottom: 12 },
  stepperBtn: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  stepperValueBox: { alignItems: 'center' },
  stepperValue: { fontSize: 26, fontWeight: '800', color: colors.onSurface },
  stepperLabel: { ...typography.labelMd, fontWeight: '600', color: colors.onSurfaceVariant },
  stepperSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  presetGrid: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, height: 44, borderRadius: 8, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  presetBtnActive: { backgroundColor: '#a9f3c5' },
  presetText: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  presetTextActive: { color: '#002111' },

  dateGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateChipActive: { flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  dateChipInactive: { flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#eff4ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTextActive: { ...typography.labelMd, fontWeight: 'bold', color: colors.onPrimary },
  dateTextInactive: { ...typography.labelMd, color: colors.onSurface },
  dateSubActive: { ...typography.bodySm, color: '#8ad2a7' },
  dateSubInactive: { ...typography.bodySm, color: colors.onSurfaceVariant },

  valueSection: { backgroundColor: '#e5eeff', borderRadius: 12, padding: 12, marginBottom: 16 },
  valueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  valueLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  valueTotal: { ...typography.headlineSm, fontWeight: '800', color: colors.primary },
  valueTag: { fontSize: 11, fontWeight: 'bold', color: '#fe932c', letterSpacing: 0.5 },
  valueTitle: { ...typography.labelMd, fontWeight: '600', color: colors.onSurface },
  creditSafe: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(112,121,113,0.3)' },
  creditText: { ...typography.bodySm, color: colors.onSurfaceVariant },

  actionBlock: { gap: 8 },
  saveBtn: { height: 56, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
  saveAddBtn: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  saveAddBtnText: { ...typography.labelMd, fontWeight: 'bold', color: colors.primary },

  offlineTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  offlinePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  offlineText: { fontSize: 11, color: colors.onSurfaceVariant }
});
