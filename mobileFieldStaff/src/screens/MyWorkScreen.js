import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { EmptyState } from '../components';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';

export function MyWorkScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const { isOnline } = useSync();

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
          <TouchableOpacity style={isOnline ? styles.syncBtn : styles.offlineBtn}>
            <View style={isOnline ? styles.syncPulse : styles.offlinePulse} />
            <Text style={isOnline ? styles.syncText : styles.offlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Bilingual Fast Filters Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll} style={{marginBottom: 16}}>
          <TouchableOpacity style={activeFilter === 'all' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('all')}>
            <Text style={activeFilter === 'all' ? styles.filterTextActive : styles.filterTextInactive}>All • सभी</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'overdue' ? [styles.filterInactive, {backgroundColor: '#ffffff'}] : styles.filterInactive} onPress={() => setActiveFilter('overdue')}>
            <MaterialIcons name="warning" size={16} color={colors.error} />
            <Text style={[styles.filterTextInactive, {color: colors.error}]}>Overdue • विलंबित</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'today' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('today')}>
            <Text style={activeFilter === 'today' ? styles.filterTextActive : styles.filterTextInactive}>Due Today • आज</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'assigned' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('assigned')}>
            <MaterialIcons name="assignment-ind" size={16} color="#904d00" />
            <Text style={activeFilter === 'assigned' ? styles.filterTextActive : styles.filterTextInactive}>Assigned • सौंपा गया</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.tabContentContainer}>
            <EmptyState title="No Work Assigned" message="There are no active tasks or priority follow-ups for you at the moment." icon="assignment" />
        </View>
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
  offlineBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffdad6', paddingHorizontal: 8, height: 32, borderRadius: 16, gap: 4 },
  offlinePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  offlineText: { ...typography.labelSm, color: '#93000a' },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  filtersScroll: { gap: 8, paddingBottom: 4 },
  filterActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  filterInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  filterTextActive: { ...typography.labelMd, color: colors.onPrimary },
  filterTextInactive: { ...typography.labelMd, color: colors.onSurface },
  tabContentContainer: { minHeight: 400, backgroundColor: '#ffffff', borderRadius: 12, elevation: 1, padding: 16, marginTop: 16 },
  fabContainer: { position: 'absolute', bottom: 20, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 20, paddingRight: 20, height: 56, borderRadius: 28, gap: 8, elevation: 4 },
  fabTitle: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  fabSub: { ...typography.labelSm, color: '#a9f3c5' },
});
