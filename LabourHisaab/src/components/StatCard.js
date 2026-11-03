// StatCard Component for Dashboard & Reports
// Clean high-contrast cards with Hindi labels and prominent numbers

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../constants/theme';

export default function StatCard({
  title,
  hindiTitle,
  value,
  icon: Icon,
  iconColor = theme.colors.primary,
  iconBgColor = theme.colors.primaryLight,
  valueColor = theme.colors.textPrimary,
  subtext,
  badgeText,
  badgeColor = theme.colors.primary,
  onPress,
  isFullWidth = false,
}) {
  const content = (
    <View style={[styles.card, isFullWidth && styles.fullWidthCard]}>
      <View style={styles.topRow}>
        <View style={styles.textContainer}>
          <Text style={styles.titleText}>{title}</Text>
          {hindiTitle ? <Text style={styles.hindiTitleText}>{hindiTitle}</Text> : null}
        </View>
        {Icon && (
          <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
            <Icon size={20} color={iconColor} />
          </View>
        )}
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.valueText, { color: valueColor }]}>{value}</Text>
        {badgeText && (
          <View style={[styles.badge, { backgroundColor: iconBgColor }]}>
            <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
          </View>
        )}
      </View>

      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[styles.touchable, isFullWidth && styles.fullWidthTouchable]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  fullWidthTouchable: {
    width: '100%',
    flex: undefined,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.surfaceBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  fullWidthCard: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  textContainer: {
    flex: 1,
    paddingRight: 6,
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  hindiTitleText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  valueText: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  subtext: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
});

