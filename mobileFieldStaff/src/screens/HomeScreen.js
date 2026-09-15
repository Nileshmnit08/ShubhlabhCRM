import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, elevation, rounded } from '../theme/tokens';
import { EmptyState } from '../components';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../lib/supabase';

// Helper component for standard headers
const SectionHeader = ({ title, icon, onAction, actionTitle }) => (
  <View style={styles.sectionHeaderBox}>
    <View style={styles.sectionHeaderLeft}>
      {icon && <MaterialIcons name={icon} size={20} color={colors.onSurfaceVariant} />}
      <Text style={styles.sectionHeaderTitle}>{title}</Text>
    </View>
    {onAction && (
      <TouchableOpacity onPress={onAction}>
        <Text style={styles.sectionHeaderAction}>{actionTitle}</Text>
      </TouchableOpacity>
    )}
  </View>
);

export function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { staffProfile, session } = useAuth();
  const { isOnline } = useSync();
  const { unreadCount } = useNotifications();
  
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [workQueue, setWorkQueue] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [schemes, setSchemes] = useState([]);
  
  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        fetchHomeData();
      }
    }, [session?.user?.id])
  );

  const fetchHomeData = async (isPull = false) => {
    if (!session?.user?.id) return;
    if (isPull) setRefreshing(true);
    else if (!workQueue.length) setIsLoading(true);

    try {
      const userId = session.user.id;
      
      // 1. Fetch Work Queue
      const { data: queueData } = await supabase
        .from('v_salesperson_work_queue')
        .select('*')
        .eq('assigned_owner_id', userId)
        .order('priority_score', { ascending: true })
        .order('relevant_date', { ascending: true });
        
      if (queueData) setWorkQueue(queueData);

      // 2. Fetch Recent Requirements
      // Try to join with crm_parties to get customer name
      const { data: reqData } = await supabase
        .from('requirements')
        .select('*, crm_parties(display_name)')
        .eq('assigned_to', userId)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (reqData) setRequirements(reqData);

      // 3. Fetch Active Schemes
      const { data: schemeData } = await supabase
        .from('dealer_schemes')
        .select('*')
        .eq('status', 'Active')
        .order('end_date', { ascending: true })
        .limit(3);
        
      if (schemeData) setSchemes(schemeData);

    } catch (e) {
      console.warn('Failed to fetch home data:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const assignedCount = workQueue.filter(w => w.work_item_type === 'Follow-up').length;
  const overdueCount = workQueue.filter(w => w.priority_score === 1).length;
  const dueTodayCount = workQueue.filter(w => w.priority_score === 2).length;
  const priorityVisits = workQueue.filter(w => w.priority_score <= 2).slice(0, 3);
  const actionableFollowUps = workQueue.filter(w => w.work_item_type === 'Follow-up' && w.priority_score <= 10).slice(0, 3);

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
            <Text style={styles.headerPageTitle}>Command Center</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={isOnline ? styles.syncBtn : styles.offlineBtn}>
            <View style={isOnline ? styles.syncPulse : styles.offlinePulse} />
            <Text style={isOnline ? styles.syncText : styles.offlineText}>{isOnline ? 'Online' : 'Offline'}</Text>
          </TouchableOpacity>
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
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHomeData(true)} colors={[colors.primary]} />}
      >
        {/* Agent Greeting */}
        <View style={styles.greetingBox}>
          <View style={styles.greetingIconBox}>
            <MaterialIcons name="wb-twilight" size={24} color="#904d00" />
          </View>
          <View>
            <Text style={styles.greetingText}>Good Morning, {staffProfile?.display_name || 'Staff'}</Text>
            <Text style={styles.zoneText}>{staffProfile?.role || 'Field Assistant'}</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={{ padding: 40, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* TODAY'S WORK METRICS */}
            <View style={styles.metricsRow}>
              <TouchableOpacity style={[styles.metricCard, elevation.level1, { flex: 1.2 }]} onPress={() => navigation.navigate('My Work')} activeOpacity={0.7}>
                <Text style={styles.metricLabel}>Assigned Work</Text>
                <Text style={[styles.metricValue, { color: colors.primary }]}>{assignedCount}</Text>
              </TouchableOpacity>
              <View style={styles.metricsColumn}>
                <TouchableOpacity style={[styles.metricSmallCard, elevation.level1, { borderLeftWidth: 3, borderLeftColor: '#904d00' }]} onPress={() => navigation.navigate('My Work')} activeOpacity={0.7}>
                  <Text style={styles.metricLabelSmall}>Due Today</Text>
                  <Text style={styles.metricValueSmall}>{dueTodayCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.metricSmallCard, elevation.level1, { borderLeftWidth: 3, borderLeftColor: colors.error, marginTop: 8 }]} onPress={() => navigation.navigate('My Work')} activeOpacity={0.7}>
                  <Text style={styles.metricLabelSmall}>Overdue</Text>
                  <Text style={[styles.metricValueSmall, { color: colors.error }]}>{overdueCount}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* PRIORITY VISITS */}
            <SectionHeader title="Priority Visits" icon="priority-high" />
            <View style={{ marginBottom: 24 }}>
              {priorityVisits.length > 0 ? (
                priorityVisits.map((item, idx) => (
                  <TouchableOpacity 
                    key={`visit_${idx}`} 
                    style={[styles.listItem, elevation.level1]} 
                    onPress={() => navigation.navigate('CustomerProfile', { id: item.party_id, customerName: item.customer_name })}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemTitle}>{item.customer_name}</Text>
                      <Text style={styles.listItemSub}>{item.recommended_action || item.work_item_type}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No priority visits right now.</Text>
                </View>
              )}
            </View>

            {/* REQUIREMENTS */}
            <SectionHeader title="Actionable Requirements" icon="assignment" />
            <View style={{ marginBottom: 24 }}>
              {requirements.length > 0 ? (
                requirements.map((req, idx) => (
                  <TouchableOpacity 
                    key={`req_${req.id || idx}`} 
                    style={[styles.listItem, elevation.level1]} 
                    onPress={() => navigation.navigate('CustomerProfile', { id: req.party_id, customerName: req.crm_parties?.display_name || 'Customer' })}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemTitle}>{req.crm_parties?.display_name || 'Customer Requirement'}</Text>
                      <Text style={styles.listItemSub}>{req.product_type} - {req.quantity} {req.unit}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: req.status === 'New' ? '#dce9ff' : '#f0f0f0' }]}>
                      <Text style={[styles.statusText, { color: req.status === 'New' ? colors.primary : colors.onSurfaceVariant }]}>{req.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No recent requirements.</Text>
                </View>
              )}
            </View>

            {/* FOLLOW-UPS */}
            <SectionHeader title="Follow-ups" icon="assignment-ind" onAction={() => navigation.navigate('My Work')} actionTitle="See All" />
            <View style={{ marginBottom: 24 }}>
              {actionableFollowUps.length > 0 ? (
                actionableFollowUps.map((item, idx) => (
                  <TouchableOpacity 
                    key={`fup_${idx}`} 
                    style={[styles.listItem, elevation.level1]} 
                    onPress={() => navigation.navigate('CustomerProfile', { id: item.party_id, customerName: item.customer_name })}
                  >
                    <View style={styles.listItemLeft}>
                      <Text style={styles.listItemTitle}>{item.customer_name}</Text>
                      <Text style={styles.listItemSub}>{item.title}</Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color={colors.outline} />
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active follow-ups.</Text>
                </View>
              )}
            </View>

            {/* SCHEMES & REWARDS */}
            <SectionHeader title="Schemes & Rewards" icon="card-giftcard" />
            <View style={{ marginBottom: 24 }}>
              {schemes.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
                  {schemes.map((scheme) => (
                    <TouchableOpacity 
                      key={scheme.id} 
                      style={[styles.schemeCard, elevation.level2]}
                      onPress={() => navigation.navigate('SchemeDetail', { scheme })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.schemeIconBox}>
                        <MaterialIcons name="emoji-events" size={24} color="#904d00" />
                      </View>
                      <Text style={styles.schemeTitle} numberOfLines={2}>{scheme.name}</Text>
                      <Text style={styles.schemeSub} numberOfLines={1}>Valid till: {scheme.end_date}</Text>
                      <Text style={styles.schemeAction}>View Details →</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyText}>No active schemes available.</Text>
                </View>
              )}
            </View>

          </>
        )}
      </ScrollView>

      {/* QUICK ACTIONS ROW */}
      <View style={[styles.quickActionsContainer, elevation.level3]}>
        <TouchableOpacity style={styles.qaBtn} onPress={() => navigation.navigate('AddCustomer')}>
          <View style={styles.qaIcon}><MaterialIcons name="person-add" size={22} color={colors.primary} /></View>
          <Text style={styles.qaText}>Customer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaBtn} onPress={() => navigation.navigate('Nearby')}>
          <View style={styles.qaIcon}><MaterialIcons name="radar" size={22} color={colors.primary} /></View>
          <Text style={styles.qaText}>Nearby</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.qaStartBtn} onPress={() => navigation.navigate('Customers')}>
          <MaterialIcons name="play-arrow" size={20} color={colors.onPrimary} />
          <Text style={styles.qaStartText}>Start Visit</Text>
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
  container: { padding: 16, paddingBottom: 100 },
  greetingBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: rounded.lg, elevation: 1, marginBottom: 20 },
  greetingIconBox: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fff4e5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  greetingText: { ...typography.headlineSm, color: colors.onSurface, fontWeight: 'bold' },
  zoneText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  metricsRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  metricsColumn: { flex: 1 },
  metricCard: { backgroundColor: '#ffffff', borderRadius: rounded.lg, padding: 16, justifyContent: 'center' },
  metricSmallCard: { backgroundColor: '#ffffff', borderRadius: rounded.md, padding: 12, flex: 1, justifyContent: 'center' },
  metricLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, marginBottom: 8 },
  metricValue: { ...typography.displayMd, fontWeight: 'bold' },
  metricLabelSmall: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  metricValueSmall: { ...typography.headlineSm, color: colors.onSurface, fontWeight: 'bold' },
  sectionHeaderBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold' },
  sectionHeaderAction: { ...typography.labelMd, color: colors.primary, fontWeight: 'bold' },
  listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: rounded.md, marginBottom: 8 },
  listItemLeft: { flex: 1, paddingRight: 12 },
  listItemTitle: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold', marginBottom: 2 },
  listItemSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  emptyCard: { backgroundColor: '#f0f2f5', padding: 16, borderRadius: rounded.md, alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#d1d5db' },
  emptyText: { ...typography.bodySm, color: '#6b7280' },
  schemeCard: { width: 160, backgroundColor: '#ffffff', borderRadius: rounded.lg, padding: 16, borderTopWidth: 4, borderTopColor: '#904d00' },
  schemeIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff4e5', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  schemeTitle: { ...typography.labelMd, color: colors.onSurface, fontWeight: 'bold', marginBottom: 4 },
  schemeSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 10, marginBottom: 12 },
  schemeAction: { ...typography.labelSm, color: colors.primary, fontWeight: 'bold' },
  quickActionsContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', flexDirection: 'row', padding: 12, paddingBottom: 24, borderTopWidth: 1, borderTopColor: '#E2E8F0', justifyContent: 'space-around', alignItems: 'center' },
  qaBtn: { alignItems: 'center', gap: 4 },
  qaIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5EEFF', alignItems: 'center', justifyContent: 'center' },
  qaText: { ...typography.labelSm, color: colors.onSurface },
  qaStartBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingHorizontal: 20, height: 44, borderRadius: 22, gap: 6 },
  qaStartText: { ...typography.labelMd, color: colors.onPrimary, fontWeight: 'bold' }
});
