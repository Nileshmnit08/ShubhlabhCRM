import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, typography } from '../theme/tokens';
import { useNotifications } from '../context/NotificationContext';

export function AppHeader({ variant = 'A', title, subtitle, rightAction, rightActionIcon, onRightAction, showBell = true }) {
  const navigation = useNavigation();
  const { unreadCount } = useNotifications();

  if (variant === 'A') {
    return (
      <View style={styles.containerA}>
        <View style={styles.row1A}>
          <Text style={styles.logoText}>SL FIELD</Text>
          <View style={styles.rightIconsA}>
            {showBell && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
                <MaterialIcons name="notifications" size={24} color={colors.onSurfaceVariant} />
                {unreadCount > 0 && (
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {rightActionIcon && (
              <TouchableOpacity style={styles.iconBtn} onPress={onRightAction}>
                <MaterialIcons name={rightActionIcon} size={24} color={colors.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
        <Text style={styles.titleA}>{title}</Text>
        {subtitle && <Text style={styles.subtitleA}>{subtitle}</Text>}
      </View>
    );
  }

  // Variant B
  return (
    <View style={styles.containerB}>
      <TouchableOpacity style={styles.backBtnB} onPress={() => navigation.goBack()}>
        <MaterialIcons name="arrow-back" size={24} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.titleContainerB}>
        <Text style={styles.titleB} numberOfLines={1}>{title}</Text>
        {subtitle && <Text style={styles.subtitleB} numberOfLines={1}>{subtitle}</Text>}
      </View>
      <View style={styles.rightActionB}>
        {rightAction ? (
          <TouchableOpacity onPress={onRightAction}>
            <Text style={styles.rightActionTextB}>{rightAction}</Text>
          </TouchableOpacity>
        ) : rightActionIcon ? (
          <TouchableOpacity onPress={onRightAction} style={styles.iconBtn}>
            <MaterialIcons name={rightActionIcon} size={24} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 24 }} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  containerA: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.background,
  },
  row1A: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoText: {
    ...typography.labelLg,
    fontWeight: '900',
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  rightIconsA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeContainer: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: colors.onError,
    fontSize: 9,
    fontWeight: 'bold',
  },
  titleA: {
    ...typography.headlineMd,
    fontWeight: 'bold',
    color: colors.primary,
    letterSpacing: -0.5,
  },
  subtitleA: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  containerB: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  backBtnB: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  titleContainerB: {
    flex: 1,
    paddingHorizontal: 12,
  },
  titleB: {
    ...typography.titleLg,
    fontWeight: 'bold',
    color: colors.onSurface,
  },
  subtitleB: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  rightActionB: {
    minWidth: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  rightActionTextB: {
    ...typography.labelMd,
    color: colors.primary,
    fontWeight: 'bold',
  }
});
