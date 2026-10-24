import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { useAttendance } from '../hooks/useAttendance';
import { ATTENDANCE_STATUS_META, AttendanceSyncNote, AttendanceMessage } from '../components/AttendanceCard';
import { formatIstTime, formatDuration, formatYmd, istBusinessDate, leaveTypeLabel } from '../utils/attendance';

const DetailRow = ({ icon, label, value, muted }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <MaterialIcons name={icon} size={18} color={colors.onSurfaceVariant} />
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={[styles.detailValue, muted && styles.detailMuted]}>{value}</Text>
  </View>
);

export function AttendanceScreen({ navigation }) {
  const { loading, processing, message, view, record, workedSeconds, today, locationEnabled, refresh, checkIn, checkOut } = useAttendance();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const meta = view ? ATTENDANCE_STATUS_META[view.status] : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Go back">
          <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        <Text style={styles.dateText}>{formatYmd(today?.businessDate || istBusinessDate())}</Text>

        {loading || !view ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={[styles.card, elevation.level1]}>
            <View style={[styles.statusPill, { backgroundColor: meta.bg }]}>
              <MaterialIcons name={meta.icon} size={20} color={meta.color} />
              <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
            </View>

            {view.status === 'SETUP_PENDING' && (
              <Text style={styles.infoText}>
                Attendance is not enabled on the server yet. Your administrator needs to complete setup before you can check in.
              </Text>
            )}
            {view.status === 'ON_LEAVE' && (
              <Text style={styles.infoText}>
                You have approved {leaveTypeLabel(today.approvedLeaveToday.leave_type).toLowerCase()} today
                ({today.approvedLeaveToday.start_date} to {today.approvedLeaveToday.end_date}).
              </Text>
            )}
            {today?.pendingLeaveToday && !today?.approvedLeaveToday && (
              <Text style={styles.infoText}>A leave request covering today is pending approval. It is not yet approved.</Text>
            )}

            <DetailRow icon="login" label="Check-in" value={formatIstTime(record?.check_in_at) || 'Not recorded'} muted={!record?.check_in_at} />
            <DetailRow icon="logout" label="Check-out" value={formatIstTime(record?.check_out_at) || 'Not recorded'} muted={!record?.check_out_at} />
            <DetailRow
              icon="schedule"
              label={record?.check_out_at ? 'Total duration' : 'Working duration'}
              value={formatDuration(workedSeconds) || '—'}
              muted={workedSeconds === null}
            />

            <AttendanceSyncNote label="Check-in" sync={today?.checkInSync} />
            <AttendanceSyncNote label="Check-out" sync={today?.checkOutSync} />
            {today?.loadError && (
              <Text style={styles.warnText}>Could not reach the server: showing values saved on this device.</Text>
            )}
            {!today?.online && (
              <Text style={styles.warnText}>You are offline. Values shown are saved on this device.</Text>
            )}

            <AttendanceMessage message={message} />

            {locationEnabled && (view.canCheckIn || view.canCheckOut) && (
              <Text style={styles.noticeText}>
                Your location is recorded once when you check in and once when you check out. Authorized managers can see it.
              </Text>
            )}

            {(view.canCheckIn || view.canCheckOut) && (
              <TouchableOpacity
                style={[styles.primaryBtn, processing && styles.btnDisabled]}
                onPress={view.canCheckIn ? checkIn : checkOut}
                disabled={processing}
                accessibilityRole="button"
                accessibilityState={{ disabled: processing, busy: processing }}
              >
                {processing
                  ? <ActivityIndicator size="small" color={colors.onPrimary} />
                  : <Text style={styles.primaryBtnText}>{view.canCheckIn ? 'CHECK IN' : 'CHECK OUT'}</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={[styles.linkRow, elevation.level1]} onPress={() => navigation.navigate('AttendanceHistory')}>
          <View style={styles.detailLeft}>
            <MaterialIcons name="history" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Attendance History</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.outline} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.linkRow, elevation.level1]} onPress={() => navigation.navigate('LeaveRequests')}>
          <View style={styles.detailLeft}>
            <MaterialIcons name="event-note" size={22} color={colors.primary} />
            <Text style={styles.linkText}>Leave Requests</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color={colors.outline} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 4, backgroundColor: colors.surfaceContainerLowest, elevation: 2 },
  backBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { ...typography.headlineSm, fontWeight: 'bold', color: colors.onSurface },
  container: { padding: 16, paddingBottom: 48 },
  dateText: { ...typography.labelLg, color: colors.onSurfaceVariant, marginBottom: 12 },
  loadingBox: { padding: 40, alignItems: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: rounded.lg, padding: 16, marginBottom: 16 },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: rounded.full, marginBottom: 12 },
  statusText: { ...typography.headlineSm },
  infoText: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginBottom: 12 },
  warnText: { ...typography.bodySm, color: colors.status.pending.text, marginTop: 8 },
  noticeText: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceContainer },
  detailLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailLabel: { ...typography.bodyLg, color: colors.onSurfaceVariant },
  detailValue: { ...typography.labelLg, color: colors.onSurface },
  detailMuted: { color: colors.outline, fontWeight: '400' },
  primaryBtn: { marginTop: 16, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary, borderRadius: rounded.md, minHeight: 52, justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderRadius: rounded.md, paddingHorizontal: 16, minHeight: 56, marginBottom: 12 },
  linkText: { ...typography.labelLg, color: colors.onSurface },
});
