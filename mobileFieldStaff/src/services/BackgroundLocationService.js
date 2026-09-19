import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateDistanceKm } from '../utils/location';
import { SyncService } from './SyncService';

export const LOCATION_TASK_NAME = 'background-location-task';
const getGeofenceStorageKey = (userId) => `@geofence_state_${userId}`;
const getSessionStorageKey = (userId) => `@travel_session_id_${userId}`;
export const getDistanceStateKey = (sessionId) => `@travel_distance_state_${sessionId}`;
export const getDestinationStateKey = (userId) => `@travel_destination_state_${userId}`;

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const GEOFENCE_RADIUS_KM = 0.05; // 50 meters radius
const MIN_ACCURACY_M = 50; // Reject updates worse than 50 meters
const MIN_DISTANCE_KM = 0.01; // 10 meters (Stationary noise filter)
const MAX_SPEED_KM_H = 120; // 120 km/h (Jump protection)

// FA-10: Initialize Geofence State on Tracking Start
export const initializeGeofenceCustomers = async (userId) => {
  try {
    const { data: customers, error } = await supabase
      .from('crm_parties')
      .select('id, latitude, longitude')
      .eq('assigned_owner_id', userId)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.error("Failed to fetch geofence customers:", error.message);
      return 0;
    }

    const stateObj = {};
    customers.forEach(c => {
      stateObj[c.id] = {
        id: c.id,
        latitude: parseFloat(c.latitude),
        longitude: parseFloat(c.longitude),
        status: 'UNKNOWN',
        last_processed_timestamp: 0
      };
    });

    const storageKey = getGeofenceStorageKey(userId);
    await AsyncStorage.setItem(storageKey, JSON.stringify(stateObj));
    // console.log(`Initialized ${customers.length} geofences.`);
    return customers.length;
  } catch (err) {
    console.error("Error initializing geofences:", err);
    return 0;
  }
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error("Background Location Error:", error.message);
    return;
  }
  if (data) {
    const { locations } = data;
    if (!locations || locations.length === 0) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
         console.warn("Location update discarded: User not authenticated.");
         return;
      }
      
      const loc = locations[0];
      
      // 1. Log continuous location update (FA-09)
      try {
        await SyncService.enqueueOperation('staff_location_history', {
          staff_id: session.user.id,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          captured_at: new Date(loc.timestamp).toISOString()
        }, session.user.id);
      } catch (insertError) {
        console.error("Failed to enqueue location:", insertError.message);
      }

      // FA-10: Geofence Evaluation
      // Reject if accuracy is worse than 50 meters to prevent GPS jitter
      if (loc.coords.accuracy > MIN_ACCURACY_M) {
        console.warn(`Location accuracy ${loc.coords.accuracy}m rejected for geofencing.`);
        return;
      }

      const storageKey = getGeofenceStorageKey(session.user.id);
      const stateStr = await AsyncStorage.getItem(storageKey);
      if (!stateStr) return; // No geofences to monitor

      const geofenceState = JSON.parse(stateStr);
      let stateChanged = false;

      // Evaluate distance for each eligible customer
      for (const customerId of Object.keys(geofenceState)) {
        const customer = geofenceState[customerId];
        
        // FA-10: Idempotency protection against duplicate OS/TaskManager events
        if (customer.last_processed_timestamp && loc.timestamp <= customer.last_processed_timestamp) {
           continue; // Already processed this or a newer update
        }

        const distanceKm = calculateDistanceKm(
          loc.coords.latitude, loc.coords.longitude,
          customer.latitude, customer.longitude
        );

        if (distanceKm == null) continue;

        customer.last_processed_timestamp = loc.timestamp;
        stateChanged = true; // State changed due to timestamp update

        let newStatus = customer.status;
        let eventToTrigger = null;

        // FA-10: Strict State Machine
        if (distanceKm <= GEOFENCE_RADIUS_KM && (customer.status === 'OUTSIDE' || customer.status === 'UNKNOWN')) {
          newStatus = 'INSIDE';
          eventToTrigger = 'ENTER';
        } else if (distanceKm > GEOFENCE_RADIUS_KM && customer.status === 'INSIDE') {
          newStatus = 'OUTSIDE';
          eventToTrigger = 'EXIT';
        } else if (distanceKm > GEOFENCE_RADIUS_KM && customer.status === 'UNKNOWN') {
          newStatus = 'OUTSIDE';
          // No event on UNKNOWN -> OUTSIDE
        }

        if (eventToTrigger) {
          // Record event to SyncQueue
          try {
            await SyncService.enqueueOperation('geofence_events', {
              customer_id: customer.id,
              staff_id: session.user.id,
              event_type: eventToTrigger,
              event_time: new Date(loc.timestamp).toISOString(),
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              accuracy: loc.coords.accuracy,
              distance_m: Math.round(distanceKm * 1000)
            }, session.user.id);
            
            customer.status = newStatus;
            // console.log(`Geofence ${eventToTrigger} enqueued for customer ${customer.id}`);
          } catch (geoErr) {
            // console.error(`Geofence enqueue failed for customer ${customer.id}:`, geoErr.message);
          }
        }
      }

      // Persist state if changed
      if (stateChanged) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(geofenceState));
      }

      // FA-TRAVEL-02: GPS Travel Distance Engine
      if (loc.coords.accuracy <= MIN_ACCURACY_M) {
        const sessionKey = getSessionStorageKey(session.user.id);
        const activeSessionId = await AsyncStorage.getItem(sessionKey);
        
        if (activeSessionId) {
          const distanceStateKey = getDistanceStateKey(activeSessionId);
          const stateStr = await AsyncStorage.getItem(distanceStateKey);
          
          let state = stateStr ? JSON.parse(stateStr) : {
            lastValidLat: loc.coords.latitude,
            lastValidLon: loc.coords.longitude,
            lastValidTimestamp: loc.timestamp,
            accumulatedDistanceKm: 0
          };

          const distanceKm = calculateDistanceKm(
            state.lastValidLat, state.lastValidLon,
            loc.coords.latitude, loc.coords.longitude
          );

          if (distanceKm != null && distanceKm >= MIN_DISTANCE_KM) {
            const timeDiffHours = (loc.timestamp - state.lastValidTimestamp) / (1000 * 60 * 60);
            
            if (timeDiffHours > 0) {
              const speed = distanceKm / timeDiffHours;
              
              if (speed <= MAX_SPEED_KM_H) {
                // Valid movement
                state.accumulatedDistanceKm += distanceKm;
                state.lastValidLat = loc.coords.latitude;
                state.lastValidLon = loc.coords.longitude;
                state.lastValidTimestamp = loc.timestamp;
                
                await AsyncStorage.setItem(distanceStateKey, JSON.stringify(state));
                
                // Enqueue update to staff_tracking_sessions
                // SyncService naturally throttles and deduplicates these updates by local_id
                await SyncService.enqueueOperation('staff_tracking_sessions', {
                  id: activeSessionId,
                  total_distance_km: state.accumulatedDistanceKm,
                  updated_at: new Date(loc.timestamp).toISOString()
                }, session.user.id, 'update');
              } else {
                console.warn(`GPS Jump rejected. Speed: ${speed} km/h`);
              }
            }
          } else if (!stateStr) {
            // First time saving initial state
            await AsyncStorage.setItem(distanceStateKey, JSON.stringify(state));
          }
        }
      }

    } catch (err) {
      console.error("Task Manager Execution Error:", err);
    }
  }
});

export const startBackgroundLocationTracking = async (userId) => {
  // Prevent duplicate tracking starts
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    console.warn('Background tracking is already active.');
    return;
  }

  // Verify the authenticated user/session is available before starting
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error('Active session required to start tracking.');
  }
  const activeUserId = session.user.id;

  // Verify foreground permissions
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    throw new Error('Foreground location permission not granted.');
  }
  
  // Verify background permissions
  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    throw new Error('Background location permission not granted.');
  }

  // Handle unavailable location gracefully
  const providerStatus = await Location.getProviderStatusAsync();
  if (!providerStatus.locationServicesEnabled) {
    throw new Error('Device location services are disabled.');
  }

  // Initialize geofence cache using verified session user
  const monitoredCount = await initializeGeofenceCustomers(activeUserId);

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 60000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "Field Assistant Tracking",
      notificationBody: "Continuous location tracking is active",
      notificationColor: "#0052CC"
    }
  });

  // FA-TRAVEL-01: Create an authoritative tracking session
  const sessionId = generateId();
  await AsyncStorage.setItem(getSessionStorageKey(activeUserId), sessionId);
  
  let currentLoc = null;
  try {
    currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch (e) {
    currentLoc = await Location.getLastKnownPositionAsync();
  }

  const businessDate = new Date().toISOString().split('T')[0]; // Simple local-ish date for business_date
  
  await SyncService.enqueueOperation('staff_tracking_sessions', {
    id: sessionId,
    staff_id: activeUserId,
    business_date: businessDate,
    started_at: new Date().toISOString(),
    started_latitude: currentLoc?.coords?.latitude || null,
    started_longitude: currentLoc?.coords?.longitude || null,
    started_accuracy: currentLoc?.coords?.accuracy || null,
    total_distance_km: 0,
    status: 'OPEN'
  }, activeUserId, 'insert');

  if (currentLoc && currentLoc.coords.accuracy <= MIN_ACCURACY_M) {
    const initialState = {
      lastValidLat: currentLoc.coords.latitude,
      lastValidLon: currentLoc.coords.longitude,
      lastValidTimestamp: currentLoc.timestamp,
      accumulatedDistanceKm: 0
    };
    await AsyncStorage.setItem(getDistanceStateKey(sessionId), JSON.stringify(initialState));
  }
  
  // FA-TRAVEL-03: Initialize Day Start Destination
  const destState = {
    tracking_session_id: sessionId,
    type: 'DAY_START',
    referenceId: sessionId,
    latitude: currentLoc?.coords?.latitude || null,
    longitude: currentLoc?.coords?.longitude || null,
    timestamp: new Date().toISOString(),
    distanceAtDestination: 0
  };
  await AsyncStorage.setItem(getDestinationStateKey(activeUserId), JSON.stringify(destState));

  return monitoredCount;
};

export const stopBackgroundLocationTracking = async () => {
  const hasStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  if (hasStarted) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const activeUserId = session.user.id;
      // Clear geofence state
      await AsyncStorage.removeItem(getGeofenceStorageKey(activeUserId));
      
      // FA-TRAVEL-01: Close the authoritative tracking session
      const sessionKey = getSessionStorageKey(activeUserId);
      const travelSessionId = await AsyncStorage.getItem(sessionKey);
      
      if (travelSessionId) {
        let currentLoc = null;
        try {
          currentLoc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        } catch (e) {
          currentLoc = await Location.getLastKnownPositionAsync();
        }
        
        // Final flush of total_distance_km
        const distanceStateKey = getDistanceStateKey(travelSessionId);
        const stateStr = await AsyncStorage.getItem(distanceStateKey);
        const finalDistance = stateStr ? JSON.parse(stateStr).accumulatedDistanceKm : 0;
        
        const nowIso = new Date().toISOString();
        
        await SyncService.enqueueOperation('staff_tracking_sessions', {
          id: travelSessionId,
          ended_at: nowIso,
          ended_latitude: currentLoc?.coords?.latitude || null,
          ended_longitude: currentLoc?.coords?.longitude || null,
          ended_accuracy: currentLoc?.coords?.accuracy || null,
          total_distance_km: finalDistance,
          status: 'CLOSED'
        }, activeUserId, 'update');
        
        // FA-TRAVEL-03: Create Day End Segment
        const destKey = getDestinationStateKey(activeUserId);
        const destStr = await AsyncStorage.getItem(destKey);
        if (destStr) {
          const destState = JSON.parse(destStr);
          const segmentDistance = finalDistance - destState.distanceAtDestination;
          
          await SyncService.enqueueOperation('staff_travel_segments', {
            id: generateId(),
            tracking_session_id: destState.tracking_session_id,
            staff_id: activeUserId,
            from_type: destState.type,
            from_reference_id: destState.referenceId,
            from_latitude: destState.latitude,
            from_longitude: destState.longitude,
            from_timestamp: destState.timestamp,
            to_type: 'DAY_END',
            to_reference_id: travelSessionId,
            to_latitude: currentLoc?.coords?.latitude || null,
            to_longitude: currentLoc?.coords?.longitude || null,
            to_timestamp: nowIso,
            distance_km: segmentDistance > 0 ? segmentDistance : 0,
            status: 'COMPLETED'
          }, activeUserId, 'insert');
          
          await AsyncStorage.removeItem(destKey);
        }

        await AsyncStorage.removeItem(sessionKey);
        await AsyncStorage.removeItem(distanceStateKey);
      }
    }
  }
};

export const checkIsTracking = async () => {
  return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
};
