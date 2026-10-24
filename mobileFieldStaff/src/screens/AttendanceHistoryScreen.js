import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { LoadingState, EmptyState, ErrorState } from '../components';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/AttendanceService';
import { historyEntryView, istBusinessDate } from '../utils/attendance';

export function AttendanceHistoryScreen({ navigation }) {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [rows, setRows] = useState([]);
  const [state, setState] = useState('loading'); // loading | ready | error | unavailable
  const [errorText, setErrorText] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const { ready, verifiedNow } = await AttendanceService.probeBackend(userId);
      if (!ready) {
        setState(verifiedNow ? 'unavailable' : 'error');
        setErrorText(verifiedNow ? null : 'You appear to be offline. History is loaded from the server.');
        return;
      }
      const { rows: data, error } = await AttendanceService.fetchHistory(userId);
      if (error) {
        setErrorText('Could not load attendance history from the server.');
        setState('error');
        return;
      }
      setRows(data);
      setState('ready');
    } catch (e) {
      setErrorText('Could not load attendance history. Check your connection.');
      setState('error');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setState((s) => (s === 'ready' ? s : 'loading'));
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const todayYmd = istBusinessDate();

  const renderItem = ({ item }) => {
    const v = historyEntryView(item, todayYmd);
    return (
      <View style={[styles.card, elevation.level1]}>
        <View style={styles.cardTop}>
          <Text style={styles.date}>{v.dateLabel}</Text>
          <Text style={[styles.status, v.incomplete && { color: colors.error }]}>{v.status}</Text>
        </View>
        <View style={styles.timesRow}>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Check-in</Text>
            <Text style={styles.timeValue}>{v.checkInLabel}</Text>
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Check-out</Text>
            <Text style={styles.timeValue}>{v.checkOutLabel}</Text>
          </View>
          <View style={styles.timeCol}>
            <Text style={styles.timeLabel}>Duration</Text>
            <Text style={styles.timeValue}>{v.durationLabel}</Text>
          </View>
        </View>
        {v.note && (
          <View style={styles.noteRow}>
            <MaterialIcons name="error-outline" size={14} color={colors.error} />
            <Text style={styles.noteText}>{v.note}</Text>
          </View>
        )}
      </View>
    );
  };

  let body;
  if (state === 'loading') body = <LoadingState message="Loading attendance history..." />;
  else if (state === 'unavailable') body = <EmptyState title="Attendance Unavailable" message="Attendance is not enabled on the server yet." icon="cloud-off" />;
  else if (state === 'error') body = <ErrorState title="Could not load history" message={errorText} onRetry={() => { setState('loading'); load(); }} />;
  else {
    body = (
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={rows.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        ListEmptyComponent={<EmptyState title="No Attendance Yet" message="Your check-ins will appear here once saved to the server." icon="event-available" />}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance History</Text>
      </View>
      {body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, backgroundColor: colors.surfaceContainerLowest, elevation: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  list: { padding: 16, paddingBottom: 48 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: colors.surface, borderRadius: rounded.lg, padding: 16, marginBottom: 12 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  date: { ...typography.labelLg, color: colors.onSurface },
  status: { ...typography.labelMd, color: colors.primary },
  timesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  timeCol: { flex: 1 },
  timeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: 2 },
  timeValue: { ...typography.bodyMd, color: colors.onSurface },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10 },
  noteText: { ...typography.bodySm, color: colors.error },
});
