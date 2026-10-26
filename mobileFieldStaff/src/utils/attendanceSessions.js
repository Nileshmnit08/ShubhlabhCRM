/**
 * FA-ATTENDANCE-MULTISESSION-01: pure logic for multiple attendance sessions per day.
 *
 * Active only when the server has staff_attendance_sessions (proposal 245). Until
 * then AttendanceService keeps the single-row path from utils/attendance.js.
 *
 * No React Native / Supabase imports — imported directly by
 * __tests__/attendanceSessions.test.mjs.
 */

import { durationSeconds, istBusinessDate } from './attendance.js';
import { hasCoordinates } from './attendanceLocation.js';

export const SESSIONS_TABLE = 'staff_attendance_sessions';
export const RPC_CHECK_IN = 'fa_attendance_check_in';
export const RPC_CHECK_OUT = 'fa_attendance_check_out';
// Mirrors the server's SESSION_LIMIT in 245.
export const MAX_SESSIONS_PER_DAY = 10;

// Employees never read coordinates (245 column grants). Explicit, non-sensitive columns only.
export const SESSION_READ_COLUMNS =
  'id, attendance_id, staff_id, business_date, session_no, check_in_at, check_out_at, status, '
  + 'check_in_server_received_at, check_out_server_received_at';
// Summary columns added by 245; requested only when the sessions table exists.
export const SUMMARY_EXTRA_COLUMNS = ', session_count, worked_seconds';

/** RPC location parameters for one capture result (null fields when nothing was captured). */
export function locationParams(location) {
  if (!location) {
    return { p_latitude: null, p_longitude: null, p_accuracy_m: null, p_location_at: null, p_location_status: null };
  }
  const coords = hasCoordinates(location);
  return {
    p_latitude: coords ? location.latitude : null,
    p_longitude: coords ? location.longitude : null,
    p_accuracy_m: coords ? location.accuracy_m : null,
    p_location_at: location.captured_at || null,
    p_location_status: location.status || null,
  };
}

// Server timestamps ('+00:00') and device ones ('Z') differ as strings; compare instants.
const timeMs = (value) => (value ? new Date(value).getTime() || 0 : -Infinity);

const toIso = (now) => {
  const d = now instanceof Date ? now : new Date(now);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid device time.');
  return d.toISOString();
};

/** The single open session (no check-out), or null. */
export const openSession = (sessions) => (sessions || []).find((s) => s && s.check_in_at && !s.check_out_at) || null;

/**
 * Queue payload for a check-in. The session id is the idempotency key: it is
 * created once per tap and reused by every retry of this operation.
 */
export function buildSessionCheckIn({ sessionId, sessions = [], now = new Date(), location = null }) {
  if (!sessionId) throw new Error('Check-in requires a session id.');
  if (openSession(sessions)) throw new Error('You are already checked in.');
  if (sessions.length >= MAX_SESSIONS_PER_DAY) {
    throw new Error(`You can check in at most ${MAX_SESSIONS_PER_DAY} times a day.`);
  }
  const nowIso = toIso(now);
  const lastOut = sessions.reduce((max, s) => (s.check_out_at && timeMs(s.check_out_at) > timeMs(max) ? s.check_out_at : max), null);
  if (lastOut && durationSeconds(lastOut, nowIso) === null) {
    throw new Error('Check-in time cannot be before your last check-out. Please check the device clock.');
  }
  return {
    id: sessionId,
    rpc: RPC_CHECK_IN,
    params: { p_session_id: sessionId, p_check_in_at: nowIso, ...locationParams(location) },
    session: { id: sessionId, business_date: istBusinessDate(nowIso), check_in_at: nowIso, check_out_at: null },
  };
}

/** Queue payload for a check-out of one specific session. `opId` is a fresh operation key. */
export function buildSessionCheckOut({ opId, session, now = new Date(), location = null }) {
  if (!opId) throw new Error('Check-out requires an operation id.');
  if (!session || !session.check_in_at) throw new Error('You have not checked in.');
  if (session.check_out_at) throw new Error('You have already checked out of this session.');
  const nowIso = toIso(now);
  if (!durationSeconds(session.check_in_at, nowIso)) {
    throw new Error('Check-out time must be after check-in time. Please check the device clock.');
  }
  return {
    id: opId,
    rpc: RPC_CHECK_OUT,
    params: { p_session_id: session.id, p_check_out_at: nowIso, ...locationParams(location) },
  };
}

/**
 * Today's sessions: server rows are authoritative for what the server has;
 * local sessions not yet on the server, and local check-outs not yet on the
 * server, are overlaid so the employee sees their actions. Sorted by check-in.
 */
export function mergeSessions(serverSessions, localSessions) {
  const byId = new Map();
  (serverSessions || []).forEach((s) => byId.set(s.id, { ...s, _onServer: true }));
  (localSessions || []).forEach((l) => {
    const s = byId.get(l.id);
    if (!s) {
      byId.set(l.id, { ...l, _onServer: false });
    } else if (!s.check_out_at && l.check_out_at) {
      byId.set(l.id, { ...s, check_out_at: l.check_out_at, checkOutOpId: l.checkOutOpId, _checkOutLocal: true });
    } else if (l.checkOutOpId) {
      byId.set(l.id, { ...s, checkOutOpId: l.checkOutOpId });
    }
  });
  return [...byId.values()].sort((a, b) => timeMs(a.check_in_at) - timeMs(b.check_in_at));
}

/** Day totals. The open session counts up to `nowIso`; breaks between sessions are excluded. */
export function summarizeSessions(sessions, nowIso = new Date().toISOString()) {
  const list = sessions || [];
  let worked = 0;
  list.forEach((s) => { worked += durationSeconds(s.check_in_at, s.check_out_at || nowIso) || 0; });
  const open = openSession(list);
  const closed = list.filter((s) => s.check_out_at).sort((a, b) => timeMs(a.check_out_at) - timeMs(b.check_out_at));
  return {
    count: list.length,
    workedSeconds: list.length ? worked : null,
    firstCheckIn: list.length ? list[0].check_in_at : null,
    lastCheckOut: open || !closed.length ? null : closed[closed.length - 1].check_out_at,
    open,
  };
}

/**
 * Status for Home / Attendance in session mode. Same statuses as
 * deriveAttendanceView, but CHECKED_OUT allows checking in again.
 */
export function deriveSessionView({ backendReady, sessions, approvedLeaveToday }) {
  const list = sessions || [];
  if (!backendReady) return { status: 'SETUP_PENDING', canCheckIn: false, canCheckOut: false, isRecheckIn: false };
  if (openSession(list)) return { status: 'WORKING', canCheckIn: false, canCheckOut: true, isRecheckIn: false };
  if (approvedLeaveToday) {
    return { status: list.length ? 'CHECKED_OUT' : 'ON_LEAVE', canCheckIn: false, canCheckOut: false, isRecheckIn: false };
  }
  if (list.length) {
    const canCheckIn = list.length < MAX_SESSIONS_PER_DAY;
    return { status: 'CHECKED_OUT', canCheckIn, canCheckOut: false, isRecheckIn: canCheckIn };
  }
  return { status: 'NOT_CHECKED_IN', canCheckIn: true, canCheckOut: false, isRecheckIn: false };
}

const paramsOf = (op) => (op && op.payload && op.payload.params) || {};

/**
 * True when `op` is a session check-out whose check-in is still in the queue.
 * The queue retries failed ops later in the same run, so without this a
 * check-out could reach the server before its check-in (SESSION_NOT_FOUND).
 */
export function isSessionCheckOutBlocked(op, queue) {
  if (!op || op.table !== SESSIONS_TABLE || op.payload?.rpc !== RPC_CHECK_OUT) return false;
  const sessionId = paramsOf(op).p_session_id;
  return (queue || []).some((q) => q !== op
    && q.table === SESSIONS_TABLE
    && q.payload?.rpc === RPC_CHECK_IN
    && paramsOf(q).p_session_id === sessionId);
}

/** Employee-facing text for server rule errors raised by the 245 RPCs. */
export function sessionErrorMessage(raw) {
  const msg = String(raw || '');
  if (msg.includes('OPEN_SESSION_EXISTS')) return 'You are already checked in on the server. Pull down to refresh.';
  if (msg.includes('SESSION_OVERLAP')) return 'Check-in time is earlier than your last check-out. Check the device clock.';
  if (msg.includes('SESSION_LIMIT')) return `You can check in at most ${MAX_SESSIONS_PER_DAY} times a day.`;
  if (msg.includes('SESSION_NOT_FOUND')) return 'The matching check-in has not reached the server yet.';
  if (msg.includes('Approved leave')) return 'You have approved leave today.';
  return msg || null;
}
