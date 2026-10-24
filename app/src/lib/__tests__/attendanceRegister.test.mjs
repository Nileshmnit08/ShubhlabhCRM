/**
 * SL-CRM-ATTENDANCE-PORTAL-01 unit tests (imports the real module).
 * Run: node --test app/src/lib/__tests__/attendanceRegister.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  istDate, istTime, formatBusinessDate, durationSeconds, formatDuration,
  deriveStatus, buildRows, filterRows, computeTodaySummary, classifyError,
  isAttendanceStaff, employeeLabel, isValidYmd,
} from '../attendanceRegister.js';

const TODAY = '2026-10-24';

test('IST business date and time, not UTC', () => {
  assert.equal(istDate('2026-10-23T18:29:59Z'), '2026-10-23');
  assert.equal(istDate('2026-10-23T18:30:00Z'), '2026-10-24');
  assert.equal(istTime('2026-10-24T03:35:00Z'), '09:05 AM');
  assert.equal(istTime(null), null);
  assert.equal(formatBusinessDate('2026-10-24'), '24 Oct 2026');
  assert.equal(formatBusinessDate(null), '—');
  assert.equal(isValidYmd('2026-10-24'), true);
  assert.equal(isValidYmd('24-10-2026'), false);
});

test('duration uses absolute timestamps; reversed or missing is null', () => {
  assert.equal(formatDuration(durationSeconds('2026-10-24T03:30:00Z', '2026-10-24T12:00:00Z')), '8h 30m');
  // Overnight shift crossing the IST date boundary is still measured correctly.
  assert.equal(formatDuration(durationSeconds('2026-10-24T14:00:00Z', '2026-10-24T20:00:00Z')), '6h 00m');
  assert.equal(durationSeconds('2026-10-24T12:00:00Z', '2026-10-24T03:00:00Z'), null);
  assert.equal(durationSeconds(null, '2026-10-24T03:00:00Z'), null);
});

test('status derives from timestamps and business date', () => {
  assert.equal(deriveStatus({ business_date: TODAY, check_in_at: '2026-10-24T03:30:00Z', check_out_at: null }, TODAY), 'WORKING');
  assert.equal(deriveStatus({ business_date: '2026-10-23', check_in_at: '2026-10-23T03:30:00Z', check_out_at: null }, TODAY), 'INCOMPLETE');
  assert.equal(deriveStatus({ business_date: TODAY, check_in_at: '2026-10-24T03:30:00Z', check_out_at: '2026-10-24T12:00:00Z' }, TODAY), 'CHECKED_OUT');
  assert.equal(deriveStatus({ business_date: TODAY, check_in_at: null, check_out_at: null }, TODAY), 'INCOMPLETE');
});

test('rows handle missing check-out and resolve names safely', () => {
  const users = { u1: { display_name: 'Pradeep' } };
  const rows = buildRows([
    { id: 'a', staff_id: 'u1', business_date: TODAY, check_in_at: '2026-10-24T03:30:00Z', check_out_at: null },
    { id: 'b', staff_id: 'u2', business_date: '2026-10-23', check_in_at: '2026-10-23T03:30:00Z', check_out_at: null },
    { id: 'c', staff_id: 'u1', business_date: '2026-10-22', check_in_at: '2026-10-22T03:30:00Z', check_out_at: '2026-10-22T12:00:00Z' },
  ], users, TODAY, new Date('2026-10-24T05:00:00Z'));

  assert.equal(rows[0].status, 'WORKING');
  assert.equal(rows[0].durationLabel, '1h 30m');
  assert.equal(rows[0].durationNote, 'In progress');
  assert.equal(rows[0].checkOutLabel, '—');

  assert.equal(rows[1].status, 'INCOMPLETE');
  assert.equal(rows[1].durationLabel, '—');
  assert.equal(rows[1].durationNote, 'Check-out missing');
  assert.match(rows[1].employee, /^Unknown employee/);

  assert.equal(rows[2].durationLabel, '8h 30m');
  assert.equal(rows[2].employee, 'Pradeep');

  assert.deepEqual(filterRows(rows, { status: 'INCOMPLETE' }).map((r) => r.id), ['b']);
  assert.equal(filterRows(rows, { status: 'ALL' }).length, 3);
});

test('employee label falls back without exposing more than an id prefix', () => {
  assert.equal(employeeLabel({ display_name: 'A' }, 'x'), 'A');
  assert.equal(employeeLabel({ email: 'a@b.c' }, 'x'), 'a@b.c');
  assert.equal(employeeLabel(undefined, '12345678-aaaa'), 'Unknown employee (12345678)');
});

test('today summary: real records only; missing record is not a confirmed absence', () => {
  const staff = [
    { id: 's1', role: 'Staff', is_active: true },
    { id: 's2', role: 'Staff', is_active: true },
    { id: 's3', role: 'Staff', is_active: true },
    { id: 's4', role: 'Operator', is_active: false },   // inactive: not expected
    { id: 'a1', role: 'Admin', is_active: true },        // admins don't use Field Assist
    { id: 'b1', role: 'Buyer', is_active: true },        // customers excluded
  ];
  const todayRecords = [
    { staff_id: 's1', check_in_at: '2026-10-24T03:30:00Z', check_out_at: null },
    { staff_id: 's2', check_in_at: '2026-10-24T03:40:00Z', check_out_at: '2026-10-24T12:00:00Z' },
  ];
  const withLeave = computeTodaySummary({ todayRecords, staff, approvedLeaveStaffIds: ['s3'], leaveAvailable: true });
  assert.deepEqual(withLeave, { present: 2, openCheckIns: 1, noCheckIn: 0, onLeave: 1, expectedStaff: 3 });

  const noLeaveData = computeTodaySummary({ todayRecords, staff, approvedLeaveStaffIds: ['s3'], leaveAvailable: false });
  assert.equal(noLeaveData.noCheckIn, 1);
  assert.equal(noLeaveData.onLeave, null);

  // Checked in while on approved leave counts as present, not on leave.
  const both = computeTodaySummary({ todayRecords, staff, approvedLeaveStaffIds: ['s1'], leaveAvailable: true });
  assert.equal(both.onLeave, 0);
  assert.equal(both.present, 2);

  assert.equal(isAttendanceStaff({ role: 'Staff', is_active: true }), true);
  assert.equal(isAttendanceStaff({ role: 'Buyer', is_active: true }), false);
});

test('error classification never claims success and maps RLS/schema problems', () => {
  assert.equal(classifyError(null), null);
  assert.equal(classifyError({ code: 'PGRST205', message: "Could not find the table 'public.staff_attendance'" }).kind, 'MISSING_TABLE');
  assert.equal(classifyError({ code: '42501', message: 'permission denied for table staff_attendance' }).kind, 'PERMISSION');
  assert.equal(classifyError({ code: '42703', message: 'column staff_attendance.check_out_at does not exist' }).kind, 'SCHEMA');
  assert.equal(classifyError({ message: 'TypeError: Failed to fetch' }).kind, 'NETWORK');
  assert.equal(classifyError({ code: 'XX000', message: 'boom' }).kind, 'OTHER');
});
