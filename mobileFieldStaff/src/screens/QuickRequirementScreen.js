import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { EmptyState } from '../components';
import { useVisit } from '../context/VisitContext';

export function QuickRequirementScreen({ navigation, route }) {
  const { saveRequirement } = useVisit();
  const [qty, setQty] = useState(50);
  const [activeDate, setActiveDate] = useState('friday');
  const [activeUnit, setActiveUnit] = useState('bags');

  const customerName = route.params?.customerName || 'Customer';

  const handleSave = async () => {
    try {
      const expectedDate = new Date();
      if (activeDate === 'friday') {
        expectedDate.setDate(expectedDate.getDate() + 5); // Add 5 days for 'This Week' roughly
      }
      
      const req = {
        product_type: `Generic Requirement (${activeUnit.toUpperCase()})`,
        quantity: qty,
        expected_date: expectedDate.toISOString().split('T')[0]
      };
      
      await saveRequirement(req);
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerLogoText}>SHUBH LABH FIELD</Text>
            <Text style={styles.headerPageTitle}>Add Requirement</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <View style={styles.mainContainer}>
        {/* Context Background Simulator */}
        <View style={styles.contextBox}>
          <View style={styles.contextTop}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <View style={styles.contextPulse} />
              <Text style={styles.contextActive}>ACTIVE VISIT</Text>
            </View>
          </View>
          <View style={styles.contextContent}>
            <View>
              <Text style={styles.contextTitle}>{customerName}</Text>
            </View>
            <MaterialIcons name="store" size={28} color={colors.outlineVariant} />
          </View>
        </View>

        {/* Bottom Sheet Frame */}
        <View style={styles.sheetFrame}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetScroll}>
            
            {/* Sheet Header */}
            <View style={styles.sheetHeader}>
              <View style={styles.dragPill} />
              <View style={styles.sheetHeaderRow}>
                <View style={{flex: 1, paddingRight: 8}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                    <MaterialIcons name="bolt" size={20} color={colors.primary} />
                    <Text style={styles.sheetTitle}>Quick Requirement / त्वरित मांग</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                  <MaterialIcons name="close" size={20} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
            </View>

            <EmptyState title="Catalog Not Connected" message="The product catalog is currently offline. Hardcoded items have been removed." icon="inventory" />

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
            </View>

            {/* Delivery / Expected Date */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionLabel}>Delivery Expected / डिलीवरी कब चाहिए?</Text>
              </View>
              
              <View style={styles.dateGrid}>
                <TouchableOpacity style={activeDate === 'immediate' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('immediate')}>
                  <View style={{flex: 1}}>
                    <Text style={activeDate === 'immediate' ? styles.dateTextActive : styles.dateTextInactive}>Immediate</Text>
                  </View>
                  <MaterialIcons name="bolt" size={18} color={activeDate === 'immediate' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
                <TouchableOpacity style={activeDate === 'friday' ? styles.dateChipActive : styles.dateChipInactive} onPress={() => setActiveDate('friday')}>
                  <View style={{flex: 1}}>
                    <Text style={activeDate === 'friday' ? styles.dateTextActive : styles.dateTextInactive}>This Week</Text>
                  </View>
                  <MaterialIcons name="check-circle" size={18} color={activeDate === 'friday' ? colors.onPrimary : colors.outline} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Primary Action Button Block */}
            <View style={styles.actionBlock}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <MaterialIcons name="check-circle" size={22} color={colors.onPrimary} />
                <Text style={styles.saveBtnText}>SAVE REQUIREMENT</Text>
              </TouchableOpacity>
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
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  
  mainContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  contextBox: { backgroundColor: '#e5eeff', borderRadius: 12, padding: 16, marginBottom: 8 },
  contextTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  contextPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  contextActive: { ...typography.labelSm, fontWeight: 'bold', color: colors.primary, letterSpacing: 0.5 },
  contextContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  contextTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },

  sheetFrame: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, overflow: 'hidden' },
  sheetScroll: { padding: 16, paddingBottom: 40 },
  sheetHeader: { marginBottom: 16 },
  dragPill: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.outlineVariant, alignSelf: 'center', marginBottom: 4 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sheetTitle: { ...typography.headlineMd, fontWeight: 'bold', color: colors.onSurface },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#eff4ff', alignItems: 'center', justifyContent: 'center' },
  
  section: { marginBottom: 16, marginTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionLabel: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },

  qtySection: { backgroundColor: '#eff4ff', borderRadius: 12, padding: 12, marginBottom: 16, marginTop: 16 },
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

  dateGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  dateChipActive: { flex: 1, minHeight: 48, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1 },
  dateChipInactive: { flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#eff4ff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateTextActive: { ...typography.labelMd, fontWeight: 'bold', color: colors.onPrimary },
  dateTextInactive: { ...typography.labelMd, color: colors.onSurface },
  dateSubActive: { ...typography.bodySm, color: '#8ad2a7' },
  dateSubInactive: { ...typography.bodySm, color: colors.onSurfaceVariant },

  actionBlock: { gap: 8 },
  saveBtn: { height: 56, backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 2 },
  saveBtnText: { ...typography.labelLg, fontWeight: 'bold', color: colors.onPrimary },
});
