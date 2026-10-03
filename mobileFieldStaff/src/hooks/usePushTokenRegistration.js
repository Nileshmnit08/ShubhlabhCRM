/**
 * usePushTokenRegistration.js
 * Registers the device's FCM push token with the backend on login.
 */
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import messaging from '@react-native-firebase/messaging';
import { v4 as uuidv4 } from 'uuid';

export function usePushTokenRegistration() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const userIdRef = useRef(userId);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    
    registerTokens();

    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      const currentUserId = userIdRef.current;
      if (currentUserId && newToken) {
        await saveFcmToken(currentUserId, newToken);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  const getDeviceId = async () => {
    let deviceId = await AsyncStorage.getItem('@device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      await AsyncStorage.setItem('@device_id', deviceId);
    }
    return deviceId;
  };

  const saveFcmToken = async (uid, fcmToken) => {
    try {
      const deviceId = await getDeviceId();
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          {
            user_id: uid,
            device_id: deviceId,
            fcm_token: fcmToken,
            platform: Platform.OS,
            is_active: true,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id, fcm_token' }
        );

      if (error) {
        console.warn('[PushToken] FCM Registration failed:', error.message);
      } else {
        console.log('[PushToken] FCM Registered successfully');
      }
    } catch (err) {
      console.warn('[PushToken] FCM Save Error:', err.message);
    }
  };

  const registerTokens = async () => {
    try {
      // 1. Native FCM Token (Phase 2 Migration)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          await saveFcmToken(userId, fcmToken);
        }
      }

      // 2. Legacy Expo Token (Phase 1 Migration - retain for older backend)
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        const tokenData = await Notifications.getExpoPushTokenAsync();
        const expoToken = tokenData?.data;
        if (expoToken) {
          const { error } = await supabase
            .from('push_tokens')
            .upsert(
              {
                user_id: userId,
                token: expoToken,
                platform: Platform.OS,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' }
            );
          if (error) {
            console.warn('[PushToken] Legacy Expo Registration failed:', error.message);
          } else {
             console.log('[PushToken] Legacy Expo Registered successfully');
          }
        }
      }
    } catch (err) {
      console.warn('[PushToken] Error:', err.message);
    }
  };
}
