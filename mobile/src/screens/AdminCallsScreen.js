import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { Phone, Search, Filter } from 'lucide-react-native';

export default function AdminCallsScreen({ navigation }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalls = useCallback(async () => {
    try {
      // Fetch all staff members to map user_id -> display_name
      const { data: staffData } = await supabase
        .from('app_users')
        .select('id, display_name');
      const staffMap = {};
      if (staffData) {
        staffData.forEach(s => {
          staffMap[s.id] = s.display_name;
        });
      }

      const { data, error } = await supabase
        .from('interactions')
        .select(`
          id, channel, outcome, note, direction, created_at, user_id,
          crm_parties:party_id (display_name)
        `)
        .ilike('channel', '%call%')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const { data: moreData } = await supabase
        .from('interactions')
        .select(`
          id, interaction_type, outcome, note, direction, created_at, user_id,
          crm_parties:party_id (display_name)
        `)
        .ilike('interaction_type', '%call%')
        .order('created_at', { ascending: false })
        .limit(100);

      const all = [...(data || []), ...(moreData || [])];
      // Deduplicate by ID
      const unique = Array.from(new Map(all.map(item => [item.id, item])).values());
      unique.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Map user_id to display_name
      const mappedCalls = unique.map(item => {
         item.app_users = { display_name: staffMap[item.user_id] || 'System / Unassigned' };
         return item;
      });

      setCalls(mappedCalls);
    } catch (err) {
      console.error('[AdminCalls]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCalls(); }, [fetchCalls]);

  const renderItem = ({ item }) => {
    const timeStr = new Date(item.created_at).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const staffObj = Array.isArray(item.app_users) ? item.app_users[0] : item.app_users;
    const repName = staffObj?.display_name || 'System / Unassigned';
    
    const firmObj = Array.isArray(item.crm_parties) ? item.crm_parties[0] : item.crm_parties;
    const firmName = firmObj?.display_name || 'Unknown Customer';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('AdminCallDetail', { callId: item.id })}
      >
        <View style={styles.iconBox}>
          <Phone size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title}>{firmName}</Text>
          <Text style={styles.sub}>{repName} • {timeStr}</Text>
          {item.outcome ? <Text style={styles.outcome}>{item.outcome}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Call Ledger" />
      
      {/* Search/Filter Bar Placeholder */}
      <View style={styles.searchBar}>
        <Search size={20} color={theme.colors.onSurfaceVariant} />
        <Text style={styles.searchText}>Search calls...</Text>
        <View style={{flex:1}}/>
        <Filter size={20} color={theme.colors.onSurfaceVariant} />
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={calls}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCalls(); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No calls logged recently.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLowest,
    marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchText: { marginLeft: 8, color: theme.colors.onSurfaceVariant, fontSize: 14 },
  list: { padding: 16 },
  card: {
    flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '18', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface },
  sub: { fontSize: 13, color: theme.colors.onSurfaceVariant, marginTop: 4 },
  outcome: { 
    fontSize: 12, color: theme.colors.onPrimary, backgroundColor: theme.colors.primary, 
    alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginTop: 8 
  },
  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontSize: 16 },
});
