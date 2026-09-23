import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { SyncService } from './SyncService';

const getStorageKey = (userId) => `@notifications_${userId}`;

export class InAppNotificationService {
  /**
   * Retrieves the locally cached notifications for the user.
   */
  static async getLocalNotifications(userId) {
    if (!userId) return [];
    try {
      const data = await AsyncStorage.getItem(getStorageKey(userId));
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error fetching local notifications:', error);
      return [];
    }
  }

  /**
   * Saves the provided notifications list to the user's local cache.
   */
  static async saveLocalNotifications(userId, notifications) {
    if (!userId) return;
    try {
      await AsyncStorage.setItem(getStorageKey(userId), JSON.stringify(notifications));
    } catch (error) {
      console.error('Error saving local notifications:', error);
    }
  }

  /**
   * Clears the notification cache. Usually called on logout to enforce staff isolation.
   */
  static async clearLocalState(userId) {
    if (!userId) return;
    try {
      await AsyncStorage.removeItem(getStorageKey(userId));
    } catch (error) {
      console.error('Error clearing local notifications:', error);
    }
  }

  /**
   * Syncs notifications from the backend down to local storage.
   * Preserves existing local state and deduplicates by authoritative `id`.
   */
  static async syncNotifications(userId) {
    if (!userId) return [];
    
    // 1. Get current local state
    const local = await this.getLocalNotifications(userId);
    
    try {
      // 2. Fetch authoritative state from backend
      // In a robust offline-first app, we'd query by `updated_at > last_sync_time`. 
      // For simplicity, we fetch recent notifications.
      const { data: serverNotifications, error } = await supabase
        .from('crm_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
        
      if (error) throw error;
      
      // 3. Deduplicate and merge
      // We prioritize server data for truth (e.g., if another device marked it read)
      const mergedMap = new Map();
      
      // Seed map with local
      local.forEach(n => mergedMap.set(n.id, n));
      
      // Overwrite/Add server data
      serverNotifications.forEach(n => mergedMap.set(n.id, n));
      
      // Convert map to array and sort by created_at desc
      const merged = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
      );
      
      // 4. Save updated local state
      await this.saveLocalNotifications(userId, merged);
      return merged;
      
    } catch (error) {
      console.error('Error syncing notifications from backend:', error);
      // Return local state if backend fetch fails (offline behavior)
      return local;
    }
  }

  /**
   * Marks a notification as read locally, then pushes the change to the backend via SyncService.
   */
  static async markAsRead(userId, notificationId) {
    if (!userId || !notificationId) return;
    
    // 1. Update local state immediately for snappy UI
    let local = await this.getLocalNotifications(userId);
    let updated = false;
    
    local = local.map(n => {
      if (n.id === notificationId && !n.is_read) {
        updated = true;
        return { ...n, is_read: true };
      }
      return n;
    });
    
    if (updated) {
      await this.saveLocalNotifications(userId, local);
      
      // 2. Enqueue the mutation to sync to the backend when online
      // We pass the exact payload the backend requires
      await SyncService.enqueueOperation('crm_notifications', {
        id: notificationId,
        is_read: true
      }, userId, 'update');
    }
  }

  /**
   * Marks all notifications for a specific entity as read locally and syncs them.
   */
  static async markEntityAsRead(userId, entityId) {
    if (!userId || !entityId) return;

    let local = await this.getLocalNotifications(userId);
    let updated = false;

    local = local.map(n => {
      if (n.entity_id === entityId && !n.is_read) {
        updated = true;
        
        // Enqueue the backend mutation for this specific notification
        SyncService.enqueueOperation('crm_notifications', {
          id: n.id,
          is_read: true
        }, userId, 'update');

        return { ...n, is_read: true };
      }
      return n;
    });

    if (updated) {
      await this.saveLocalNotifications(userId, local);
    }
  }
}
