import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { SyncService } from './SyncService';
import {
  ATTENDANCE_TABLE,
  LEAVE_TABLE,
  ATTENDANCE_CONFLICT_TARGET,
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

/**
 * FA-ATTENDANCE-01: Attendance & leave persistence.
 *
 * Writes go through the existing durable SyncService queue (offline-safe).
 * Reads come from the server; a local cache only bridges offline periods.
 * Nothing is reported as synced unless the server row confirms it.
 */

const getStateKey = (userId) => `@attendance_state_${userId}`;
const getBackendKey = (userId) => `@attendance_backend_ready_${userId}`;
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

  static async fetchServerDay(userId, businessDate) {
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
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
    const { data, error } = await supabase
      .from(ATTENDANCE_TABLE)
      .select('*')
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
   * Waits for a queued operation to leave the queue, then checks the server.
   * Returns 'SYNCED' | 'FAILED' | 'PENDING' (still queued / not confirmed in time).
   */
  static async _awaitConfirmation(userId, opId, isConfirmed) {
    const deadline = Date.now() + CONFIRM_TIMEOUT_MS;
    // Kick the queue; if a run is already active it will pick this op up.
    SyncService.processQueue(userId).catch(() => {});
    while (Date.now() < deadline) {
      const queue = (await SyncService.getQueue(userId)) || [];
      const item = findQueueItem(queue, ATTENDANCE_TABLE, opId) || findQueueItem(queue, LEAVE_TABLE, opId);
      if (item && item.status === 'FAILED') return { state: 'FAILED', error: item.last_error || 'Upload failed.' };
      if (!item) {
        const confirmed = await isConfirmed();
        return confirmed ? { state: 'SYNCED', error: null } : { state: 'PENDING', error: null };
      }
      await sleep(CONFIRM_POLL_MS);
    }
    return { state: 'PENDING', error: null };
  }

  static async checkIn(userId) {
    const { ready } = await this.probeBackend(userId);
    if (!ready) throw new Error('Attendance is not yet enabled on the server. Please contact your administrator.');

    const today = await this.loadToday(userId);
    if (today.record?.check_in_at) {
      throw new Error('You have already checked in today.');
    }
    if (today.approvedLeaveToday) {
      throw new Error('You have approved leave today. Check-in is not allowed.');
    }

    const payload = buildCheckInPayload({ id: uuidv4(), staffId: userId });
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

  static async checkOut(userId) {
    const { ready } = await this.probeBackend(userId);
    if (!ready) throw new Error('Attendance is not yet enabled on the server. Please contact your administrator.');

    const today = await this.loadToday(userId);
    const local = (await readLocalState(userId))[today.businessDate] || {};
    const payload = buildCheckOutPayload({ id: uuidv4(), staffId: userId, record: today.record });

    await writeLocalDay(userId, payload.business_date, {
      ...local,
      record: { ...today.record, check_out_at: payload.check_out_at, status: 'CHECKED_OUT' },
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
