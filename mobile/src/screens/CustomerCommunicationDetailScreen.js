import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Linking, Alert,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import {
  Phone, MessageCircle, FileText, Users, Package,
  Truck, CalendarCheck, AlertTriangle,
  IndianRupee, PhoneCall, MessageSquare,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, MapPin, User,
} from 'lucide-react-native';

const TYPE_META = {
  Call:        { color: '#3b82f6', emoji: '📞' },
  WhatsApp:    { color: '#25D366', emoji: '💬' },
  Note:        { color: '#8b5cf6', emoji: '📝' },
  Meeting:     { color: '#0ea5e9', emoji: '👤' },
  Requirement: { color: '#ec4899', emoji: '🛒' }, // Order
  Payment:     { color: '#10b981', emoji: '💰' },
  Dispatch:    { color: '#6366f1', emoji: '🚚' },
  'Follow-up': { color: '#14b8a6', emoji: '🔄' },
  Complaint:   { color: '#ef4444', emoji: '⚠️' },
};

function getMeta(type) {
  return TYPE_META[type] || { color: theme.colors.onSurfaceVariant, emoji: '📌' };
}

export default function CustomerCommunicationDetailScreen({ route, navigation }) {
  const { customerId, customerName, customerCity, customerMobile, customerWhatsapp, customerPhone } = route.params;

  const [customerData, setCustomerData] = useState(null);
  const [financials, setFinancials] = useState(null);
  const [lastOrder, setLastOrder] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('All');

  const FILTERS = ['All', 'Calls', 'WhatsApp', 'Notes', 'Visits', 'Orders', 'Dispatches', 'Follow-ups', 'Complaints'];

  const fetchTimeline = useCallback(async () => {
    try {
      setLoading(true);

      // We might not have a party_id (unknown number)
      if (customerId) {
        // Fetch CRM Party for rep info
        const { data: custData } = await supabase
          .from('crm_parties')
          .select('*, rep:assigned_owner_id(display_name)')
          .eq('id', customerId)
          .single();
        if (custData) setCustomerData(custData);

        // Fetch Financials
        const { data: finData } = await supabase
          .from('v_customer_360')
          .select('*')
          .eq('customer_id', customerId)
          .single();
        if (finData) setFinancials(finData);
      }

      // ── Fetch Authoritative Calls (crm_call_events) ──
      let callsQuery = supabase
        .from('crm_call_events')
        .select(`
          id,
          direction,
          call_type,
          duration_seconds,
          started_at,
          staff_id,
          app_users!staff_id ( display_name )
        `)
        .order('started_at', { ascending: false })
        .limit(100);

      if (customerId) {
        callsQuery = callsQuery.eq('party_id', customerId);
      } else if (customerPhone) {
        callsQuery = callsQuery.eq('normalized_phone', customerPhone);
      }

      const { data: callEvents } = await callsQuery;

      // ── Fetch legacy Interactions (for WhatsApp, Notes, Meetings) ──
      let interactions = [];
      if (customerId) {
        const { data: interData } = await supabase
          .from('interactions')
          .select('id, channel, interaction_type, outcome, note, direction, created_at, user_id, app_users!user_id ( display_name )')
          .eq('party_id', customerId)
          .neq('channel', 'Call') // Skip calls, we have them from crm_call_events now
          .order('created_at', { ascending: false })
          .limit(100);
        interactions = interData || [];
      }

      // ── Fetch Other Business Events (only if known customer) ──
      let requirements = [];
      let dispatches = [];
      let followUps = [];
      let issues = [];
      let payments = [];

      if (customerId) {
        const { data: reqData } = await supabase
          .from('requirements')
          .select('id, product_type, quantity, unit, status, notes, created_at')
          .eq('party_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50);
        requirements = reqData || [];
        if (requirements.length > 0) setLastOrder(requirements[0]);

        if (requirements.length > 0) {
          const reqIds = requirements.map(r => r.id);
          const { data: dispData } = await supabase
            .from('requirement_dispatches')
            .select('id, requirement_id, dispatch_date, quantity, vehicle_number, status, created_at')
            .in('requirement_id', reqIds)
            .order('created_at', { ascending: false });
          dispatches = dispData || [];
        }

        const { data: fuData } = await supabase
          .from('follow_ups')
          .select('id, reason, follow_up_type, follow_up_date, status, notes, created_at, completed_at')
          .eq('party_id', customerId)
          .order('created_at', { ascending: false })
          .limit(50);
        followUps = fuData || [];

        const { data: issData } = await supabase
          .from('crm_issues')
          .select('id, category, priority, description, status, created_at')
          .eq('party_id', customerId)
          .order('created_at', { ascending: false })
          .limit(20);
        issues = issData || [];

        const { data: payData } = await supabase
          .from('tally_transactions')
          .select('id, voucher_type, voucher_no, amount, is_credit, voucher_date')
          .eq('crm_party_id', customerId)
          .order('voucher_date', { ascending: false })
          .limit(50);
        payments = payData || [];
      }

      // ── Normalize Timeline ────────────────────────────────────────────────

      const timeline = [];

      // 1. Authoritative Calls
      (callEvents || []).forEach(c => {
        let finalDir = c.direction;
        if (c.call_type === 'MISSED') finalDir = 'MISSED';

        const sName = Array.isArray(c.app_users) ? c.app_users[0]?.display_name : c.app_users?.display_name;
        
        let durStr = null;
        if (c.duration_seconds > 0) {
          const m = Math.floor(c.duration_seconds / 60);
          const s = c.duration_seconds % 60;
          durStr = m > 0 ? `${m}m ${s}s` : `${s}s`;
        }

        timeline.push({
          id: c.id,
          type: 'Call',
          direction: finalDir,
          duration: durStr,
          title: 'Call',
          outcome: null,
          note: sName ? `Logged by ${sName}` : '',
          date: c.started_at,
          sourceTable: 'crm_call_events',
          isBusinessEvent: false,
        });
      });

      // 2. Other Interactions
      interactions.forEach(i => {
        const ch = i.channel || i.interaction_type || 'Note';
        timeline.push({
          id: i.id,
          type: ch,
          direction: null,
          duration: null,
          title: ch,
          outcome: i.outcome,
          note: i.note,
          date: i.created_at,
          sourceTable: 'interactions',
          isBusinessEvent: false,
        });
      });

      // 3. Requirements
      requirements.forEach(r => {
        timeline.push({
          id: r.id,
          type: 'Requirement',
          title: 'Order',
          outcome: r.status,
          note: `${r.product_type} · Qty: ${r.quantity} ${r.unit}`,
          date: r.created_at,
          sourceTable: 'requirements',
          isBusinessEvent: true,
        });
      });

      // 4. Dispatches
      dispatches.forEach(d => {
        timeline.push({
          id: d.id,
          type: 'Dispatch',
          title: 'Dispatch',
          outcome: d.status,
          note: `${d.quantity || '—'} units${d.vehicle_number ? ' · ' + d.vehicle_number : ''}`,
          date: d.dispatch_date || d.created_at,
          sourceTable: 'requirement_dispatches',
          isBusinessEvent: true,
        });
      });

      // 5. Follow Ups
      followUps.forEach(f => {
        timeline.push({
          id: f.id,
          type: 'Follow-up',
          title: f.follow_up_type || 'Follow-up',
          outcome: f.status,
          note: f.reason + (f.notes ? ' · ' + f.notes : ''),
          date: f.completed_at || f.created_at,
          sourceTable: 'follow_ups',
          isBusinessEvent: false,
        });
      });

      // 6. Issues
      issues.forEach(iss => {
        timeline.push({
          id: iss.id,
          type: 'Complaint',
          title: iss.category || 'Issue',
          outcome: iss.status,
          note: iss.description,
          date: iss.created_at,
          sourceTable: 'crm_issues',
          isBusinessEvent: true,
        });
      });

      // 7. Payments
      payments.forEach(p => {
        timeline.push({
          id: p.id,
          type: 'Payment',
          title: p.voucher_type,
          outcome: p.is_credit ? 'Credit' : 'Debit',
          note: `₹${Number(p.amount || 0).toLocaleString('en-IN')}`,
          date: p.voucher_date,
          sourceTable: 'tally_transactions',
          isBusinessEvent: true,
        });
      });

      timeline.sort((a, b) => new Date(b.date) - new Date(a.date));
      setEvents(timeline);
    } catch (err) {
      console.error('[CustomerCommDetail]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, customerPhone]);

  useEffect(() => {
    fetchTimeline();
    const unsub = navigation.addListener('focus', fetchTimeline);
    return unsub;
  }, [fetchTimeline, navigation]);

  // ── Filter logic ──────────────────────────────────────────────────────────

  const filterMap = {
    All: null,
    Calls: 'Call',
    WhatsApp: 'WhatsApp',
    Notes: 'Note',
    Visits: 'Meeting',
    Orders: 'Requirement',
    Dispatches: 'Dispatch',
    'Follow-ups': 'Follow-up',
    Complaints: 'Complaint',
  };

  const filtered = filter === 'All'
    ? events
    : events.filter(e => e.type === filterMap[filter]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCallAct = () => {
    const num = customerMobile || customerPhone;
    if (!num) return Alert.alert('No Phone', 'No mobile number on file.');
    Linking.openURL(`tel:${num}`);
  };

  const handleWhatsAppAct = () => {
    const num = customerWhatsapp || customerMobile || customerPhone;
    if (!num) return Alert.alert('No Number', 'No WhatsApp number on file.');
    const clean = num.replace(/[^0-9]/g, '');
    const intl = clean.length === 10 ? '91' + clean : clean;
    Linking.openURL(`https://wa.me/${intl}`);
  };

  const handleAddInteraction = () => {
    if (!customerId) return Alert.alert('Unknown Number', 'Cannot add note for an unknown number.');
    navigation.navigate('AddActivity', { partyId: customerId, partyName: customerName });
  };
  const handleAddFollowUp = () => {
    if (!customerId) return Alert.alert('Unknown Number', 'Cannot add follow-up for an unknown number.');
    navigation.navigate('AddFollowUp', { partyId: customerId, partyName: customerName });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const formatDateStr = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const renderEvent = ({ item: ev }) => {
    const meta = getMeta(ev.type);
    const isCall = ev.type === 'Call';
    const isMissed = isCall && ev.direction === 'MISSED';
    
    let IconComp = Phone;
    let iconColor = meta.color;
    if (isCall) {
      if (ev.direction === 'INCOMING') { IconComp = PhoneIncoming; iconColor = theme.colors.success; }
      else if (ev.direction === 'OUTGOING') { IconComp = PhoneOutgoing; iconColor = '#3b82f6'; }
      else if (ev.direction === 'MISSED') { IconComp = PhoneMissed; iconColor = theme.colors.error; }
    } else if (ev.type === 'WhatsApp') IconComp = MessageCircle;
    else if (ev.type === 'Note') IconComp = FileText;
    else if (ev.type === 'Follow-up') IconComp = CalendarCheck;
    else if (ev.type === 'Meeting') IconComp = Users;
    else if (ev.isBusinessEvent) {
      IconComp = ev.type === 'Payment' ? IndianRupee : Package;
      iconColor = theme.colors.onSurfaceVariant;
    }

    return (
      <TouchableOpacity
        style={[styles.eventCard, isMissed && styles.eventCardMissed, ev.isBusinessEvent && styles.eventCardBusiness]}
        activeOpacity={0.7}
        onPress={() => {
          if (ev.sourceTable === 'interactions') navigation.navigate('AdminCallDetail', { callId: ev.id });
          else if (ev.sourceTable === 'requirements') navigation.navigate('RequirementDetail', { requirementId: ev.id });
          else if (ev.sourceTable === 'requirement_dispatches') navigation.navigate('DispatchDetail', { dispatchId: ev.id });
          else if (ev.sourceTable === 'follow_ups') navigation.navigate('FollowUpDetail', { followUpId: ev.id });
        }}
      >
        <View style={[styles.eventIconBox, { backgroundColor: iconColor + (ev.isBusinessEvent ? '10' : '18') }]}>
          <IconComp size={18} color={iconColor} />
        </View>
        <View style={styles.eventBody}>
          <View style={styles.eventHeaderRow}>
            <Text style={[styles.eventSubtitle, isMissed && { color: theme.colors.error, fontWeight: '600' }]}>
              {ev.isBusinessEvent ? ev.title.toUpperCase() : (isCall ? ev.direction : ev.type)}
            </Text>
            <Text style={styles.eventDate}>{formatDateStr(ev.date)}</Text>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.eventNote, ev.isBusinessEvent && { color: theme.colors.onSurfaceVariant }]} numberOfLines={2}>
              {[ev.outcome, ev.note].filter(Boolean).join(' - ')}
            </Text>
            {ev.duration && <Text style={styles.eventDuration}> • {ev.duration}</Text>}
          </View>
        </View>
        {isMissed && (
          <TouchableOpacity style={styles.callBackBtn} onPress={(e) => { e.stopPropagation(); handleCallAct(); }}>
            <PhoneCall size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const repName = customerData?.rep?.display_name;
  const repObj = Array.isArray(repName) ? repName[0] : repName; 

  const isUnknown = !customerId;
  const displayName = isUnknown ? 'Unknown Customer' : (customerName || 'Customer');

  return (
    <View style={styles.container}>
      <ScreenHeader title={displayName} showBack />

      {/* Customer Info Header */}
      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Phone size={14} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
          <Text style={styles.infoText}>{customerMobile || customerPhone || 'No Phone'}</Text>
        </View>
        
        {!isUnknown && (
          <>
            <View style={styles.infoRow}>
              <MapPin size={14} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
              <Text style={styles.infoText}>{customerCity || 'Unknown Location'}</Text>
            </View>
            <View style={styles.infoRow}>
              <User size={14} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
              <Text style={styles.infoText}>Rep: {repObj?.display_name || repObj || 'Unassigned'}</Text>
            </View>
            
            {financials && financials.closing_balance !== undefined && (
              <View style={[styles.infoRow, { marginTop: 4 }]}>
                <IndianRupee size={14} color={financials.closing_balance > 0 ? theme.colors.error : theme.colors.success} style={styles.infoIcon} />
                <Text style={[styles.infoText, { fontWeight: '600', color: financials.closing_balance > 0 ? theme.colors.error : theme.colors.success }]}>
                  Bal: ₹{Math.abs(financials.closing_balance).toLocaleString('en-IN')} {financials.closing_balance > 0 ? 'Dr' : 'Cr'}
                </Text>
              </View>
            )}
            
            {lastOrder && (
              <View style={[styles.infoRow, { marginTop: 4 }]}>
                <Package size={14} color={theme.colors.onSurfaceVariant} style={styles.infoIcon} />
                <Text style={styles.infoText} numberOfLines={1}>
                  Last Order: {lastOrder.quantity} {lastOrder.unit} {lastOrder.product_type} ({new Date(lastOrder.created_at).toLocaleDateString()})
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#3b82f6' }]} onPress={handleCallAct}>
          <PhoneCall size={16} color="#fff" />
          <Text style={styles.qaBtnText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsAppAct}>
          <MessageSquare size={16} color="#fff" />
          <Text style={styles.qaBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        
        {!isUnknown && (
          <>
            <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#8b5cf6' }]} onPress={handleAddInteraction}>
              <FileText size={16} color="#fff" />
              <Text style={styles.qaBtnText}>Note</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.qaBtn, { backgroundColor: '#14b8a6' }]} onPress={handleAddFollowUp}>
              <CalendarCheck size={16} color="#fff" />
              <Text style={styles.qaBtnText}>Follow-up</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Filters */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTERS}
          keyExtractor={f => f}
          contentContainerStyle={styles.filterBar}
          renderItem={({ item: f }) => (
            <TouchableOpacity
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Timeline */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id + item.sourceTable}
          renderItem={renderEvent}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTimeline(); }} />}
          ListEmptyComponent={<Text style={styles.empty}>No communication history found.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  infoCard: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  infoIcon: { marginRight: 8 },
  infoText: { fontSize: 13, color: theme.colors.onSurfaceVariant, flex: 1 },

  quickActions: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 8 },
  qaBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 4 },
  qaBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: theme.colors.border, marginRight: 6,
  },
  filterChipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  filterChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  filterChipTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 80 },
  
  eventCard: {
    flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  eventCardMissed: { borderColor: theme.colors.error + '40', backgroundColor: '#fff5f5' },
  eventCardBusiness: { backgroundColor: theme.colors.background, opacity: 0.8 },
  
  eventIconBox: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  
  eventBody: { flex: 1, justifyContent: 'center' },
  eventHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  
  eventSubtitle: { fontSize: 12, color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' },
  eventDate: { fontSize: 11, color: theme.colors.onSurfaceVariant },
  
  eventNote: { fontSize: 13, color: theme.colors.onSurface, lineHeight: 18, flex: 1 },
  eventDuration: { fontSize: 11, color: theme.colors.onSurfaceVariant, marginLeft: 4 },

  callBackBtn: {
    backgroundColor: theme.colors.error,
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginLeft: 12, alignSelf: 'center',
  },

  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontSize: 16 },
});
