import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, TextInput,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar, Clock, AlertCircle, CheckCircle2,
  Search, PlusCircle, Building2, RefreshCw,
} from 'lucide-react-native';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TODAY_STR = new Date().toISOString().split('T')[0];

function getStatusBadge(status) {
  switch (status) {
    case 'Completed': return 'success';
    case 'Postponed': return 'info';
    case 'Cancelled': return 'error';
    default: return 'warning';
  }
}

function getPriorityColor(priority) {
  switch (priority) {
    case 'High': return theme.colors.warning;
    case 'Low': return theme.colors.onSurfaceVariant;
    default: return theme.colors.secondary;
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

// ─── Tab definitions ──────────────────────────────────────────────────────────
const TABS = [
  { id: 'today', label: 'Today' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Done' },
];

// ─── Follow-up Card ───────────────────────────────────────────────────────────
function FollowUpCard({ item, onPress }) {
  const isOverdue = item.follow_up_date < TODAY_STR && item.status === 'Pending';
  const daysLabel = getDaysLabel(item.follow_up_date);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(item)} activeOpacity={0.8}>
      {/* Priority accent */}
      <View style={[styles.priorityAccent, { backgroundColor: getPriorityColor(item.priority) }]} />

      <View style={styles.cardContent}>
        {/* Top row: WHO + Status */}
        <View style={styles.cardTopRow}>
          <View style={styles.customerRow}>
            <Building2 size={14} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.customerName} numberOfLines={1}>{item.display_name || item.crm_parties?.display_name || '—'}</Text>
          </View>
          <Badge label={item.status} status={getStatusBadge(item.status)} />
        </View>

        {/* WHAT: reason */}
        <Text style={styles.reasonText} numberOfLines={2}>
          {item.reason || item.follow_up_reason || 'Follow-up'}
        </Text>

        {/* Bottom row: WHEN + type */}
        <View style={styles.cardBottomRow}>
          <View style={styles.metaItem}>
            <Calendar size={13} color={isOverdue ? theme.colors.error : theme.colors.onSurfaceVariant} />
            <Text style={[styles.metaText, isOverdue && styles.metaTextOverdue]}>
              {formatDate(item.follow_up_date)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Clock size={13} color={theme.colors.onSurfaceVariant} />
            <Text style={styles.metaText}>{daysLabel}</Text>
          </View>
          <View style={[styles.typePill, { marginLeft: 'auto' }]}>
            <Text style={styles.typePillText}>{item.follow_up_type || 'General'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function FollowUpListScreen({ navigation }) {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState('today');
  const [allFollowUps, setAllFollowUps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFollowUps = useCallback(async () => {
    if (!userProfile) return;
    try {
      // Fetch all relevant follow-ups for this user's territory
      const { data, error } = await supabase
        .from('follow_ups')
        .select(`
          *,
          crm_parties(display_name, mobile)
        `)
        .or(`assigned_to.eq.${userProfile.id},created_by.eq.${userProfile.id}`)
        .order('follow_up_date', { ascending: true });

      if (error) {
        console.error('[FollowUpList] fetch error:', error.message);
        return;
      }
      setAllFollowUps(data || []);
    } catch (err) {
      console.error('[FollowUpList] unexpected:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchFollowUps();
    const unsubscribe = navigation.addListener('focus', fetchFollowUps);
    return unsubscribe;
  }, [fetchFollowUps, navigation]);

  const onRefresh = () => { setRefreshing(true); fetchFollowUps(); };

  // ─── Filter by tab ──────────────────────────────────────────────────────────
  const filtered = allFollowUps.filter((f) => {
    const name = (f.crm_parties?.display_name || '').toLowerCase();
    const reason = (f.reason || f.follow_up_reason || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || name.includes(q) || reason.includes(q);

    let matchesTab = false;
    switch (activeTab) {
      case 'today':
        matchesTab = f.follow_up_date === TODAY_STR && f.status === 'Pending';
        break;
      case 'upcoming':
        matchesTab = f.follow_up_date > TODAY_STR && f.status === 'Pending';
        break;
      case 'overdue':
        matchesTab = f.follow_up_date < TODAY_STR && f.status === 'Pending';
        break;
      case 'completed':
        matchesTab = f.status === 'Completed';
        break;
    }
    return matchesSearch && matchesTab;
  });

  // Tab counts (unfiltered by search)
  const counts = {
    today: allFollowUps.filter(f => f.follow_up_date === TODAY_STR && f.status === 'Pending').length,
    upcoming: allFollowUps.filter(f => f.follow_up_date > TODAY_STR && f.status === 'Pending').length,
    overdue: allFollowUps.filter(f => f.follow_up_date < TODAY_STR && f.status === 'Pending').length,
    completed: allFollowUps.filter(f => f.status === 'Completed').length,
  };

  const emptyMessages = {
    today: { title: 'All clear for today!', sub: 'No follow-ups due today.' },
    upcoming: { title: 'Pipeline looks clear', sub: 'No upcoming follow-ups scheduled.' },
    overdue: { title: 'Nothing overdue!', sub: 'All follow-ups are on track.' },
    completed: { title: 'No completions yet', sub: 'Completed follow-ups will appear here.' },
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Follow-ups"
        showBack={false}
        rightElement={
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => navigation.navigate('AddFollowUp', { partyId: null, partyName: null })}
          >
            <PlusCircle size={22} color={theme.colors.secondary} />
          </TouchableOpacity>
        }
      />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={18} color={theme.colors.onSurfaceVariant} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by customer or reason..."
            placeholderTextColor={theme.colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const count = counts[tab.id];
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                  <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyContainer}>
          {activeTab === 'overdue'
            ? <CheckCircle2 size={48} color={theme.colors.success} />
            : <Calendar size={48} color={theme.colors.outlineVariant} />
          }
          <Text style={styles.emptyTitle}>{emptyMessages[activeTab].title}</Text>
          <Text style={styles.emptySubtext}>{emptyMessages[activeTab].sub}</Text>
          {activeTab !== 'completed' && (
            <TouchableOpacity
              style={styles.addFollowUpBtn}
              onPress={() => navigation.navigate('AddFollowUp', { partyId: null, partyName: null })}
            >
              <PlusCircle size={18} color={theme.colors.onSecondary} />
              <Text style={styles.addFollowUpBtnText}>Schedule Follow-up</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <FollowUpCard
              item={item}
              onPress={(fu) => navigation.navigate('FollowUpDetail', { followUpId: fu.id })}
            />
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  searchContainer: { backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing['screen-edge'], paddingVertical: theme.spacing.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surfaceContainerLowest, height: 44, borderRadius: theme.borders.radius.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: '#CBD5E1', gap: 8 },
  searchInput: { flex: 1, height: 44, fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface },

  tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLowest, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: theme.spacing['screen-edge'] },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 4, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: theme.colors.secondary },
  tabText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, fontWeight: '500', color: theme.colors.onSurfaceVariant },
  tabTextActive: { color: theme.colors.secondary, fontWeight: '700' },
  tabBadge: { backgroundColor: theme.colors.surfaceContainerHighest, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1, minWidth: 18, alignItems: 'center' },
  tabBadgeActive: { backgroundColor: theme.colors.secondary },
  tabBadgeText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '700' },
  tabBadgeTextActive: { color: theme.colors.onSecondary },

  listContent: { padding: theme.spacing['screen-edge'], paddingBottom: 80 },

  card: { flexDirection: 'row', backgroundColor: theme.colors.surfaceContainerLowest, borderRadius: theme.borders.radius.lg, marginBottom: theme.spacing.md, ...theme.shadows.sm, overflow: 'hidden' },
  priorityAccent: { width: 4, borderTopLeftRadius: theme.borders.radius.lg, borderBottomLeftRadius: theme.borders.radius.lg },
  cardContent: { flex: 1, padding: theme.spacing.lg },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1, marginRight: 8 },
  customerName: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '600', color: theme.colors.onSurface, flex: 1 },
  reasonText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurface, lineHeight: 20, marginBottom: 10 },
  cardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant },
  metaTextOverdue: { color: theme.colors.error, fontWeight: '600' },
  typePill: { backgroundColor: theme.colors.surfaceContainerHighest, paddingHorizontal: 8, paddingVertical: 2, borderRadius: theme.borders.radius.full },
  typePillText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelSm, color: theme.colors.onSurfaceVariant, fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.xl },
  emptyTitle: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleMd, fontWeight: '700', color: theme.colors.onSurface, marginTop: theme.spacing.lg },
  emptySubtext: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant, marginTop: 4, textAlign: 'center', marginBottom: theme.spacing.xl },
  addFollowUpBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.secondary, height: 48, paddingHorizontal: theme.spacing.xl, borderRadius: theme.borders.radius.full },
  addFollowUpBtnText: { fontFamily: theme.typography.fontFamily.body, color: theme.colors.onSecondary, fontWeight: '600', fontSize: theme.typography.sizes.labelLg },
});
