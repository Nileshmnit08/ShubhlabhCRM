import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import ScreenHeader from '../components/ScreenHeader';
import Badge from '../components/Badge';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Phone, MessageCircle, Users, FileText, AlertCircle,
  CheckCircle2, Clock, ChevronRight,
} from 'lucide-react-native';

// ─── Channel → Icon mapping ────────────────────────────────────────────────────
function ChannelIcon({ channel, size = 18 }) {
  const color = channelColor(channel);
  switch ((channel || '').toLowerCase()) {
    case 'call':      return <Phone size={size} color={color} />;
    case 'whatsapp':  return <MessageCircle size={size} color={color} />;
    case 'meeting':   return <Users size={size} color={color} />;
    case 'note':      return <FileText size={size} color={color} />;
    default:          return <FileText size={size} color={color} />;
  }
}

function channelColor(channel) {
  switch ((channel || '').toLowerCase()) {
    case 'call':      return theme.colors.primary;
    case 'whatsapp':  return '#25D366';
    case 'meeting':   return theme.colors.secondary;
    case 'note':      return theme.colors.onSurfaceVariant;
    default:          return theme.colors.onSurfaceVariant;
  }
}

function outcomeBadgeStatus(outcome) {
  if (!outcome) return 'default';
  const lower = outcome.toLowerCase();
  if (['contacted', 'interested', 'response received', 'completed'].some(v => lower.includes(v))) return 'success';
  if (['no answer', 'number busy', 'no response', 'no show'].some(v => lower.includes(v))) return 'warning';
  if (['wrong number', 'not interested', 'competitor'].some(v => lower.includes(v))) return 'error';
  if (['requirement', 'order'].some(v => lower.includes(v))) return 'info';
  return 'default';
}

// ─── Filter Chips ──────────────────────────────────────────────────────────────
const FILTERS = [
  { id: 'all',      label: 'All' },
  { id: 'call',     label: 'Calls' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'meeting',  label: 'Meetings' },
  { id: 'note',     label: 'Notes' },
];

function FilterChips({ active, onSelect, counts }) {
  return (
    <View style={filterStyles.row}>
      {FILTERS.map(f => {
        const isActive = f.id === active;
        const count = counts[f.id] || 0;
        return (
          <TouchableOpacity
            key={f.id}
            style={[filterStyles.chip, isActive && filterStyles.chipActive]}
            onPress={() => onSelect(f.id)}
            activeOpacity={0.75}
          >
            <Text style={[filterStyles.chipText, isActive && filterStyles.chipTextActive]}>
              {f.label}{f.id !== 'all' && count > 0 ? ` (${count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: theme.spacing['screen-edge'],
    gap: 8, marginBottom: theme.spacing.md,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.borders.radius.full,
    backgroundColor: theme.colors.surfaceContainer,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelMd,
    color: theme.colors.onSurfaceVariant, fontWeight: '600',
  },
  chipTextActive: { color: theme.colors.onPrimary },
});

// ─── Activity Card ─────────────────────────────────────────────────────────────
function ActivityCard({ item }) {
  const channel = item.channel || item.interaction_type || 'Note';
  const timeStr = item.created_at
    ? new Date(item.created_at).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })
    : '—';

  return (
    <View style={cardStyles.card}>
      <View style={[cardStyles.iconBox, { backgroundColor: channelColor(channel) + '18' }]}>
        <ChannelIcon channel={channel} size={20} />
      </View>
      <View style={cardStyles.body}>
        <View style={cardStyles.topRow}>
          <Text style={cardStyles.channel}>{channel}</Text>
          {item.outcome ? (
            <Badge label={item.outcome} status={outcomeBadgeStatus(item.outcome)} />
          ) : null}
        </View>
        {item.note ? (
          <Text style={cardStyles.note} numberOfLines={2}>{item.note}</Text>
        ) : null}
        <View style={cardStyles.metaRow}>
          <Clock size={12} color={theme.colors.onSurfaceVariant} />
          <Text style={cardStyles.time}>{timeStr}</Text>
        </View>
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: theme.colors.surfaceContainerLowest,
    borderRadius: theme.borders.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center',
    marginRight: theme.spacing.md, flexShrink: 0,
  },
  body: { flex: 1 },
  topRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  channel: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.titleSm,
    fontWeight: '700', color: theme.colors.onSurface,
  },
  note: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    lineHeight: 20, marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  time: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.labelSm,
    color: theme.colors.onSurfaceVariant,
  },
});

// ─── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ filter }) {
  return (
    <View style={emptyStyles.container}>
      <CheckCircle2 size={48} color={theme.colors.outlineVariant} />
      <Text style={emptyStyles.title}>No Activity Recorded</Text>
      <Text style={emptyStyles.subtitle}>
        {filter === 'all'
          ? 'No activity has been recorded for this customer yet.'
          : `No ${filter} activity recorded yet.`}
      </Text>
    </View>
  );
}

const emptyStyles = StyleSheet.create({
  container: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  title: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd, fontWeight: '700',
    color: theme.colors.onSurface, marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22,
  },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function ActivityListScreen({ route, navigation }) {
  const { partyId, partyName } = route.params;
  const insets = useSafeAreaInsets();

  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const fetchInteractions = useCallback(async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('interactions')
        .select('id, channel, interaction_type, outcome, note, direction, created_at')
        .eq('party_id', partyId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (fetchErr) {
        if (fetchErr.code === '42501') {
          setError('You do not have permission to view this customer\'s activity.');
        } else {
          setError('Failed to load activity. Pull down to refresh.');
        }
        console.error('[ActivityList]', fetchErr.code, fetchErr.message);
        return;
      }

      setInteractions(data || []);
      setError(null);
    } catch (err) {
      console.error('[ActivityList] unexpected error:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partyId]);

  useEffect(() => { fetchInteractions(); }, [fetchInteractions]);

  const onRefresh = () => { setRefreshing(true); fetchInteractions(); };

  // Derived: filtered list + counts per channel
  const counts = {
    all: interactions.length,
    call: interactions.filter(i => (i.channel || i.interaction_type || '').toLowerCase() === 'call').length,
    whatsapp: interactions.filter(i => (i.channel || i.interaction_type || '').toLowerCase() === 'whatsapp').length,
    meeting: interactions.filter(i => (i.channel || i.interaction_type || '').toLowerCase() === 'meeting').length,
    note: interactions.filter(i => (i.channel || i.interaction_type || '').toLowerCase() === 'note').length,
  };

  const filtered = activeFilter === 'all'
    ? interactions
    : interactions.filter(i =>
        (i.channel || i.interaction_type || '').toLowerCase() === activeFilter
      );

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Activity" showBack subtitle={partyName} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </View>
    );
  }

  // ─── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Activity" showBack subtitle={partyName} />
        <View style={styles.center}>
          <AlertCircle size={48} color={theme.colors.error} />
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchInteractions}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={`Activity (${interactions.length})`}
        showBack
        subtitle={partyName}
      />

      <FilterChips
        active={activeFilter}
        onSelect={setActiveFilter}
        counts={counts}
      />

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => <ActivityCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.secondary}
          />
        }
        ListEmptyComponent={<EmptyState filter={activeFilter} />}
      />

      {/* Sticky Log Action dock */}
      <View style={[styles.dock, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.dockBtn}
          onPress={() => navigation.navigate('AddActivity', { partyId, partyName })}
          activeOpacity={0.85}
        >
          <Text style={styles.dockBtnText}>+ Log New Activity</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.xl },

  list: {
    paddingHorizontal: theme.spacing['screen-edge'],
    paddingTop: theme.spacing.sm,
    paddingBottom: 100,
  },

  errorTitle: {
    fontFamily: theme.typography.fontFamily.display,
    fontSize: theme.typography.sizes.titleMd, fontWeight: '700',
    color: theme.colors.onSurface, marginTop: theme.spacing.md,
  },
  errorText: {
    fontFamily: theme.typography.fontFamily.body,
    fontSize: theme.typography.sizes.bodyMd,
    color: theme.colors.onSurfaceVariant,
    textAlign: 'center', marginTop: theme.spacing.sm,
  },
  retryBtn: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borders.radius.md,
    paddingHorizontal: theme.spacing.xl, paddingVertical: 12,
  },
  retryBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary, fontWeight: '600',
  },

  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(248,249,255,0.97)',
    borderTopWidth: 1, borderTopColor: theme.colors.border,
    paddingTop: 12, paddingHorizontal: theme.spacing['screen-edge'],
  },
  dockBtn: {
    height: 48, backgroundColor: theme.colors.secondary,
    borderRadius: theme.borders.radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  dockBtnText: {
    fontFamily: theme.typography.fontFamily.body,
    color: theme.colors.onSecondary,
    fontSize: theme.typography.sizes.labelLg, fontWeight: '600',
  },
});
