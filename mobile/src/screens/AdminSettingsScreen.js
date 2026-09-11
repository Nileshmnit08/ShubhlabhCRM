import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../AuthContext';
import { supabase } from '../lib/supabase';
import { Settings } from 'lucide-react-native';
import { theme } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminSettingsScreen() {
  const { userProfile } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Settings</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.iconBox}>
            <Settings size={28} color={theme.colors.secondary} />
          </View>
          <Text style={styles.label}>Signed in as</Text>
          <Text style={styles.value}>{userProfile?.display_name || 'Admin User'}</Text>
          
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{userProfile?.role || 'Admin'}</Text>
          </View>

          <View style={styles.divider} />
          
          <Text style={styles.infoText}>App Version: 1.0.0 (Production)</Text>
          <Text style={styles.infoText}>Workspace: Directorate Workspace</Text>
          <Text style={styles.infoText}>Sync State: Online</Text>

          <TouchableOpacity style={styles.logoutButton} onPress={() => supabase.auth.signOut()}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: 16, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: theme.colors.onSurface, fontFamily: theme.typography.fontFamily.display },
  content: { padding: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
  iconBox: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.surfaceContainerLow, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  label: { fontSize: 12, color: theme.colors.onSurfaceVariant, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 22, fontWeight: 'bold', color: theme.colors.onSurface, marginTop: 4, fontFamily: theme.typography.fontFamily.display },
  roleBadge: { marginTop: 12, backgroundColor: theme.colors.primary, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  roleText: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: theme.colors.border, width: '100%', marginVertical: 24 },
  infoText: { fontSize: 14, color: theme.colors.onSurfaceVariant, marginBottom: 8 },
  logoutButton: { marginTop: 24, backgroundColor: theme.colors.error, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 8, width: '100%', alignItems: 'center' },
  logoutText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
