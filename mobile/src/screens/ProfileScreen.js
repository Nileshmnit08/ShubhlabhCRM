import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Globe, MapPin, Mic, ShieldCheck, ChevronRight } from 'lucide-react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';

export default function ProfileScreen() {
  const { userProfile, session } = useAuth();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [locationStatus, setLocationStatus] = useState('Checking...');
  const [micStatus, setMicStatus] = useState('Checking...');
  
  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    try {
      const loc = await Location.getForegroundPermissionsAsync();
      setLocationStatus(loc.status === 'granted' ? 'Granted' : 'Denied');
      
      const audio = await Audio.getPermissionsAsync();
      setMicStatus(audio.status === 'granted' ? 'Granted' : 'Denied');
    } catch (error) {
      console.warn(error);
      setLocationStatus('Unknown');
      setMicStatus('Unknown');
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name) => {
    return (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const SettingRow = ({ icon: Icon, title, value, onPress, isError }) => (
    <TouchableOpacity 
      style={styles.settingRow} 
      onPress={onPress} 
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.settingRowLeft}>
        <View style={styles.iconBox}>
          <Icon size={20} color={theme.colors.onSurfaceVariant} />
        </View>
        <Text style={styles.settingTitle}>{title}</Text>
      </View>
      <View style={styles.settingRowRight}>
        {value && <Text style={[styles.settingValue, isError && { color: theme.colors.error }]}>{value}</Text>}
        {onPress && <ChevronRight size={16} color={theme.colors.outline} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="My Profile" showBack={false} />
      
      <ScrollView contentContainerStyle={{ padding: theme.spacing['screen-edge'], paddingBottom: 100 }}>
        
        {/* User Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.display_name)}</Text>
          </View>
          <Text style={styles.profileName}>{userProfile?.display_name || 'User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userProfile?.role || 'Field Sales'}</Text>
          </View>
          <Text style={styles.profileEmail}>{session?.user?.email}</Text>
        </Card>

        {/* Preferences Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <Card style={styles.sectionCard}>
          <SettingRow 
            icon={Globe} 
            title="Language" 
            value={i18n.language === 'hi' ? 'हिंदी (Hindi)' : 'English'} 
            onPress={toggleLanguage} 
          />
        </Card>

        {/* System & Permissions Section */}
        <Text style={styles.sectionTitle}>System & Device</Text>
        <Card style={styles.sectionCard}>
          <SettingRow 
            icon={MapPin} 
            title="Location Permission" 
            value={locationStatus}
            isError={locationStatus !== 'Granted'}
          />
          <View style={styles.divider} />
          <SettingRow 
            icon={Mic} 
            title="Microphone Permission" 
            value={micStatus}
            isError={micStatus !== 'Granted'}
          />
          <View style={styles.divider} />
          <SettingRow 
            icon={ShieldCheck} 
            title="App Version" 
            value="1.0.0"
          />
        </Card>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color={theme.colors.onError} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  profileCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarText: {
    fontSize: theme.typography.sizes.displaySm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onPrimaryContainer,
  },
  profileName: {
    fontSize: theme.typography.sizes.headlineSm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onSurface,
    fontFamily: theme.typography.fontFamily.display,
  },
  roleBadge: {
    backgroundColor: theme.colors.surfaceContainerHighest,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: theme.borders.radius.full,
    marginTop: 8,
    marginBottom: 8,
  },
  roleText: {
    fontSize: theme.typography.sizes.labelSm,
    fontWeight: theme.typography.weights.semibold,
    color: theme.colors.secondary,
  },
  profileEmail: {
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.onSurfaceVariant,
  },
  sectionTitle: {
    fontSize: theme.typography.sizes.titleSm,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onSurfaceVariant,
    marginBottom: theme.spacing.sm,
    marginLeft: theme.spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    padding: 0,
    marginBottom: theme.spacing.lg,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: theme.borders.radius.sm,
    backgroundColor: theme.colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: theme.typography.sizes.bodyMd,
    fontWeight: theme.typography.weights.medium,
    color: theme.colors.onSurface,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    fontSize: theme.typography.sizes.bodySm,
    color: theme.colors.onSurfaceVariant,
    marginRight: 8,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginLeft: 60,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borders.radius.md,
    marginTop: theme.spacing.md,
  },
  logoutText: {
    fontSize: theme.typography.sizes.titleMd,
    fontWeight: theme.typography.weights.bold,
    color: theme.colors.onError,
    marginLeft: 8,
  }
});
