import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { SyncService } from './SyncService';
import {
  ATTENDANCE_TABLE,
  LEAVE_TABLE,
  ATTENDANCE_CONFLICT_TARGET,
  ATTENDANCE_READ_COLUMNS,
  LOCATION_PROBE_COLUMNS,
  istBusinessDate,
  addDaysYmd,
  buildCheckInPayload,
  buildCheckOutPayload,
  buildLeavePayload,
  mergeAttendanceRecord,
  deriveSyncState,
  findQueueItem,
  findLeaveForDate,
  interpretBackendProbe,
  validateLeaveInput,
} from '../utils/attendance';
import { interpretLocationColumnsProbe, pickLocationFields } from '../utils/attendanceLocation';
import {
  SESSIONS_TABLE,
  SESSION_READ_COLUMNS,
  SUMMARY_EXTRA_COLUMNS,
  buildSessionCheckIn,
  buildSessionCheckOut,
  mergeSessions,
  openSession,
  summarizeSessions,
  sessionErrorMessage,
} from '../utils/attendanceSessions';

/**
 * FA-ATTENDANCE-01: Attendance & leave persistence.
 *
 * Writes go through the existing durable SyncService queue (offline-safe).
 * Reads come from the server; a local cache only bridges offline periods.
 * Nothing is reported as synced unless the server row confirms it.
 */

const getStateKey = (userId) => `@attendance_state_${userId}`;
const getBackendKey = (userId) => `@attendance_backend_ready_${userId}`;
const getLocationKey = (userId) => `@attendance_location_ready_${userId}`;
const getSessionsKey = (userId) => `@attendance_sessions_ready_${userId}`;
const LOCAL_RETENTION_DAYS = 7;
const CONFIRM_TIMEOUT_MS = 20000;
const CONFIRM_POLL_MS = 500;

const isOnline = async () => {
  try {
    const net = await NetInfo.fetch();
    return !!net.isConnected;
  } catch (e) {
    return false;
  }
};

const readLocalState = async (userId) => {
  try {
    const raw = await AsyncStorage.getItem(getStateKey(userId));
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('[AttendanceService] Failed to read local state', e?.message);
    return {};
  }
};

const writeLocalDay = async (userId, businessDate, dayState) => {
  const all = await readLocalState(userId);
  all[businessDate] = dayState;
  const cutoff = addDaysYmd(istBusinessDate(), -LOCAL_RETENTION_DAYS);
  Object.keys(all).forEach((d) => { if (d < cutoff) delete all[d]; });
  await AsyncStorage.setItem(getStateKey(userId), JSON.stringify(all));
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Local session cache entry: no coordinates and no display-only flags. */
const toLocalSession = (s) => ({
  id: s.id,
  business_date: s.business_date,
  check_in_at: s.check_in_at,
  check_out_at: s.check_out_at || null,
  checkOutOpId: s.checkOutOpId || null,
});

/**
 * Drops local session state the server has definitively not accepted: once the
 * server was read and the operation is no longer queued, a session (or a local
 * check-out) missing on the server was lost, and keeping it would block the
 * employee behind a phantom open session.
 */
const reconcileLocalSessions = (localSessions, serverSessions, queue) => {
  const onServer = new Map((serverSessions || []).map((s) => [s.id, s]));
  return (localSessions || []).flatMap((l) => {
    const server = onServer.get(l.id);
    if (!server) return findQueueItem(queue, SESSIONS_TABLE, l.id) ? [l] : [];
    if (l.check_out_at && !server.check_out_at && !(l.checkOutOpId && findQueueItem(queue, SESSIONS_TABLE, l.checkOutOpId))) {
      return [{ ...l, check_out_at: null, checkOutOpId: null }];
    }
    return [l];
  });
};

export class AttendanceService {
  /**
   * Verifies the attendance tables exist on the server. The result is cached
   * so the app knows offline whether attendance has ever been available.
   * Returns { ready, verifiedNow }.
   */
  static async probeBackend(userId) {
    const cached = (await AsyncStorage.getItem(getBackendKey(userId))) === 'true';
    if (!(await isOnline())) return { ready: cached, verifiedNow: false };

    // GET, not HEAD: see interpretBackendProbe for why HEAD reports a missing table as success.
    const result = await supabase
      .from(ATTENDANCE_TABLE)
      .select('id')
      .eq('staff_id', userId)
      .limit(1);

    const outcome = interpretBackendProbe(result);
    if (outcome === 'READY') {
      await AsyncStorage.setItem(getBackendKey(userId), 'true');
      return { ready: true, verifiedNow: true };
    }
    if (outcome === 'MISSING') {
      await AsyncStorage.setItem(getBackendKey(userId), 'false');
      return { ready: false, verifiedNow: true };
    }
    // Other errors (network, auth) do not change the cached answer.
    return { ready: cached, verifiedNow: false };
  }

  /**
   * FA-ATTENDANCE-LOCATION-01: whether the live table has the location columns.
   * Location is captured and sent only when this is true; otherwise payloads stay
   * exactly as before (unknown columns would make every check-in fail).
   * Cached for offline use. Returns { ready, verifiedNow }.
   */
  static async probeLocationSupport(userId) {
    const cached = (await AsyncStorage.getItem(getLocationKey(userId))) === 'true';
    if (!(await isOnline())) return { ready: cached, verifiedNow: false };
    const result = await supabase
      .from(ATTENDANCE_TABLE)
      .select(LOCATION_PROBE_COLUMNS)
      .eq('staff_id', userId)
      .limit(1);
    const outcome = interpretLocationColumnsProbe(result);
    if (outcome === 'READY' || outcome === 'MISSING') {
      await AsyncStorage.setItem(getLocationKey(userId), outcome === 'READY' ? 'true' : 'false');
      return { ready: outcome === 'READY', verifiedNow: true };
    }
    return { ready: cached, verifiedNow: false };
  }

  /**
   * FA-ATTENDANCE-MULTISESSION-01: whether the server has staff_attendance_sessions
   * (proposal 245). Until it does, the single-row path is used unchanged. Cached
   * for offline use. Returns { ready, verifiedNow }.
   */
  static async probeSessionSupport(userId) {
    const cached = (await AsyncStorage.getItem(getSessionsKey(userId))) === 'true';
    if (!(await isOnline())) return { ready: cached, verifiedNow: false };
    const result = await supabase
      .from(SESSIONS_TABLE)
      .select('id')
      .eq('staff_id', userId)
      .limit(1);
    const outcome = interpretBackendProbe(result);
    if (outcome === 'READY' || outcome === 'MISSING') {
      await AsyncStorage.setItem(getSessionsKey(userId), outcome === 'READY' ? 'true' : 'false');
      return { ready: outcome === 'READY', verifiedNow: true };
    }
    return { ready: cached, verifiedNow: false };
  }

  static async fetchServerSessions(userId, businessDate) {
    const { data, error } = await supabase
      .from(SESSIONS_TABLE)
      .select(SESSION_READ_COLUMNS)
      .eq('staff_id', userId)
      .eq('business_date', businessDate)
      .order('check_in_at', { ascending: true });
    return { sessions: data || [], error: error || null };
  }

  static async fetchServerDay(userId, businessDate, { sessionMode = false } = {}) {
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select(ATTENDANCE_READ_COLUMNS + (sessionMode ? SUMMARY_EXTRA_COLUMNS : ''))
      .eq('staff_id', userId)
      .eq('business_date', businessDate)
      .maybeSingle();
    return { row: data || null, error: error || null };
  }

  static async fetchLeaves(userId) {
    const { data, error } = await supabase
      .from(LEAVE_TABLE)
      .select('*')
      .eq('staff_id', userId)
      .order('start_date', { ascending: false })
      .limit(100);
    return { leaves: data || [], error: error || null };
  }

  static async fetchHistory(userId, limit = 60) {
    const sessionMode = (await this.probeSessionSupport(userId)).ready;
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select(ATTENDANCE_READ_COLUMNS + (sessionMode ? SUMMARY_EXTRA_COLUMNS : ''))
      .eq('staff_id', userId)
      .order('business_date', { ascending: false })
      .limit(limit);
    return { rows: data || [], error: error || null };
  }

  /** Leave requests still in the local queue (not yet accepted by the server). */
  static async getQueuedLeaves(userId) {
    const queue = (await SyncService.getQueue(userId)) || [];
    return queue
      .filter((op) => op.table === LEAVE_TABLE)
      .map((op) => ({ ...op.payload, _queue: deriveSyncState({ queueItem: op, serverConfirmed: false }) }));
  }

  /**
   * Today's attendance for Home / Attendance screens.
   */
  static async loadToday(userId) {
    const businessDate = istBusinessDate();
    const online = await isOnline();
    const { ready } = await this.probeBackend(userId);
    if (ready && (await this.probeSessionSupport(userId)).ready) {
      return this._loadTodaySessions(userId, businessDate, online);
    }
    const local = (await readLocalState(userId))[businessDate] || null;

    let serverRow = null;
    let serverChecked = false;
    let leaves = [];
    let loadError = null;

    if (ready && online) {
      const [day, leaveRes] = await Promise.all([
        this.fetchServerDay(userId, businessDate),
        this.fetchLeaves(userId),
      ]);
      if (day.error) loadError = day.error.message;
      else { serverRow = day.row; serverChecked = true; }
      if (!leaveRes.error) leaves = leaveRes.leaves;
    }

    const record = mergeAttendanceRecord(serverRow, local?.record || null);
    const queue = (await SyncService.getQueue(userId)) || [];

    const checkInSync = local?.checkInOpId
      ? deriveSyncState({
          queueItem: findQueueItem(queue, ATTENDANCE_TABLE, local.checkInOpId),
          serverConfirmed: !!serverRow?.check_in_at,
        })
      : (serverRow?.check_in_at ? { state: 'SYNCED', error: null } : null);

    const checkOutSync = local?.checkOutOpId
      ? deriveSyncState({
          queueItem: findQueueItem(queue, ATTENDANCE_TABLE, local.checkOutOpId),
          serverConfirmed: !!serverRow?.check_out_at,
        })
      : (serverRow?.check_out_at ? { state: 'SYNCED', error: null } : null);

    // Keep the local cache aligned with confirmed server state.
    if (serverChecked && serverRow) {
      await writeLocalDay(userId, businessDate, { ...(local || {}), record });
    }

    return {
      businessDate,
      online,
      backendReady: ready,
      serverChecked,
      loadError,
      record,
      checkInSync,
      checkOutSync,
      approvedLeaveToday: findLeaveForDate(leaves, businessDate, 'Approved'),
      pendingLeaveToday: findLeaveForDate(leaves, businessDate, 'Pending'),
    };
  }

  /**
   * FA-ATTENDANCE-MULTISESSION-01: today's state from sessions. `record` is a
   * summary in the single-row shape so existing screens keep working:
   * first check-in, last check-out (null while a session is open).
   */
  static async _loadTodaySessions(userId, businessDate, online) {
    const local = (await readLocalState(userId))[businessDate] || {};
    let serverSessions = [];
    let serverRow = null;
    let serverChecked = false;
    let leaves = [];
    let loadError = null;

    if (online) {
      const [day, sess, leaveRes] = await Promise.all([
        this.fetchServerDay(userId, businessDate, { sessionMode: true }),
        this.fetchServerSessions(userId, businessDate),
        this.fetchLeaves(userId),
      ]);
      if (day.error || sess.error) loadError = (day.error || sess.error).message;
      else { serverRow = day.row; serverSessions = sess.sessions; serverChecked = true; }
      if (!leaveRes.error) leaves = leaveRes.leaves;
    }

    const queue = (await SyncService.getQueue(userId)) || [];
    const localSessions = serverChecked
      ? reconcileLocalSessions(local.sessions, serverSessions, queue)
      : (local.sessions || []);
    const sessions = mergeSessions(serverChecked ? serverSessions : [], localSessions);
    if (serverChecked) {
      await writeLocalDay(userId, businessDate, { ...local, sessions: sessions.map(toLocalSession) });
    }

    const summary = summarizeSessions(sessions);
    const record = sessions.length
      ? {
          ...(serverRow || {}),
          business_date: businessDate,
          check_in_at: summary.firstCheckIn,
          check_out_at: summary.lastCheckOut,
          status: summary.open ? 'CHECKED_IN' : 'CHECKED_OUT',
        }
      : null;

    const latest = sessions[sessions.length - 1] || null;
    const syncOf = (opId, serverConfirmed) => {
      const sync = deriveSyncState({ queueItem: opId ? findQueueItem(queue, SESSIONS_TABLE, opId) : null, serverConfirmed });
      return sync.error ? { ...sync, error: sessionErrorMessage(sync.error) } : sync;
    };

    return {
      businessDate,
      online,
      backendReady: true,
      sessionMode: true,
      serverChecked,
      loadError,
      record,
      sessions,
      currentSession: summary.open,
      checkInSync: latest ? syncOf(latest.id, !!latest._onServer) : null,
      checkOutSync: latest && latest.check_out_at
        ? syncOf(latest.checkOutOpId, !!latest._onServer && !latest._checkOutLocal)
        : null,
      approvedLeaveToday: findLeaveForDate(leaves, businessDate, 'Approved'),
      pendingLeaveToday: findLeaveForDate(leaves, businessDate, 'Pending'),
    };
  }

  static async _sessionCheckIn(userId, location) {
    const today = await this.loadToday(userId);
    if (today.approvedLeaveToday) throw new Error('You have approved leave today. Check-in is not allowed.');

    const op = buildSessionCheckIn({ sessionId: uuidv4(), sessions: today.sessions, location });
    const date = op.session.business_date;
    const local = (await readLocalState(userId))[date] || {};
    // Persist locally first so a crash between enqueue and save cannot lose the action.
    await writeLocalDay(userId, date, { ...local, sessions: [...(local.sessions || []), op.session] });
    await SyncService.enqueueOperation(SESSIONS_TABLE, { id: op.id, rpc: op.rpc, params: op.params }, userId, 'rpc');

    if (!(await isOnline())) return { state: 'PENDING', error: null };
    const result = await this._awaitConfirmation(userId, op.id, async () => {
      const { sessions } = await this.fetchServerSessions(userId, date);
      return sessions.some((s) => s.id === op.id);
    });
    return result.error ? { ...result, error: sessionErrorMessage(result.error) } : result;
  }

  static async _sessionCheckOut(userId, location) {
    const today = await this.loadToday(userId);
    const session = openSession(today.sessions);
    if (!session) throw new Error('You are not checked in.');

    const op = buildSessionCheckOut({ opId: uuidv4(), session, location });
    const date = session.business_date || today.businessDate;
    const local = (await readLocalState(userId))[date] || {};
    const closed = { ...toLocalSession(session), check_out_at: op.params.p_check_out_at, checkOutOpId: op.id };
    const existing = local.sessions || [];
    const sessions = existing.some((s) => s.id === session.id)
      ? existing.map((s) => (s.id === session.id ? closed : s))
      : [...existing, closed];
    await writeLocalDay(userId, date, { ...local, sessions });
    await SyncService.enqueueOperation(SESSIONS_TABLE, { id: op.id, rpc: op.rpc, params: op.params }, userId, 'rpc');

    if (!(await isOnline())) return { state: 'PENDING', error: null };
    const result = await this._awaitConfirmation(userId, op.id, async () => {
      const { sessions: rows } = await this.fetchServerSessions(userId, date);
      return rows.some((s) => s.id === session.id && s.check_out_at);
    });
    return result.error ? { ...result, error: sessionErrorMessage(result.error) } : result;
  }

  /**
   * Waits for a queued operation to leave the queue, then checks the server.
   * Returns 'SYNCED' | 'FAILED' | 'PENDING' (still queued / not confirmed in time).
   */
  static async _awaitConfirmation(userId, opId, isConfirmed) {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    // Kick the queue; if a run is already active it will pick this op up.
    SyncService.processQueue(userId).catch(() => {});
    while (Date.now() < deadline) {
      const queue = (await SyncService.getQueue(userId)) || [];
      const item = findQueueItem(queue, ATTENDANCE_TABLE, opId)
        || findQueueItem(queue, SESSIONS_TABLE, opId)
        || findQueueItem(queue, LEAVE_TABLE, opId);
      if (item && item.status === 'FAILED') return { state: 'FAILED', error: item.last_error || 'Upload failed.' };
      if (!item) {
        const confirmed = await isConfirmed();
        return confirmed ? { state: 'SYNCED', error: null } : { state: 'PENDING', error: null };
      }
      await sleep(CONFIRM_POLL_MS);
    }
    return { state: 'PENDING', error: null };
  }

  static async checkIn(userId, { location = null } = {}) {
    const { ready } = await this.probeBackend(userId);
    if (!ready) throw new Error('Attendance is not yet enabled on the server. Please contact your administrator.');
    if ((await this.probeSessionSupport(userId)).ready) return this._sessionCheckIn(userId, location);

    const today = await this.loadToday(userId);
    if (today.record?.check_in_at) {
      throw new Error('You have already checked in today.');
    }
    if (today.approvedLeaveToday) {
      throw new Error('You have approved leave today. Check-in is not allowed.');
    }

    // Never send location columns unless the live schema is confirmed to have them.
    const sendLocation = location && (await this.probeLocationSupport(userId)).ready;
    const payload = buildCheckInPayload({ id: uuidv4(), staffId: userId, location: sendLocation ? location : null });
    // Persist locally first so a crash between enqueue and save cannot lose the action.
    await writeLocalDay(userId, payload.business_date, {
      record: { ...payload },
      checkInOpId: payload.id,
      checkOutOpId: null,
    });
    await SyncService.enqueueOperation(ATTENDANCE_TABLE, payload, userId, 'upsert', ATTENDANCE_CONFLICT_TARGET);

    if (!(await isOnline())) {
      return { state: 'PENDING', error: null, record: payload };
    }
    const result = await this._awaitConfirmation(userId, payload.id, async () => {
      const { row } = await this.fetchServerDay(userId, payload.business_date);
      if (row?.check_in_at) {
        await writeLocalDay(userId, payload.business_date, {
          record: mergeAttendanceRecord(row, payload),
          checkInOpId: payload.id,
          checkOutOpId: null,
        });
        return true;
      }
      return false;
    });
    return { ...result, record: payload };
  }

  static async checkOut(userId, { location = null } = {}) {
    const { ready } = await this.probeBackend(userId);
    if (!ready) throw new Error('Attendance is not yet enabled on the server. Please contact your administrator.');
    if ((await this.probeSessionSupport(userId)).ready) return this._sessionCheckOut(userId, location);

    const today = await this.loadToday(userId);
    const local = (await readLocalState(userId))[today.businessDate] || {};
    const sendLocation = location && (await this.probeLocationSupport(userId)).ready;
    const payload = buildCheckOutPayload({
      id: uuidv4(), staffId: userId, record: today.record, location: sendLocation ? location : null,
    });

    await writeLocalDay(userId, payload.business_date, {
      ...local,
      record: {
        ...today.record,
        ...pickLocationFields(payload, 'check_out'),
        check_out_at: payload.check_out_at,
        status: 'CHECKED_OUT',
      },
      checkOutOpId: payload.id,
    });
    await SyncService.enqueueOperation(ATTENDANCE_TABLE, payload, userId, 'upsert', ATTENDANCE_CONFLICT_TARGET);

    if (!(await isOnline())) {
      return { state: 'PENDING', error: null };
    }
    return this._awaitConfirmation(userId, payload.id, async () => {
      const { row } = await this.fetchServerDay(userId, payload.business_date);
      return !!row?.check_out_at;
    });
  }

  static async applyLeave(userId, form) {
    const { ready } = await this.probeBackend(userId);
    if (!ready) throw new Error('Leave applications are not yet enabled on the server. Please contact your administrator.');

    const online = await isOnline();
    let existing = [];
    if (online) {
      const res = await this.fetchLeaves(userId);
      if (res.error) throw new Error('Could not load your existing leave requests. Please try again.');
      existing = res.leaves;
    }
    // Requests still waiting in the local queue count as pending for overlap checks.
    const queued = (await this.getQueuedLeaves(userId))
      .filter((q) => q._queue.state !== 'FAILED')
      .map((q) => ({ ...q, status: 'Pending' }));
    existing = existing.concat(queued);

    const { valid, errors } = validateLeaveInput(form, existing);
    if (!valid) {
      const err = new Error(Object.values(errors)[0]);
      err.fieldErrors = errors;
      throw err;
    }

    const payload = buildLeavePayload({ id: uuidv4(), staffId: userId, ...form });
    await SyncService.enqueueOperation(LEAVE_TABLE, payload, userId, 'insert');

    if (!online) return { state: 'PENDING', error: null };
    return this._awaitConfirmation(userId, payload.id, async () => {
      const { data } = await supabase.from(LEAVE_TABLE).select('id').eq('id', payload.id).maybeSingle();
      return !!data;
    });
  }
}
