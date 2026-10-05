import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput, Linking, Alert, Modal,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import {
  Phone, MessageCircle, FileText, Users, Search,
  PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneCall,
  Calendar, User, ChevronDown, X
} from 'lucide-react-native';

const DATE_RANGES = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'this_week' },
  { label: 'This Month', value: 'this_month' },
  { label: 'All Time', value: 'all_time' },
];

const TABS = ['All', 'Missed', 'Incoming', 'Outgoing', 'Known', 'Unknown'];

export default function AdminCallsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groups, setGroups] = useState([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [activeTab, setActiveTab] = useState('All');
  
  const [dateRange, setDateRange] = useState(DATE_RANGES[0]);
  const [showDateModal, setShowDateModal] = useState(false);
  
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState({ id: 'all', display_name: 'All Staff' });
  const [showStaffModal, setShowStaffModal] = useState(false);

  const [summary, setSummary] = useState({
    totalCalls: 0, incoming: 0, outgoing: 0, missed: 0, known: 0, unknown: 0
  });

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Staff
  useEffect(() => {
    async function loadStaff() {
      try {
        const { data } = await supabase.from('app_users').select('id, display_name').order('display_name');
        if (data) {
          setStaffList([{ id: 'all', display_name: 'All Staff' }, ...data]);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadStaff();
  }, []);

  // Compute start/end dates
  const getDateBounds = (rangeVal) => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    
    if (rangeVal === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (rangeVal === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setHours(23, 59, 59, 999);
    } else if (rangeVal === 'this_week') {
      const day = start.getDay(); // 0 is Sunday
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // start on Monday
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (rangeVal === 'this_month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (rangeVal === 'all_time') {
      start = new Date('2020-01-01T00:00:00Z');
      end.setHours(23, 59, 59, 999);
    }
    return { start, end };
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { start, end } = getDateBounds(dateRange.value);
      
      const params = {
        p_start_date: start.toISOString(),
        p_end_date: end.toISOString(),
        p_staff_id: selectedStaff.id === 'all' ? null : selectedStaff.id,
        p_search: debouncedSearch || null,
        p_sort_key: 'last_call_at',
        p_sort_direction: 'desc',
        p_limit: 500,
        p_offset: 0
      };

      const { data, error } = await supabase.rpc('get_communication_dashboard_grouped', params);
      
      if (error) throw error;

      if (data && data.length > 0) {
        setGroups(data);
        setSummary({
          totalCalls: Number(data[0].grand_total_calls) || 0,
          incoming: Number(data[0].grand_incoming) || 0,
          outgoing: Number(data[0].grand_outgoing) || 0,
          missed: Number(data[0].grand_missed) || 0,
          known: Number(data[0].grand_known) || 0,
          unknown: Number(data[0].grand_unknown) || 0,
        });
      } else {
        setGroups([]);
        setSummary({ totalCalls: 0, incoming: 0, outgoing: 0, missed: 0, known: 0, unknown: 0 });
      }
    } catch (err) {
      console.error('[AdminCallsScreen] Fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, selectedStaff, debouncedSearch]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Client-side tab filter
  const filteredGroups = useMemo(() => {
    let list = groups;
    if (activeTab === 'Missed') list = list.filter(g => Number(g.missed_count) > 0);
    else if (activeTab === 'Incoming') list = list.filter(g => Number(g.incoming_count) > 0);
    else if (activeTab === 'Outgoing') list = list.filter(g => Number(g.outgoing_count) > 0);
    else if (activeTab === 'Known') list = list.filter(g => g.party_id != null);
    else if (activeTab === 'Unknown') list = list.filter(g => g.party_id == null);
    return list;
  }, [groups, activeTab]);

  const handleCall = (phone) => {
    if (!phone) return Alert.alert('Error', 'No phone number available.');
    Linking.openURL(`tel:${phone}`);
  };

  const renderItem = ({ item }) => {
    const isKnown = !!item.party_id;
    const name = isKnown ? item.party_name : 'Unknown Customer';
    
    // Determine main icon based on counts (priority: Missed > Incoming > Outgoing)
    let IconComp = PhoneCall;
    let iconColor = theme.colors.primary;
    if (Number(item.missed_count) > 0) {
      IconComp = PhoneMissed;
      iconColor = theme.colors.error;
    } else if (Number(item.incoming_count) > 0) {
      IconComp = PhoneIncoming;
      iconColor = theme.colors.success;
    } else {
      IconComp = PhoneOutgoing;
      iconColor = '#3b82f6';
    }

    const lastCallDate = new Date(item.last_call_at).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });

    const callsText = `${item.total_calls} Call${item.total_calls > 1 ? 's' : ''} · ${item.incoming_count} Incoming · ${item.outgoing_count} Outgoing · ${item.missed_count} Missed`;
    
    // Show one staff member if possible, else just let detail screen handle it
    let staffName = '';
    if (item.events_json && item.events_json.length > 0) {
      staffName = item.events_json[0].staff_name;
    }

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => {
          navigation.navigate('CustomerCommunicationDetail', {
            customerId: item.party_id,
            customerName: item.party_name,
            customerPhone: item.display_phone, // passed to fallback if partyId null
            eventsJson: item.events_json // pass events if we want to show raw list
          });
        }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.name, !isKnown && { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.phone}>{item.display_phone || item.normalized_phone}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn} onPress={() => handleCall(item.normalized_phone || item.display_phone)}>
            <Phone size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.statsText}>{callsText}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>{isKnown ? 'Known' : 'Unknown'}</Text>
            </View>
            <Text style={styles.lastCall}>Last call: {lastCallDate}</Text>
          </View>
          {staffName ? (
            <Text style={styles.staffText}>Assigned/Logged by: {staffName}</Text>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Customer Communication" showBack={false} />

      {/* Filters Bar */}
      <View style={styles.filtersBar}>
        <TouchableOpacity style={styles.filterDropdown} onPress={() => setShowDateModal(true)}>
          <Calendar size={14} color={theme.colors.onSurface} />
          <Text style={styles.filterDropdownText}>{dateRange.label}</Text>
          <ChevronDown size={14} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.filterDropdown} onPress={() => setShowStaffModal(true)}>
          <User size={14} color={theme.colors.onSurface} />
          <Text style={styles.filterDropdownText} numberOfLines={1}>{selectedStaff.display_name}</Text>
          <ChevronDown size={14} color={theme.colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Search size={18} color={theme.colors.onSurfaceVariant} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or phone..."
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: 4 }}>
            <X size={16} color={theme.colors.onSurfaceVariant} />
          </TouchableOpacity>
        )}
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{summary.totalCalls}</Text>
          <Text style={styles.summaryLbl}>Calls</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: theme.colors.success }]}>{summary.incoming}</Text>
          <Text style={styles.summaryLbl}>Incoming</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#3b82f6' }]}>{summary.outgoing}</Text>
          <Text style={styles.summaryLbl}>Outgoing</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: theme.colors.error }]}>{summary.missed}</Text>
          <Text style={styles.summaryLbl}>Missed</Text>
        </View>
      </View>
      <View style={[styles.summaryBar, { borderTopWidth: 0, paddingTop: 0, paddingBottom: 12 }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: theme.colors.primary }]}>{summary.known}</Text>
          <Text style={styles.summaryLbl}>Known</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: theme.colors.onSurfaceVariant }]}>{summary.unknown}</Text>
          <Text style={styles.summaryLbl}>Unknown</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={TABS}
          keyExtractor={t => t}
          contentContainerStyle={styles.tabBar}
          renderItem={({ item: t }) => (
            <TouchableOpacity
              style={[styles.tabChip, activeTab === t && styles.tabChipActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabChipText, activeTab === t && styles.tabChipTextActive]}>{t}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      {loading && !refreshing ? (
        <ActivityIndicator size="large" color={theme.colors.secondary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredGroups}
          keyExtractor={(item, index) => item.normalized_phone + index}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>0 calls / No communication found.</Text>
          }
        />
      )}

      {/* Date Modal */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowDateModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Date Range</Text>
            {DATE_RANGES.map(dr => (
              <TouchableOpacity
                key={dr.value}
                style={styles.modalOption}
                onPress={() => { setDateRange(dr); setShowDateModal(false); }}
              >
                <Text style={[styles.modalOptionText, dateRange.value === dr.value && { color: theme.colors.secondary, fontWeight: '700' }]}>
                  {dr.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Staff Modal */}
      <Modal visible={showStaffModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowStaffModal(false)}>
          <View style={[styles.modalSheet, { maxHeight: '70%' }]}>
            <Text style={styles.modalTitle}>Select Staff</Text>
            <FlatList 
              data={staffList}
              keyExtractor={s => s.id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => { setSelectedStaff(item); setShowStaffModal(false); }}
                >
                  <Text style={[styles.modalOptionText, selectedStaff.id === item.id && { color: theme.colors.secondary, fontWeight: '700' }]}>
                    {item.display_name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  filtersBar: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 8,
    backgroundColor: theme.colors.surfaceContainerLowest
  },
  filterDropdown: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surfaceContainerLow,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  filterDropdownText: { fontSize: 13, fontWeight: '600', color: theme.colors.onSurface, flex: 1, marginHorizontal: 6 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surfaceContainerLow,
    marginHorizontal: 16, marginTop: 12, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: theme.colors.onSurface, paddingVertical: 4 },

  summaryBar: {
    flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLowest,
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingHorizontal: 16
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface },
  summaryLbl: { fontSize: 11, color: theme.colors.onSurfaceVariant, marginTop: 2, fontWeight: '600' },

  tabBar: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  tabChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: theme.colors.border, marginRight: 8,
  },
  tabChipActive: { backgroundColor: theme.colors.secondary, borderColor: theme.colors.secondary },
  tabChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.onSurfaceVariant },
  tabChipTextActive: { color: '#fff' },

  list: { paddingHorizontal: 16, paddingBottom: 80, paddingTop: 16 },

  card: {
    backgroundColor: theme.colors.surfaceContainerLowest,
    padding: 16, borderRadius: 12, marginBottom: 12,
    borderWidth: 1, borderColor: theme.colors.border,
    ...theme.shadows.sm
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  name: { fontSize: 16, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  phone: { fontSize: 14, color: theme.colors.onSurfaceVariant, fontWeight: '500' },
  
  callBtn: {
    backgroundColor: theme.colors.success, width: 36, height: 36,
    borderRadius: 18, alignItems: 'center', justifyContent: 'center'
  },

  cardBody: {},
  statsText: { fontSize: 13, color: theme.colors.onSurface, fontWeight: '600', marginBottom: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  metaBadge: {
    backgroundColor: theme.colors.surfaceContainerHigh,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8
  },
  metaBadgeText: { fontSize: 10, fontWeight: '600', color: theme.colors.onSurfaceVariant, textTransform: 'uppercase' },
  lastCall: { fontSize: 12, color: theme.colors.onSurfaceVariant },
  staffText: { fontSize: 12, color: theme.colors.onSurfaceVariant, marginTop: 4, fontStyle: 'italic' },

  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalSheet: { width: '100%', backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 16 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  modalOptionText: { fontSize: 15, color: theme.colors.onSurface },
});
