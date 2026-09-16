import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

const getQueueKey = (userId) => `@sync_queue_${userId}`;

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export class SyncService {
  static onQueueChange = null;

  static async getQueue(userId) {
    if (!userId) return [];
    try {
      const q = await AsyncStorage.getItem(getQueueKey(userId));
      return q ? JSON.parse(q) : [];
    } catch (e) {
      console.error('SyncService: Error reading queue', e);
      return null;
    }
  }

  static async saveQueue(userId, queue) {
    if (!userId) return;
    await AsyncStorage.setItem(getQueueKey(userId), JSON.stringify(queue));
  }

  /**
   * Adds an operation to the offline sync queue.
   * @param {string} table 
   * @param {object} payload - Must contain a predefined client UUID 'id'
   * @param {string} userId - Authenticated user's ID
   */
  static async enqueueOperation(table, payload, userId, action = 'insert') {
    if (!userId) {
      console.warn('SyncService: enqueueOperation called without userId');
      return null;
    }
    const queue = await this.getQueue(userId);
    if (queue === null) {
      console.error('SyncService: Critical failure loading queue, cannot enqueue');
      throw new Error("Unable to read local sync queue. Operation aborted to prevent data loss.");
    }

    const guaranteedId = payload.id || generateId();
    const operation = {
      local_id: guaranteedId, // Guarantee ID exists for idempotency
      table,
      action,
      payload: { ...payload, id: guaranteedId },
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    
    // Deduplication check: Do not re-enqueue if already in queue
    const existing = queue.find(op => op.local_id === operation.local_id && op.table === table);
    if (existing) {
       return existing.payload;
    }

    queue.push(operation);
    await this.saveQueue(userId, queue);
    
    if (this.onQueueChange) {
      this.onQueueChange();
    }

    // Attempt sync immediately if online
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      this.processQueue(userId);
    }
    
    return operation.payload;
  }

  static async processQueue(userId) {
    if (!userId) return;
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    let queue = await this.getQueue(userId);
    if (!queue || queue.length === 0) return;

    let queueUpdated = false;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      if (op.status === 'SYNCED') continue;

      op.status = 'SYNCING';
      
      try {
        let error;
        // Clean out unsupported fields if they accidentally made it into the payload
        let safePayload = { ...op.payload };
        delete safePayload.customerName; // Never sync ephemeral labels
        
        if (op.action === 'update') {
          const { error: updateError } = await supabase
            .from(op.table)
            .update(safePayload)
            .eq('id', safePayload.id);
          error = updateError;
        } else {
          const { error: insertError } = await supabase
            .from(op.table)
            .insert([safePayload]);
          error = insertError;
        }

        if (error) {
          // Trap Unique Constraint violation (idempotency success)
          if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
            // console.log(`Sync idempotency: ${op.table} ${op.local_id} already exists.`);
            op.status = 'SYNCED';
          } else {
            console.error(`Sync error for ${op.local_id}:`, error.message);
            op.status = 'FAILED';
            op.last_error = error.message || 'Unknown database error';
            op.last_attempted_at = new Date().toISOString();
          }
        } else {
          // console.log(`Synced ${op.local_id} to ${op.table}`);
          op.status = 'SYNCED';
        }
      } catch (err) {
        // console.error(`Network error syncing ${op.local_id}:`, err);
        op.status = 'FAILED';
      }
      queueUpdated = true;
      
      // Save progress so UI and app state are consistent
      await this.saveQueue(userId, queue);
      if (this.onQueueChange) {
        this.onQueueChange();
      }
    }

    if (queueUpdated) {
      // Remove SYNCED items, retain FAILED/PENDING
      const newQueue = queue.filter(op => op.status !== 'SYNCED');
      
      // We intentionally do NOT reset FAILED back to PENDING.
      // This preserves the error state so the user can see what failed.

      await this.saveQueue(userId, newQueue);
      if (this.onQueueChange) {
        this.onQueueChange();
      }
    }
  }

  static async clearQueue(userId) {
    if (!userId) return;
    await AsyncStorage.removeItem(getQueueKey(userId));
    if (this.onQueueChange) {
      this.onQueueChange();
    }
  }
}
