/**
 * SL-CRM-ATTENDANCE-PORTAL-01: pure logic for the Attendance Register.
 *
 * Reads the records written by Field Assist (mobileFieldStaff AttendanceService):
 *   staff_attendance(id, staff_id, business_date, check_in_at, check_out_at, status)
 * Business timezone is Asia/Kolkata. India has no DST, so a fixed +05:30
 * offset is used (same rule as mobileFieldStaff/src/utils/attendance.js).
 *
 * No React / Supabase imports: unit-tested in __tests__/attendanceRegister.test.mjs.
 */

export const ATTENDANCE_COLUMNS = 'id, staff_id, business_date, check_in_at, check_out_at, status';
export const MAX_ROWS = 1000;

const IST_OFFSET_MS = 330 * 60 * 1000;
const pad = (n) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const toDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** 'YYYY-MM-DD' in Asia/Kolkata for the given instant. */
export function istDate(value = new Date()) {
  const d = toDate(value);
  if (!d) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** '09:05 AM' in Asia/Kolkata, or null. */
export function istTime(value) {
  const d = toDate(value);
  if (!d) return null;
  const ist = new Date(d.getTime() + IST_OFFSET_MS);
  const h = ist.getUTCHours();
  return `${pad(h % 12 || 12)}:${pad(ist.getUTCMinutes())} ${h >= 12 ? 'PM' : 'AM'}`;
}

/** '24 Oct 2026' for a 'YYYY-MM-DD' business date. */
export function formatBusinessDate(ymd) {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return '—';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${pad(d)} ${MONTHS[m - 1]} ${y}`;
}

export const isValidYmd = (ymd) =>
  typeof ymd === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ymd) && !Number.isNaN(new Date(`${ymd}T00:00:00Z`).getTime());

/** Whole seconds between two timestamps; null if missing, invalid or reversed. */
export function durationSeconds(start, end) {
  const s = toDate(start);
  const e = toDate(end);
  if (!s || !e) return null;
  const diff = Math.floor((e - s) / 1000);
  return diff >= 0 ? diff : null;
}

export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  const mins = Math.floor(seconds / 60);
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}h ${pad(mins % 60)}m` : `${mins % 60}m`;
}

/**
 * Display status derived from timestamps (not trusted from the status column alone):
 *  CHECKED_OUT → has check-in and check-out
 *  WORKING     → checked in today, no check-out yet
 *  INCOMPLETE  → past business date with no check-out, or no valid check-in
 */
export function deriveStatus(record, todayYmd) {
  if (!record || !toDate(record.check_in_at)) return 'INCOMPLETE';
  if (toDate(record.check_out_at)) return 'CHECKED_OUT';
  return record.business_date === todayYmd ? 'WORKING' : 'INCOMPLETE';
}

export const STATUS_META = {
  WORKING: { label: 'Working', badge: 'badge-info' },
  CHECKED_OUT: { label: 'Checked Out', badge: 'badge-success' },
  INCOMPLETE: { label: 'Incomplete', badge: 'badge-warning' },
};

export function employeeLabel(user, staffId) {
  if (user?.display_name) return user.display_name;
  if (user?.full_name) return user.full_name;
  if (user?.email) return user.email;
  return `Unknown employee (${String(staffId || '').slice(0, 8)})`;
}

/** Table rows with display values. `now` is used only for in-progress durations. */
export function buildRows(records, usersById, todayYmd, now = new Date()) {
  return (records || []).map((r) => {
    const status = deriveStatus(r, todayYmd);
    let durationLabel = '—';
    let durationNote = null;
    if (status === 'CHECKED_OUT') {
      const secs = durationSeconds(r.check_in_at, r.check_out_at);
      if (secs === null) durationNote = 'Invalid timestamps';
      else durationLabel = formatDuration(secs);
    } else if (status === 'WORKING') {
      const secs = durationSeconds(r.check_in_at, now);
      durationLabel = secs === null ? '—' : formatDuration(secs);
      durationNote = 'In progress';
    } else {
      durationNote = toDate(r.check_in_at) ? 'Check-out missing' : 'Check-in missing';
    }
    return {
      id: r.id,
      staffId: r.staff_id,
      employee: employeeLabel(usersById?.[r.staff_id], r.staff_id),
      businessDate: r.business_date,
      dateLabel: formatBusinessDate(r.business_date),
      checkInLabel: istTime(r.check_in_at) || '—',
      checkOutLabel: istTime(r.check_out_at) || '—',
      durationLabel,
      durationNote,
      status,
    };
  });
}

export function filterRows(rows, { status = 'ALL' } = {}) {
  return status === 'ALL' ? rows : rows.filter((r) => r.status === status);
}

/** Staff expected to record attendance in Field Assist: active, not Admin, not Buyer. */
export function isAttendanceStaff(user) {
  return !!user && user.is_active === true && user.role !== 'Admin' && user.role !== 'Buyer';
}

/**
 * Today's summary from actual records.
 *  present        → distinct staff with a valid check-in today
 *  openCheckIns   → today's records without a check-out
 *  noCheckIn      → attendance staff with no record today and no approved leave
 *                   (a missing record is NOT a confirmed absence)
 *  onLeave        → attendance staff with approved leave today (null if leave data unavailable)
 */
export function computeTodaySummary({ todayRecords, staff, approvedLeaveStaffIds, leaveAvailable }) {
  const withCheckIn = (todayRecords || []).filter((r) => toDate(r.check_in_at));
  const presentIds = new Set(withCheckIn.map((r) => r.staff_id));
  const expected = (staff || []).filter(isAttendanceStaff);
  const leaveIds = new Set(leaveAvailable ? approvedLeaveStaffIds || [] : []);
  const onLeave = leaveAvailable ? expected.filter((u) => leaveIds.has(u.id) && !presentIds.has(u.id)).length : null;
  const noCheckIn = expected.filter((u) => !presentIds.has(u.id) && !leaveIds.has(u.id)).length;
  return {
    present: presentIds.size,
    openCheckIns: withCheckIn.filter((r) => !toDate(r.check_out_at)).length,
    noCheckIn,
    onLeave,
    expectedStaff: expected.length,
  };
}

/** Maps Supabase/PostgREST errors to a register-specific state. */
export function classifyError(error) {
  if (!error) return null;
  const code = String(error.code || '');
  const msg = String(error.message || '');
  if (code === 'PGRST205' || code === '42P01' || /could not find the table/i.test(msg)) {
    return { kind: 'MISSING_TABLE', message: 'Attendance records are not available in the database yet.' };
  }
  if (code === '42501' || /permission denied/i.test(msg)) {
    return { kind: 'PERMISSION', message: 'Your account does not have permission to view attendance records.' };
  }
  if (code === '42703' || code === 'PGRST204' || /column .* does not exist/i.test(msg)) {
    return { kind: 'SCHEMA', message: 'The attendance table does not match the expected columns. Contact the administrator.' };
  }
  if (/failed to fetch|network/i.test(msg)) {
    return { kind: 'NETWORK', message: 'Could not reach the server. Check your connection and retry.' };
  }
  return { kind: 'OTHER', message: 'Could not load attendance records.' };
}
