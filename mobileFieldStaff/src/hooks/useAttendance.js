import { useState, useRef, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { AttendanceService } from '../services/AttendanceService';
import { deriveAttendanceView, durationSeconds } from '../utils/attendance';

const TICK_MS = 30000;

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
  // Synchronous guard: state updates are async, so a fast double tap could pass a state check.
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await AttendanceService.loadToday(userId);
      setToday(data);
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

  const checkIn = () => runAction((uid) => AttendanceService.checkIn(uid), {
    synced: 'Checked in. Saved to server.',
    pending: 'Check-in saved on this device. It will upload when the connection allows.',
    failed: 'Check-in could not be saved to the server.',
  });

  const checkOut = () => runAction((uid) => AttendanceService.checkOut(uid), {
    synced: 'Checked out. Saved to server.',
    pending: 'Check-out saved on this device. It will upload when the connection allows.',
    failed: 'Check-out could not be saved to the server.',
  });

  const view = today
    ? deriveAttendanceView({
        backendReady: today.backendReady,
        record: today.record,
        approvedLeaveToday: today.approvedLeaveToday,
      })
    : null;

  const record = today?.record || null;
  const workedSeconds = record?.check_in_at
    ? durationSeconds(record.check_in_at, record.check_out_at || new Date(now).toISOString())
    : null;

  return {
    loading,
    processing,
    message,
    clearMessage: () => setMessage(null),
    today,
    view,
    record,
    workedSeconds,
    refresh,
    checkIn,
    checkOut,
  };
}
