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

    // 4. Schedule local notifications for the strictly NEW messages
    for (const notif of newNotifs) {
      await Notifications.scheduleNotificationAsync({
        identifier: notif.id,
        content: {
          title: notif.title || 'Shubh Labh Staff',
          body: notif.message || 'New message',
          data: {
            type: 'chat_message',
            conversation_id: notif.entity_id,
            notification_id: notif.id
          }
        },
        trigger: null, // deliver immediately
      });
      deliveredIds.push(notif.id);
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
