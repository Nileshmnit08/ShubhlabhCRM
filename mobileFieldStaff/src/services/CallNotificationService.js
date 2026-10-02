/**
 * CallNotificationService.js
 * Handles incoming call notifications when the app is in the background or killed.
 * Uses expo-notifications (FCM on Android) to show a heads-up call notification.
 * 
 * Architecture:
 * 1. When a CALL_INITIATED signal arrives in the foreground: handled by CallContext
 * 2. When app is backgrounded: Supabase Broadcast is inactive, so we need FCM push
 *    (This requires a Supabase Edge Function or backend trigger to send FCM push.
 *     The mobile side registers its FCM token and the backend sends a high-priority
 *     FCM notification which wakes the device.)
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Channel for incoming call notifications (Android)
const CALL_CHANNEL_ID = 'incoming_calls';

export const CallNotificationService = {
  /**
   * Set up the Android notification channel for calls.
   * Must be called at app startup.
   */
  async setupCallChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CALL_CHANNEL_ID, {
        name: 'Incoming Calls',
        description: 'Alerts for incoming audio and video calls',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 300, 500, 300, 500],
        lightColor: '#3B82F6',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,     // Bypass Do Not Disturb for calls
        sound: 'default',
      });
    }
  },

  /**
   * Show a local incoming call notification.
   * Used to simulate a call notification when the app is backgrounded
   * and you want to alert the user even without FCM.
   * (In production, this is replaced by the server-side FCM push)
   */
  async showIncomingCallNotification({ callerName, callerRole, callType, callSessionId }) {
    const isVideo = callType === 'VIDEO';
    await Notifications.scheduleNotificationAsync({
      identifier: `call_${callSessionId}`,
      content: {
        title: `Incoming ${isVideo ? 'Video' : 'Audio'} Call`,
        body: `${callerName} (${callerRole}) is calling you`,
        data: {
          type: 'incoming_call',
          callSessionId,
          callerName,
          callerRole,
          callType,
        },
        categoryIdentifier: 'incoming_call',
        sound: 'default',
        priority: 'max',
        ...(Platform.OS === 'android' && {
          channelId: CALL_CHANNEL_ID,
        }),
      },
      trigger: null, // Immediate
    });
  },

  /**
   * Dismiss the call notification once the call is answered/rejected.
   */
  async dismissCallNotification(callSessionId) {
    await Notifications.dismissNotificationAsync(`call_${callSessionId}`);
  },

  /**
   * Get the push token for this device.
   * This token must be stored in the backend so the server can send FCM pushes.
   */
  async getPushToken() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus !== 'granted') return null;
      }
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (e) {
      console.warn('[CallNotification] getPushToken error:', e);
      return null;
    }
  },

  /**
   * Register call notification categories (for action buttons on notification).
   * Note: Android does not support interactive notification actions the same way iOS does.
   */
  async registerCallCategory() {
    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'accept',
        buttonTitle: '✅ Accept',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'reject',
        buttonTitle: '❌ Decline',
        options: { opensAppToForeground: false },
      },
    ]);
  },
};
