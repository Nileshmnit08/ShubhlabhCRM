import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, typography, rounded, elevation } from '../theme/tokens';
import { StatusChip } from './Status';
import { MaterialIcons } from '@expo/vector-icons';

export function MerchantRow({ name, location, statusType = 'completed', dues, onPress }) {
  return (
    <TouchableOpacity style={[styles.card, elevation.level1]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.stripe, { backgroundColor: colors.status[statusType]?.border || colors.primary }]} />
      <View style={styles.cardContent}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{name}</Text>
          <StatusChip type={statusType} label={statusType} />
        </View>
        <Text style={styles.subtitle}>{location}</Text>
        
        <View style={styles.dataMatrix}>
          <View>
            <Text style={styles.metaLabel}>Pending Dues</Text>
            <Text style={styles.metaValue}>{dues}</Text>
          </View>
        </View>

        <View style={styles.actionDock}>
          <TouchableOpacity style={styles.shortcut}>
            <MaterialIcons name="call" size={20} color={colors.tertiary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shortcut}>
            <MaterialIcons name="directions" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// Minimal versions for the others to establish the components
export const CustomerCard = MerchantRow; 
export const WorkItemCard = MerchantRow;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: rounded.default,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    overflow: 'hidden',
    marginVertical: 8,
  },
  stripe: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    flex: 1,
    marginRight: 8,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginBottom: 12,
  },
  dataMatrix: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  metaLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginBottom: 2,
  },
  metaValue: {
    ...typography.currencyDisplay,
    fontSize: 18, // scaled down for card context
    color: colors.onSurface,
  },
  actionDock: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 12,
    gap: 16,
  },
  shortcut: {
    width: 40,
    height: 40,
    borderRadius: rounded.default,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
