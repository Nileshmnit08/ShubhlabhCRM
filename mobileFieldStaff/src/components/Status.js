import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, rounded } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';

export function StatusChip({ type, label, icon }) {
  const statusColors = colors.status[type] || colors.status.pending;
  
  return (
    <View style={[styles.chip, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
      {icon && <MaterialIcons name={icon} size={14} color={statusColors.text} style={styles.icon} />}
      <Text style={[styles.label, { color: statusColors.text }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

export function SyncIndicator({ isOffline, isSyncing, pendingCount = 0 }) {
  if (!isOffline && !isSyncing && pendingCount === 0) {
    // Online and synced
    return null; 
  }

  const bgColor = isOffline ? colors.secondary : colors.primary; // Saffron Amber vs Emerald

  return (
    <View style={[styles.syncBand, { backgroundColor: bgColor }]}>
      {isSyncing ? (
        <Text style={styles.syncText}>SYNCING...</Text>
      ) : isOffline ? (
        <Text style={styles.syncText}>OFFLINE • {pendingCount} PENDING</Text>
      ) : (
        <Text style={styles.syncText}>SYNC COMPLETE</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: rounded.full,
    borderWidth: 1,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    ...typography.labelSm,
  },
  syncBand: {
    height: 28,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncText: {
    ...typography.labelSm,
    color: colors.onPrimary,
  }
});
