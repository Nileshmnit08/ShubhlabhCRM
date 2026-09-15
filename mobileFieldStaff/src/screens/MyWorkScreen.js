import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { EmptyState } from '../components';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { supabase } from '../lib/supabase';

// Local WorkCard component honoring Stitch Design
const WorkCard = ({ item, onPress }) => {
  const isOverdue = item.priority_score === 1;
  const isToday = item.priority_score === 2;
  const iconName = item.work_item_type === 'Follow-up' ? 'assignment-ind' : 'lightbulb-outline';
  const iconColor = isOverdue ? colors.error : (item.work_item_type === 'Follow-up' ? '#904d00' : colors.primary);

  return (
    <TouchableOpacity style={[styles.card, elevation.level1]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.stripe, { backgroundColor: iconColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          {isOverdue && (
            <View style={styles.urgentBadge}>
              <Text style={styles.urgentText}>Overdue</Text>
            </View>
          )}
        </View>
        <Text style={styles.customerName}>{item.customer_name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaBadge}>
            <MaterialIcons name={iconName} size={14} color={iconColor} />
            <Text style={[styles.metaText, {color: iconColor}]}>{item.work_item_type}</Text>
          </View>
          <View style={styles.metaBadge}>
            <MaterialIcons name="event" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{item.relevant_date}</Text>
          </View>
        </View>
        {item.recommended_action && (
          <Text style={styles.actionText}>{item.recommended_action}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export function MyWorkScreen({ navigation }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const [workItems, setWorkItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { session } = useAuth();
  const { isOnline } = useSync();

  useEffect(() => {
    fetchWork();
  }, [session?.user?.id]);

  const fetchWork = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('v_salesperson_work_queue')
        .select('*')
        .eq('assigned_owner_id', session.user.id)
        .order('priority_score', { ascending: true })
        .order('relevant_date', { ascending: true });
        
      if (!error && data) {
        setWorkItems(data);
        await AsyncStorage.setItem('@my_work_cache', JSON.stringify(data));
      } else {
        await loadCached();
      }
    } catch (err) {
      await loadCached();
    } finally {
      setIsLoading(false);
    }
  };

  const loadCached = async () => {
    try {
      const cached = await AsyncStorage.getItem('@my_work_cache');
      if (cached) {
        setWorkItems(JSON.parse(cached));
      }
    } catch (e) {
      console.warn("Failed to load work cache");
    }
  };

  const filteredWork = workItems.filter(item => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'overdue') return item.priority_score === 1;
    if (activeFilter === 'today') return item.priority_score === 2;
    if (activeFilter === 'assigned') return item.work_item_type === 'Follow-up';
    return true;
  });

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
            <Text style={activeFilter === 'all' ? styles.filterTextActive : styles.filterTextInactive}>All सभी</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'overdue' ? [styles.filterInactive, {backgroundColor: '#ffffff'}] : styles.filterInactive} onPress={() => setActiveFilter('overdue')}>
            <MaterialIcons name="warning" size={16} color={colors.error} />
            <Text style={[styles.filterTextInactive, {color: colors.error}]}>Overdue अतिदेय</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'today' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('today')}>
            <Text style={activeFilter === 'today' ? styles.filterTextActive : styles.filterTextInactive}>Due Today आज</Text>
          </TouchableOpacity>
          <TouchableOpacity style={activeFilter === 'assigned' ? styles.filterActive : styles.filterInactive} onPress={() => setActiveFilter('assigned')}>
            <MaterialIcons name="assignment-ind" size={16} color="#904d00" />
            <Text style={activeFilter === 'assigned' ? styles.filterTextActive : styles.filterTextInactive}>Assigned कार्य</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={filteredWork.length > 0 ? styles.tabContentContainerTransparent : styles.tabContentContainer}>
          {isLoading ? (
             <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
          ) : filteredWork.length > 0 ? (
            filteredWork.map((item, index) => (
              <WorkCard 
                key={item.work_item_id || `opp_${index}`} 
                item={item} 
                onPress={() => navigation.navigate('CustomerProfile', { id: item.party_id, customerName: item.customer_name })} 
              />
            ))
          ) : (
            <EmptyState 
              title={activeFilter === 'all' ? "No Work Assigned" : `No ${activeFilter} Work`} 
              message="There are no active tasks or priority follow-ups for you in this category at the moment." 
              icon="assignment" 
            />
          )}
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
  tabContentContainer: { minHeight: 400, backgroundColor: '#ffffff', borderRadius: 12, elevation: 1, padding: 16, marginTop: 8 },
  tabContentContainerTransparent: { minHeight: 400, backgroundColor: 'transparent', marginTop: 8 },
  fabContainer: { position: 'absolute', bottom: 20, right: 16, zIndex: 40 },
  fab: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, paddingLeft: 20, paddingRight: 20, height: 56, borderRadius: 28, gap: 8, elevation: 4 },
  fabTitle: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  fabSub: { ...typography.labelSm, color: '#a9f3c5' },
  // WorkCard Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.default,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 12,
  },
  stripe: { width: 4 },
  cardContent: { flex: 1, padding: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 },
  title: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold', flex: 1, paddingRight: 8 },
  customerName: { ...typography.bodyMd, color: colors.onSurface, marginBottom: 12 },
  urgentBadge: { backgroundColor: colors.errorContainer, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgentText: { ...typography.labelSm, color: colors.onErrorContainer, fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12 },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceContainerLowest, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: colors.outlineVariant },
  metaText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontSize: 11 },
  actionText: { ...typography.bodySm, color: colors.primary, fontWeight: '600' }
});
