import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { supabase } from '../lib/supabase';
import { SyncService } from '../services/SyncService';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/BackgroundLocationService';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SESSION_STORAGE_KEY = '@active_field_session';

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export function FieldSessionCard() {
  const { session } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      loadSession();
    }
  }, [session?.user?.id]);

  const loadSession = async () => {
    setIsLoading(true);
    try {
      // Check local storage first for offline capability
      const localStr = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
      if (localStr) {
        setActiveSession(JSON.parse(localStr));
      } else {
        // Fallback to online check if possible
        if (SyncService.getNetworkStatus && await SyncService.getNetworkStatus()) {
            const { data, error } = await supabase
              .from('staff_tracking_sessions')
              .select('*')
              .eq('staff_id', session.user.id)
              .eq('status', 'OPEN')
              .limit(1);
            
            if (data && data.length > 0) {
              setActiveSession(data[0]);
              await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data[0]));
            }
        }
      }
    } catch (e) {
      console.warn('Failed to load field session:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is required to start a field session.');
      return null;
    }
    const providerStatus = await Location.getProviderStatusAsync();
    if (!providerStatus.locationServicesEnabled) {
      Alert.alert('Location Disabled', 'Please enable location services.');
      return null;
    }
    
    try {
      return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    } catch (e) {
      console.warn("Could not get current position, falling back to last known", e);
      return await Location.getLastKnownPositionAsync();
    }
  };

  const handleStartSession = async () => {
    if (activeSession) return;
    setIsProcessing(true);
    
    try {
      const loc = await getLocation();
      if (!loc) {
        setIsProcessing(false);
        return; // Failed to get location
      }

      const sessionId = generateId();
      const nowIso = new Date().toISOString();
      const businessDate = nowIso.split('T')[0];

      const newSession = {
        id: sessionId,
        staff_id: session.user.id,
        business_date: businessDate,
        started_at: nowIso,
        started_latitude: loc.coords.latitude,
        started_longitude: loc.coords.longitude,
        started_accuracy: loc.coords.accuracy,
        status: 'OPEN'
      };

      await SyncService.enqueueOperation('staff_tracking_sessions', newSession, session.user.id, 'insert');
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      setActiveSession(newSession);

      // Start background tracking for GPS points (FM-02)
      try {
        await startBackgroundLocationTracking(session.user.id);
      } catch (trackErr) {
        console.warn("Background tracking start failed", trackErr);
      }

    } catch (e) {
      Alert.alert('Error', 'Failed to start session: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    setIsProcessing(true);
    
    try {
      let endLoc = null;
      try {
        endLoc = await getLocation();
      } catch (e) {
        console.warn("End location failed");
      }

      const nowIso = new Date().toISOString();
      const updatedSession = {
        id: activeSession.id,
        ended_at: nowIso,
        ended_latitude: endLoc?.coords?.latitude || null,
        ended_longitude: endLoc?.coords?.longitude || null,
        ended_accuracy: endLoc?.coords?.accuracy || null,
        status: 'CLOSED'
      };

      await SyncService.enqueueOperation('staff_tracking_sessions', updatedSession, session.user.id, 'update');
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
      setActiveSession(null);

      // Stop background tracking (FM-02)
      try {
        await stopBackgroundLocationTracking();
      } catch (trackErr) {
        console.warn("Background tracking stop failed", trackErr);
      }

    } catch (e) {
      Alert.alert('Error', 'Failed to end session: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.card, elevation.level1, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (activeSession) {
    const startedTime = new Date(activeSession.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return (
      <View style={[styles.card, elevation.level1]}>
        <View style={styles.activeHeader}>
          <View style={styles.dot} />
          <Text style={styles.activeTitle}>FIELD SESSION ACTIVE</Text>
        </View>
        <Text style={styles.startedText}>Started: {startedTime}</Text>
        <TouchableOpacity 
          style={styles.endBtn} 
          onPress={handleEndSession}
          disabled={isProcessing}
        >
          {isProcessing ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.btnText}>END FIELD SESSION</Text>}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.card, elevation.level1]}>
      <TouchableOpacity 
        style={styles.startBtn} 
        onPress={handleStartSession}
        disabled={isProcessing}
      >
        {isProcessing ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.startBtnText}>START FIELD SESSION</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: rounded.lg,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  startBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#E5EEFF',
    borderRadius: rounded.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  startBtnText: {
    ...typography.labelLg,
    color: colors.primary,
    fontWeight: 'bold',
  },
  activeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4caf50',
    marginRight: 8,
  },
  activeTitle: {
    ...typography.labelLg,
    color: '#2e7d32',
    fontWeight: 'bold',
  },
  startedText: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: 16,
  },
  endBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: rounded.md,
  },
  btnText: {
    ...typography.labelLg,
    color: colors.onPrimary,
    fontWeight: 'bold',
  },
});
