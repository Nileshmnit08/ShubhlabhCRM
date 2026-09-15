import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { Button } from '../components';
import { useAuth } from '../context/AuthContext';
import { 
  startBackgroundLocationTracking, 
  stopBackgroundLocationTracking, 
  checkIsTracking 
} from '../services/BackgroundLocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { staffProfile, logout } = useAuth();
  const [isTracking, setIsTracking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [geofencesCount, setGeofencesCount] = useState(0);

  useEffect(() => {
    const initTrackingStatus = async () => {
      const tracking = await checkIsTracking();
      setIsTracking(tracking);
    };
    initTrackingStatus();
  }, []);

  const handleToggleTracking = async () => {
    setIsLoading(true);
    try {
      if (isTracking) {
        await stopBackgroundLocationTracking();
        setIsTracking(false);
        setGeofencesCount(0);
        Alert.alert(t('tracking.stoppedTitle', 'Tracking Stopped'), t('tracking.stoppedMessage', 'Background location tracking has been disabled.'));
      } else {
        const count = await startBackgroundLocationTracking(staffProfile?.id);
        setIsTracking(true);
        setGeofencesCount(count || 0);
        Alert.alert(
          t('tracking.activeTitle', 'Tracking Active'), 
          t('tracking.activeMessage', 'Background location tracking has started.') + `\nMonitored Geofences: ${count || 0}`
        );
      }
    } catch (error) {
      Alert.alert(t('tracking.errorTitle', 'Tracking Error'), error.message || t('tracking.errorMessage', 'Failed to toggle tracking.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (lang) => {
    try {
      await AsyncStorage.setItem('@app_language', lang);
      i18n.changeLanguage(lang);
    } catch (e) {
      console.error('Failed to change language', e);
    }
  };
  
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.avatarContainer}>
          <MaterialIcons name="person" size={64} color={colors.primary} />
        </View>
        <Text style={styles.name}>{staffProfile?.display_name || 'Field Agent'}</Text>
        <Text style={styles.role}>{staffProfile?.role || 'Territory Manager'}</Text>
        
        <View style={[styles.card, elevation.level1]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Email / Login</Text>
            <Text style={styles.statValue}>{staffProfile?.email || 'Unavailable'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Account Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons 
                name={staffProfile?.is_active ? "check-circle" : "cancel"} 
                size={16} 
                color={staffProfile?.is_active ? colors.primary : colors.error} 
                style={{ marginRight: 6 }} 
              />
              <Text style={[styles.statValue, { color: staffProfile?.is_active ? colors.primary : colors.error, fontSize: 14 }]}>
                {staffProfile?.is_active ? "ACTIVE" : "INACTIVE"}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, elevation.level1, { marginTop: 16 }]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Language / भाषा</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button 
              title="English" 
              variant={i18n.language === 'en' ? "primary" : "secondary"}
              onPress={() => handleLanguageChange('en')}
            />
            <Button 
              title="हिन्दी" 
              variant={i18n.language === 'hi' ? "primary" : "secondary"}
              onPress={() => handleLanguageChange('hi')}
            />
          </View>
        </View>

        <View style={[styles.card, elevation.level1, { marginTop: 16 }]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Tracking Status</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons 
                name={isTracking ? "gps-fixed" : "gps-off"} 
                size={20} 
                color={isTracking ? colors.primary : colors.error} 
                style={{ marginRight: 8 }} 
              />
              <Text style={[styles.statValue, { color: isTracking ? colors.primary : colors.error }]}>
                {isTracking ? "ACTIVE" : "OFF"}
              </Text>
            </View>
          </View>
          {isTracking && (
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Active Geofences</Text>
              <Text style={styles.statValue}>{geofencesCount}</Text>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <Button 
              title={isTracking ? "STOP TRACKING" : "START TRACKING"} 
              variant={isTracking ? "secondary" : "primary"} 
              onPress={handleToggleTracking} 
              disabled={isLoading}
            />
          </View>
        </View>

        <View style={styles.actionContainer}>
          <Button title={t('auth.action.logout')} variant="secondary" onPress={logout} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E5EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  role: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: 32,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  statLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  statValue: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  actionContainer: {
    marginTop: 48,
    width: '100%',
  }
});
