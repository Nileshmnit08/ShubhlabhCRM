import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SESSIONS_TABLE,
  RPC_CHECK_IN,
  RPC_CHECK_OUT,
  MAX_SESSIONS_PER_DAY,
  SESSION_READ_COLUMNS,
  locationParams,
  openSession,
  buildSessionCheckIn,
  buildSessionCheckOut,
  mergeSessions,
  summarizeSessions,
  deriveSessionView,
  isSessionCheckOutBlocked,
  sessionErrorMessage,
} from '../src/utils/attendanceSessions.js';
import { historyEntryView } from '../src/utils/attendance.js';

const T = (hhmm) => `2026-10-26T${hhmm}:00.000Z`; // 26 Oct IST working day (UTC times)
const captured = { status: 'CAPTURED', latitude: 26.9, longitude: 75.8, accuracy_m: 12, captured_at: T('04:00') };

test('check-in → check-out → check-in → check-out builds two independent sessions', () => {
  const s1 = buildSessionCheckIn({ sessionId: 'a', sessions: [], now: T('04:00'), location: captured });
  assert.equal(s1.rpc, RPC_CHECK_IN);
  assert.equal(s1.params.p_session_id, 'a');
  assert.equal(s1.session.business_date, '2026-10-26');

  const o1 = buildSessionCheckOut({ opId: 'op1', session: s1.session, now: T('06:00') });
  assert.equal(o1.rpc, RPC_CHECK_OUT);
  assert.equal(o1.params.p_session_id, 'a');
  const closed1 = { ...s1.session, check_out_at: o1.params.p_check_out_at };

  const s2 = buildSessionCheckIn({ sessionId: 'b', sessions: [closed1], now: T('06:30') });
  const o2 = buildSessionCheckOut({ opId: 'op2', session: s2.session, now: T('09:00') });
  const day = [closed1, { ...s2.session, check_out_at: o2.params.p_check_out_at }];

  const sum = summarizeSessions(day, T('12:00'));
  assert.equal(sum.count, 2);
  assert.equal(sum.workedSeconds, 2 * 3600 + 2.5 * 3600); // break excluded
  assert.equal(sum.firstCheckIn, T('04:00'));
  assert.equal(sum.lastCheckOut, T('09:00'));
  assert.equal(day[0].check_out_at, T('06:00'), 'first check-out preserved');
});

test('re-check-in is rejected while a session is open, before the last check-out, or past the daily limit', () => {
  const open = [{ id: 'a', check_in_at: T('04:00'), check_out_at: null }];
  assert.throws(() => buildSessionCheckIn({ sessionId: 'b', sessions: open, now: T('05:00') }), /already checked in/);
  const closed = [{ id: 'a', check_in_at: T('04:00'), check_out_at: '2026-10-26T06:00:00+00:00' }]; // server format
  assert.throws(() => buildSessionCheckIn({ sessionId: 'b', sessions: closed, now: T('05:59') }), /before your last check-out/);
  assert.doesNotThrow(() => buildSessionCheckIn({ sessionId: 'b', sessions: closed, now: T('06:00') }));
  const full = Array.from({ length: MAX_SESSIONS_PER_DAY }, (_, i) => ({ id: `s${i}`, check_in_at: T('01:00'), check_out_at: T('02:00') }));
  assert.throws(() => buildSessionCheckIn({ sessionId: 'x', sessions: full, now: T('05:00') }), /at most/);
});

test('check-out validates its session', () => {
  assert.throws(() => buildSessionCheckOut({ opId: 'o', session: null }), /not checked in/);
  assert.throws(() => buildSessionCheckOut({ opId: 'o', session: { id: 'a', check_in_at: T('04:00'), check_out_at: T('05:00') } }), /already checked out/);
  assert.throws(() => buildSessionCheckOut({ opId: 'o', session: { id: 'a', check_in_at: T('04:00') }, now: T('04:00') }), /after check-in/);
});

test('location parameters: coordinates only for captured fixes; failures keep their status', () => {
  assert.deepEqual(locationParams(captured), {
    p_latitude: 26.9, p_longitude: 75.8, p_accuracy_m: 12, p_location_at: T('04:00'), p_location_status: 'CAPTURED',
  });
  const denied = { status: 'PERMISSION_DENIED', latitude: 1, longitude: 2, accuracy_m: 5, captured_at: T('04:00') };
  const p = locationParams(denied);
  assert.equal(p.p_latitude, null);
  assert.equal(p.p_longitude, null);
  assert.equal(p.p_location_status, 'PERMISSION_DENIED');
  assert.equal(locationParams({ status: 'SERVICES_DISABLED', captured_at: T('04:00') }).p_location_status, 'SERVICES_DISABLED');
  assert.equal(locationParams(null).p_location_status, null, 'no capture: attendance still allowed');
});

test('employee session reads never request coordinates', () => {
  assert.equal(/latitude|longitude/.test(SESSION_READ_COLUMNS), false);
});

test('merge: server authoritative, local pending actions overlaid, sorted by check-in instant', () => {
  const server = [{ id: 'a', check_in_at: '2026-10-26T04:00:00+00:00', check_out_at: null }];
  const local = [
    { id: 'a', check_in_at: T('04:00'), check_out_at: T('06:00'), checkOutOpId: 'op1' },
    { id: 'b', check_in_at: T('06:30'), check_out_at: null },
  ];
  const merged = mergeSessions(server, local);
  assert.deepEqual(merged.map((s) => s.id), ['a', 'b']);
  assert.equal(merged[0]._onServer, true);
  assert.equal(merged[0]._checkOutLocal, true);
  assert.equal(merged[0].check_out_at, T('06:00'));
  assert.equal(merged[1]._onServer, false);
  assert.equal(openSession(merged).id, 'b');

  // Server check-out wins over a local one (first check-out on the server is kept).
  const serverClosed = [{ id: 'a', check_in_at: T('04:00'), check_out_at: T('05:00') }];
  assert.equal(mergeSessions(serverClosed, local.slice(0, 1))[0].check_out_at, T('05:00'));
});

test('session view allows checking in again after checking out', () => {
  const closed = [{ id: 'a', check_in_at: T('04:00'), check_out_at: T('06:00') }];
  assert.deepEqual(deriveSessionView({ backendReady: true, sessions: closed }), { status: 'CHECKED_OUT', canCheckIn: true, canCheckOut: false, isRecheckIn: true });
  assert.equal(deriveSessionView({ backendReady: true, sessions: [{ ...closed[0], check_out_at: null }] }).status, 'WORKING');
  assert.equal(deriveSessionView({ backendReady: true, sessions: [] }).status, 'NOT_CHECKED_IN');
  assert.equal(deriveSessionView({ backendReady: true, sessions: [], approvedLeaveToday: {} }).status, 'ON_LEAVE');
  assert.equal(deriveSessionView({ backendReady: true, sessions: closed, approvedLeaveToday: {} }).canCheckIn, false);
  assert.equal(deriveSessionView({ backendReady: false, sessions: closed }).status, 'SETUP_PENDING');
});

test('a check-out op waits in the queue until its check-in has synced', () => {
  const checkIn = { table: SESSIONS_TABLE, local_id: 'a', payload: { id: 'a', rpc: RPC_CHECK_IN, params: { p_session_id: 'a' } } };
  const checkOut = { table: SESSIONS_TABLE, local_id: 'op1', payload: { id: 'op1', rpc: RPC_CHECK_OUT, params: { p_session_id: 'a' } } };
  const otherCheckOut = { ...checkOut, local_id: 'op2', payload: { ...checkOut.payload, id: 'op2', params: { p_session_id: 'z' } } };
  assert.equal(isSessionCheckOutBlocked(checkOut, [checkIn, checkOut]), true);
  assert.equal(isSessionCheckOutBlocked(checkOut, [checkOut]), false);
  assert.equal(isSessionCheckOutBlocked(otherCheckOut, [checkIn, otherCheckOut]), false);
  assert.equal(isSessionCheckOutBlocked(checkIn, [checkIn, checkOut]), false);
  assert.equal(isSessionCheckOutBlocked({ table: 'staff_attendance', payload: {} }, [checkIn]), false);
});

test('server rule errors map to employee messages', () => {
  assert.match(sessionErrorMessage('OPEN_SESSION_EXISTS: check out first'), /already checked in/);
  assert.match(sessionErrorMessage('SESSION_OVERLAP: x'), /device clock/);
  assert.match(sessionErrorMessage('SESSION_LIMIT: x'), /at most/);
  assert.equal(sessionErrorMessage('Network down'), 'Network down');
});

test('history uses worked time and session count when the summary has them', () => {
  const row = {
    id: 'r', business_date: '2026-10-26', check_in_at: T('04:00'), check_out_at: T('09:00'),
    session_count: 2, worked_seconds: 4.5 * 3600,
  };
  const v = historyEntryView(row, '2026-10-27');
  assert.equal(v.durationLabel, '4h 30m');
  assert.equal(v.sessionsLabel, '2 sessions');
  const legacy = historyEntryView({ id: 'l', business_date: '2026-10-25', check_in_at: T('04:00'), check_out_at: T('09:00') }, '2026-10-27');
  assert.equal(legacy.durationLabel, '5h 00m');
  assert.equal(legacy.sessionsLabel, null);
});
