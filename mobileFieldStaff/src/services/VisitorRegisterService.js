import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { SyncService } from './SyncService';
import {
  VISITOR_TABLE,
  istBusinessDate,
  validateVisitorInput,
  buildVisitorPayload,
  buildExitPayload,
  filterTodayVisitors,
  isMissingTableError,
} from '../utils/visitorRegister';

const getCacheKey = (userId) => `@visitor_register_cache_${userId || 'shared'}`;
const getBackendStatusKey = (userId) => `@visitor_backend_ready_${userId || 'shared'}`;

export class VisitorRegisterService {
  /**
   * Checks network connectivity.
   */
  static async isOnline() {
    try {
      const net = await NetInfo.fetch();
      return !!net.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Reads cached visitors from local storage.
   */
  static async getLocalVisitors(userId) {
    try {
      const raw = await AsyncStorage.getItem(getCacheKey(userId));
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[VisitorRegisterService] getLocalVisitors error:', e);
      return [];
    }
  }

  /**
   * Saves visitors list to local storage.
   */
  static async saveLocalVisitors(userId, visitors) {
    try {
      await AsyncStorage.setItem(getCacheKey(userId), JSON.stringify(visitors || []));
    } catch (e) {
      console.warn('[VisitorRegisterService] saveLocalVisitors error:', e);
    }
  }

  /**
   * Probes whether the backend table `visitor_register` exists on Supabase.
   */
  static async checkBackendAvailability(userId) {
    try {
      const online = await this.isOnline();
      if (!online) {
        const cached = await AsyncStorage.getItem(getBackendStatusKey(userId));
        return cached === 'true';
      }

      const { data, error } = await supabase
        .from(VISITOR_TABLE)
        .select('id')
        .limit(1);

      if (error && isMissingTableError(error)) {
        await AsyncStorage.setItem(getBackendStatusKey(userId), 'false');
        return false;
      }

      await AsyncStorage.setItem(getBackendStatusKey(userId), 'true');
      return true;
    } catch (e) {
      console.warn('[VisitorRegisterService] probe error:', e?.message);
      return false;
    }
  }

  /**
   * Registers a new visitor.
   * Auto-captures registration date/time, pass number, staff ID, and 'IN' status.
   * Saves to local cache immediately and enqueues to SyncService for background sync.
   */
  static async registerVisitor(form, userId) {
    if (!userId) {
      throw new Error('User authentication required to register visitors');
    }

    const validation = validateVisitorInput(form);
    if (!validation.isValid) {
      const error = new Error('Please fill in all required visitor details');
      error.fieldErrors = validation.errors;
      throw error;
    }

    const clientUuid = form.id || uuidv4();
    const payload = buildVisitorPayload({
      ...form,
      id: clientUuid,
      registered_by: userId,
    });

    // 1. Save to local storage (prepend so new entries are at the top)
    const localList = await this.getLocalVisitors(userId);
    const existingIndex = localList.findIndex((v) => v.id === payload.id);
    let updatedList;
    if (existingIndex >= 0) {
      updatedList = [...localList];
      updatedList[existingIndex] = payload;
    } else {
      updatedList = [payload, ...localList];
    }
    await this.saveLocalVisitors(userId, updatedList);

    // 2. Enqueue for background sync
    try {
      await SyncService.enqueueOperation(
        VISITOR_TABLE,
        payload,
        userId,
        'insert'
      );
    } catch (syncErr) {
      console.warn('[VisitorRegisterService] Enqueue warning:', syncErr);
    }

    const online = await this.isOnline();
    return {
      success: true,
      record: payload,
      isOffline: !online,
      message: online
        ? 'Visitor registered and pass generated successfully.'
        : 'Visitor registered and saved offline. Will sync when back online.',
    };
  }

  /**
   * Marks a visitor as exited on their existing record.
   * Never creates a duplicate record; updates exit_time and status to 'OUT'.
   */
  static async markVisitorExit(visitorId, userId) {
    if (!visitorId) {
      throw new Error('Visitor ID is required to mark exit');
    }

    const now = new Date().toISOString();
    const exitPayload = buildExitPayload(visitorId, now);

    // 1. Update local storage record
    const localList = await this.getLocalVisitors(userId);
    let updatedRecord = null;
    const updatedList = localList.map((v) => {
      if (v.id === visitorId) {
        updatedRecord = {
          ...v,
          exit_time: now,
          status: 'OUT',
          updated_at: now,
        };
        return updatedRecord;
      }
      return v;
    });

    if (!updatedRecord) {
      updatedRecord = {
        id: visitorId,
        exit_time: now,
        status: 'OUT',
        updated_at: now,
      };
      updatedList.push(updatedRecord);
    }

    await this.saveLocalVisitors(userId, updatedList);

    // 2. Enqueue update to SyncService
    try {
      await SyncService.enqueueOperation(
        VISITOR_TABLE,
        exitPayload,
        userId,
        'update'
      );
    } catch (syncErr) {
      console.warn('[VisitorRegisterService] Exit update enqueue warning:', syncErr);
    }

    const online = await this.isOnline();
    return {
      success: true,
      record: updatedRecord,
      message: 'Visitor exit marked successfully.',
    };
  }

  /**
   * Retrieves today's visitors for display in the history tab.
   * Merges local cache with server data when online.
   */
  static async getTodayVisitors(userId) {
    const todayYmd = istBusinessDate();
    let localList = await this.getLocalVisitors(userId);

    // Filter local list to today
    let todayList = filterTodayVisitors(localList, todayYmd);

    const online = await this.isOnline();
    if (online) {
      try {
        const { data, error } = await supabase
          .from(VISITOR_TABLE)
          .select('*')
          .gte('entry_time', `${todayYmd}T00:00:00+05:30`)
          .order('entry_time', { ascending: false });

        if (!error && Array.isArray(data)) {
          // Merge server records with local list
          const serverMap = new Map(data.map((item) => [item.id, item]));

          // Overlay any local-only updates (e.g. pending exits or newly added records)
          const merged = [...data];
          for (const localItem of todayList) {
            const serverItem = serverMap.get(localItem.id);
            if (!serverItem) {
              merged.unshift(localItem);
            } else if (localItem.status === 'OUT' && serverItem.status === 'IN') {
              // Local exit has not yet synced to server, overlay local
              const idx = merged.findIndex((m) => m.id === localItem.id);
              if (idx >= 0) merged[idx] = localItem;
            }
          }

          // Sort descending by entry_time
          merged.sort((a, b) => new Date(b.entry_time || 0) - new Date(a.entry_time || 0));
          todayList = merged;

          // Update local cache
          await this.saveLocalVisitors(userId, merged);
        }
      } catch (err) {
        console.warn('[VisitorRegisterService] fetch today visitors error:', err);
      }
    }

    return todayList;
  }
}
