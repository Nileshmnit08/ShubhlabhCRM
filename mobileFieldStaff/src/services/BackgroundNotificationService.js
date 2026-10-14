import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_NOTIFICATION_TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (!userId) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 1. Get previously delivered notification IDs
    const deliveredStr = await AsyncStorage.getItem(`@delivered_bg_notifs_${userId}`);
    let deliveredIds = deliveredStr ? JSON.parse(deliveredStr) : [];

    // 2. Fetch ALL unread chat messages for this user
    const { data: unreadNotifs, error } = await supabase
      .from('crm_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .eq('entity_type', 'CHAT_MESSAGE');

    if (error || !unreadNotifs || unreadNotifs.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Filter out messages we already delivered a local push for
    const newNotifs = unreadNotifs.filter(n => !deliveredIds.includes(n.id));

    if (newNotifs.length === 0) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 4. Group new notifications by conversation so multiple messages from the same conversation
    // update/replace a single tray notification rather than stacking multiple entries.
    const convGroups = new Map();
    for (const notif of newNotifs) {
      const convId = notif.entity_id || notif.id;
      if (!convGroups.has(convId)) {
        convGroups.set(convId, []);
      }
      convGroups.get(convId).push(notif);
    }

    for (const [convId, group] of convGroups.entries()) {
      // Sort to get the latest message
      group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latestNotif = group[0];
      const count = group.length;

      const title = count > 1 
        ? `${latestNotif.title || 'Shubh Labh Staff'} (${count} new messages)` 
        : (latestNotif.title || 'Shubh Labh Staff');

      await Notifications.scheduleNotificationAsync({
        identifier: convId,
        content: {
          title,
          body: latestNotif.message || 'New message',
          channelId: 'chat_messages',
          data: {
            type: 'chat_message',
            conversation_id: latestNotif.entity_id,
            notification_id: latestNotif.id
          },
          sound: true
        },
        trigger: null, // deliver immediately
      });

      // Mark all raw IDs in this group as delivered
      group.forEach(n => deliveredIds.push(n.id));
    }

    // 5. Keep the delivered array from growing indefinitely (keep last 200)
    if (deliveredIds.length > 200) {
      deliveredIds = deliveredIds.slice(-200);
    }

    await AsyncStorage.setItem(`@delivered_bg_notifs_${userId}`, JSON.stringify(deliveredIds));

    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('Background fetch failed:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export class BackgroundNotificationService {
  static async registerTask() {
    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK);
      if (!isRegistered) {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
          minimumInterval: 15 * 60, // 15 minutes
          stopOnTerminate: false, // android only
          startOnBoot: true, // android only
        });
      }
    } catch (err) {
      console.error("Task registration failed:", err);
    }
  }
}
