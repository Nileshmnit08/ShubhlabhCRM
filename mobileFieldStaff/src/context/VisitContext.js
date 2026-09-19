import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { SyncService } from '../services/SyncService';
import * as Location from 'expo-location';
import { getDestinationStateKey, getDistanceStateKey } from '../services/BackgroundLocationService';

const VisitContext = createContext({});

const ACTIVE_VISIT_KEY = '@active_visit';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const VisitProvider = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [activeVisit, setActiveVisit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [warningShown, setWarningShown] = useState(false);
  const isFinishingRef = useRef(false);

  // Helper to reliably fetch location without hanging
  const getFastLocation = async (requireFresh = true) => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission is required.');
      }

      // Try current position with a strict 10-second timeout for high accuracy
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 10000))
        ]);
        
        const locationAgeMs = Date.now() - loc.timestamp;
        if (requireFresh && locationAgeMs > 300000) { // 5 minutes max age
           throw new Error('Retrieved location is too old.');
        }

        return { 
          latitude: loc.coords.latitude, 
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          timestamp: loc.timestamp
        };
      } catch (err) {
        // Fallback to last known position only if it is sufficiently fresh
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          const locationAgeMs = Date.now() - lastLoc.timestamp;
          if (locationAgeMs <= 300000) { // 5 minutes max age
            return { 
              latitude: lastLoc.coords.latitude, 
              longitude: lastLoc.coords.longitude,
              accuracy: lastLoc.coords.accuracy,
              timestamp: lastLoc.timestamp
            };
          }
        }
        throw new Error('Fresh GPS location unavailable. Please step outside or wait for better signal.');
      }
    } catch (e) {
      console.log('Location fetch failed:', e.message);
      throw e; // Propagate so startVisit can explicitly reject
    }
  };

  useEffect(() => {
    loadActiveVisit();
  }, [userId]);

  // FA-TRAVEL-04: Monitor active visit duration
  useEffect(() => {
    let interval;
    if (activeVisit && !isFinishingRef.current) {
      interval = setInterval(() => {
        const elapsedMins = (Date.now() - new Date(activeVisit.started_at).getTime()) / 60000;
        
        if (elapsedMins >= 60 && elapsedMins < 75 && !warningShown) {
          setWarningShown(true);
          Alert.alert(
            "Visit is still active / विज़िट अभी भी सक्रिय है",
            "You have been on this visit for more than 1 hour. / आप इस विज़िट पर 1 घंटे से अधिक समय से हैं।",
            [
              {
                text: "CONTINUE VISIT / जारी रखें",
                style: "cancel",
                onPress: () => {
                  // Keep it open, warningAcknowledged is implicitly handled by warningShown state
                }
              },
              {
                text: "END VISIT / समाप्त करें",
                onPress: () => {
                  finishVisit([{ product_type: 'Manual Close', status: 'Closed after warning' }]);
                }
              }
            ]
          );
        } else if (elapsedMins >= 75) {
          // Auto-close after 75 minutes
          finishVisit([{ product_type: 'System', status: 'Auto-closed due to 75+ mins inactivity' }], 'AUTO_CLOSED');
        }
      }, 60000); // Check every minute
    } else {
      setWarningShown(false);
    }
    return () => clearInterval(interval);
  }, [activeVisit, warningShown]);

  const loadActiveVisit = async () => {
    if (!userId) {
      setActiveVisit(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const stored = await AsyncStorage.getItem(`${ACTIVE_VISIT_KEY}_${userId}`);
      if (stored) {
        setActiveVisit(JSON.parse(stored));
      } else {
        setActiveVisit(null);
      }
    } catch (e) {
      console.error('Failed to load active visit:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const startVisit = async (customerContext) => {
    if (!userId) throw new Error('Authentication required to start a visit.');
    if (activeVisit) throw new Error('A visit is already active. Finish it first.');

    // Fetch fresh location, throw if unavailable
    let location;
    try {
      location = await getFastLocation(true);
    } catch (e) {
      throw new Error(`Cannot start visit: ${e.message}`);
    }

    const newVisit = {
      id: generateId(), // Guarantee ID exists for idempotency
      party_id: customerContext.party_id,
      customerName: customerContext.customerName,
      staff_id: userId,
      started_at: new Date().toISOString(),
      start_latitude: location.latitude,
      start_longitude: location.longitude,
      start_location_accuracy: location.accuracy,
      start_location_timestamp: new Date(location.timestamp).toISOString(),
      requirements: [],
    };

    // FA-TRAVEL-03: Create Segment to this Visit
    const destKey = getDestinationStateKey(userId);
    const destStr = await AsyncStorage.getItem(destKey);
    if (destStr) {
      const destState = JSON.parse(destStr);
      
      const distanceKey = getDistanceStateKey(destState.tracking_session_id);
      const distanceStr = await AsyncStorage.getItem(distanceKey);
      const currentDistance = distanceStr ? JSON.parse(distanceStr).accumulatedDistanceKm : 0;
      const segmentDistance = currentDistance - destState.distanceAtDestination;
      
      await SyncService.enqueueOperation('staff_travel_segments', {
        id: generateId(),
        tracking_session_id: destState.tracking_session_id,
        staff_id: userId,
        from_type: destState.type,
        from_reference_id: destState.referenceId,
        from_latitude: destState.latitude,
        from_longitude: destState.longitude,
        from_timestamp: destState.timestamp,
        to_type: 'VISIT',
        to_reference_id: newVisit.id,
        to_latitude: location.latitude,
        to_longitude: location.longitude,
        to_timestamp: newVisit.started_at,
        distance_km: segmentDistance > 0 ? segmentDistance : 0,
        status: 'COMPLETED'
      }, userId, 'insert');
    }

    setActiveVisit(newVisit);
    await AsyncStorage.setItem(`${ACTIVE_VISIT_KEY}_${userId}`, JSON.stringify(newVisit));
    return newVisit;
  };

  const saveRequirement = async (requirement) => {
    if (!activeVisit) throw new Error('No active visit to save requirement to.');
    
    const updatedVisit = {
      ...activeVisit,
      requirements: [...(activeVisit.requirements || []), { ...requirement, id: generateId() }]
    };
    
    setActiveVisit(updatedVisit);
    await AsyncStorage.setItem(`${ACTIVE_VISIT_KEY}_${userId}`, JSON.stringify(updatedVisit));
  };

  const finishVisit = async (outcomes, statusOverride = 'COMPLETED') => {
    if (!userId) throw new Error('Authentication required to finish a visit.');
    if (!activeVisit) throw new Error('No active visit to finish.');
    if (isFinishingRef.current) return;
    
    isFinishingRef.current = true;
    try {
      const ended_at = new Date().toISOString();
    const duration_seconds = Math.floor((new Date(ended_at) - new Date(activeVisit.started_at)) / 1000);

    // Re-fetch location for checkout if available, but don't strictly block completion if it fails
    let checkoutLoc = null;
    try {
      checkoutLoc = await getFastLocation(false);
    } catch (e) {
      console.log('Checkout location failed, safely falling back to start location for checkout.');
    }
    
    const endLat = checkoutLoc?.latitude || activeVisit.start_latitude;
    const endLng = checkoutLoc?.longitude || activeVisit.start_longitude;

    const visitPayload = {
      id: activeVisit.id,
      party_id: activeVisit.party_id,
      staff_id: activeVisit.staff_id,
      status: statusOverride,
      started_at: activeVisit.started_at,
      ended_at,
      duration_seconds,
      latitude: endLat,
      longitude: endLng,
      outcomes,
      notes: ''
    };

    // Construct the fully hydrated completed visit for the summary screen
    const completedVisit = {
      ...visitPayload,
      customerName: activeVisit.customerName,
      requirements: activeVisit.requirements || []
    };

    // Push requirements to SyncService
    if (activeVisit.requirements && activeVisit.requirements.length > 0) {
      for (const req of activeVisit.requirements) {
        const reqPayload = {
          id: req.id,
          party_id: activeVisit.party_id,
          product_type: req.product_type || 'General Requirement',
          quantity: req.quantity,
          expected_date: req.expected_date,
          status: 'New', // Complies with req_status_check
          assigned_to: userId
        };
        await SyncService.enqueueOperation('requirements', reqPayload, userId);
      }
    }

    // Push visit to SyncService
    await SyncService.enqueueOperation('crm_visits', visitPayload, userId);

    // Push activity log to SyncService
    const activityPayload = {
      id: generateId(),
      actor_id: userId,
      module: 'Visits',
      action_type: 'COMPLETED',
      entity_type: 'crm_parties',
      entity_id: activeVisit.party_id,
      summary: `Completed visit with ${activeVisit.customerName} (${duration_seconds}s)`,
      metadata: { duration_seconds, outcomes, requirements_count: activeVisit.requirements?.length || 0 }
    };
    await SyncService.enqueueOperation('activity_logs', activityPayload, userId);

    // FA-TRAVEL-03: Establish new destination boundary for next segment
    const destKey = getDestinationStateKey(userId);
    const destStr = await AsyncStorage.getItem(destKey);
    if (destStr) {
      const destState = JSON.parse(destStr);
      const distanceKey = getDistanceStateKey(destState.tracking_session_id);
      const distanceStr = await AsyncStorage.getItem(distanceKey);
      const currentDistance = distanceStr ? JSON.parse(distanceStr).accumulatedDistanceKm : 0;
      
      const newDestState = {
        tracking_session_id: destState.tracking_session_id,
        type: 'VISIT',
        referenceId: activeVisit.id,
        latitude: endLat,
        longitude: endLng,
        timestamp: ended_at,
        distanceAtDestination: currentDistance
      };
      await AsyncStorage.setItem(destKey, JSON.stringify(newDestState));
    }

    // Clear active visit locally
    setActiveVisit(null);
    await AsyncStorage.removeItem(`${ACTIVE_VISIT_KEY}_${userId}`);
    
    return completedVisit;
    } finally {
      isFinishingRef.current = false;
    }
  };

  return (
    <VisitContext.Provider value={{ activeVisit, isLoading, startVisit, finishVisit, saveRequirement }}>
      {children}
    </VisitContext.Provider>
  );
};

export const useVisit = () => useContext(VisitContext);
