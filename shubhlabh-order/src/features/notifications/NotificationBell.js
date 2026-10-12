import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Bell } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { useNotifications } from './NotificationContext';

export default function NotificationBell({
  onPress,
  color = theme.colors.textPrimary,
  size = 22,
  style,
}) {
  const { unreadCount } = useNotifications();

  const formattedCount = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, style]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Notifications, ${unreadCount} unread`}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {formattedCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#DC2626', // High-contrast crimson red
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.surface || '#FFFFFF',
    elevation: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: 12,
  },
});
