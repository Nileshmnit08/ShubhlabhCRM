import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { enqueueEvent } from './SyncManager';

const LOCATION_TASK_NAME = 'background-location-task';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('Background Location Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const loc = locations[0];
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          await enqueueEvent('staff_location_events', {
            user_id: userData.user.id,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            is_background: true
          });
          console.log('Background location queued');
        }
      } catch (err) {
        console.error('Failed to queue background location', err);
      }
    }
  }
});

export const startBackgroundLocation = async () => {
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus === 'granted') {
    const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
    if (backgroundStatus === 'granted') {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 300000, // 5 minutes
        distanceInterval: 100, // 100 meters
        deferredUpdatesInterval: 300000,
        foregroundService: {
          notificationTitle: "Shubh Labh CRM",
          notificationBody: "Location tracking is active",
          notificationColor: "#0EA5E9"
        }
      });
      return true;
    }
  }
  return false;
};

export const stopBackgroundLocation = async () => {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
};
