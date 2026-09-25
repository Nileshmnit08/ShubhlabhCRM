import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';

export function MyWorkScreen({ navigation }) {
  const [stats, setStats] = useState({ visits: 0, orders: 0, followups: 0 });
  const [isLoading, setIsLoading] = useState(true);
  
  const { session } = useAuth();
  const { isOnline, failedCount } = useSync();

  const fetchStats = async () => {
    if (!session?.user?.id) return;
    try {
      const today = new Date();
      today.setHours(0,0,0,0);
      const todayIso = today.toISOString();

      const [visitsRes, ordersRes, followupsRes, sessionsRes] = await Promise.all([
        supabase.from('crm_visits').select('id', { count: 'exact' }).eq('staff_id', session.user.id).gte('created_at', todayIso),
        supabase.from('requirements').select('id', { count: 'exact' }).eq('assigned_to', session.user.id).gte('created_at', todayIso),
        supabase.from('follow_ups').select('id', { count: 'exact' }).eq('assigned_to', session.user.id).eq('status', 'Completed').gte('updated_at', todayIso),
        supabase.from('staff_tracking_sessions').select('verified_distance_meters').eq('staff_id', session.user.id).gte('created_at', todayIso)
      ]);

      const km = sessionsRes.data?.reduce((acc, s) => acc + (s.verified_distance_meters || 0), 0) / 1000 || 0;

      const newStats = {
        visits: visitsRes.count || 0,
        orders: ordersRes.count || 0,
        followups: followupsRes.count || 0,
        verifiedKm: km.toFixed(1)
      };
      setStats(newStats);
      await AsyncStorage.setItem('@my_work_stats', JSON.stringify(newStats));
    } catch (err) {
      const cached = await AsyncStorage.getItem('@my_work_stats');
      if (cached) setStats(JSON.parse(cached));
    } finally {
      setIsLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchStats();
    }, [session?.user?.id])
  );

  const isSyncGood = failedCount === 0;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerPageTitle}>My Work</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Today's Activity */}
        <Text style={styles.sectionTitle}>TODAY'S ACTIVITY</Text>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Visits Completed</Text>
            <Text style={[styles.metricValue, {color: colors.primary}]}>{isLoading ? '-' : stats.visits}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Orders Taken</Text>
            <Text style={[styles.metricValue, {color: '#904d00'}]}>{isLoading ? '-' : stats.orders}</Text>
          </View>
        </View>
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Follow-ups</Text>
            <Text style={[styles.metricValue, {color: colors.tertiary}]}>{isLoading ? '-' : stats.followups}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Verified KM</Text>
            <Text style={[styles.metricValue, {color: colors.onSurface}]}>{isLoading ? '-' : stats.verifiedKm}</Text>
          </View>
        </View>

        {/* Primary Sections */}
        <Text style={styles.sectionTitle}>MY VISITS</Text>
        <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('MyVisits')}>
          <View style={styles.navCardLeft}>
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
          </View>
          <Text style={styles.navCardTitle}>My Visits</Text>
          <View style={styles.navCardRight}>
            <Text style={styles.navCardSub}>{stats.visits} Today</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>MY ORDERS</Text>
        <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('MyOrders')}>
          <View style={styles.navCardLeft}>
            <MaterialIcons name="shopping-cart" size={20} color={colors.primary} />
          </View>
          <Text style={styles.navCardTitle}>My Orders</Text>
          <View style={styles.navCardRight}>
            <Text style={styles.navCardSub}>{stats.orders} Today</Text>
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>MY ACTIVITY</Text>
        <TouchableOpacity style={styles.navCard} onPress={() => navigation.navigate('MyActivity')}>
          <View style={styles.navCardLeft}>
            <MaterialIcons name="history" size={20} color={colors.primary} />
          </View>
          <Text style={styles.navCardTitle}>Activity Timeline</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* More */}
        <Text style={styles.sectionTitle}>MORE</Text>
        <TouchableOpacity style={styles.secondaryNavCard} onPress={() => navigation.navigate('Customers')}>
          <Text style={styles.secondaryNavTitle}>My Customers</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryNavCard} onPress={() => navigation.navigate('ExpenseList')}>
          <Text style={styles.secondaryNavTitle}>My Expenses</Text>
          <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>

        {/* Sync Status */}
        <TouchableOpacity style={styles.secondaryNavCard} onPress={() => navigation.navigate('Reconciliation')}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            {isSyncGood ? (
               <MaterialIcons name="cloud-done" size={20} color={colors.primary} />
            ) : (
               <MaterialIcons name="cloud-off" size={20} color={colors.error} />
            )}
            <Text style={styles.secondaryNavTitle}>Sync Status</Text>
          </View>
          <View style={styles.navCardRight}>
            {!isSyncGood && <Text style={{color: colors.error, fontSize: 12}}>{failedCount} items failed</Text>}
            <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, backgroundColor: colors.background },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitleBox: { flexDirection: 'col' },
  headerPageTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  container: { padding: 16, paddingBottom: 100 },
  sectionTitle: { ...typography.labelLg, color: colors.onSurface, marginTop: 24, marginBottom: 12, fontWeight: 'bold' },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  metricCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, flex: 1, justifyContent: 'center', elevation: 1 },
  metricLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: 8 },
  metricValue: { ...typography.displayMd, fontWeight: 'bold' },
  navCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 8, elevation: 1 },
  navCardLeft: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  navCardTitle: { flex: 1, ...typography.titleMd, color: colors.onSurface, fontWeight: 'bold' },
  navCardRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  navCardSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  secondaryNavCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  secondaryNavTitle: { ...typography.bodyLg, color: colors.onSurface }
});
