import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import { BarChart3, Search, ChevronRight } from 'lucide-react-native';

const STAGES = ['New', 'Open', 'Negotiation', 'Won'];

export default function AdminPipelineScreen({ navigation }) {
  const [pipeline, setPipeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStage, setActiveStage] = useState('New');

  const fetchPipeline = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('requirements')
        .select(`
          *,
          app_users:assigned_to (display_name),
          crm_parties:party_id (display_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPipeline(data || []);
    } catch (err) {
      console.error('[AdminPipeline]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const filtered = pipeline.filter(p => p.status === activeStage);

  const formatCurrency = (val) => {
    if (!val) return '₹0';
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
    return `₹${val.toLocaleString('en-IN')}`;
  };

  const renderItem = ({ item }) => {
    const value = formatCurrency((item.quantity || 0) * (item.expected_rate || 0));
    
    // Some relations may come back as arrays or single objects
    const staffObj = Array.isArray(item.app_users) ? item.app_users[0] : item.app_users;
    const repName = staffObj?.display_name || 'Unassigned';
    
    const firmObj = Array.isArray(item.crm_parties) ? item.crm_parties[0] : item.crm_parties;
    const firmName = firmObj?.display_name || 'Unknown Customer';

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('RequirementDetail', { requirementId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.firmName} numberOfLines={1}>{firmName}</Text>
          <Text style={styles.value}>{value}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.itemText}>{item.quantity} {item.unit} • {item.material_type || 'Material'}</Text>
          <Text style={styles.repText}>Rep: {repName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Pipeline" />
      
      <View style={styles.stageTabs}>
        {STAGES.map(stage => (
          <TouchableOpacity 
            key={stage} 
            style={[styles.stageTab, activeStage === stage && styles.stageTabActive]}
            onPress={() => setActiveStage(stage)}
          >
            <Text style={[styles.stageTabText, activeStage === stage && styles.stageTabTextActive]}>{stage}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{marginTop: 40}} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPipeline(); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No deals in this stage.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  stageTabs: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  stageTab: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  stageTabActive: { borderBottomColor: theme.colors.secondary },
  stageTabText: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  stageTabTextActive: { color: theme.colors.secondary },
  list: { padding: 16 },
  card: { backgroundColor: theme.colors.surfaceContainerLowest, padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  firmName: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, flex: 1, marginRight: 8 },
  value: { fontSize: 16, fontWeight: '700', color: theme.colors.secondary },
  cardBody: { flexDirection: 'row', justifyContent: 'space-between' },
  itemText: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  repText: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontSize: 16 },
});
