/**
 * FA-ATTENDANCE-01: Pure attendance & leave logic.
 *
 * No React Native / Supabase imports — this module is imported directly by the
 * Node unit tests in __tests__/attendance.test.mjs.
 *
 * Business timezone is Asia/Kolkata. India has no DST, so a fixed +05:30
 * offset is used instead of Intl time-zone support (not reliable on Hermes).
 */

export const IST_OFFSET_MS = 330 * 60 * 1000;

export const ATTENDANCE_TABLE = 'staff_attendance';
export const LEAVE_TABLE = 'staff_leave_requests';
export const ATTENDANCE_CONFLICT_TARGET = 'staff_id,business_date';

// Mirrors CHECK staff_leave_type_check in supabase/proposals/242_sprint_FA_ATTENDANCE_01.sql
export const LEAVE_TYPES = [
  { code: 'CASUAL', label: 'Casual Leave' },
  { code: 'SICK', label: 'Sick Leave' },
  { code: 'OTHER', label: 'Other' },
];
export const LEAVE_MAX_SPAN_DAYS = 30; // end_date - start_date <= 30
export const LEAVE_REASON_MIN = 5;
export const LEAVE_REASON_MAX = 500;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad = (n) => String(n).padStart(2, '0');

const toValidDate = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Returns a Date whose UTC fields hold the Asia/Kolkata wall-clock time. */
const toIstFields = (value) => {
  const d = toValidDate(value);
  return d ? new Date(d.getTime() + IST_OFFSET_MS) : null;
};

/** 'YYYY-MM-DD' business date in Asia/Kolkata for the given instant. */
export function istBusinessDate(value = new Date()) {
  const ist = toIstFields(value);
  if (!ist) return null;
  return `${ist.getUTCFullYear()}-${pad(ist.getUTCMonth() + 1)}-${pad(ist.getUTCDate())}`;
}

/** '09:05 AM' in Asia/Kolkata, or null for a missing/invalid timestamp. */
export function formatIstTime(value) {
  const ist = toIstFields(value);
  if (!ist) return null;
  let hours = ist.getUTCHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${pad(hours)}:${pad(ist.getUTCMinutes())} ${ampm}`;
}

const parseYmd = (ymd) => {
  if (typeof ymd !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const d = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== ymd ? null : d;
};

export const isValidYmd = (ymd) => parseYmd(ymd) !== null;

/** 'Fri, 24 Oct 2026' for a 'YYYY-MM-DD' business date. */
export function formatYmd(ymd) {
  const d = parseYmd(ymd);
  if (!d) return 'Unknown date';
  return `${WEEKDAYS[d.getUTCDay()]}, ${pad(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function addDaysYmd(ymd, days) {
  const d = parseYmd(ymd);
  if (!d) return null;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Inclusive day count between two business dates, or null if invalid/reversed. */
export function daysInclusive(startYmd, endYmd) {
  const s = parseYmd(startYmd);
  const e = parseYmd(endYmd);
  if (!s || !e || e < s) return null;
  return Math.round((e - s) / 86400000) + 1;
}

/** Whole seconds between two timestamps, or null when either is invalid or reversed. */
export function durationSeconds(startValue, endValue) {
  const s = toValidDate(startValue);
  const e = toValidDate(endValue);
  if (!s || !e) return null;
  const diff = Math.floor((e.getTime() - s.getTime()) / 1000);
  return diff >= 0 ? diff : null;
}

/** '7h 05m', '45m', or null. */
export function formatDuration(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds) || seconds < 0) return null;
  const totalMinutes = Math.floor(seconds / 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${pad(m)}m` : `${m}m`;
}

// ─── Leave ──────────────────────────────────────────────────────────────────

export const leaveTypeLabel = (code) =>
  (LEAVE_TYPES.find((t) => t.code === code) || {}).label || code || 'Leave';

export function leaveCoversDate(leave, ymd) {
  return !!leave && !!ymd && leave.start_date <= ymd && ymd <= leave.end_date;
}

/** First server leave with the given status covering the date. */
export function findLeaveForDate(leaves, ymd, status) {
  return (leaves || []).find((l) => l.status === status && leaveCoversDate(l, ymd)) || null;
}

const rangesOverlap = (aStart, aEnd, bStart, bEnd) => aStart <= bEnd && bStart <= aEnd;

/**
 * Client-side mirror of the server constraints/trigger. The server remains
 * authoritative; this only gives the employee immediate feedback.
 */
export function validateLeaveInput({ leaveType, startDate, endDate, reason }, existingLeaves = []) {
  const errors = {};
  if (!LEAVE_TYPES.some((t) => t.code === leaveType)) errors.leaveType = 'Select a leave type.';
  if (!isValidYmd(startDate)) errors.startDate = 'Select a valid start date.';
  if (!isValidYmd(endDate)) errors.endDate = 'Select a valid end date.';

  if (!errors.startDate && !errors.endDate) {
    const span = daysInclusive(startDate, endDate);
    if (span === null) errors.endDate = 'End date cannot be before start date.';
    else if (span - 1 > LEAVE_MAX_SPAN_DAYS) errors.endDate = `Leave cannot span more than ${LEAVE_MAX_SPAN_DAYS + 1} days.`;
  }

  const trimmed = (reason || '').trim();
  if (trimmed.length < LEAVE_REASON_MIN) errors.reason = `Reason must be at least ${LEAVE_REASON_MIN} characters.`;
  else if (trimmed.length > LEAVE_REASON_MAX) errors.reason = `Reason must be at most ${LEAVE_REASON_MAX} characters.`;

  if (!errors.startDate && !errors.endDate) {
    const clash = (existingLeaves || []).find(
      (l) => (l.status === 'Pending' || l.status === 'Approved')
        && rangesOverlap(startDate, endDate, l.start_date, l.end_date)
    );
    if (clash) errors.startDate = `Overlaps your ${clash.status.toLowerCase()} leave (${clash.start_date} to ${clash.end_date}).`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

export function buildLeavePayload({ id, staffId, leaveType, startDate, endDate, reason }) {
  if (!id || !staffId) throw new Error('Leave request requires an id and the signed-in staff id.');
  return {
    id,
    staff_id: staffId,
    leave_type: leaveType,
    start_date: startDate,
    end_date: endDate,
    reason: (reason || '').trim(),
  };
}

// ─── Attendance records ─────────────────────────────────────────────────────

export function buildCheckInPayload({ id, staffId, now = new Date() }) {
  if (!id || !staffId) throw new Error('Check-in requires an id and the signed-in staff id.');
  const nowIso = toValidDate(now).toISOString();
  return {
    id,
    staff_id: staffId,
    business_date: istBusinessDate(nowIso),
    check_in_at: nowIso,
    status: 'CHECKED_IN',
  };
}

/**
 * Check-out is sent as a full-row upsert on (staff_id, business_date) so it
 * completes the record even if the check-in operation never reached the
 * server. `id` is a fresh operation key; the server keeps the original row id.
 */
export function buildCheckOutPayload({ id, staffId, record, now = new Date() }) {
  if (!id || !staffId) throw new Error('Check-out requires an id and the signed-in staff id.');
  if (!record || !record.check_in_at) throw new Error('You have not checked in today.');
  if (record.check_out_at) throw new Error('You have already checked out today.');
  const nowIso = toValidDate(now).toISOString();
  if (durationSeconds(record.check_in_at, nowIso) === null) {
    throw new Error('Check-out time cannot be before check-in time. Please check the device clock.');
  }
  return {
    id,
    staff_id: staffId,
    business_date: record.business_date,
    check_in_at: record.check_in_at,
    check_out_at: nowIso,
    status: 'CHECKED_OUT',
  };
}

/**
 * Server values are authoritative for the fields the server has. A local
 * check-out that has not reached the server yet is overlaid so the employee
 * sees their action, flagged by the separate sync state.
 */
export function mergeAttendanceRecord(serverRow, localRecord) {
  if (!serverRow && !localRecord) return null;
  if (!serverRow) return { ...localRecord };
  if (!localRecord) return { ...serverRow };
  return {
    ...serverRow,
    check_out_at: serverRow.check_out_at || localRecord.check_out_at || null,
    status: serverRow.check_out_at || localRecord.check_out_at ? 'CHECKED_OUT' : 'CHECKED_IN',
  };
}

/**
 * Status shown on Home / Attendance.
 *  SETUP_PENDING  → backend tables not verified; no actions allowed
 *  ON_LEAVE       → APPROVED leave covers today and there is no attendance record
 *  NOT_CHECKED_IN → may check in
 *  WORKING        → may check out
 *  CHECKED_OUT    → no further action today
 */
export function deriveAttendanceView({ backendReady, record, approvedLeaveToday }) {
  if (record && record.check_in_at) {
    if (record.check_out_at) return { status: 'CHECKED_OUT', canCheckIn: false, canCheckOut: false };
    return { status: 'WORKING', canCheckIn: false, canCheckOut: !!backendReady };
  }
  if (!backendReady) return { status: 'SETUP_PENDING', canCheckIn: false, canCheckOut: false };
  if (approvedLeaveToday) return { status: 'ON_LEAVE', canCheckIn: false, canCheckOut: false };
  return { status: 'NOT_CHECKED_IN', canCheckIn: true, canCheckOut: false };
}

/**
 * Sync state of one queued operation, from the real SyncService queue item
 * and whether the server row has been seen to contain the action.
 *  SYNCED      → confirmed in the server row
 *  PENDING     → queued, not yet attempted
 *  RETRYING    → queued, previous attempt failed transiently
 *  SYNCING     → upload in progress
 *  FAILED      → permanent failure or retries exhausted (see error)
 *  UNCONFIRMED → not in the queue and not (yet) seen on the server
 */
export function deriveSyncState({ queueItem, serverConfirmed }) {
  if (serverConfirmed) return { state: 'SYNCED', error: null };
  if (queueItem) {
    if (queueItem.status === 'FAILED') return { state: 'FAILED', error: queueItem.last_error || 'Upload failed.' };
    if (queueItem.status === 'SYNCING') return { state: 'SYNCING', error: null };
    if (queueItem.status === 'PENDING') {
      return (queueItem.attempts || 0) > 0
        ? { state: 'RETRYING', error: queueItem.last_error || null }
        : { state: 'PENDING', error: null };
    }
  }
  return { state: 'UNCONFIRMED', error: null };
}

export const findQueueItem = (queue, table, localId) =>
  (queue || []).find((op) => op.table === table && op.local_id === localId) || null;

/** True when Supabase reports the table does not exist (migration not applied). */
export function isMissingTableError(error) {
  if (!error) return false;
  const code = String(error.code || '');
  const msg = String(error.message || '').toLowerCase();
  return code === 'PGRST205' || code === '42P01'
    || msg.includes('could not find the table')
    || (msg.includes('relation') && msg.includes('does not exist'));
}

/**
 * Interprets the backend-availability probe (a GET with limit 1).
 * READY only on a real 2xx response with array data. A HEAD request must not
 * be used: postgrest-js converts a 404 with an empty body (what HEAD returns
 * for a missing table) into status 204 with no error (FA-ATTENDANCE-02).
 *  → 'READY' | 'MISSING' | 'UNKNOWN'
 */
export function interpretBackendProbe({ status, error, data }) {
  if (error) return isMissingTableError(error) ? 'MISSING' : 'UNKNOWN';
  if (status >= 200 && status < 300 && Array.isArray(data)) return 'READY';
  return 'UNKNOWN';
}

/** Display model for one attendance history row. */
export function historyEntryView(row, todayYmd) {
  const seconds = durationSeconds(row.check_in_at, row.check_out_at);
  const checkIn = formatIstTime(row.check_in_at);
  const checkOut = formatIstTime(row.check_out_at);
  let note = null;
  if (!checkIn) note = 'Check-in time missing';
  else if (!checkOut && row.business_date && todayYmd && row.business_date < todayYmd) note = 'Check-out missing';
  else if (row.check_out_at && seconds === null) note = 'Invalid timestamps';
  return {
    id: row.id,
    dateLabel: formatYmd(row.business_date),
    status: row.check_out_at ? 'Checked Out' : (row.business_date === todayYmd ? 'Working' : 'Incomplete'),
    checkInLabel: checkIn || '—',
    checkOutLabel: checkOut || '—',
    durationLabel: formatDuration(seconds) || '—',
    incomplete: !!note,
    note,
  };
}
