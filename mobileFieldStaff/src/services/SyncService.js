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

const withTimeout = (promiseOrThenable, ms = 15000, errorMsg = 'Network request timed out after 15 seconds') => {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(errorMsg);
      err.code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });
  const wrappedPromise = Promise.resolve(promiseOrThenable).then(
    (res) => {
      if (timer) clearTimeout(timer);
      return res;
    },
    (err) => {
      if (timer) clearTimeout(timer);
      throw err;
    }
  );
  return Promise.race([wrappedPromise, timeoutPromise]);
};

const sanitizeError = (err) => {
  if (!err) return 'Unknown error';
  let msg = typeof err === 'string' ? err : (err.message || JSON.stringify(err));
  return msg
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/apikey\s+[A-Za-z0-9._-]+/gi, 'apikey [REDACTED]')
    .replace(/password\s*[:=]\s*\S+/gi, 'password=[REDACTED]')
    .replace(/"access_token"\s*:\s*"[^"]+"/gi, '"access_token":"[REDACTED]"');
};

const isPermanentError = (error, table) => {
  if (!error) return false;
  const code = error.code ? String(error.code) : '';
  const msg = (error.message || '').toLowerCase();

  // 23505: Unique violation (idempotent success - handled separately)
  if (code === '23505' || msg.includes('duplicate key') || msg.includes('unique constraint')) {
    return false;
  }

  // 42501: Row-level security / permission denied
  if (code === '42501' || msg.includes('permission denied') || msg.includes('violates row-level security')) {
    return true;
  }

  // 23514: Check constraint violation
  if (code === '23514' || msg.includes('check constraint')) {
    return true;
  }

  // 23503: Foreign key violation
  if (code === '23503' || msg.includes('foreign key constraint')) {
    return true;
  }

  // 22P02: Invalid syntax / UUID format error
  if (code === '22P02' || msg.includes('invalid input syntax')) {
    return true;
  }

  // Auth / session expired
  if (msg.includes('jwt expired') || msg.includes('invalid claim') || msg.includes('invalid refresh token')) {
    return true;
  }

  return false;
};

export class SyncService {
  static onQueueChange = null;
  static _queueLock = Promise.resolve();
  static _isProcessing = false;

  /**
   * Recovers any items stranded in 'SYNCING' state due to app termination,
   * background worker interruption, or unhandled exceptions.
   * Also recovers items that failed due to the internal 'undefined is not a function'
   * client-side runtime bug in withTimeout.
   * Items with < 3 attempts are restored to 'PENDING' for safe retry.
   * Items with >= 3 attempts are marked 'FAILED'.
   */
  static async recoverStaleSyncingItems(userId) {
    if (!userId) return;
    let recoveredCount = 0;
    await this._atomicQueueUpdate(userId, queue => {
      let modified = false;
      const now = new Date().toISOString();
      for (const item of queue) {
        if (item.status === 'SYNCING') {
          modified = true;
          recoveredCount++;
          const currentAttempts = item.attempts || 0;
          if (currentAttempts >= 3) {
            item.status = 'FAILED';
            item.last_error = item.last_error || 'Previous sync attempt timed out or was interrupted. Maximum attempts reached.';
          } else {
            item.status = 'PENDING';
            item.last_error = item.last_error || 'Previous sync attempt timed out or was interrupted. Ready to retry.';
          }
          item.last_attempted_at = item.last_attempted_at || now;
        } else if (item.status === 'FAILED' && item.last_error && item.last_error.includes('undefined is not a function')) {
          // Automatic recovery for items that failed purely due to the client-side withTimeout runtime bug
          modified = true;
          recoveredCount++;
          item.status = 'PENDING';
          item.last_error = 'Recovered from client runtime error. Ready to retry.';
          item.attempts = 0; // Reset artificially inflated attempts
          item.last_attempted_at = now;
        }
      }
      return modified ? queue : null;
    });
    if (recoveredCount > 0) {
      console.log(`[SyncService] Recovered ${recoveredCount} stale/errored items for user ${userId}`);
    }
  }

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

    // Synchronous concurrency guard: prevent race conditions from rapid concurrent calls
    if (this._isProcessing) {
      console.log('[SyncService] Already processing queue; skipping concurrent call.');
      return;
    }
    this._isProcessing = true;

    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) {
        console.log('[SyncService] Network disconnected; aborting sync run.');
        return;
      }

      // Recover any stale SYNCING items stranded by previous app termination or network disconnect
      await this.recoverStaleSyncingItems(userId);

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

           // 2. Sort the queue to enforce Chat and Entity Dependencies
           const priorityMap = {
             'crm_parties': 1,
             'requirements': 2,
             'requirement_items': 3,
             'chat_conversations': 4,
             'chat_participants': 5,
             'chat_messages': 6,
             'staff_tracking_sessions': 7,
             'staff_location_history': 8,
             'crm_visits': 9,
             'staff_travel_segments': 10,
             'crm_call_events': 11,
             'crm_notifications': 12
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
                     
                     if (parentInQueue) {
                         console.log(`[DIAGNOSTIC] Blocking requirement_items ${op.local_id} because parent ${parentId} is still in queue with status ${parentInQueue.status}`);
                         return false;
                     }
                 }
             }

             if (op.table === 'chat_participants' || op.table === 'chat_messages') {
                 const parentId = op.payload?.conversation_id;
                 if (parentId) {
                     const parentInQueue = activeQueue.find(parentOp => 
                         parentOp.table === 'chat_conversations' && 
                         (parentOp.payload?.id === parentId || parentOp.local_id === parentId)
                     );
                     
                     if (parentInQueue) {
                         console.log(`[DIAGNOSTIC] Blocking ${op.table} ${op.local_id} because parent conversation ${parentId} is still in queue with status ${parentInQueue.status}`);
                         return false;
                     }
                 }
             }

             if (op.table === 'crm_notifications' && op.payload?.entity_type === 'CHAT_MESSAGE') {
                 const parentId = op.payload?.entity_id;
                 if (parentId) {
                     const parentInQueue = activeQueue.find(parentOp => 
                         parentOp.table === 'chat_conversations' && 
                         (parentOp.payload?.id === parentId || parentOp.local_id === parentId)
                     );
                     
                     if (parentInQueue) {
                         console.log(`[DIAGNOSTIC] Blocking crm_notifications ${op.local_id} because parent conversation ${parentId} is still in queue with status ${parentInQueue.status}`);
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
            // weight, gift, other_gift are now canonical columns in requirement_items, so do not delete them.
          }

          // Safe recovery patch for existing queued items failing req_status_check
          if (pendingOp.table === 'requirements') {
            if (safePayload.status === 'Open') {
              safePayload.status = 'New';
              pendingOp.payload.status = 'New'; // Persist the patch in memory
            }
            if (safePayload.quantity !== undefined && safePayload.quantity <= 0) {
              delete safePayload.quantity;
              if (pendingOp.payload) delete pendingOp.payload.quantity;
            }

            // Recovery: Remove 'created_by' from old failed queued requirements
            if ('created_by' in safePayload) {
              delete safePayload.created_by;
              delete pendingOp.payload.created_by;
            }

            // Fix for old failed payloads (removed weight stripping since it's now supported natively)
            if (safePayload.requirement_items && Array.isArray(safePayload.requirement_items)) {
              // Intentionally leaving weight intact
            }
          }

          // Safe recovery patch for crm_notifications with mismatched conversationId as user_id
          if (pendingOp.table === 'crm_notifications') {
            if (safePayload.entity_type === 'CHAT_MESSAGE' && safePayload.entity_id && safePayload.user_id === safePayload.entity_id) {
              console.warn(`[DIAGNOSTIC] Detected conversation ID as user_id on crm_notifications ${pendingOp.local_id}. Attempting pre-insert recovery...`);
              try {
                const { data: parts } = await supabase
                  .from('chat_participants')
                  .select('user_id')
                  .eq('conversation_id', safePayload.entity_id)
                  .neq('user_id', userId);
                if (parts && parts.length > 0 && parts[0].user_id) {
                  console.log(`[DIAGNOSTIC] Pre-insert recovered recipient user_id: ${parts[0].user_id}`);
                  safePayload.user_id = parts[0].user_id;
                  pendingOp.payload.user_id = parts[0].user_id;
                }
              } catch (recErr) {
                console.warn('Failed pre-insert recovery for crm_notifications user_id:', recErr);
              }
            }
          }
          
          if (pendingOp.action === 'update') {
            const { error: updateError } = await withTimeout(
              supabase
                .from(pendingOp.table)
                .update(safePayload)
                .eq('id', safePayload.id),
              15000,
              `Update on ${pendingOp.table} timed out after 15s`
            );
            error = updateError;
          } else if (pendingOp.action === 'upsert') {
            const { error: upsertError } = await withTimeout(
              supabase
                .from(pendingOp.table)
                .upsert([safePayload], { onConflict: pendingOp.conflictTarget || 'id' }),
              15000,
              `Upsert on ${pendingOp.table} timed out after 15s`
            );
            error = upsertError;
          } else if (pendingOp.action === 'delete') {
            const { error: deleteError } = await withTimeout(
              supabase
                .from(pendingOp.table)
                .delete()
                .match(safePayload),
              15000,
              `Delete on ${pendingOp.table} timed out after 15s`
            );
            error = deleteError;
          } else {
            const { error: insertError } = await withTimeout(
              supabase
                .from(pendingOp.table)
                .insert([safePayload]),
              15000,
              `Insert on ${pendingOp.table} timed out after 15s`
            );
            error = insertError;
          }
        } catch (err) {
          error = err;
        }

        let recoveredParentId = null;
        if (error && error.code === '23503' && pendingOp.table === 'requirement_items') {
             console.warn(`[DIAGNOSTIC] FK Violation on requirement_items. Fetching recent parent to recover orphan...`);
             try {
                 const { data: recentReq } = await withTimeout(
                   supabase
                     .from('requirements')
                     .select('id')
                     .eq('assigned_to', userId)
                     .order('created_at', { ascending: false })
                     .limit(1),
                   5000
                 );
                 
                 if (recentReq && recentReq.length > 0) {
                     recoveredParentId = recentReq[0].id;
                     console.log(`[DIAGNOSTIC] Found recovery parent: ${recoveredParentId}`);
                 }
             } catch (fetchErr) {
                 console.error('Failed to fetch recovery parent', fetchErr);
             }
        }

        let recoveredNotifUserId = null;
        if (error && error.code === '23503' && pendingOp.table === 'crm_notifications') {
             console.warn(`[DIAGNOSTIC] FK Violation on crm_notifications (${error.message}). Attempting recovery via chat_participants...`);
             if (pendingOp.payload?.entity_type === 'CHAT_MESSAGE' && pendingOp.payload?.entity_id) {
                 try {
                     const { data: parts } = await withTimeout(
                       supabase
                         .from('chat_participants')
                         .select('user_id')
                         .eq('conversation_id', pendingOp.payload.entity_id)
                         .neq('user_id', userId),
                       5000
                     );
                     
                     if (parts && parts.length > 0) {
                         const validPart = parts.find(p => p.user_id && p.user_id !== pendingOp.payload.entity_id);
                         if (validPart) {
                             recoveredNotifUserId = validPart.user_id;
                             console.log(`[DIAGNOSTIC] Found recovery participant: ${recoveredNotifUserId}`);
                         }
                     }
                 } catch (fetchErr) {
                     console.error('Failed to resolve recovery participant for crm_notifications', fetchErr);
                 }
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
              item.attempts = (item.attempts || 0) + 1;
              item.last_attempted_at = new Date().toISOString();
              const sanitizedErrMsg = sanitizeError(error.message || error);
              item.last_error = sanitizedErrMsg;

              console.error(`[DIAGNOSTIC] CALL_SYNC_FAILURE: local_id=${pendingOp.local_id} code=${error.code} msg=${sanitizedErrMsg} attempts=${item.attempts}`);
              
              if (error.code === '23503' && pendingOp.table === 'requirement_items') {
                 if (recoveredParentId) {
                     item.payload.requirement_id = recoveredParentId;
                     item.status = 'PENDING'; 
                     console.log(`[DIAGNOSTIC] Orphan recovered locally. Will retry in next loop.`);
                 } else {
                     item.status = 'FAILED';
                     item.last_error = sanitizedErrMsg || 'No parent found for recovery';
                 }
              } else if (error.code === '23503' && pendingOp.table === 'crm_notifications') {
                 if (recoveredNotifUserId) {
                     item.payload.user_id = recoveredNotifUserId;
                     item.status = 'PENDING';
                     item.last_error = null;
                     console.log(`[DIAGNOSTIC] Notification recipient recovered. Will retry in next loop.`);
                 } else {
                     item.status = 'FAILED';
                     item.last_error = 'Invalid recipient user: ID not found in auth.users';
                 }
              } else {
                 const permanent = isPermanentError(error, pendingOp.table);
                 if (permanent || item.attempts >= 3) {
                     item.status = 'FAILED';
                 } else {
                     // Transient / retryable failure (e.g. timeout, network offline)
                     item.status = 'PENDING';
                 }

                 // Save the recovery patch if it failed
                 if (pendingOp.table === 'requirements') {
                     if (item.payload.status === 'Open') {
                         item.payload.status = 'New';
                     }
                     if ('created_by' in item.payload) {
                         delete item.payload.created_by;
                     }
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
