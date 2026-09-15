import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { SyncService } from '../services/SyncService';
import * as Location from 'expo-location';

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

  // Helper to reliably fetch location without hanging
  const getFastLocation = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return { latitude: null, longitude: null };

      // Try current position with a strict timeout
      try {
        const loc = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ]);
        return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      } catch (err) {
        // Fallback to last known position if current hangs/times out
        const lastLoc = await Location.getLastKnownPositionAsync();
        if (lastLoc) {
          return { latitude: lastLoc.coords.latitude, longitude: lastLoc.coords.longitude };
        }
      }
    } catch (e) {
      console.log('Location fetch failed safely:', e);
    }
    return { latitude: null, longitude: null };
  };

  useEffect(() => {
    loadActiveVisit();
  }, [userId]);

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

    // Fetch location if available
    const { latitude, longitude } = await getFastLocation();

    const newVisit = {
      id: generateId(), // Guarantee ID exists for idempotency
      party_id: customerContext.party_id,
      customerName: customerContext.customerName,
      staff_id: userId,
      started_at: new Date().toISOString(),
      start_latitude: latitude,
      start_longitude: longitude,
      requirements: [],
    };

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

  const finishVisit = async (outcomes) => {
    if (!userId) throw new Error('Authentication required to finish a visit.');
    if (!activeVisit) throw new Error('No active visit to finish.');

    const ended_at = new Date().toISOString();
    const duration_seconds = Math.floor((new Date(ended_at) - new Date(activeVisit.started_at)) / 1000);

    // Re-fetch location for checkout if available
    const checkoutLoc = await getFastLocation();
    const endLat = checkoutLoc.latitude || activeVisit.start_latitude;
    const endLng = checkoutLoc.longitude || activeVisit.start_longitude;

    const visitPayload = {
      id: activeVisit.id,
      party_id: activeVisit.party_id,
      staff_id: activeVisit.staff_id,
      status: 'COMPLETED',
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
          status: 'Open',
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

    // Clear active visit locally
    setActiveVisit(null);
    await AsyncStorage.removeItem(`${ACTIVE_VISIT_KEY}_${userId}`);
    
    return completedVisit;
  };

  return (
    <VisitContext.Provider value={{ activeVisit, isLoading, startVisit, finishVisit, saveRequirement }}>
      {children}
    </VisitContext.Provider>
  );
};

export const useVisit = () => useContext(VisitContext);
