/**
 * FA-ATTENDANCE-01 unit tests.
 * Imports the real production module (no re-implemented logic).
 * Run: node --test mobileFieldStaff/__tests__/attendance.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  istBusinessDate,
  formatIstTime,
  formatYmd,
  addDaysYmd,
  daysInclusive,
  durationSeconds,
  formatDuration,
  buildCheckInPayload,
  buildCheckOutPayload,
  buildLeavePayload,
  mergeAttendanceRecord,
  deriveAttendanceView,
  deriveSyncState,
  findQueueItem,
  findLeaveForDate,
  validateLeaveInput,
  isMissingTableError,
  interpretBackendProbe,
  historyEntryView,
  ATTENDANCE_TABLE,
} from '../src/utils/attendance.js';

const STAFF = '11111111-1111-4111-8111-111111111111';

test('business date uses Asia/Kolkata, not UTC or device date', () => {
  assert.equal(istBusinessDate('2026-10-23T18:29:59Z'), '2026-10-23');
  assert.equal(istBusinessDate('2026-10-23T18:30:00Z'), '2026-10-24'); // 00:00 IST
  assert.equal(istBusinessDate('2026-10-24T00:15:00Z'), '2026-10-24'); // 05:45 IST, UTC date also 24th
  assert.equal(istBusinessDate('not a date'), null);
});

test('times display in IST 12-hour format; missing timestamps return null', () => {
  assert.equal(formatIstTime('2026-10-24T03:35:00Z'), '09:05 AM');
  assert.equal(formatIstTime('2026-10-24T12:45:00Z'), '06:15 PM');
  assert.equal(formatIstTime('2026-10-23T18:30:00Z'), '12:00 AM');
  assert.equal(formatIstTime(null), null);
  assert.equal(formatIstTime(''), null);
});

test('date helpers', () => {
  assert.equal(formatYmd('2026-10-24'), 'Sat, 24 Oct 2026');
  assert.equal(formatYmd('2026-02-30'), 'Unknown date');
  assert.equal(addDaysYmd('2026-12-31', 1), '2027-01-01');
  assert.equal(daysInclusive('2026-10-24', '2026-10-24'), 1);
  assert.equal(daysInclusive('2026-10-24', '2026-10-26'), 3);
  assert.equal(daysInclusive('2026-10-26', '2026-10-24'), null);
});

test('working duration is calculated from real timestamps', () => {
  const s = durationSeconds('2026-10-24T03:30:00Z', '2026-10-24T10:35:00Z');
  assert.equal(s, 7 * 3600 + 5 * 60);
  assert.equal(formatDuration(s), '7h 05m');
  assert.equal(formatDuration(45 * 60 + 59), '45m');
  assert.equal(formatDuration(0), '0m');
  assert.equal(durationSeconds('2026-10-24T10:00:00Z', '2026-10-24T09:00:00Z'), null, 'reversed is invalid');
  assert.equal(durationSeconds(null, '2026-10-24T09:00:00Z'), null);
  assert.equal(formatDuration(null), null);
});

test('check-in payload: trusted staff id, IST business date, CHECKED_IN', () => {
  const p = buildCheckInPayload({ id: 'op-1', staffId: STAFF, now: new Date('2026-10-23T19:00:00Z') });
  assert.deepEqual(p, {
    id: 'op-1',
    staff_id: STAFF,
    business_date: '2026-10-24',
    check_in_at: '2026-10-23T19:00:00.000Z',
    status: 'CHECKED_IN',
  });
  assert.throws(() => buildCheckInPayload({ id: 'op-1', staffId: null }), /staff id/);
});

test('check-out payload completes the row and rejects invalid/duplicate check-out', () => {
  const record = { business_date: '2026-10-24', check_in_at: '2026-10-24T03:30:00.000Z', check_out_at: null };
  const p = buildCheckOutPayload({ id: 'op-2', staffId: STAFF, record, now: new Date('2026-10-24T12:00:00Z') });
  assert.equal(p.check_in_at, record.check_in_at, 'carries check-in so upsert is order-independent');
  assert.equal(p.business_date, '2026-10-24');
  assert.equal(p.check_out_at, '2026-10-24T12:00:00.000Z');
  assert.equal(p.status, 'CHECKED_OUT');

  assert.throws(() => buildCheckOutPayload({ id: 'x', staffId: STAFF, record: null }), /not checked in/);
  assert.throws(
    () => buildCheckOutPayload({ id: 'x', staffId: STAFF, record: { ...record, check_out_at: '2026-10-24T11:00:00Z' } }),
    /already checked out/
  );
  assert.throws(
    () => buildCheckOutPayload({ id: 'x', staffId: STAFF, record, now: new Date('2026-10-24T03:00:00Z') }),
    /before check-in/
  );
});

test('attendance view states and allowed actions', () => {
  const checkedIn = { check_in_at: '2026-10-24T03:30:00Z', check_out_at: null };
  const checkedOut = { ...checkedIn, check_out_at: '2026-10-24T12:00:00Z' };

  assert.deepEqual(deriveAttendanceView({ backendReady: true, record: null }), { status: 'NOT_CHECKED_IN', canCheckIn: true, canCheckOut: false });
  assert.deepEqual(deriveAttendanceView({ backendReady: true, record: checkedIn }), { status: 'WORKING', canCheckIn: false, canCheckOut: true });
  assert.deepEqual(deriveAttendanceView({ backendReady: true, record: checkedOut }), { status: 'CHECKED_OUT', canCheckIn: false, canCheckOut: false });
  assert.deepEqual(
    deriveAttendanceView({ backendReady: true, record: null, approvedLeaveToday: { status: 'Approved' } }),
    { status: 'ON_LEAVE', canCheckIn: false, canCheckOut: false }
  );
  assert.deepEqual(deriveAttendanceView({ backendReady: false, record: null }), { status: 'SETUP_PENDING', canCheckIn: false, canCheckOut: false });
});

test('pending leave is never treated as approved', () => {
  const leaves = [{ status: 'Pending', start_date: '2026-10-24', end_date: '2026-10-25' }];
  assert.equal(findLeaveForDate(leaves, '2026-10-24', 'Approved'), null);
  assert.ok(findLeaveForDate(leaves, '2026-10-24', 'Pending'));
  const view = deriveAttendanceView({ backendReady: true, record: null, approvedLeaveToday: findLeaveForDate(leaves, '2026-10-24', 'Approved') });
  assert.equal(view.status, 'NOT_CHECKED_IN');
  assert.equal(findLeaveForDate([{ status: 'Approved', start_date: '2026-10-20', end_date: '2026-10-23' }], '2026-10-24', 'Approved'), null);
});

test('sync state reflects actual queue state; synced only on server confirmation', () => {
  assert.deepEqual(deriveSyncState({ queueItem: { status: 'PENDING', attempts: 0 }, serverConfirmed: false }), { state: 'PENDING', error: null });
  assert.equal(deriveSyncState({ queueItem: { status: 'PENDING', attempts: 2, last_error: 'timeout' }, serverConfirmed: false }).state, 'RETRYING');
  assert.equal(deriveSyncState({ queueItem: { status: 'SYNCING' }, serverConfirmed: false }).state, 'SYNCING');
  assert.deepEqual(deriveSyncState({ queueItem: { status: 'FAILED', last_error: 'RLS' }, serverConfirmed: false }), { state: 'FAILED', error: 'RLS' });
  // Local-only (removed from queue but not seen on the server) must NOT be reported as synced.
  assert.equal(deriveSyncState({ queueItem: null, serverConfirmed: false }).state, 'UNCONFIRMED');
  assert.equal(deriveSyncState({ queueItem: null, serverConfirmed: true }).state, 'SYNCED');
});

test('queue lookup matches table and local id', () => {
  const queue = [
    { table: 'staff_location_history', local_id: 'a', status: 'PENDING' },
    { table: ATTENDANCE_TABLE, local_id: 'a', status: 'FAILED' },
  ];
  assert.equal(findQueueItem(queue, ATTENDANCE_TABLE, 'a').status, 'FAILED');
  assert.equal(findQueueItem(queue, ATTENDANCE_TABLE, 'b'), null);
});

test('server record is authoritative; pending local check-out is overlaid', () => {
  const server = { id: 's1', check_in_at: '2026-10-24T03:30:00Z', check_out_at: null, status: 'CHECKED_IN' };
  const local = { id: 'l1', check_in_at: '2026-10-24T03:31:00Z', check_out_at: '2026-10-24T12:00:00Z' };
  const merged = mergeAttendanceRecord(server, local);
  assert.equal(merged.id, 's1');
  assert.equal(merged.check_in_at, server.check_in_at, 'first (server) check-in wins');
  assert.equal(merged.check_out_at, local.check_out_at);
  assert.equal(merged.status, 'CHECKED_OUT');

  const serverOut = { ...server, check_out_at: '2026-10-24T11:00:00Z' };
  assert.equal(mergeAttendanceRecord(serverOut, local).check_out_at, '2026-10-24T11:00:00Z', 'first (server) check-out wins');
  assert.equal(mergeAttendanceRecord(null, null), null);
});

test('leave validation: single and multi-day, ordering, span, reason, overlap', () => {
  const base = { leaveType: 'CASUAL', startDate: '2026-10-27', endDate: '2026-10-27', reason: 'Family function' };
  assert.equal(validateLeaveInput(base).valid, true);
  assert.equal(validateLeaveInput({ ...base, endDate: '2026-10-29' }).valid, true);
  assert.ok(validateLeaveInput({ ...base, endDate: '2026-10-26' }).errors.endDate);
  assert.equal(validateLeaveInput({ ...base, endDate: '2026-11-26' }).valid, true, '30-day difference allowed');
  assert.ok(validateLeaveInput({ ...base, endDate: '2026-11-27' }).errors.endDate, '31-day difference rejected');
  assert.ok(validateLeaveInput({ ...base, reason: ' ab ' }).errors.reason);
  assert.ok(validateLeaveInput({ ...base, leaveType: 'PAID' }).errors.leaveType);
  assert.ok(validateLeaveInput({ ...base, startDate: '2026-13-01' }).errors.startDate);

  const existing = [
    { status: 'Pending', start_date: '2026-10-26', end_date: '2026-10-27' },
    { status: 'Rejected', start_date: '2026-11-02', end_date: '2026-11-02' },
  ];
  assert.ok(validateLeaveInput(base, existing).errors.startDate, 'overlapping pending is blocked');
  assert.equal(validateLeaveInput({ ...base, startDate: '2026-11-02', endDate: '2026-11-02' }, existing).valid, true, 'rejected does not block');
});

test('leave payload trims reason and never carries status or reviewer fields', () => {
  const p = buildLeavePayload({ id: 'L1', staffId: STAFF, leaveType: 'SICK', startDate: '2026-10-27', endDate: '2026-10-28', reason: '  Fever  ' });
  assert.deepEqual(Object.keys(p).sort(), ['end_date', 'id', 'leave_type', 'reason', 'staff_id', 'start_date']);
  assert.equal(p.reason, 'Fever');
  assert.throws(() => buildLeavePayload({ id: 'L1', staffId: '' }), /staff id/);
});

test('missing-table detection gates the feature before migration is applied', () => {
  assert.equal(isMissingTableError({ code: 'PGRST205', message: "Could not find the table 'public.staff_attendance'" }), true);
  assert.equal(isMissingTableError({ code: '42P01', message: 'relation "staff_attendance" does not exist' }), true);
  assert.equal(isMissingTableError({ code: '42501', message: 'permission denied' }), false);
  assert.equal(isMissingTableError(null), false);
});

test('backend probe: HEAD-style 204 without data is NOT treated as ready (FA-ATTENDANCE-02)', () => {
  // Observed on the live project 2026-10-24 for the missing staff_attendance table:
  //   HEAD → { status: 204, error: null, data: null }   GET → { status: 404, error.code: 'PGRST205' }
  assert.equal(interpretBackendProbe({ status: 204, error: null, data: null }), 'UNKNOWN');
  assert.equal(interpretBackendProbe({ status: 404, error: { code: 'PGRST205', message: "Could not find the table 'public.staff_attendance' in the schema cache" }, data: null }), 'MISSING');
  assert.equal(interpretBackendProbe({ status: 200, error: null, data: [] }), 'READY');
  assert.equal(interpretBackendProbe({ status: 0, error: { message: 'Network request failed' }, data: null }), 'UNKNOWN');
});

test('history rows flag missing or incomplete timestamps', () => {
  const today = '2026-10-24';
  const complete = historyEntryView({ id: '1', business_date: '2026-10-22', check_in_at: '2026-10-22T03:30:00Z', check_out_at: '2026-10-22T12:00:00Z' }, today);
  assert.equal(complete.status, 'Checked Out');
  assert.equal(complete.durationLabel, '8h 30m');
  assert.equal(complete.incomplete, false);

  const missingOut = historyEntryView({ id: '2', business_date: '2026-10-23', check_in_at: '2026-10-23T03:30:00Z', check_out_at: null }, today);
  assert.equal(missingOut.status, 'Incomplete');
  assert.equal(missingOut.note, 'Check-out missing');
  assert.equal(missingOut.checkOutLabel, '—');
  assert.equal(missingOut.durationLabel, '—');

  const working = historyEntryView({ id: '3', business_date: today, check_in_at: '2026-10-24T03:30:00Z', check_out_at: null }, today);
  assert.equal(working.status, 'Working');
  assert.equal(working.incomplete, false);
});

// FA-ATTENDANCE-LOCATION-01 approved one-shot capture at check-in/out (service, hook,
// utils). Rendering files must still never display coordinates, accuracy, maps or GPS calls.
test('staff-facing attendance screens never display coordinates, maps or GPS data', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const files = [
    '../src/components/AttendanceCard.js',
    '../src/screens/AttendanceScreen.js',
    '../src/screens/AttendanceHistoryScreen.js',
    '../src/screens/LeaveRequestsScreen.js',
    '../src/screens/LeaveApplicationScreen.js',
  ];
  const forbidden = /expo-location|react-native-maps|MapView|latitude|longitude|coords|getCurrentPosition|accuracy|BackgroundLocationService|gps/i;
  for (const f of files) {
    const src = readFileSync(path.join(here, f), 'utf8');
    assert.equal(forbidden.test(src), false, `${f} must not reference location capture or display`);
  }
});
