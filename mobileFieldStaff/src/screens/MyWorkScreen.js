import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function MyWorkScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');

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
            <Text style={styles.headerPageTitle}>My Work</Text>
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
        {/* Offline / Online GPS Telemetry Strip */}
        <View style={styles.telemetryStrip}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <MaterialIcons name="satellite-alt" size={16} color={colors.primary} />
            <Text style={styles.telemetryText}>GPS: 4m Accurate • Mandi Route</Text>
          </View>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlinePulse} />
              <Text style={styles.onlineBadgeText}>Online</Text>
            </View>
            <Text style={styles.queueText}>Queue: 9</Text>
          </View>
        </View>

        {/* Morning Motivation Banner */}
        <View style={styles.motivationBanner}>
          <View style={styles.motivationHeader}>
            <View>
              <Text style={styles.motivationSub}>Daily Target • दैनिक कार्य लक्ष्य</Text>
              <Text style={styles.motivationTitle}>Today's Focus: 9 Visits / Follow-ups</Text>
            </View>
            <View style={styles.motivationIconBox}>
              <MaterialIcons name="task-alt" size={26} color="#0d5c3a" />
            </View>
          </View>
          
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, {width: '22%'}]} />
          </View>
          <View style={styles.progressMetrics}>
            <Text style={styles.progressText}>Completed: <Text style={{color: colors.primary, fontWeight: 'bold'}}>2</Text> done</Text>
            <Text style={styles.progressText}>Remaining: <Text style={{color: colors.error, fontWeight: 'bold'}}>7</Text> pending</Text>
            <Text style={styles.progressText}>₹1,20,400 Target Due</Text>
          </View>
        </View>

        {/* Bilingual Fast Filters Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll} style={{marginBottom: 16}}>
          <TouchableOpacity style={activeFilter === 'all' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('all')}>
            <Text style={activeFilter === 'all' ? styles.filterTextActive : styles.filterTextInactive}>All • सभी</Text>
            <View style={activeFilter === 'all' ? styles.filterBadgeActive : styles.filterBadgeInactive}><Text style={activeFilter === 'all' ? styles.filterBadgeTextActive : styles.filterBadgeTextInactive}>9</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'overdue' ? [styles.filterInactive, {backgroundColor: '#ffffff'}] : styles.filterInactive} onPress={() => setActiveFilter('overdue')}>
            <MaterialIcons name="warning" size={16} color={colors.error} />
            <Text style={[styles.filterTextInactive, {color: colors.error}]}>Overdue • विलंबित</Text>
            <View style={[styles.filterBadgeInactive, {backgroundColor: colors.error}]}><Text style={[styles.filterBadgeTextInactive, {color: colors.onError}]}>3</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'today' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('today')}>
            <Text style={activeFilter === 'today' ? styles.filterTextActive : styles.filterTextInactive}>Due Today • आज</Text>
            <View style={activeFilter === 'today' ? styles.filterBadgeActive : styles.filterBadgeInactive}><Text style={activeFilter === 'today' ? styles.filterBadgeTextActive : styles.filterBadgeTextInactive}>4</Text></View>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'assigned' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('assigned')}>
            <MaterialIcons name="assignment-ind" size={16} color="#904d00" />
            <Text style={activeFilter === 'assigned' ? styles.filterTextActive : styles.filterTextInactive}>Assigned • सौंपा गया</Text>
            <View style={[activeFilter === 'assigned' ? styles.filterBadgeActive : styles.filterBadgeInactive, {backgroundColor: '#ffdcc3'}]}><Text style={[activeFilter === 'assigned' ? styles.filterBadgeTextActive : styles.filterBadgeTextInactive, {color: '#2f1500'}]}>2</Text></View>
          </TouchableOpacity>
        </ScrollView>

        {/* SECTION 1: OVERDUE QUEUE */}
        {(activeFilter === 'all' || activeFilter === 'overdue') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <View style={[styles.sectionDot, {backgroundColor: colors.error}]} />
                <Text style={[styles.sectionTitle, {color: colors.error}]}>OVERDUE • अति आवश्यक</Text>
              </View>
              <View style={[styles.sectionCountBadge, {backgroundColor: '#ffdad6'}]}><Text style={[styles.sectionCountText, {color: '#93000a'}]}>3 Pending</Text></View>
            </View>

            {/* Card 1 */}
            <View style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskTags}>
                    <View style={[styles.taskTag, {backgroundColor: colors.error}]}><Text style={[styles.taskTagText, {color: colors.onError}]}>2 Days Late</Text></View>
                    <Text style={styles.taskDistance}><MaterialIcons name="near-me" size={14} color={colors.onSurfaceVariant} /> 0.4 km • Indore Bypass</Text>
                  </View>
                  <Text style={styles.taskTitle}>Kalyan Agro Enterprises</Text>
                  <Text style={styles.taskSub}>कल्याण एग्रो • Cheque Pickup Pending</Text>
                </View>
                <View style={styles.taskMetrics}>
                  <Text style={[styles.taskAmount, {color: colors.error}]}>₹78,400</Text>
                  <Text style={styles.taskDue}>Due: Yesterday 4 PM</Text>
                </View>
              </View>
              <View style={styles.taskContextBox}>
                <Text style={styles.taskContextText}><MaterialIcons name="receipt-long" size={18} color={colors.error} /> Invoice #INV-9824 • HDFC Cheque</Text>
                <Text style={styles.taskContextSub}>Owner: Ramesh Ji</Text>
              </View>
              <View style={styles.taskActionGrid}>
                <TouchableOpacity style={[styles.taskBtnMain, {backgroundColor: '#0d5c3a', flex: 2}]}>
                  <MaterialIcons name="check-circle" size={20} color={colors.onPrimary} />
                  <Text style={styles.taskBtnMainText}>1-Tap Complete (चेक मिला)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskBtnSecondary, {flex: 1}]}>
                  <MaterialIcons name="call" size={18} color={colors.primary} />
                  <Text style={styles.taskBtnSecondaryText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskBtnSecondary, {flex: 1}]} onPress={() => navigation.navigate('VisitMode')}>
                  <MaterialIcons name="navigation" size={18} color="#904d00" />
                  <Text style={styles.taskBtnSecondaryText}>Visit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* SECTION 2: DUE TODAY */}
        {(activeFilter === 'all' || activeFilter === 'today') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <View style={[styles.sectionDot, {backgroundColor: colors.primary}]} />
                <Text style={[styles.sectionTitle, {color: colors.onSurface}]}>DUE TODAY • आज का कार्य</Text>
              </View>
              <View style={[styles.sectionCountBadge, {backgroundColor: '#e5eeff'}]}><Text style={[styles.sectionCountText, {color: colors.onSurface}]}>4 Tasks</Text></View>
            </View>

            {/* Card 4 (Shree Ganesh) */}
            <View style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskInfo}>
                  <View style={styles.taskTags}>
                    <View style={[styles.taskTag, {backgroundColor: '#a9f3c5'}]}><Text style={[styles.taskTagText, {color: '#002111'}]}>11:30 AM Slot</Text></View>
                    <View style={[styles.taskTag, {backgroundColor: '#ffdcc3'}]}><Text style={[styles.taskTagText, {color: '#2f1500'}]}>High Priority</Text></View>
                    <Text style={styles.taskDistance}>0.9 km</Text>
                  </View>
                  <Text style={styles.taskTitle}>Shree Ganesh Fertilisers</Text>
                  <Text style={styles.taskSub}>श्री गणेश फर्टिलाइजर्स • Bulk Urea Substitute</Text>
                </View>
              </View>
              <View style={styles.taskContextBox}>
                <Text style={styles.taskContextText}>Order Quote: #SO-4402 (500 Bags)</Text>
                <Text style={[styles.taskContextSub, {color: colors.primary, fontWeight: 'bold'}]}>₹3,40,000</Text>
              </View>
              <View style={styles.taskActionGrid}>
                <TouchableOpacity style={[styles.taskBtnMain, {backgroundColor: colors.primary, flex: 2}]}>
                  <MaterialIcons name="task-alt" size={20} color={colors.onPrimary} />
                  <Text style={styles.taskBtnMainText}>Complete (संपन्न)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskBtnSecondary, {flex: 1}]} onPress={() => navigation.navigate('VisitMode')}>
                  <MaterialIcons name="storefront" size={18} color={colors.primary} />
                  <Text style={styles.taskBtnSecondaryText}>Visit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.taskBtnSecondary, {flex: 1}]}>
                  <MaterialIcons name="chat" size={18} color="#0d5c3a" />
                  <Text style={styles.taskBtnSecondaryText}>WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Add Customer */}
      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddCustomer')}>
          <MaterialIcons name="person-add" size={26} color={colors.onPrimary} />
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
  telemetryStrip: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff4ff', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, marginBottom: 16 },
  telemetryText: { ...typography.labelSm, color: colors.onSurface },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#a9f3c5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, gap: 4 },
  onlinePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  onlineBadgeText: { ...typography.labelSm, color: '#002111' },
  queueText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  motivationBanner: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 16 },
  motivationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  motivationSub: { ...typography.labelSm, color: colors.onSurfaceVariant, textTransform: 'uppercase', marginBottom: 2 },
  motivationTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  motivationIconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(13, 92, 58, 0.1)', alignItems: 'center', justifyContent: 'center' },
  progressBarBg: { height: 10, backgroundColor: '#e5eeff', borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 10, backgroundColor: colors.primary, borderRadius: 5 },
  progressMetrics: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  filtersScroll: { gap: 8, paddingBottom: 4 },
  filterActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  filterInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  filterTextActive: { ...typography.labelMd, color: colors.onPrimary },
  filterTextInactive: { ...typography.labelMd, color: colors.onSurface },
  filterBadgeActive: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center' },
  filterBadgeInactive: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#e5eeff', alignItems: 'center', justifyContent: 'center' },
  filterBadgeTextActive: { fontSize: 11, fontWeight: 'bold', color: colors.primary },
  filterBadgeTextInactive: { fontSize: 11, fontWeight: 'bold', color: colors.onSurface },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { ...typography.headlineSm, fontWeight: 'bold' },
  sectionCountBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  sectionCountText: { ...typography.labelSm, fontWeight: 'bold' },
  taskCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 12 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  taskInfo: { flex: 1 },
  taskTags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  taskTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  taskTagText: { ...typography.labelSm, fontWeight: 'bold' },
  taskDistance: { ...typography.labelSm, color: colors.onSurfaceVariant },
  taskTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface, lineHeight: 22 },
  taskSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  taskMetrics: { alignItems: 'flex-end', marginLeft: 12 },
  taskAmount: { fontFamily: 'Inter', fontSize: 22, fontWeight: 'bold' },
  taskDue: { ...typography.labelSm, color: colors.onSurfaceVariant },
  taskContextBox: { backgroundColor: '#eff4ff', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  taskContextText: { ...typography.bodySm, color: colors.onSurface, flex: 1, flexDirection: 'row', alignItems: 'center' },
  taskContextSub: { ...typography.labelSm, fontWeight: 'bold', color: colors.onSurfaceVariant },
  taskActionGrid: { flexDirection: 'row', gap: 8 },
  taskBtnMain: { height: 50, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, elevation: 1 },
  taskBtnMainText: { ...typography.labelLg, color: colors.onPrimary },
  taskBtnSecondary: { height: 50, borderRadius: 8, backgroundColor: '#e5eeff', flexDirection: 'col', alignItems: 'center', justifyContent: 'center', elevation: 1 },
  taskBtnSecondaryText: { fontSize: 11, color: colors.onSurface, marginTop: 2 },
  fabContainer: { position: 'absolute', bottom: 20, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 20, paddingRight: 20, height: 56, borderRadius: 28, gap: 8, elevation: 4 },
  fabTitle: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  fabSub: { ...typography.labelSm, color: '#a9f3c5' },
});
