import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, rounded } from '../theme/tokens';

export function Tabs({ tabs, activeTab, onChange }) {
  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => onChange(tab.id)}
            >
              {tab.icon && (
                <MaterialIcons 
                  name={tab.icon} 
                  size={18} 
                  color={isActive ? colors.onPrimary : colors.onSurfaceVariant} 
                  style={{ marginRight: 6 }} 
                />
              )}
              <Text style={[styles.text, isActive && styles.textActive]}>
                {tab.label}
              </Text>
              {tab.badge !== undefined && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{tab.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: rounded.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  text: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  textActive: {
    color: colors.onPrimary,
  },
  badge: {
    marginLeft: 6,
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: rounded.full,
  },
  badgeText: {
    ...typography.labelSm,
    color: colors.onSurface,
  }
});
