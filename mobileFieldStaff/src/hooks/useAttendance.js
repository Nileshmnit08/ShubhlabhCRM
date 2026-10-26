import { useState, useRef, useCallback, useEffect } from 'react';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/AttendanceService';
import { captureAttendanceLocation } from '../services/AttendanceLocationService';
import { deriveAttendanceView, durationSeconds } from '../utils/attendance';
import { LOCATION_STATUS, locationProblemMessage } from '../utils/attendanceLocation';
import { deriveSessionView, summarizeSessions } from '../utils/attendanceSessions';

const TICK_MS = 30000;
const getNoticeKey = (userId) => `@attendance_location_notice_${userId}`;

const ask = (title, message, buttons) => new Promise((resolve) => {
  Alert.alert(
    title,
    message,
    buttons.map((b) => ({ text: b.text, style: b.style, onPress: () => resolve(b.value) })),
    { cancelable: true, onDismiss: () => resolve('CANCEL') }
  );
});

/** One-time staff notice before the first location capture. */
async function ensureLocationNoticeAccepted(userId) {
  if ((await AsyncStorage.getItem(getNoticeKey(userId))) === 'accepted') return true;
  const choice = await ask(
    'Attendance location',
    'When you check in or check out, the app records your location once at that moment. '
      + 'Authorized managers can see it in the CRM. Your location is not tracked between check-in and check-out.',
    [
      { text: 'Cancel', style: 'cancel', value: 'CANCEL' },
      { text: 'I understand', value: 'OK' },
    ]
  );
  if (choice !== 'OK') return false;
  await AsyncStorage.setItem(getNoticeKey(userId), 'accepted');
  return true;
}

/**
 * Captures one location for an attendance event, or returns { location: null }
 * when the live schema has no location columns (nothing is captured then).
 * Attendance is never blocked by GPS: "Continue" records an explicit failure status.
 */
async function resolveAttendanceLocation(userId) {
  const { ready } = await AttendanceService.probeLocationSupport(userId);
  if (!ready) return { location: null };
  if (!(await ensureLocationNoticeAccepted(userId))) return { cancelled: true };

  for (;;) {
    const result = await captureAttendanceLocation();
    if (result.status === LOCATION_STATUS.CAPTURED) return { location: result };

    const needsSettings = result.status === LOCATION_STATUS.PERMISSION_BLOCKED || result.status === LOCATION_STATUS.SERVICES_DISABLED;
    const choice = await ask('Location not recorded precisely', locationProblemMessage(result), [
      needsSettings ? { text: 'Open Settings', value: 'SETTINGS' } : { text: 'Retry', value: 'RETRY' },
      { text: 'Continue without location', value: 'CONTINUE' },
      { text: 'Cancel', style: 'cancel', value: 'CANCEL' },
    ]);
    if (choice === 'RETRY') continue;
    if (choice === 'CONTINUE') return { location: result };
    if (choice === 'SETTINGS') Linking.openSettings().catch(() => {});
    return { cancelled: true };
  }
}

/**
 * FA-ATTENDANCE-01: shared attendance state for Home and Attendance screens.
 * Reloads on focus so values reflect the server after navigation/restart.
 */
export function useAttendance() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [today, setToday] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'info' | 'error', text }
  const [now, setNow] = useState(Date.now());
  const [locationEnabled, setLocationEnabled] = useState(false);
  // Synchronous guard: state updates are async, so a fast double tap could pass a state check.
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const [data, loc] = await Promise.all([
        AttendanceService.loadToday(userId),
        AttendanceService.probeLocationSupport(userId).catch(() => ({ ready: false })),
      ]);
      setToday(data);
      setLocationEnabled(!!loc.ready);
    } catch (e) {
      setMessage({ type: 'error', text: 'Could not load attendance. Pull down to retry.' });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const runAction = async (action, labels) => {
    if (busyRef.current || !userId) return;
    busyRef.current = true;
    setProcessing(true);
    setMessage(null);
    try {
      const result = await action(userId);
      if (result.state === 'CANCELLED') return; // employee cancelled at the location step; nothing saved
      if (result.state === 'SYNCED') setMessage({ type: 'success', text: labels.synced });
      else if (result.state === 'FAILED') setMessage({ type: 'error', text: `${labels.failed} ${result.error || ''}`.trim() });
      else setMessage({ type: 'info', text: labels.pending });
    } catch (e) {
      setMessage({ type: 'error', text: e?.message || labels.failed });
    } finally {
      await refresh();
      busyRef.current = false;
      setProcessing(false);
    }
  };

  const withLocation = (save) => async (uid) => {
    const { location, cancelled } = await resolveAttendanceLocation(uid);
    if (cancelled) return { state: 'CANCELLED' };
    return save(uid, { location });
  };

  const checkIn = () => runAction(withLocation((uid, opts) => AttendanceService.checkIn(uid, opts)), {
    synced: today?.sessionMode && today.sessions?.length ? 'Checked in again. Saved to server.' : 'Checked in. Saved to server.',
    pending: 'Check-in saved on this device. It will upload when the connection allows.',
    failed: 'Check-in could not be saved to the server.',
  });

  const checkOut = () => runAction(withLocation((uid, opts) => AttendanceService.checkOut(uid, opts)), {
    synced: 'Checked out. Saved to server.',
    pending: 'Check-out saved on this device. It will upload when the connection allows.',
    failed: 'Check-out could not be saved to the server.',
  });

  const sessionMode = !!today?.sessionMode;
  let view = null;
  if (today) {
    view = sessionMode
      ? deriveSessionView({ backendReady: today.backendReady, sessions: today.sessions, approvedLeaveToday: today.approvedLeaveToday })
      : deriveAttendanceView({ backendReady: today.backendReady, record: today.record, approvedLeaveToday: today.approvedLeaveToday });
  }

  const record = today?.record || null;
  const nowIso = new Date(now).toISOString();
  let workedSeconds = null;
  if (sessionMode) workedSeconds = summarizeSessions(today.sessions, nowIso).workedSeconds;
  else if (record?.check_in_at) workedSeconds = durationSeconds(record.check_in_at, record.check_out_at || nowIso);

  return {
    loading,
    processing,
    message,
    clearMessage: () => setMessage(null),
    today,
    view,
    record,
    workedSeconds,
    sessions: sessionMode ? today.sessions : [],
    currentSession: sessionMode ? today.currentSession : null,
    locationEnabled,
    refresh,
    checkIn,
    checkOut,
  };
}
