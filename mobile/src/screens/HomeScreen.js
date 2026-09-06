import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { LayoutDashboard, Users, AlertTriangle, Truck } from 'lucide-react-native';

export default function HomeScreen() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState({ overdue: 0, pendingDispatches: 0, openIssues: 0, activeCustomers: 0 });

  const fetchAdminKpis = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];

      // Overdue Follow-ups
      const { data: overdueData } = await supabase
        .from('follow_ups')
        .select('id')
        .eq('status', 'Pending')
        .lt('follow_up_date', todayStr);
        
      // Pending Dispatches (v_board_requirements)
      const { count: dispatchCount } = await supabase
        .from('v_board_requirements')
        .select('*', { count: 'exact', head: true })
        .in('status', ['Won', 'Dispatched'])
        // simplified logic for mobile overview
        
      // Open Issues
      const { count: issueCount } = await supabase
        .from('crm_issues')
        .select('*', { count: 'exact', head: true })
        .not('status', 'in', '("Resolved","Closed")');

      // Active Customers
      const { count: customerCount } = await supabase
        .from('v_customer_360')
        .select('*', { count: 'exact', head: true })
        .eq('crm_status', 'Active');

      setKpis({
        overdue: overdueData?.length || 0,
        pendingDispatches: dispatchCount || 0,
        openIssues: issueCount || 0,
        activeCustomers: customerCount || 0,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminKpis();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminKpis();
  };

  const KpiTile = ({ title, value, icon, color }) => (
    <View style={[styles.tile, { borderTopColor: color, borderTopWidth: 3 }]}>
      <View style={styles.tileHeader}>
        {icon}
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
      <Text style={[styles.tileValue, { color }]}>{value}</Text>
    </View>
  );

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3b82f6" />}
    >
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Global Overview</Text>
        <Text style={styles.nameText}>{userProfile?.display_name || 'Admin'}</Text>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <View style={styles.grid}>
          <KpiTile 
            title="Overdue Actions" 
            value={kpis.overdue} 
            color="#ef4444" 
            icon={<AlertTriangle color="#ef4444" size={20} />} 
          />
          <KpiTile 
            title="Pending Dispatch" 
            value={kpis.pendingDispatches} 
            color="#3b82f6" 
            icon={<Truck color="#3b82f6" size={20} />} 
          />
          <KpiTile 
            title="Open Issues" 
            value={kpis.openIssues} 
            color="#f59e0b" 
            icon={<AlertTriangle color="#f59e0b" size={20} />} 
          />
          <KpiTile 
            title="Active Customers" 
            value={kpis.activeCustomers} 
            color="#10b981" 
            icon={<Users color="#10b981" size={20} />} 
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { padding: 20, paddingBottom: 10 },
  welcomeText: { fontSize: 16, color: '#94a3b8' },
  nameText: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, justifyContent: 'space-between' },
  tile: {
    backgroundColor: '#1e293b',
    width: '47%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    marginHorizontal: '1.5%',
  },
  tileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  tileTitle: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 1 },
  tileValue: { fontSize: 32, fontWeight: 'bold' },
});
