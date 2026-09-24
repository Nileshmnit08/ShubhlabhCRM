import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { EmptyState } from '../components';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function ReconciliationScreen({ navigation }) {
  const { session } = useAuth();
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  // Hardcoded for 'today' for the sake of the minimal requirement.
  // Full filters (Staff, DateRange) can be connected to existing filter components.
  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('vw_field_timeline')
        .select('*')
        .eq('staff_id', session?.user?.id) // Filtering for self for now, can be modified for Admin
        .gte('event_time', `${today}T00:00:00Z`)
        .lte('event_time', `${today}T23:59:59Z`)
        .order('event_time', { ascending: true });
        
      if (!error && data) {
        setTimeline(data);
      }
    } catch (e) {
      console.warn("Failed to fetch timeline", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimeline();
  }, [session]);

  const renderIcon = (type) => {
    switch (type) {
      case 'SESSION_START': return 'play-circle-outline';
      case 'SESSION_END': return 'stop-circle';
      case 'TRAVEL_SEGMENT': return 'directions-car';
      case 'VISIT': return 'storefront';
      case 'EXPENSE': return 'receipt';
      default: return 'info-outline';
    }
  };

  const renderItem = ({ item, index }) => {
    const time = new Date(item.event_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isLast = index === timeline.length - 1;
    
    return (
      <View style={styles.timelineRow}>
        <View style={styles.timelineLeft}>
          <Text style={styles.timeText}>{time}</Text>
        </View>
        <View style={styles.timelineCenter}>
          <View style={styles.iconCircle}>
            <MaterialIcons name={renderIcon(item.event_type)} size={16} color={colors.primary} />
          </View>
          {!isLast && <View style={styles.line} />}
        </View>
        <View style={styles.timelineRight}>
          <View style={styles.contentCard}>
            <Text style={styles.description}>{item.description}</Text>
            {item.event_type === 'TRAVEL_SEGMENT' && item.distance_m != null && (
              <Text style={styles.meta}>Distance: {(item.distance_m / 1000).toFixed(2)} km</Text>
            )}
            {item.event_type === 'EXPENSE' && item.amount != null && (
              <Text style={styles.metaAmount}>₹{item.amount}</Text>
            )}
            {item.status && <Text style={styles.metaStatus}>Status: {item.status}</Text>}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Field Reconciliation</Text>
      </View>

      <View style={styles.filterBar}>
        <Text style={styles.filterText}>Showing: Today</Text>
        <MaterialIcons name="filter-list" size={20} color={colors.onSurfaceVariant} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
      ) : (
        <FlatList
          data={timeline}
          keyExtractor={(item, idx) => item.id ? item.id.toString() : idx.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState title="No Activity" message="No field activity found for this period." icon="event-busy" />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: colors.surfaceContainerLowest, ...elevation.level2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  
  filterBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
  filterText: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: 'bold' },

  list: { padding: 16, paddingBottom: 100 },
  
  timelineRow: { flexDirection: 'row', minHeight: 60 },
  timelineLeft: { width: 60, alignItems: 'flex-end', paddingRight: 12, paddingTop: 4 },
  timeText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  
  timelineCenter: { width: 24, alignItems: 'center' },
  iconCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#e3f2fd', justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  line: { flex: 1, width: 2, backgroundColor: '#e3f2fd', marginTop: -4, marginBottom: -4 },
  
  timelineRight: { flex: 1, paddingLeft: 12, paddingBottom: 24 },
  contentCard: { backgroundColor: colors.surfaceContainerLowest, padding: 12, borderRadius: rounded.md, borderWidth: 1, borderColor: colors.outlineVariant },
  description: { ...typography.titleSm, fontWeight: 'bold', color: colors.onSurface, marginBottom: 4 },
  meta: { ...typography.bodySm, color: colors.onSurfaceVariant },
  metaAmount: { ...typography.bodyMd, fontWeight: 'bold', color: colors.primary, marginTop: 4 },
  metaStatus: { ...typography.labelSm, color: '#ed6c02', marginTop: 4 }
});
