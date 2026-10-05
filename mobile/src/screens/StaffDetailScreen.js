import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, FlatList, TextInput, Alert, Linking, RefreshControl
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import {
  User, Phone, CalendarClock, MapPin, Building2,
  Calendar, Clock, CheckCircle2, Search, AlertCircle, 
  ChevronLeft, ChevronRight, PhoneIncoming, PhoneOutgoing, PhoneMissed, MessageCircle, FileText, Users
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

export default function StaffDetailScreen({ route, navigation }) {
  const { staffId } = route.params;
  
  const [staff, setStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Raw data
  const [assignedParties, setAssignedParties] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [allCalls, setAllCalls] = useState([]);
  const [todayCalls, setTodayCalls] = useState([]);
  const [todayOtherInts, setTodayOtherInts] = useState({ whatsapp: 0, notes: 0 });

  // UI state
  const [custFilter, setCustFilter] = useState('All');
  const [historyFilter, setHistoryFilter] = useState('Month');

  const fetchStaffData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Staff Profile
      const { data: profile } = await supabase.from('app_users').select('*').eq('id', staffId).single();
      if (profile) setStaff(profile);

      // 2. Assigned Parties
      const { data: partiesData } = await supabase
        .from('crm_parties')
        .select('*')
        .eq('assigned_owner_id', staffId)
        .order('display_name', { ascending: true });
      const parties = partiesData || [];
      setAssignedParties(parties);

      // 3. Follow-ups
      const { data: followUpsData } = await supabase
        .from('follow_ups')
        .select('*, crm_parties(display_name)')
        .eq('assigned_to', staffId)
        .order('follow_up_date', { ascending: true });
      const fUps = followUpsData || [];
      setFollowUps(fUps);

      // 4. Communication Log (All Time for Coverage/Suggestions)
      // We will use start of year to bound it, or maybe last 90 days.
      const now = new Date();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(now.getDate() - 90);

      const { data: callsData } = await supabase.rpc('get_communication_dashboard_grouped', {
        p_start_date: ninetyDaysAgo.toISOString(),
        p_end_date: now.toISOString(),
        p_staff_id: staffId,
        p_limit: 1000,
        p_offset: 0
      });
      const cData = callsData || [];
      setAllCalls(cData);

      // 5. Today's Call Activity
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      const todayEnd = new Date();
      todayEnd.setHours(23,59,59,999);

      const { data: todayCData } = await supabase.rpc('get_communication_dashboard_grouped', {
        p_start_date: todayStart.toISOString(),
        p_end_date: todayEnd.toISOString(),
        p_staff_id: staffId,
        p_limit: 1000,
        p_offset: 0
      });
      setTodayCalls(todayCData || []);

      // 6. Today's WhatsApp / Notes
      const { data: todayInts } = await supabase
        .from('interactions')
        .select('channel')
        .eq('user_id', staffId)
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      let waCount = 0; let noteCount = 0;
      (todayInts || []).forEach(i => {
        if (i.channel === 'WhatsApp') waCount++;
        if (i.channel === 'Note') noteCount++;
      });
      setTodayOtherInts({ whatsapp: waCount, notes: noteCount });

    } catch (err) {
      console.error('[StaffDetail] Fetch Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [staffId]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // ── Computations ──────────────────────────────────────────────────────────

  const pendingFollowUps = useMemo(() => followUps.filter(f => f.status === 'Pending'), [followUps]);
  const overdueFollowUps = useMemo(() => pendingFollowUps.filter(f => f.follow_up_date && f.follow_up_date < TODAY_STR), [pendingFollowUps]);
  const dueFollowUps = useMemo(() => pendingFollowUps.filter(f => f.follow_up_date && f.follow_up_date >= TODAY_STR), [pendingFollowUps]);

  // Contact Coverage
  const contactedPartyIds = useMemo(() => {
    const ids = new Set();
    allCalls.forEach(c => { if (c.party_id) ids.add(c.party_id); });
    return ids;
  }, [allCalls]);

  const coveragePercent = assignedParties.length > 0 
    ? Math.round((contactedPartyIds.size / assignedParties.length) * 100) 
    : 0;

  // Today's Totals
  const todaySummary = useMemo(() => {
    if (!todayCalls.length) return { custContacted: 0, incoming: 0, outgoing: 0, missed: 0 };
    return {
      custContacted: todayCalls.length,
      incoming: Number(todayCalls[0].grand_incoming || 0),
      outgoing: Number(todayCalls[0].grand_outgoing || 0),
      missed: Number(todayCalls[0].grand_missed || 0)
    };
  }, [todayCalls]);

  // Generate Suggestions
  const suggestions = useMemo(() => {
    const suggs = [];
    const partyIdsWithPendingFUs = new Set(pendingFollowUps.map(f => f.party_id));

    allCalls.forEach(callGroup => {
      // 1. Missed Call Requiring Callback
      if (Number(callGroup.missed_count) > 0 && callGroup.last_call_direction === 'MISSED') {
        if (!partyIdsWithPendingFUs.has(callGroup.party_id)) {
          suggs.push({
            id: 'sugg_missed_' + callGroup.normalized_phone,
            partyId: callGroup.party_id,
            partyName: callGroup.party_name || 'Unknown',
            phone: callGroup.normalized_phone,
            reason: 'Recent Missed Call',
            detail: `Missed call at ${new Date(callGroup.last_call_at).toLocaleString()}`
          });
        }
      }
      
      // 2. Customer Contacted but no next action
      // If last call was today and no pending FU
      else if (callGroup.last_call_at && callGroup.last_call_at.startsWith(TODAY_STR)) {
        if (!partyIdsWithPendingFUs.has(callGroup.party_id)) {
          suggs.push({
            id: 'sugg_no_action_' + callGroup.normalized_phone,
            partyId: callGroup.party_id,
            partyName: callGroup.party_name || 'Unknown',
            phone: callGroup.normalized_phone,
            reason: 'Contacted Today - No Next Action',
            detail: `Last call was ${callGroup.last_call_direction ? callGroup.last_call_direction.toLowerCase() : 'unknown'}`
          });
        }
      }
      
      // 3. Multiple outgoing calls with no response
      else if (Number(callGroup.outgoing_count) >= 3 && Number(callGroup.talk_seconds) === 0) {
        if (!partyIdsWithPendingFUs.has(callGroup.party_id)) {
          suggs.push({
            id: 'sugg_no_resp_' + callGroup.normalized_phone,
            partyId: callGroup.party_id,
            partyName: callGroup.party_name || 'Unknown',
            phone: callGroup.normalized_phone,
            reason: 'No Response to Outgoing Calls',
            detail: `${callGroup.outgoing_count} outgoing attempts with 0s talk time`
          });
        }
      }
    });

    return suggs.slice(0, 10); // Limit to top 10 actionable suggestions
  }, [allCalls, pendingFollowUps]);

  // Customer Activity List
  const customerList = useMemo(() => {
    return assignedParties.map(p => {
      const isContacted = contactedPartyIds.has(p.id);
      const callData = allCalls.find(c => c.party_id === p.id);
      const hasPendingFU = pendingFollowUps.some(f => f.party_id === p.id);
      const isOverdue = overdueFollowUps.some(f => f.party_id === p.id);
      
      return { ...p, isContacted, callData, hasPendingFU, isOverdue };
    }).filter(p => {
      if (custFilter === 'Contacted') return p.isContacted;
      if (custFilter === 'Not Contacted') return !p.isContacted;
      if (custFilter === 'Follow-up Due') return p.hasPendingFU && !p.isOverdue;
      if (custFilter === 'Overdue') return p.isOverdue;
      return true;
    });
  }, [assignedParties, custFilter, contactedPartyIds, allCalls, pendingFollowUps, overdueFollowUps]);

  // History List
  const historyList = useMemo(() => {
    const pastFus = followUps.filter(f => f.status !== 'Pending');
    const now = new Date();
    
    return pastFus.filter(f => {
      if (!f.follow_up_date) return false;
      const d = new Date(f.follow_up_date);
      if (historyFilter === 'Day') return d.toDateString() === now.toDateString();
      if (historyFilter === 'Week') {
        const diff = Math.abs(now - d) / 86400000;
        return diff <= 7;
      }
      if (historyFilter === 'Month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [followUps, historyFilter]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCreateFollowUp = (partyId, partyName) => {
    navigation.navigate('AddFollowUp', { partyId, partyName });
  };

  const handleCall = (phone) => {
    if (!phone) return Alert.alert('Error', 'No phone number available.');
    Linking.openURL(`tel:${phone}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Staff Detail" showBack />
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{marginTop: 40}} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title={staff?.display_name || 'Staff Member'} subtitle={staff?.role || 'Unknown Role'} showBack />
      
      <ScrollView 
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStaffData(); }} />}
      >
        
        {/* 1. STAFF SUMMARY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryVal}>{assignedParties.length}</Text>
              <Text style={styles.summaryLbl}>Assigned Customers</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={styles.summaryVal}>{contactedPartyIds.size}</Text>
              <Text style={styles.summaryLbl}>Customers Contacted</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryVal, { color: theme.colors.primary }]}>{dueFollowUps.length}</Text>
              <Text style={styles.summaryLbl}>Follow-ups Due</Text>
            </View>
            <View style={styles.summaryBox}>
              <Text style={[styles.summaryVal, { color: theme.colors.error }]}>{overdueFollowUps.length}</Text>
              <Text style={styles.summaryLbl}>Overdue</Text>
            </View>
          </View>

          {/* Contact Coverage Bar */}
          <View style={styles.coverageWrap}>
            <View style={styles.coverageRow}>
              <Text style={styles.coverageLabel}>Contact Coverage</Text>
              <Text style={styles.coverageVal}>{contactedPartyIds.size} / {assignedParties.length} ({coveragePercent}%)</Text>
            </View>
            <View style={styles.coverageBarBg}>
              <View style={[styles.coverageBarFill, { width: `${coveragePercent}%` }]} />
            </View>
          </View>
        </View>

        {/* 2. TODAY'S ACTIVITY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's Communication</Text>
          <View style={styles.activityRow}>
            <View style={styles.actItem}>
              <Users size={16} color={theme.colors.onSurfaceVariant} />
              <Text style={styles.actVal}>{todaySummary.custContacted}</Text>
              <Text style={styles.actLbl}>Contacted</Text>
            </View>
            <View style={styles.actItem}>
              <PhoneIncoming size={16} color={theme.colors.success} />
              <Text style={styles.actVal}>{todaySummary.incoming}</Text>
              <Text style={styles.actLbl}>Incoming</Text>
            </View>
            <View style={styles.actItem}>
              <PhoneOutgoing size={16} color="#3b82f6" />
              <Text style={styles.actVal}>{todaySummary.outgoing}</Text>
              <Text style={styles.actLbl}>Outgoing</Text>
            </View>
            <View style={styles.actItem}>
              <PhoneMissed size={16} color={theme.colors.error} />
              <Text style={styles.actVal}>{todaySummary.missed}</Text>
              <Text style={styles.actLbl}>Missed</Text>
            </View>
          </View>
          <View style={[styles.activityRow, { marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 12 }]}>
            <View style={styles.actItem}>
              <MessageCircle size={16} color="#25D366" />
              <Text style={styles.actVal}>{todayOtherInts.whatsapp}</Text>
              <Text style={styles.actLbl}>WhatsApp</Text>
            </View>
            <View style={styles.actItem}>
              <FileText size={16} color="#8b5cf6" />
              <Text style={styles.actVal}>{todayOtherInts.notes}</Text>
              <Text style={styles.actLbl}>Notes</Text>
            </View>
          </View>
        </View>

        {/* 3. FOLLOW-UP INTELLIGENCE */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Follow-up Intelligence</Text>
          
          {/* Overdue */}
          {overdueFollowUps.length > 0 && (
            <View style={styles.fuGroup}>
              <View style={styles.fuHeaderRow}>
                <AlertCircle size={16} color={theme.colors.error} />
                <Text style={styles.fuHeaderTitle}>Overdue ({overdueFollowUps.length})</Text>
              </View>
              {overdueFollowUps.map(fu => (
                <View key={fu.id} style={[styles.fuItem, { borderLeftColor: theme.colors.error }]}>
                  <Text style={styles.fuItemParty}>{fu.crm_parties?.display_name || 'Unknown'}</Text>
                  <Text style={styles.fuItemReason}>{fu.reason}</Text>
                  <Text style={[styles.fuItemDate, { color: theme.colors.error }]}>Due: {formatDate(fu.follow_up_date)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Due / Needs Attention */}
          {dueFollowUps.length > 0 && (
            <View style={styles.fuGroup}>
              <View style={styles.fuHeaderRow}>
                <CalendarClock size={16} color={theme.colors.warning} />
                <Text style={styles.fuHeaderTitle}>Due / Needs Attention ({dueFollowUps.length})</Text>
              </View>
              {dueFollowUps.map(fu => (
                <View key={fu.id} style={[styles.fuItem, { borderLeftColor: theme.colors.warning }]}>
                  <Text style={styles.fuItemParty}>{fu.crm_parties?.display_name || 'Unknown'}</Text>
                  <Text style={styles.fuItemReason}>{fu.reason}</Text>
                  <Text style={styles.fuItemDate}>Due: {formatDate(fu.follow_up_date)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Suggested */}
          {suggestions.length > 0 && (
            <View style={styles.fuGroup}>
              <View style={styles.fuHeaderRow}>
                <AlertCircle size={16} color={theme.colors.primary} />
                <Text style={styles.fuHeaderTitle}>Suggested Follow-ups ({suggestions.length})</Text>
              </View>
              {suggestions.map(sugg => (
                <View key={sugg.id} style={[styles.fuItem, { borderLeftColor: theme.colors.primary, backgroundColor: theme.colors.surfaceContainerLowest }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fuItemParty}>{sugg.partyName}</Text>
                      <Text style={styles.fuItemReason}>{sugg.reason}</Text>
                      <Text style={styles.fuItemDate}>{sugg.detail}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity style={styles.miniBtn} onPress={() => handleCall(sugg.phone)}>
                        <Phone size={14} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.miniBtn, { backgroundColor: theme.colors.primary }]} onPress={() => handleCreateFollowUp(sugg.partyId, sugg.partyName)}>
                        <Calendar size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {pendingFollowUps.length === 0 && suggestions.length === 0 && (
             <Text style={styles.emptyText}>No follow-ups require attention right now.</Text>
          )}
        </View>

        {/* 6. CUSTOMER ACTIVITY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Customer Activity</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            {['All', 'Contacted', 'Not Contacted', 'Follow-up Due', 'Overdue'].map(f => (
              <TouchableOpacity 
                key={f} 
                style={[styles.filterChip, custFilter === f && styles.filterChipActive]}
                onPress={() => setCustFilter(f)}
              >
                <Text style={[styles.filterChipText, custFilter === f && styles.filterChipTextActive]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {customerList.slice(0, 20).map(cust => (
            <View key={cust.id} style={styles.custCard}>
              <View style={styles.custCardHeader}>
                <Text style={styles.custName}>{cust.display_name}</Text>
                <Text style={styles.custLoc}>{cust.city}</Text>
              </View>
              
              {cust.callData ? (
                <View style={styles.custDataRow}>
                  <Text style={styles.custLabel}>Last contact: {cust.callData.last_call_at ? new Date(cust.callData.last_call_at).toLocaleString() : 'Unknown'}</Text>
                  <Text style={styles.custLabel}>{cust.callData.total_calls} Calls ({cust.callData.outgoing_count} Out)</Text>
                </View>
              ) : (
                <Text style={styles.custLabel}>No communication recorded</Text>
              )}

              {cust.hasPendingFU && (
                <View style={[styles.custBadge, cust.isOverdue && { backgroundColor: '#fff5f5', borderColor: theme.colors.error + '40' }]}>
                  <Text style={[styles.custBadgeText, cust.isOverdue && { color: theme.colors.error }]}>
                    {cust.isOverdue ? 'Overdue Follow-up' : 'Follow-up Scheduled'}
                  </Text>
                </View>
              )}

              <View style={styles.custActions}>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: theme.colors.success }]} onPress={() => handleCall(cust.mobile)}>
                  <Phone size={14} color="#fff" />
                  <Text style={styles.actBtnText}>Call</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actBtn, { backgroundColor: theme.colors.primary }]} onPress={() => handleCreateFollowUp(cust.id, cust.display_name)}>
                  <Calendar size={14} color="#fff" />
                  <Text style={styles.actBtnText}>Schedule</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actBtn, { backgroundColor: theme.colors.surfaceContainerLow, borderWidth: 1, borderColor: theme.colors.border }]} 
                  onPress={() => navigation.navigate('CustomerCommunicationDetail', { customerId: cust.id, customerName: cust.display_name })}
                >
                  <Text style={[styles.actBtnText, { color: theme.colors.onSurface }]}>History</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {customerList.length > 20 && (
             <Text style={styles.emptyText}>Showing top 20 of {customerList.length} customers.</Text>
          )}
          {customerList.length === 0 && (
             <Text style={styles.emptyText}>No customers match this filter.</Text>
          )}
        </View>

        {/* 9. FOLLOW-UP HISTORY */}
        <View style={styles.sectionCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Follow-up History</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {['Day', 'Week', 'Month'].map(hf => (
                <TouchableOpacity key={hf} onPress={() => setHistoryFilter(hf)}>
                  <Text style={{ fontSize: 12, fontWeight: historyFilter === hf ? '700' : '500', color: historyFilter === hf ? theme.colors.secondary : theme.colors.onSurfaceVariant }}>
                    {hf}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {historyList.map(h => (
            <View key={h.id} style={styles.histItem}>
              <Badge label={h.status} type={getStatusBadge(h.status)} style={{ alignSelf: 'flex-start', marginBottom: 4 }} />
              <Text style={styles.histParty}>{h.crm_parties?.display_name || 'Unknown'}</Text>
              <Text style={styles.histReason}>{h.reason}</Text>
              <Text style={styles.histDate}>Completed: {formatDate(h.completed_at)}</Text>
            </View>
          ))}
          
          {historyList.length === 0 && (
            <Text style={styles.emptyText}>No historical follow-ups in this period.</Text>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  
  sectionCard: {
    backgroundColor: theme.colors.surface, padding: 16,
    borderRadius: 12, marginBottom: 16,
    borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadows.sm
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 12 },

  // Summary Grid
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  summaryBox: {
    width: '48%', backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border
  },
  summaryVal: { fontSize: 20, fontWeight: '700', color: theme.colors.onSurface },
  summaryLbl: { fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 4, fontWeight: '500' },

  coverageWrap: { marginTop: 16 },
  coverageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  coverageLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurface },
  coverageVal: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  coverageBarBg: { height: 8, backgroundColor: theme.colors.surfaceContainerHigh, borderRadius: 4 },
  coverageBarFill: { height: 8, backgroundColor: theme.colors.secondary, borderRadius: 4 },

  // Activity
  activityRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actItem: { alignItems: 'center', flex: 1 },
  actVal: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, marginVertical: 2 },
  actLbl: { fontSize: 10, color: theme.colors.onSurfaceVariant },

  // Follow Ups
  fuGroup: { marginBottom: 16 },
  fuHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  fuHeaderTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurfaceVariant },
  fuItem: {
    backgroundColor: theme.colors.surfaceContainerLow,
    padding: 12, borderRadius: 8, marginBottom: 8,
    borderLeftWidth: 4,
  },
  fuItemParty: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 2 },
  fuItemReason: { fontSize: 13, color: theme.colors.onSurfaceVariant, marginBottom: 4 },
  fuItemDate: { fontSize: 11, fontWeight: '500', color: theme.colors.onSurfaceVariant },
  miniBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },

  // Filters
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: theme.colors.surfaceContainerLow, borderWidth: 1, borderColor: theme.colors.border, marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  filterChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  filterChipTextActive: { color: '#fff' },

  // Cust Card
  custCard: { backgroundColor: theme.colors.surfaceContainerLowest, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  custCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  custName: { fontSize: 14, fontWeight: '700', color: theme.colors.onSurface },
  custLoc: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  custDataRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  custLabel: { fontSize: 11, color: theme.colors.onSurfaceVariant },
  custBadge: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#f0fdf4', borderRadius: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 8 },
  custBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.success },
  custActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, borderRadius: 6, gap: 4 },
  actBtnText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // History
  histItem: { backgroundColor: theme.colors.surfaceContainerLowest, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 8 },
  histParty: { fontSize: 13, fontWeight: '700', color: theme.colors.onSurface },
  histReason: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginVertical: 2 },
  histDate: { fontSize: 10, color: theme.colors.onSurfaceVariant },

  emptyText: { textAlign: 'center', color: theme.colors.onSurfaceVariant, fontSize: 13, fontStyle: 'italic', marginVertical: 8 },
});
