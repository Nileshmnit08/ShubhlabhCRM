import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { enqueueEvent } from './SyncManager';

export const captureForegroundLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Permission to access location was denied' };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { data: userData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !userData?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const success = await enqueueEvent('staff_location_events', {
      user_id: userData.user.id,
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      is_background: false,
      captured_at: new Date(location.timestamp).toISOString()
    });

    if (!success) {
      return { success: false, error: 'Failed to queue location event' };
    }

    return { success: true, location };
  } catch (err) {
    return { success: false, error: err.message };
  }
};
