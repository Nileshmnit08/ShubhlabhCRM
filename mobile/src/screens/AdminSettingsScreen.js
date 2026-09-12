import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Globe, ShieldCheck, ChevronRight } from 'lucide-react-native';
import Card from '../components/Card';
import ScreenHeader from '../components/ScreenHeader';

export default function AdminSettingsScreen() {
  const { userProfile, session } = useAuth();
  const { i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const getInitials = (name) => {
    return (name || 'A').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
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
      <ScreenHeader title="Admin Profile" showBack />
      
      <ScrollView contentContainerStyle={{ padding: theme.spacing['screen-edge'], paddingBottom: 100 }}>
        
        {/* User Identity Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getInitials(userProfile?.display_name)}</Text>
          </View>
          <Text style={styles.profileName}>{userProfile?.display_name || 'Admin User'}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userProfile?.role || 'System Admin'}</Text>
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
        <Text style={styles.sectionTitle}>System Info</Text>
        <Card style={styles.sectionCard}>
          <SettingRow 
            icon={ShieldCheck} 
            title="App Version" 
            value="1.0.0"
          />
          <View style={styles.divider} />
          <SettingRow 
            icon={ShieldCheck} 
            title="Sync State" 
            value="Online"
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
  container: { flex: 1, backgroundColor: theme.colors.background },
  profileCard: { alignItems: 'center', padding: theme.spacing.xl, marginBottom: theme.spacing.lg },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.md },
  avatarText: { fontFamily: theme.typography.fontFamily.display, fontSize: 28, color: theme.colors.onPrimary, fontWeight: '700' },
  profileName: { fontFamily: theme.typography.fontFamily.display, fontSize: theme.typography.sizes.titleLg, fontWeight: '700', color: theme.colors.onSurface, marginBottom: 4 },
  roleBadge: { backgroundColor: theme.colors.secondaryContainer, paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.borders.radius.full, marginBottom: 8 },
  roleText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelMd, color: theme.colors.onSecondaryContainer, fontWeight: '600' },
  profileEmail: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant },
  sectionTitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.labelLg, fontWeight: '700', color: theme.colors.onSurface, marginBottom: theme.spacing.sm, marginLeft: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionCard: { padding: 0, marginBottom: theme.spacing.lg, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: theme.borders.radius.md, backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyLg, color: theme.colors.onSurface, fontWeight: '500' },
  settingRowRight: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
  settingValue: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.bodyMd, color: theme.colors.onSurfaceVariant },
  divider: { height: 1, backgroundColor: theme.colors.border, marginLeft: 52 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.error, paddingVertical: theme.spacing.md, borderRadius: theme.borders.radius.lg, marginTop: theme.spacing.md },
  logoutText: { fontFamily: theme.typography.fontFamily.body, fontSize: theme.typography.sizes.titleSm, color: theme.colors.onError, fontWeight: '700' },
});
