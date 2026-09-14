import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

const SYNC_QUEUE_KEY = '@sync_queue';

export class SyncService {
  static async getQueue() {
    try {
      const q = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return q ? JSON.parse(q) : [];
    } catch (e) {
      return [];
    }
  }

  static async saveQueue(queue) {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }

  /**
   * Adds an operation to the offline sync queue.
   * @param {string} table 
   * @param {object} payload - Must contain a predefined client UUID 'id'
   */
  static async enqueueOperation(table, payload) {
    const queue = await this.getQueue();
    const operation = {
      local_id: payload.id || crypto.randomUUID(), // Guarantee ID exists for idempotency
      table,
      payload: { ...payload, id: payload.id || crypto.randomUUID() },
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    queue.push(operation);
    await this.saveQueue(queue);
    
    // Attempt sync immediately if online
    const net = await NetInfo.fetch();
    if (net.isConnected) {
      this.processQueue();
    }
    
    return operation.payload;
  }

  static async processQueue() {
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    let queue = await this.getQueue();
    if (queue.length === 0) return;

    let queueUpdated = false;

    for (let i = 0; i < queue.length; i++) {
      const op = queue[i];
      if (op.status === 'SYNCED') continue;

      op.status = 'SYNCING';
      
      try {
        const { error } = await supabase
          .from(op.table)
          .insert([op.payload]);

        if (error) {
          // Trap Unique Constraint violation (idempotency success)
          if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
            // console.log(`Sync idempotency: ${op.table} ${op.local_id} already exists.`);
            op.status = 'SYNCED';
          } else {
            // console.error(`Sync error for ${op.local_id}:`, error.message);
            op.status = 'FAILED';
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
    }

    if (queueUpdated) {
      // Remove SYNCED items, retain FAILED/PENDING
      const newQueue = queue.filter(op => op.status !== 'SYNCED');
      
      // Reset FAILED to PENDING for next run
      newQueue.forEach(op => {
        if (op.status === 'FAILED') op.status = 'PENDING';
      });

      await this.saveQueue(newQueue);
    }
  }

  static async clearQueue() {
    await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
  }
}
