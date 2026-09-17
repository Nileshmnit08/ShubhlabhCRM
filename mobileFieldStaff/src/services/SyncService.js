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
  static _queueLock = Promise.resolve();
  static _isProcessing = false;

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

  static async _atomicQueueUpdate(userId, updateFn) {
    if (!userId) return null;
    
    // Chain onto the lock to serialize all queue reads/writes
    this._queueLock = this._queueLock.then(async () => {
      try {
        const queue = await this.getQueue(userId) || [];
        const newQueue = await updateFn(queue);
        if (newQueue) { 
          await this.saveQueue(userId, newQueue);
          if (this.onQueueChange) {
            this.onQueueChange();
          }
        }
      } catch (e) {
        console.error('SyncService: Error in atomic update', e);
      }
    }).catch(e => {
        console.error('SyncService: Lock error', e);
    });
    
    return this._queueLock;
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

    const guaranteedId = payload.id || generateId();
    const operation = {
      local_id: guaranteedId, // Guarantee ID exists for idempotency
      table,
      action,
      payload: { ...payload, id: guaranteedId },
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    
    await this._atomicQueueUpdate(userId, (queue) => {
      // Deduplication check: Do not re-enqueue if already in queue
      const existing = queue.find(op => op.local_id === operation.local_id && op.table === table);
      if (!existing) {
        queue.push(operation);
        return queue; // Return modified queue to trigger save
      }
      return null; // Return null to skip save (no changes)
    });

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

    if (this._isProcessing) return;
    this._isProcessing = true;

    try {
      while (true) {
        let pendingOp = null;
        
        // Find next item to process
        const queue = await this.getQueue(userId);
        if (queue && queue.length > 0) {
           pendingOp = queue.find(op => op.status !== 'SYNCED' && op.status !== 'SYNCING');
        }
        
        if (!pendingOp) {
          break; // Nothing left to process
        }

        // Atomically mark it as SYNCING so another loop/caller doesn't pick it up
        await this._atomicQueueUpdate(userId, q => {
          const item = q.find(x => x.local_id === pendingOp.local_id && x.table === pendingOp.table);
          if (item) {
            item.status = 'SYNCING';
            return q;
          }
          return null;
        });

        console.log(`[DIAGNOSTIC] CALL_SYNC_ATTEMPT: table=${pendingOp.table} local_id=${pendingOp.local_id}`);
        
        let error = null;
        try {
          // Clean out unsupported fields if they accidentally made it into the payload
          let safePayload = { ...pendingOp.payload };
          delete safePayload.customerName; // Never sync ephemeral labels

          // Safe recovery patch for existing queued items failing req_status_check
          if (pendingOp.table === 'requirements' && safePayload.status === 'Open') {
            safePayload.status = 'New';
            pendingOp.payload.status = 'New'; // Persist the patch in memory
          }
          
          if (pendingOp.action === 'update') {
            const { error: updateError } = await supabase
              .from(pendingOp.table)
              .update(safePayload)
              .eq('id', safePayload.id);
            error = updateError;
          } else {
            const { error: insertError } = await supabase
              .from(pendingOp.table)
              .insert([safePayload]);
            error = insertError;
          }
        } catch (err) {
          error = err;
        }

        // Atomically record the result and cleanup
        await this._atomicQueueUpdate(userId, q => {
          const item = q.find(x => x.local_id === pendingOp.local_id && x.table === pendingOp.table);
          if (!item) return null;

          if (error) {
            // Trap Unique Constraint violation (idempotency success)
            if (error.code === '23505' || (error.message && error.message.includes('unique'))) {
              console.log(`[DIAGNOSTIC] CALL_SYNC_SUCCESS (Idempotent): ${pendingOp.table} ${pendingOp.local_id} already exists.`);
              item.status = 'SYNCED';
            } else {
              console.error(`[DIAGNOSTIC] CALL_SYNC_FAILURE: local_id=${pendingOp.local_id} code=${error.code} msg=${error.message}`);
              item.status = 'FAILED';
              item.last_error = error.message || 'Unknown database error';
              item.last_attempted_at = new Date().toISOString();
              // Save the recovery patch if it failed
              if (pendingOp.table === 'requirements' && item.payload.status === 'Open') {
                  item.payload.status = 'New';
              }
            }
          } else {
            console.log(`[DIAGNOSTIC] CALL_SYNC_SUCCESS: local_id=${pendingOp.local_id} to ${pendingOp.table}`);
            item.status = 'SYNCED';
          }
          
          // Remove SYNCED items immediately, retain FAILED/PENDING
          return q.filter(x => x.status !== 'SYNCED');
        });
      }
    } finally {
      this._isProcessing = false;
    }
  }

  static async clearQueue(userId) {
    if (!userId) return;
    await this._atomicQueueUpdate(userId, () => {
      return []; // Return empty array to clear queue atomically
    });
  }
}
