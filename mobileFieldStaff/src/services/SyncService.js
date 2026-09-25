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
  static async enqueueOperation(table, payload, userId, action = 'insert', conflictTarget = null) {
    if (!userId) {
      console.warn('SyncService: enqueueOperation called without userId');
      return null;
    }

    const guaranteedId = payload.id || generateId();
    const operation = {
      local_id: guaranteedId, // Guarantee ID exists for idempotency
      table,
      action,
      conflictTarget,
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

  static async processQueue(userId, isManualRetry = false) {
    if (!userId) return;
    const net = await NetInfo.fetch();
    if (!net.isConnected) return;

    if (this._isProcessing) return;
    this._isProcessing = true;

    try {
      const attemptedIds = new Set();
      while (true) {
        let pendingOp = null;
        
        // Find next item to process
        const queue = await this.getQueue(userId);
        if (queue && queue.length > 0) {
           // 1. Normalize legacy UUIDs immediately
           const normalizedQueue = queue.map(op => {
             if (op.table === 'chat_messages' && op.payload && op.payload.id && op.payload.id.startsWith('msg-')) {
               const newId = generateId();
               console.log(`[DIAGNOSTIC] Normalizing legacy ID ${op.payload.id} -> ${newId}`);
               return {
                 ...op,
                 local_id: newId,
                 payload: { ...op.payload, id: newId }
               };
             }
             
             // Normalize non-UUID requirement IDs
             const isUUID = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
             
             if (op.table === 'requirements' && op.payload && op.payload.id && !isUUID(op.payload.id)) {
                const newId = generateId();
                console.log(`[DIAGNOSTIC] Normalizing non-UUID requirement ID ${op.payload.id} -> ${newId}`);
                // Also update any child items in the queue that reference this old ID
                queue.forEach(childOp => {
                   if (childOp.table === 'requirement_items' && childOp.payload && childOp.payload.requirement_id === op.payload.id) {
                       childOp.payload.requirement_id = newId;
                   }
                });
                return {
                  ...op,
                  local_id: newId,
                  payload: { ...op.payload, id: newId }
                };
             }
             
             // Normalize non-UUID requirement_items IDs
             if (op.table === 'requirement_items' && op.payload && op.payload.id && !isUUID(op.payload.id)) {
                const newId = generateId();
                return {
                  ...op,
                  local_id: newId,
                  payload: { ...op.payload, id: newId }
                };
             }
             
             return op;
           });

           // Save normalization back to queue if it changed
           const hasChanges = normalizedQueue.some((op, i) => op.local_id !== queue[i].local_id);
           if (hasChanges) {
             await this.saveQueue(userId, normalizedQueue);
           }

           const activeQueue = hasChanges ? normalizedQueue : queue;

           // 2. Sort the queue to enforce Chat Dependencies
           const priorityMap = {
             'crm_parties': 1,
             'requirements': 2,
             'requirement_items': 3,
             'chat_conversations': 4,
             'chat_participants': 5,
             'chat_messages': 6
           };
           
           const sortedQueue = [...activeQueue].sort((a, b) => {
             const pA = priorityMap[a.table] || 99;
             const pB = priorityMap[b.table] || 99;
             return pA - pB;
           });

           pendingOp = sortedQueue.find(op => {
             if (!(op.status === 'PENDING' || (isManualRetry && op.status === 'FAILED'))) return false;
             if (attemptedIds.has(op.local_id)) return false;
             
             // Enforce Queue Dependencies
             if (op.table === 'requirement_items') {
                 // Check if parent requirement is still in the queue (meaning it hasn't synced successfully)
                 const parentId = op.payload?.requirement_id;
                 if (parentId) {
                     const parentInQueue = activeQueue.find(parentOp => 
                         parentOp.table === 'requirements' && 
                         (parentOp.payload?.id === parentId || parentOp.local_id === parentId)
                     );
                     
                     // If parent is still in the queue (FAILED, PENDING, SYNCING), block the child.
                     // The child will remain PENDING and will not be attempted.
                     if (parentInQueue) {
                         console.log(`[DIAGNOSTIC] Blocking requirement_items ${op.local_id} because parent ${parentId} is still in queue with status ${parentInQueue.status}`);
                         return false;
                     }
                 }
             }
             
             return true;
           });
        }
        
        if (!pendingOp) {
          break; // Nothing left to process
        }

        attemptedIds.add(pendingOp.local_id);

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
          
          if (pendingOp.table === 'requirement_items') {
            delete safePayload.weight;
          }

          // Safe recovery patch for existing queued items failing req_status_check
          if (pendingOp.table === 'requirements') {
            if (safePayload.status === 'Open') {
              safePayload.status = 'New';
              pendingOp.payload.status = 'New'; // Persist the patch in memory
            }
            if (!safePayload.quantity || safePayload.quantity <= 0) {
              safePayload.quantity = 1;
              pendingOp.payload.quantity = 1; // Satisfy req_positive_values constraint
            }
            if (!safePayload.product_type) {
              safePayload.product_type = 'General Requirement';
              pendingOp.payload.product_type = 'General Requirement';
            }

            // Fix for old failed payloads: remove weight from nested requirement_items
            if (safePayload.requirement_items && Array.isArray(safePayload.requirement_items)) {
              safePayload.requirement_items.forEach(item => {
                delete item.weight;
              });
            }
          }
          
          if (pendingOp.action === 'update') {
            const { error: updateError } = await supabase
              .from(pendingOp.table)
              .update(safePayload)
              .eq('id', safePayload.id);
            error = updateError;
          } else if (pendingOp.action === 'upsert') {
            const { error: upsertError } = await supabase
              .from(pendingOp.table)
              .upsert([safePayload], { onConflict: pendingOp.conflictTarget || 'id' });
            error = upsertError;
          } else if (pendingOp.action === 'delete') {
            const { error: deleteError } = await supabase
              .from(pendingOp.table)
              .delete()
              .match(safePayload);
            error = deleteError;
          } else {
            const { error: insertError } = await supabase
              .from(pendingOp.table)
              .insert([safePayload]);
            error = insertError;
          }
        } catch (err) {
          error = err;
        }

        let recoveredParentId = null;
        if (error && error.code === '23503' && pendingOp.table === 'requirement_items') {
             console.warn(`[DIAGNOSTIC] FK Violation on requirement_items. Fetching recent parent to recover orphan...`);
             try {
                 const { data: recentReq } = await supabase
                     .from('requirements')
                     .select('id')
                     .eq('assigned_to', userId)
                     .order('created_at', { ascending: false })
                     .limit(1);
                 
                 if (recentReq && recentReq.length > 0) {
                     recoveredParentId = recentReq[0].id;
                     console.log(`[DIAGNOSTIC] Found recovery parent: ${recoveredParentId}`);
                 }
             } catch (fetchErr) {
                 console.error('Failed to fetch recovery parent', fetchErr);
             }
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
              
              if (error.code === '23503' && pendingOp.table === 'requirement_items') {
                 if (recoveredParentId) {
                     item.payload.requirement_id = recoveredParentId;
                     item.status = 'PENDING'; 
                     console.log(`[DIAGNOSTIC] Orphan recovered locally. Will retry in next loop.`);
                 } else {
                     item.status = 'FAILED';
                     item.last_error = error.message || 'No parent found for recovery';
                 }
              } else {
                 item.status = 'FAILED';
                 item.last_error = error.message || 'Unknown database error';
                 item.last_attempted_at = new Date().toISOString();
                 // Save the recovery patch if it failed
                 if (pendingOp.table === 'requirements' && item.payload.status === 'Open') {
                     item.payload.status = 'New';
                 }
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
