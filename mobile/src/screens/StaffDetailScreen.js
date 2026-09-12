import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, FlatList, TextInput
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import {
  User, Phone, CalendarClock, MapPin, Building2,
  Calendar, Clock, CheckCircle2, Search, AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react-native';

const TODAY_STR = new Date().toISOString().split('T')[0];

function getStatusBadge(status) {
  switch (status) {
    case 'Completed': return 'success';
    case 'Postponed': return 'info';
    case 'Cancelled': return 'error';
    default: return 'warning';
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDaysLabel(dateStr) {
  if (!dateStr) return '';
  const diff = Math.round((new Date(dateStr) - new Date(TODAY_STR)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return `In ${diff}d`;
}

export default function StaffDetailScreen({ route, navigation }) {
  const { staffId } = route.params;
  const [staff, setStaff] = useState(null);
  
  const [parties, setParties] = useState([]);
  const [filteredParties, setFilteredParties] = useState([]);
  const [partySearchQuery, setPartySearchQuery] = useState('');

  const [followUps, setFollowUps] = useState([]);
  const [historyTab, setHistoryTab] = useState('Day'); // Day, Week, Month
  
  const [stats, setStats] = useState({ calls: 0, customers: 0, followUps: 0, dueToday: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch Staff Profile
      const { data: profile, error: profileErr } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', staffId)
        .single();
      if (profileErr) throw profileErr;
      setStaff(profile);

      // 2. Fetch Assigned Parties
      const { data: partiesData, error: partiesErr } = await supabase
        .from('crm_parties')
        .select('*')
        .eq('assigned_owner_id', staffId)
        .order('display_name', { ascending: true });
      if (partiesErr) throw partiesErr;
      setParties(partiesData || []);
      setFilteredParties(partiesData || []);

      // 3. Fetch Follow-ups
      const { data: followUpsData, error: fuErr } = await supabase
        .from('follow_ups')
        .select('*, crm_parties(display_name)')
        .eq('assigned_to', staffId)
        .order('follow_up_date', { ascending: true });
      if (fuErr) throw fuErr;
      setFollowUps(followUpsData || []);

      // 4. Fetch Calls Logged Today
      const { count: callsToday } = await supabase
        .from('interactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', staffId)
        .gte('created_at', TODAY_STR + 'T00:00:00Z');

      // Aggregate Stats
      const pendingFus = followUpsData?.filter(f => f.status === 'Pending') || [];
      const dueToday = pendingFus.filter(f => f.follow_up_date === TODAY_STR).length;
      
      setStats({
        calls: callsToday || 0,
        customers: partiesData?.length || 0,
        followUps: pendingFus.length,
        dueToday
      });

    } catch (err) {
      console.error('[StaffDetail] Fetch Error:', err);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Handle Party Search
  useEffect(() => {
    const q = partySearchQuery.toLowerCase();
    if (!q) {
      setFilteredParties(parties);
    } else {
      setFilteredParties(parties.filter(p => p.display_name?.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q)));
    }
  }, [partySearchQuery, parties]);

  // Handle Follow-up History Filter
  const getFilteredFollowUps = () => {
    switch (historyTab) {
      case 'Day':
        return followUps.filter(f => f.follow_up_date === TODAY_STR);
      case 'Week': {
        // Just a simple approximation for the current week's followups (last 7 days + next 7 days for demo)
        const d = new Date();
        const past = new Date(d); past.setDate(d.getDate() - 7);
        const future = new Date(d); future.setDate(d.getDate() + 7);
        return followUps.filter(f => {
          const fd = new Date(f.follow_up_date);
          return fd >= past && fd <= future;
        });
      }
      case 'Month': {
        const thisMonth = TODAY_STR.substring(0, 7);
        return followUps.filter(f => f.follow_up_date?.startsWith(thisMonth));
      }
      default: return followUps;
    }
  };

  const renderedFollowUps = getFilteredFollowUps();
  
  // Follow-up Summary
  const fuTotal = renderedFollowUps.length;
  const fuCompleted = renderedFollowUps.filter(f => f.status === 'Completed').length;
  const fuPending = renderedFollowUps.filter(f => f.status === 'Pending' && f.follow_up_date >= TODAY_STR).length;
  const fuOverdue = renderedFollowUps.filter(f => f.status === 'Pending' && f.follow_up_date < TODAY_STR).length;

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Staff Detail" showBack />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </View>
    );
  }

  if (!staff) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Staff Detail" showBack />
        <Text style={styles.empty}>Staff not found.</Text>
      </View>
    );
  }

  const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <View style={styles.container}>
      <ScreenHeader title={`Staff: ${staff.display_name}`} showBack />
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* ─── 1. STAFF HEADER ─── */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{getInitials(staff.display_name)}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.profileName}>{staff.display_name}</Text>
              <Text style={styles.profileRole}>{staff.role || 'Field Sales'} • Active</Text>
              <View style={styles.telemetryRow}>
                <MapPin size={12} color={theme.colors.secondary} />
                <Text style={styles.telemetryText}>Location Locked • 2m ago</Text>
              </View>
            </View>
          </View>

          <View style={styles.statsBar}>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{stats.customers}</Text>
              <Text style={styles.statLabel}>Parties</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, stats.dueToday > 0 && {color: theme.colors.error}]}>{stats.dueToday}</Text>
              <Text style={styles.statLabel}>Due Today</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{stats.calls}</Text>
              <Text style={styles.statLabel}>Calls</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{stats.followUps}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
          </View>
        </View>

        {/* ─── 2. ASSIGNED PARTIES ─── */}
        <Text style={styles.sectionTitle}>Assigned Parties</Text>
        <View style={styles.partiesCard}>
          <View style={styles.searchBox}>
            <Search size={18} color={theme.colors.onSurfaceVariant} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search assigned parties..."
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={partySearchQuery}
              onChangeText={setPartySearchQuery}
            />
          </View>

          {filteredParties.length === 0 ? (
            <Text style={styles.emptySubtext}>No parties found.</Text>
          ) : (
            filteredParties.slice(0, 5).map(party => (
              <TouchableOpacity 
                key={party.id} 
                style={styles.partyRow}
                onPress={() => navigation.navigate('CustomerDetail', { customerId: party.id })}
              >
                <View style={styles.partyIcon}>
                  <Building2 size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.partyInfo}>
                  <Text style={styles.partyName} numberOfLines={1}>{party.display_name}</Text>
                  <Text style={styles.partyMeta}>{party.party_type || 'Customer'} • {party.city || 'Unknown'}</Text>
                </View>
                <View style={styles.partyRight}>
                  <ChevronRight size={16} color={theme.colors.outline} />
                </View>
              </TouchableOpacity>
            ))
          )}
          {filteredParties.length > 5 && (
            <TouchableOpacity 
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('MyCustomers', { 
                staffId: staff.id, 
                staffName: staff.display_name 
              })}
            >
              <Text style={styles.viewAllText}>View All ({filteredParties.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ─── 3. FOLLOW-UP HISTORY ─── */}
        <Text style={styles.sectionTitle}>Follow-up History</Text>
        <View style={styles.historyCard}>
          
          {/* Segmented Control */}
          <View style={styles.segmentedControl}>
            {['Day', 'Week', 'Month'].map(tab => {
              const isActive = historyTab === tab;
              return (
                <TouchableOpacity 
                  key={tab} 
                  style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                  onPress={() => setHistoryTab(tab)}
                >
                  <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>{tab}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Date Navigator Placeholder (Optional UX) */}
          <View style={styles.dateNav}>
            <TouchableOpacity><ChevronLeft size={20} color={theme.colors.onSurface} /></TouchableOpacity>
            <Text style={styles.dateNavText}>{historyTab === 'Day' ? 'Today' : historyTab === 'Week' ? 'This Week' : 'This Month'}</Text>
            <TouchableOpacity><ChevronRight size={20} color={theme.colors.onSurface} /></TouchableOpacity>
          </View>

          {/* Tally */}
          <View style={styles.tallyRow}>
            <View style={styles.tallyBox}>
              <Text style={styles.tallyVal}>{fuTotal}</Text>
              <Text style={styles.tallyLabel}>Total</Text>
            </View>
            <View style={styles.tallyBox}>
              <Text style={[styles.tallyVal, {color: theme.colors.success}]}>{fuCompleted}</Text>
              <Text style={styles.tallyLabel}>Completed</Text>
            </View>
            <View style={styles.tallyBox}>
              <Text style={[styles.tallyVal, {color: theme.colors.warning}]}>{fuPending}</Text>
              <Text style={styles.tallyLabel}>Pending</Text>
            </View>
            <View style={styles.tallyBox}>
              <Text style={[styles.tallyVal, {color: theme.colors.error}]}>{fuOverdue}</Text>
              <Text style={styles.tallyLabel}>Overdue</Text>
            </View>
          </View>

          {/* Follow-ups List */}
          <View style={styles.fuList}>
            {renderedFollowUps.length === 0 ? (
              <View style={styles.centerEmpty}>
                <CheckCircle2 size={32} color={theme.colors.success} />
                <Text style={styles.emptySubtext}>No follow-ups for this period.</Text>
              </View>
            ) : (
              renderedFollowUps.map(fu => {
                const isOverdue = fu.follow_up_date < TODAY_STR && fu.status === 'Pending';
                return (
                  <TouchableOpacity 
                    key={fu.id} 
                    style={styles.fuRow}
                    onPress={() => navigation.navigate('FollowUpDetail', { followUpId: fu.id })}
                  >
                    <View style={styles.fuLeft}>
                      <Text style={styles.fuTime}>{formatDate(fu.follow_up_date)}</Text>
                      <Badge label={fu.status} status={getStatusBadge(fu.status)} />
                    </View>
                    <View style={styles.fuRight}>
                      <Text style={styles.fuParty} numberOfLines={1}>{fu.crm_parties?.display_name || 'General'}</Text>
                      <Text style={styles.fuReason} numberOfLines={2}>{fu.reason || fu.follow_up_reason}</Text>
                      {isOverdue && (
                        <View style={styles.overdueBadge}>
                          <AlertCircle size={12} color={theme.colors.error} />
                          <Text style={styles.overdueText}>Overdue</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </View>
        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing['screen-edge'], paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  centerEmpty: { padding: 24, alignItems: 'center', gap: 8 },
  empty: { textAlign: 'center', marginTop: 40, color: theme.colors.onSurfaceVariant, fontSize: 16 },
  
  headerCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.xl,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadows.sm
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarCircle: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center'
  },
  avatarText: { fontSize: 22, fontWeight: '700', color: theme.colors.onPrimaryContainer },
  headerInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 2 },
  profileRole: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 4 },
  telemetryRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  telemetryText: { fontSize: 12, color: theme.colors.secondary, fontWeight: '500' },
  
  statsBar: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: theme.borders.radius.lg,
    padding: 12,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statVal: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface },
  statLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  partiesCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borders.radius.md,
    paddingHorizontal: 12, height: 40,
    borderWidth: 1, borderColor: theme.colors.border,
    marginBottom: 12
  },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14, color: theme.colors.onSurface },
  partyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceContainerHighest },
  partyIcon: { width: 40, height: 40, borderRadius: 8, backgroundColor: theme.colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  partyInfo: { flex: 1 },
  partyName: { fontSize: 15, fontWeight: '600', color: theme.colors.onSurface, marginBottom: 2 },
  partyMeta: { fontSize: 13, color: theme.colors.onSurfaceVariant },
  partyRight: { paddingLeft: 8 },
  viewAllBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  viewAllText: { fontSize: 14, fontWeight: '600', color: theme.colors.secondary },

  historyCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.xl,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  segmentedControl: {
    flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerHighest,
    borderRadius: 8, padding: 4, marginBottom: 16
  },
  segmentBtn: { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 6 },
  segmentBtnActive: { backgroundColor: theme.colors.surfaceContainerLowest, ...theme.shadows.sm },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  segmentTextActive: { color: theme.colors.onSurface },

  dateNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 },
  dateNavText: { fontSize: 15, fontWeight: '600', color: theme.colors.onSurface },

  tallyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 16 },
  tallyBox: { alignItems: 'center' },
  tallyVal: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  tallyLabel: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 4 },

  fuList: { gap: 12 },
  fuRow: { flexDirection: 'row', gap: 12, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  fuLeft: { width: 80, gap: 8, alignItems: 'flex-start' },
  fuTime: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  fuRight: { flex: 1 },
  fuParty: { fontSize: 15, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  fuReason: { fontSize: 13, color: theme.colors.onSurfaceVariant, lineHeight: 18 },
  overdueBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  overdueText: { fontSize: 11, fontWeight: '600', color: theme.colors.error }
});
