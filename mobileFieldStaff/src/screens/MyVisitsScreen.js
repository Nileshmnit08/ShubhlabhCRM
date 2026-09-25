import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, elevation } from '../theme/tokens';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { EmptyState } from '../components';


export function MyVisitsScreen({ navigation }) {
  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${String(d.getFullYear()).substring(2)}`;
  };

  const [activeFilter, setActiveFilter] = useState('Today');
  const [visits, setVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const { session } = useAuth();

  useEffect(() => {
    fetchVisits();
  }, [session?.user?.id]);

  const fetchVisits = async () => {
    if (!session?.user?.id) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('crm_visits')
        .select(`
          *,
          crm_parties (
            display_name,
            city
          )
        `)
        .eq('staff_id', session.user.id)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setVisits(data);
        await AsyncStorage.setItem('@my_visits_cache', JSON.stringify(data));
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
      const cached = await AsyncStorage.getItem('@my_visits_cache');
      if (cached) setVisits(JSON.parse(cached));
    } catch (e) {
      console.warn("Failed to load cached visits");
    }
  };

  const filteredVisits = visits.filter(visit => {
    if (activeFilter === 'All') return true;
    
    const visitDate = new Date(visit.created_at);
    const today = new Date();
    
    if (activeFilter === 'Today') {
      return visitDate.toDateString() === today.toDateString();
    }
    if (activeFilter === 'This Week') {
      const diff = today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1);
      const startOfWeek = new Date(today.setDate(diff));
      startOfWeek.setHours(0,0,0,0);
      return visitDate >= startOfWeek;
    }
    if (activeFilter === 'This Month') {
      return visitDate.getMonth() === today.getMonth() && visitDate.getFullYear() === today.getFullYear();
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Visits</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
          {['Today', 'This Week', 'This Month', 'All'].map(filter => (
            <TouchableOpacity 
              key={filter} 
              style={activeFilter === filter ? styles.filterActive : styles.filterInactive}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={activeFilter === filter ? styles.filterTextActive : styles.filterTextInactive}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.listContainer}>
          {isLoading ? (
             <ActivityIndicator size="large" color={colors.primary} style={{marginTop: 40}} />
          ) : filteredVisits.length > 0 ? (
            filteredVisits.map((visit) => (
              <TouchableOpacity 
                key={visit.id} 
                style={[styles.listItem, elevation.level1]}
                onPress={() => navigation.navigate('VisitSummary', { visitId: visit.id, cachedVisit: visit })}
              >
                <View style={styles.listItemLeft}>
                  <Text style={styles.listItemTitle}>{visit.crm_parties?.display_name || 'Unknown Customer'}</Text>
                  <Text style={styles.listItemSub}>{visit.crm_parties?.city || 'Location unavailable'} • {formatDate(visit.created_at)}</Text>
                </View>
                <View style={[styles.statusBadge, {backgroundColor: visit.status === 'Completed' ? '#d3ebd3' : '#e0e0e0'}]}>
                  <Text style={[styles.statusText, {color: visit.status === 'Completed' ? '#1b5e20' : '#424242'}]}>{visit.status || 'Unknown'}</Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <EmptyState 
              title="No Visits" 
              message={`You have no visits for ${activeFilter}.`} 
              icon="location-off" 
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, backgroundColor: '#ffffff', elevation: 2 },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontWeight: 'bold', marginLeft: 8 },
  container: { padding: 16, paddingBottom: 100 },
  filtersScroll: { marginBottom: 16, flexGrow: 0 },
  filterActive: { backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterInactive: { backgroundColor: '#ffffff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: colors.outlineVariant },
  filterTextActive: { ...typography.labelMd, color: colors.onPrimary },
  filterTextInactive: { ...typography.labelMd, color: colors.onSurface },
  listContainer: { marginTop: 8 },
  
  listItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12 },
  listItemLeft: { flex: 1, paddingRight: 12 },
  listItemTitle: { ...typography.titleMd, color: colors.onSurface, fontWeight: 'bold', marginBottom: 4 },
  listItemSub: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  statusText: { ...typography.labelMd, fontWeight: 'bold' }
});
