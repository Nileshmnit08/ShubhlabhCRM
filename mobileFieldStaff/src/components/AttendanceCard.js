import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { useAttendance } from '../hooks/useAttendance';
import { formatIstTime, formatDuration } from '../utils/attendance';

export const ATTENDANCE_STATUS_META = {
  NOT_CHECKED_IN: { label: 'Not Checked In', icon: 'schedule', color: colors.onSurfaceVariant, bg: colors.surfaceContainer },
  WORKING: { label: 'Working', icon: 'work', color: colors.primary, bg: colors.primaryContainer },
  CHECKED_OUT: { label: 'Checked Out', icon: 'task-alt', color: colors.secondary, bg: colors.secondaryContainer },
  ON_LEAVE: { label: 'On Leave', icon: 'beach-access', color: '#8a5a00', bg: colors.tertiaryContainer },
  SETUP_PENDING: { label: 'Attendance Unavailable', icon: 'cloud-off', color: colors.onSurfaceVariant, bg: colors.surfaceContainer },
};

const SYNC_TEXT = {
  PENDING: { text: 'Saved on this device · waiting to upload', color: colors.status.pending.text, icon: 'cloud-queue' },
  RETRYING: { text: 'Upload retrying', color: colors.status.pending.text, icon: 'sync-problem' },
  SYNCING: { text: 'Uploading…', color: colors.secondary, icon: 'cloud-upload' },
  FAILED: { text: 'Upload failed', color: colors.error, icon: 'error-outline' },
  UNCONFIRMED: { text: 'Not yet confirmed by server', color: colors.status.pending.text, icon: 'help-outline' },
};

/** Shows the real queue/server state of an attendance action. Hidden once SYNCED. */
export function AttendanceSyncNote({ label, sync }) {
  if (!sync || sync.state === 'SYNCED') return null;
  const meta = SYNC_TEXT[sync.state];
  if (!meta) return null;
  return (
    <View style={styles.syncRow} accessibilityLiveRegion="polite">
      <MaterialIcons name={meta.icon} size={14} color={meta.color} />
      <Text style={[styles.syncText, { color: meta.color }]} numberOfLines={2}>
        {label}: {meta.text}{sync.error ? ` — ${sync.error}` : ''}
      </Text>
    </View>
  );
}

export function AttendanceMessage({ message }) {
  if (!message) return null;
  const color = message.type === 'success' ? colors.primary : message.type === 'error' ? colors.error : colors.status.pending.text;
  const bg = message.type === 'success' ? colors.primaryContainer : message.type === 'error' ? colors.errorContainer : colors.tertiaryContainer;
  const icon = message.type === 'success' ? 'check-circle' : message.type === 'error' ? 'error' : 'info';
  return (
    <View style={[styles.messageBox, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <MaterialIcons name={icon} size={18} color={color} />
      <Text style={[styles.messageText, { color }]}>{message.text}</Text>
    </View>
  );
}

/** Home / Command Center attendance card. Distinct from FieldSessionCard. */
export function AttendanceCard() {
  const navigation = useNavigation();
  const { loading, processing, message, view, record, workedSeconds, today, checkIn, checkOut } = useAttendance();

  if (loading || !view) {
    return (
      <View style={[styles.card, elevation.level1, styles.center]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  const meta = ATTENDANCE_STATUS_META[view.status];
  const checkInTime = formatIstTime(record?.check_in_at);
  const checkOutTime = formatIstTime(record?.check_out_at);
  const duration = formatDuration(workedSeconds);

  return (
    <View style={[styles.card, elevation.level1]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => navigation.navigate('Attendance')}
        accessibilityRole="button"
        accessibilityLabel={`Attendance: ${meta.label}. Open attendance details`}
      >
        <View style={styles.titleRow}>
          <MaterialIcons name="event-available" size={20} color={colors.onSurfaceVariant} />
          <Text style={styles.title}>Attendance</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: meta.bg }]}>
          <MaterialIcons name={meta.icon} size={14} color={meta.color} />
          <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
        </View>
      </TouchableOpacity>

      {view.status === 'WORKING' && (
        <Text style={styles.detail}>Checked in {checkInTime} · Working {duration || '0m'}</Text>
      )}
      {view.status === 'CHECKED_OUT' && (
        <Text style={styles.detail}>{checkInTime} – {checkOutTime} · Total {duration || '—'}</Text>
      )}
      {view.status === 'ON_LEAVE' && (
        <Text style={styles.detail}>Approved leave today. No check-in required.</Text>
      )}
      {view.status === 'SETUP_PENDING' && (
        <Text style={styles.detail}>Attendance is not enabled on the server yet. Contact your administrator.</Text>
      )}
      {view.status === 'NOT_CHECKED_IN' && today?.pendingLeaveToday && (
        <Text style={styles.detail}>Leave request for today is pending approval.</Text>
      )}

      <AttendanceSyncNote label="Check-in" sync={today?.checkInSync} />
      <AttendanceSyncNote label="Check-out" sync={today?.checkOutSync} />
      <AttendanceMessage message={message} />

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
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: rounded.lg, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: colors.outlineVariant },
  center: { alignItems: 'center', justifyContent: 'center', minHeight: 64 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 32 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { ...typography.labelLg, color: colors.onSurface, fontWeight: 'bold' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: rounded.full },
  badgeText: { ...typography.labelSm },
  detail: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 8 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  syncText: { ...typography.bodySm, flex: 1 },
  messageBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: rounded.default, marginTop: 10 },
  messageText: { ...typography.bodySm, flex: 1 },
  primaryBtn: { marginTop: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.primary, borderRadius: rounded.md, minHeight: 48, justifyContent: 'center' },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { ...typography.labelLg, color: colors.onPrimary, fontWeight: 'bold' },
});
