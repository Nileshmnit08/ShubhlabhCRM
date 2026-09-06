import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../lib/supabase';

const QUEUE_KEY = '@shubhlabh_sync_queue';
let isFlushing = false;

// Initialize the event listener
export const initSyncManager = () => {
  NetInfo.addEventListener(state => {
    if (state.isConnected && state.isInternetReachable !== false) {
      flushQueue();
    }
  });
};

export const enqueueEvent = async (table, payload) => {
  try {
    const queue = await getQueue();
    
    // Assign a stable UUID for idempotency if it doesn't have one
    const event = {
      ...payload,
      id: payload.id || Crypto.randomUUID(),
    };
    
    queue.push({
      table,
      payload: event,
      queuedAt: new Date().toISOString()
    });

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SyncManager] Queued event for ${table} (${queue.length} total pending)`);
    
    // Try to flush immediately just in case we are online
    flushQueue();
    return true;
  } catch (error) {
    console.error('[SyncManager] Error enqueueing event', error);
    return false;
  }
};

const getQueue = async () => {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('[SyncManager] Error reading queue', e);
  }
  return [];
};

const flushQueue = async () => {
  if (isFlushing) return;
  isFlushing = true;

  try {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      isFlushing = false;
      return;
    }

    const queue = await getQueue();
    if (queue.length === 0) {
      isFlushing = false;
      return;
    }

    console.log(`[SyncManager] Attempting to flush ${queue.length} events...`);
    const remainingQueue = [];

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      try {
        const { error } = await supabase.from(item.table).insert(item.payload);
        
        if (error) {
          // If the error is a duplicate key constraint (HTTP 409 / Code 23505), it means it was already synced
          if (error.code === '23505') {
            console.log(`[SyncManager] Duplicate event detected for ${item.table} (ID: ${item.payload.id}). Skipping.`);
          } else {
            console.error(`[SyncManager] Sync failed for ${item.table}:`, error.message);
            remainingQueue.push(item);
          }
        } else {
          console.log(`[SyncManager] Successfully synced event to ${item.table}`);
        }
      } catch (err) {
        console.error(`[SyncManager] Unexpected error during sync:`, err);
        remainingQueue.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
    console.log(`[SyncManager] Flush complete. ${remainingQueue.length} events remaining.`);
  } catch (err) {
    console.error('[SyncManager] Flush Queue error', err);
  } finally {
    isFlushing = false;
  }
};
