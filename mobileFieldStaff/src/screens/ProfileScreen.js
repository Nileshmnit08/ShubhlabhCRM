import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, Alert, ScrollView, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { Button } from '../components';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { 
  startBackgroundLocationTracking, 
  stopBackgroundLocationTracking, 
  checkIsTracking 
} from '../services/BackgroundLocationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const appConfig = require('../../app.json');

const SectionHeader = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

const ShortcutRow = ({ icon, title, onPress }) => (
  <TouchableOpacity style={styles.shortcutRow} onPress={onPress}>
    <View style={styles.shortcutLeft}>
      <MaterialIcons name={icon} size={24} color={colors.primary} />
      <Text style={styles.shortcutText}>{title}</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
  </TouchableOpacity>
);

export function ProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const { staffProfile, logout } = useAuth();
  const { isOnline, isSyncing, pendingCount, failedCount, lastError, triggerSync } = useSync();
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

  const handleHelpStub = (title) => {
    Alert.alert(title, "Help content is currently unavailable offline.");
  };
  
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* HEADER */}
        <View style={styles.headerSection}>
          <View style={styles.avatarContainer}>
            <MaterialIcons name="person" size={56} color={colors.primary} />
          </View>
          <Text style={styles.name}>{staffProfile?.display_name || 'Field Agent'}</Text>
          <Text style={styles.role}>{staffProfile?.role || 'Territory Manager'}</Text>
          
          <View style={styles.activeBadge}>
            <MaterialIcons 
              name={staffProfile?.is_active ? "check-circle" : "cancel"} 
              size={14} 
              color={staffProfile?.is_active ? colors.primary : colors.error} 
            />
            <Text style={[styles.activeText, { color: staffProfile?.is_active ? colors.primary : colors.error }]}>
              {staffProfile?.is_active ? "ACTIVE" : "INACTIVE"}
            </Text>
          </View>
          <Text style={styles.emailText}>{staffProfile?.email || 'Unavailable'}</Text>
        </View>

        {/* MY WORK */}
        <SectionHeader title="MY WORK" />
        <View style={[styles.card, elevation.level1]}>
          <ShortcutRow 
            icon="people" 
            title="My Customers" 
            onPress={() => navigation.navigate('Customers')} 
          />
          <View style={styles.divider} />
          <ShortcutRow 
            icon="assignment" 
            title="My Tasks & Follow-ups" 
            onPress={() => navigation.navigate('My Work')} 
          />
        </View>

        {/* APP & SYNC */}
        <SectionHeader title="APP & SYNC" />
        <View style={[styles.card, elevation.level1]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Internet</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name={isOnline ? "wifi" : "wifi-off"} size={16} color={isOnline ? colors.primary : colors.error} style={{marginRight: 4}} />
              <Text style={[styles.statValue, { color: isOnline ? colors.primary : colors.error }]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Sync Status</Text>
            <Text style={[styles.statValue, { color: isSyncing ? colors.primary : colors.onSurface }]}>
              {isSyncing ? 'SYNCING...' : 'IDLE'}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Pending Sync Items</Text>
            <Text style={[
              styles.statValue, 
              { color: pendingCount === 'Unavailable' ? colors.error : colors.onSurface, 
                fontSize: pendingCount === 'Unavailable' ? 14 : styles.statValue.fontSize }
            ]}>
              {pendingCount} {failedCount > 0 && `(${failedCount} Failed)`}
            </Text>
          </View>
          {failedCount > 0 && lastError && (
            <View style={{ marginTop: 8, padding: 8, backgroundColor: '#ffebee', borderRadius: 8 }}>
              <Text style={{ fontSize: 12, color: colors.error, fontWeight: 'bold' }}>Last Sync Error:</Text>
              <Text style={{ fontSize: 12, color: colors.error }}>{lastError}</Text>
            </View>
          )}
          <View style={{ marginTop: 16 }}>
            <Button 
              title={isSyncing ? "SYNCING..." : "SYNC NOW"} 
              variant="secondary" 
              onPress={() => triggerSync()} 
              disabled={isSyncing || !isOnline || pendingCount === 'Unavailable'}
            />
          </View>
        </View>

        {/* LANGUAGE */}
        <SectionHeader title="LANGUAGE / भाषा" />
        <View style={[styles.card, elevation.level1]}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button 
                title="English" 
                variant={i18n.language === 'en' ? "primary" : "secondary"}
                onPress={() => handleLanguageChange('en')}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button 
                title="हिन्दी" 
                variant={i18n.language === 'hi' ? "primary" : "secondary"}
                onPress={() => handleLanguageChange('hi')}
              />
            </View>
          </View>
        </View>

        {/* LOCATION & PERMISSIONS */}
        <SectionHeader title="LOCATION & PERMISSIONS" />
        <View style={[styles.card, elevation.level1]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Background Tracking</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons 
                name={isTracking ? "gps-fixed" : "gps-off"} 
                size={16} 
                color={isTracking ? colors.primary : colors.error} 
                style={{ marginRight: 4 }} 
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

        {/* HELP & SUPPORT */}
        <SectionHeader title="HELP & SUPPORT" />
        <View style={[styles.card, elevation.level1]}>
          <ShortcutRow 
            icon="help-outline" 
            title="How to use Field Assistant" 
            onPress={() => handleHelpStub('How to use Field Assistant')} 
          />
          <View style={styles.divider} />
          <ShortcutRow 
            icon="report-problem" 
            title="Report a Problem" 
            onPress={() => handleHelpStub('Report a Problem')} 
          />
          <View style={styles.divider} />
          <ShortcutRow 
            icon="headset-mic" 
            title="Contact Support" 
            onPress={() => handleHelpStub('Contact Support')} 
          />
        </View>

        {/* ABOUT */}
        <SectionHeader title="ABOUT" />
        <View style={[styles.card, elevation.level1]}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>App Version</Text>
            <Text style={styles.statValue}>{appConfig.expo?.version || '1.0.0'}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Build</Text>
            <Text style={styles.statValue}>1</Text>
          </View>
        </View>

        {/* LOGOUT */}
        <View style={styles.actionContainer}>
          <Button title={t('auth.action.logout')} variant="secondary" onPress={logout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5EEFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    ...typography.headlineMd,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  role: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginBottom: 8,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 4
  },
  activeText: {
    ...typography.labelSm,
    fontWeight: 'bold',
  },
  emailText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  sectionHeader: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: 'bold',
    marginBottom: 8,
    marginLeft: 4,
    textTransform: 'uppercase'
  },
  card: {
    width: '100%',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  statLabel: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
  statValue: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
  },
  shortcutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  shortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shortcutText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    fontWeight: '500',
  },
  actionContainer: {
    marginTop: 16,
    width: '100%',
  }
});
