import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { handleNotificationPress } from '../navigation/NotificationRouter';

const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
};

const getIconForNotification = (notification) => {
  switch (notification.entity_type) {
    case 'CHAT_MESSAGE': return 'chat';
    case 'follow_ups':   return 'alarm';
    case 'requirements': return 'assignment';
    default:
      if (notification.notification_type === 'Reminder') return 'alarm';
      if (notification.notification_type === 'TASK_ASSIGNED') return 'assignment-ind';
      if (notification.notification_type === 'CHAT') return 'chat';
      return 'notifications';
  }
};

export const NotificationsScreen = ({ navigation }) => {
  const { notifications, markAsRead, syncNotifications } = useNotifications();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const onPressNotification = async (notification) => {
    // Mark read first (optimistic update)
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    // Route via the centralised router — this handles chat deep-links correctly
    await handleNotificationPress(notification, userId);
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.cardUnread]}
      onPress={() => onPressNotification(item)}
      activeOpacity={0.8}
    >
      {/* Left accent for unread */}
      <View style={[styles.leftAccent, !item.is_read && styles.leftAccentUnread]} />

      <View style={[styles.iconCircle, !item.is_read && styles.iconCircleUnread]}>
        <MaterialIcons
          name={getIconForNotification(item)}
          size={22}
          color={!item.is_read ? colors.onPrimary : colors.onSurfaceVariant}
        />
      </View>

      <View style={styles.textContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, !item.is_read && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={[styles.time, !item.is_read && styles.timeUnread]}>
            {getRelativeTime(item.created_at)}
          </Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        {item.entity_type === 'CHAT_MESSAGE' && (
          <View style={styles.typePill}>
            <MaterialIcons name="chat" size={10} color={colors.primary} />
            <Text style={styles.typePillText}>Chat message</Text>
          </View>
        )}
      </View>

      {!item.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="notifications-none" size={64} color={colors.outline} />
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySubtitle}>No new notifications to display.</Text>
    </View>
  );

  const unreadItems = notifications.filter(n => !n.is_read);
  const readItems = notifications.filter(n => n.is_read);

  const sections = [
    ...(unreadItems.length > 0 ? [{ type: 'header', label: `New  •  ${unreadItems.length}` }, ...unreadItems] : []),
    ...(readItems.length > 0 ? [{ type: 'header', label: 'Earlier' }, ...readItems] : []),
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item, index) => item.id || `section-${index}`}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{item.label}</Text>
              </View>
            );
          }
          return renderNotification({ item });
        }}
        contentContainerStyle={sections.length === 0 ? styles.flexGrow : styles.listPadding}
        ListEmptyComponent={renderEmpty}
        onRefresh={syncNotifications}
        refreshing={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  flexGrow: {
    flexGrow: 1,
  },
  listPadding: {
    padding: 16,
    paddingBottom: 24,
  },
  sectionHeader: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginBottom: 4,
    marginTop: 8,
  },
  sectionHeaderText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  cardUnread: {
    backgroundColor: '#f0faf5',
    elevation: 3,
    shadowOpacity: 0.1,
  },
  leftAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
  },
  leftAccentUnread: {
    backgroundColor: colors.primary,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 12,
    marginVertical: 14,
  },
  iconCircleUnread: {
    backgroundColor: colors.primary,
  },
  textContainer: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  title: {
    ...typography.labelMd,
    color: colors.onSurface,
    flex: 1,
    marginRight: 6,
  },
  titleUnread: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  time: {
    ...typography.labelSm,
    color: colors.outline,
  },
  timeUnread: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  message: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 3,
  },
  typePillText: {
    ...typography.labelSm,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    ...typography.headlineSm,
    color: colors.onSurface,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
