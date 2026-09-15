import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { EmptyState } from '../components';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useNotifications } from '../context/NotificationContext';

export function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { staffProfile } = useAuth();
  const { isOnline } = useSync();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState('visits');

  const renderTabContent = () => {
    switch(activeTab) {
      case 'visits':
        return <EmptyState title="No Priority Visits" message="No visits are currently scheduled for today." icon="event-busy" />;
      case 'tasks':
        return <EmptyState title="No Assigned Work" message="You don't have any tasks assigned." icon="assignment" />;
      case 'leads':
        return <EmptyState title="No Requirements" message="No pending requirements found." icon="list-alt" />;
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerTitleBox}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={styles.headerLogoText}>SHUBH LABH</Text>
              <View style={styles.headerSubBadge}><Text style={styles.headerSubBadgeText}>FIELD</Text></View>
            </View>
            <Text style={styles.headerPageTitle}>Home</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={isOnline ? styles.syncBtn : styles.offlineBtn}>
            <View style={isOnline ? styles.syncPulse : styles.offlinePulse} />
            <Text style={isOnline ? styles.syncText : styles.offlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}><Text style={styles.langText}>अ/A</Text></TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
            <MaterialIcons name="notifications" size={22} color={colors.onSurfaceVariant} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', right: 8, top: 8, backgroundColor: colors.error, borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2 }}>
                <Text style={{ color: colors.onError, fontSize: 9, fontWeight: 'bold' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.userIcon}><MaterialIcons name="person" size={18} color={colors.onPrimary} /></View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Agent Shift & Tactical Context */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftHeader}>
            <View>
              <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                <MaterialIcons name="wb-twilight" size={18} color="#904d00" />
                <Text style={styles.greetingText}>Good Morning, {staffProfile?.display_name || 'Staff'}</Text>
              </View>
              <Text style={styles.zoneText}>Role: {staffProfile?.role || 'Field Assistant'}</Text>
            </View>
            <View style={styles.shiftActiveBadge}>
              <MaterialIcons name="verified" size={14} color={colors.primary} />
              <Text style={styles.shiftActiveText}>Active</Text>
            </View>
          </View>
        </View>

        {/* Interactive Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll} style={{marginBottom: 12}}>
          <TouchableOpacity style={activeTab === 'visits' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('visits')}>
            <Text style={activeTab === 'visits' ? styles.tabTextActive : styles.tabTextInactive}>Priority Visits</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeTab === 'tasks' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('tasks')}>
            <Text style={activeTab === 'tasks' ? styles.tabTextActive : styles.tabTextInactive}>Assigned Work (कार्य)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeTab === 'leads' ? styles.tabActive : styles.tabInactive} onPress={() => setActiveTab('leads')}>
            <Text style={activeTab === 'leads' ? styles.tabTextActive : styles.tabTextInactive}>Requirements (मांग)</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.tabContentContainer}>
            {renderTabContent()}
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
  offlineBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffdad6', paddingHorizontal: 10, height: 32, borderRadius: 16, gap: 6 },
  offlinePulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  offlineText: { ...typography.labelSm, color: '#93000a' },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  langText: { ...typography.labelMd, fontWeight: 'bold', color: colors.onSurface },
  userIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 16, paddingBottom: 100 },
  shiftCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, elevation: 1, marginBottom: 16 },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greetingText: { ...typography.labelMd, color: colors.onSurface },
  zoneText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  shiftActiveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5eeff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, gap: 4 },
  shiftActiveText: { ...typography.labelSm, color: colors.onSurface },
  tabsScroll: { gap: 8, paddingBottom: 4 },
  tabActive: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6, elevation: 1 },
  tabInactive: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e5eeff', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, gap: 6 },
  tabTextActive: { ...typography.labelMd, color: colors.onPrimary },
  tabTextInactive: { ...typography.labelMd, color: colors.onSurfaceVariant },
  tabContentContainer: { minHeight: 200, backgroundColor: '#ffffff', borderRadius: 12, elevation: 1, padding: 16 },
  fabContainer: { position: 'absolute', bottom: 24, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 16, paddingRight: 20, height: 52, borderRadius: 26, gap: 8, elevation: 4 },
  fabTitle: { ...typography.labelLg, color: colors.onPrimary, lineHeight: 20 },
  fabSub: { ...typography.labelSm, color: '#8ad2a7', lineHeight: 14 },
});
