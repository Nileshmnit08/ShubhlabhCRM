/**
 * usePushTokenRegistration.js
 * Registers the device's FCM push token with the backend on login.
 * This token is used by the Edge Function to send incoming call push notifications
 * when the app is backgrounded or the phone is locked.
 */
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function usePushTokenRegistration() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    registerToken();
  }, [userId]);

  const registerToken = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') return;

      // Get Expo push token (maps to FCM on Android, APNs on iOS)
      const tokenData = await Notifications.getExpoPushTokenAsync();
      const token = tokenData.data;

      if (!token) return;

      // Upsert token into backend
      const { error } = await supabase
        .from('push_tokens')
        .upsert(
          {
            user_id: userId,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) {
        console.warn('[PushToken] Registration failed:', error.message);
      } else {
        console.log('[PushToken] Registered successfully');
      }
    } catch (err) {
      console.warn('[PushToken] Error:', err.message);
    }
  };
}
