import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/AttendanceService';
import { formatYmd, daysInclusive, leaveTypeLabel } from '../utils/attendance';

// Server statuses only. Local queue states are shown separately and never as Pending/Approved.
const STATUS_META = {
  Pending: { label: 'Pending', color: colors.status.pending.text, bg: colors.status.pending.bg, icon: 'hourglass-empty' },
  Approved: { label: 'Approved', color: colors.status.completed.text, bg: colors.status.completed.bg, icon: 'check-circle' },
  Rejected: { label: 'Rejected', color: colors.error, bg: colors.errorContainer, icon: 'cancel' },
};
const QUEUE_META = {
  FAILED: { label: 'Not submitted · failed', color: colors.error, bg: colors.errorContainer, icon: 'error-outline' },
  DEFAULT: { label: 'Not yet submitted', color: colors.onSurfaceVariant, bg: colors.surfaceContainer, icon: 'cloud-queue' },
};

export function LeaveRequestsScreen({ navigation }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [items, setItems] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error | unavailable
  const [errorText, setErrorText] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { ready, verifiedNow } = await AttendanceService.probeBackend(userId);
      if (!ready) {
        setState(verifiedNow ? 'unavailable' : 'error');
        setErrorText(verifiedNow ? null : 'You appear to be offline. Leave requests are loaded from the server.');
        return;
      }
      const queued = await AttendanceService.getQueuedLeaves(userId);
      const { leaves, error } = await AttendanceService.fetchLeaves(userId);
      if (error) {
        // Still show what is waiting locally, but make the server failure explicit.
        setItems(queued.map((q) => ({ ...q, _local: true })));
        setErrorText('Could not load leave status from the server.');
        setState(queued.length ? 'ready' : 'error');
        return;
      }
      const serverIds = new Set(leaves.map((l) => l.id));
      const localOnly = queued.filter((q) => !serverIds.has(q.id)).map((q) => ({ ...q, _local: true }));
      setItems([...localOnly, ...leaves]);
      setErrorText(null);
      setState('ready');
    } catch (e) {
      setErrorText('Could not load leave requests. Check your connection.');
      setState('error');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const meta = item._local
      ? (item._queue?.state === 'FAILED' ? QUEUE_META.FAILED : QUEUE_META.DEFAULT)
      : (STATUS_META[item.status] || { label: item.status, color: colors.onSurfaceVariant, bg: colors.surfaceContainer, icon: 'info' });
    const days = daysInclusive(item.start_date, item.end_date);
    return (
      <View style={[styles.card, elevation.level1]}>
        <View style={styles.cardTop}>
          <Text style={styles.type}>{leaveTypeLabel(item.leave_type)}</Text>
          <View style={[styles.badge, { backgroundColor: meta.bg }]}>
            <MaterialIcons name={meta.icon} size={14} color={meta.color} />
            <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
        </View>
        <Text style={styles.dates}>
          {item.start_date === item.end_date
            ? formatYmd(item.start_date)
            : `${formatYmd(item.start_date)} – ${formatYmd(item.end_date)}`}
          {days ? ` · ${days} day${days > 1 ? 's' : ''}` : ''}
        </Text>
        <Text style={styles.reason} numberOfLines={3}>{item.reason}</Text>
        {item._local && item._queue?.error && <Text style={styles.errorText}>{item._queue.error}</Text>}
        {!item._local && item.review_note ? <Text style={styles.reviewNote}>Note: {item.review_note}</Text> : null}
      </View>
    );
  };

  let body;
  if (state === 'loading') body = <LoadingState message="Loading leave requests..." />;
  else if (state === 'unavailable') body = <EmptyState title="Leave Unavailable" message="Leave applications are not enabled on the server yet." icon="cloud-off" />;
  else if (state === 'error') body = <ErrorState title="Could not load leave requests" message={errorText} onRetry={() => { setState('loading'); load(); }} />;
  else {
    body = (
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListHeaderComponent={errorText ? <Text style={styles.bannerError}>{errorText}</Text> : null}
        ListEmptyComponent={<EmptyState title="No Leave Requests" message="Requests you apply for will appear here." icon="event-note" />}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leave Requests</Text>
      </View>
      {body}
      {state !== 'unavailable' && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('LeaveApplication')}
          accessibilityRole="button"
          accessibilityLabel="Apply for leave"
        >
          <MaterialIcons name="add" size={22} color={colors.onPrimary} />
          <Text style={styles.fabText}>Apply for Leave</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, backgroundColor: colors.surfaceContainerLowest, elevation: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  list: { padding: 16, paddingBottom: 100 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: rounded.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  type: { ...typography.labelLg, color: colors.onSurface },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: rounded.full },
  badgeText: { ...typography.labelSm },
  dates: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: 6 },
  reason: { ...typography.bodyMd, color: colors.onSurface },
  errorText: { ...typography.bodySm, color: colors.error, marginTop: 6 },
  reviewNote: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 6, fontStyle: 'italic' },
  bannerError: { ...typography.bodySm, color: colors.error, marginBottom: 12 },
  fab: { position: 'absolute', bottom: 24, right: 16, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 18, height: 52, borderRadius: 26, elevation: 4 },
  fabText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
});
