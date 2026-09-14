import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { Button } from '../components';
import { useAuth } from '../context/AuthContext';

export function ProfileScreen() {
  const { t } = useTranslation();
  const { staffProfile, logout } = useAuth();
  
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
            <Text style={styles.statLabel}>Today's Visits</Text>
            <Text style={styles.statValue}>12 / 15</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Collections</Text>
            <Text style={styles.statValue}>₹ 45,000</Text>
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
