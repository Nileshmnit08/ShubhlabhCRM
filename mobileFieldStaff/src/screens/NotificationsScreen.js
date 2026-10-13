import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme/tokens';
import { MaterialIcons } from '@expo/vector-icons';
import { handleNotificationPress } from '../navigation/NotificationRouter';

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'all-inclusive' },
  { id: 'chats', label: 'Chats', icon: 'chat' },
  { id: 'tasks', label: 'Tasks', icon: 'alarm' },
  { id: 'assignments', label: 'Assignments', icon: 'assignment-ind' },
  { id: 'orders', label: 'Orders', icon: 'shopping-bag' },
  { id: 'system', label: 'System', icon: 'notifications' },
];

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getCategoryForItem = (item) => {
  if (item.entity_type === 'CHAT_MESSAGE' || item.notification_type === 'CHAT') {
    return 'chats';
  }
  if (
    item.entity_type === 'order' ||
    item.entity_type === 'orders' ||
    item.notification_type === 'ORDER_CREATED' ||
    (item.link_url && (item.link_url.includes('/requirements/') || item.link_url.includes('/orders/')))
  ) {
    return 'orders';
  }
  if (
    item.entity_type === 'follow_ups' ||
    item.notification_type === 'TASK_ASSIGNED' ||
    item.notification_type === 'Reminder'
  ) {
    return 'tasks';
  }
  if (
    item.notification_type === 'Assignment' ||
    item.entity_type === 'requirements' ||
    item.entity_type === 'crm_internal_requirements'
  ) {
    return 'assignments';
  }
  return 'system';
};

const getCategoryBadgeDetails = (item) => {
  const cat = getCategoryForItem(item);
  switch (cat) {
    case 'chats':
      return { icon: 'chat', label: 'Chat', bg: '#E3F2FD', color: '#1565C0' };
    case 'orders':
      return { icon: 'shopping-bag', label: 'Order', bg: '#E8F5E9', color: '#166534' };
    case 'tasks':
      return { icon: 'alarm', label: 'Task', bg: '#FFF8E1', color: '#B45309' };
    case 'assignments':
      return { icon: 'assignment-ind', label: 'Assignment', bg: '#F3E8FF', color: '#7E22CE' };
    default:
      return { icon: 'notifications', label: 'System', bg: '#F1F5F9', color: '#475569' };
  }
};

const getDateSection = (dateStr) => {
  if (!dateStr) return 'Earlier';
  const d = new Date(dateStr);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  const startOfItemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (startOfItemDate.getTime() === startOfToday.getTime()) {
    return 'Today';
  } else if (startOfItemDate.getTime() === startOfYesterday.getTime()) {
    return 'Yesterday';
  }
  return 'Earlier';
};

export const NotificationsScreen = ({ navigation }) => {
  const { notifications, markAsRead, markAllAsRead, syncNotifications, unreadCount } = useNotifications();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [activeCategory, setActiveCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await syncNotifications();
    setRefreshing(false);
  };

  const onPressNotification = async (item) => {
    if (item.isGroupedChat) {
      // Route directly to conversation; conversation screen handles read receipts
      await handleNotificationPress(item, userId);
    } else {
      if (!item.is_read) {
        await markAsRead(item.id);
      }
      await handleNotificationPress(item, userId);
    }
  };

  // 1. Group chat notifications by conversation_id (entity_id)
  const processedNotifications = useMemo(() => {
    const chatGroups = new Map();
    const otherNotifs = [];

    notifications.forEach((notif) => {
      if (notif.entity_type === 'CHAT_MESSAGE' || notif.notification_type === 'CHAT') {
        const convId = notif.entity_id || notif.id;
        if (!chatGroups.has(convId)) {
          chatGroups.set(convId, []);
        }
        chatGroups.get(convId).push(notif);
      } else {
        otherNotifs.push(notif);
      }
    });

    const consolidated = [...otherNotifs];

    chatGroups.forEach((group, convId) => {
      // Sort newest first
      group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const latest = group[0];
      const chatUnread = group.filter((n) => !n.is_read).length;

      consolidated.push({
        ...latest,
        id: `grouped-chat-${convId}`,
        isGroupedChat: true,
        conversationId: convId,
        unreadCount: chatUnread,
        is_read: chatUnread === 0,
        rawItems: group,
        rawIds: group.map((n) => n.id),
        message: latest.message,
        title: latest.title || 'Staff Member',
        created_at: latest.created_at,
      });
    });

    return consolidated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }, [notifications]);

  // 2. Compute category counts and unread badges
  const categoryMeta = useMemo(() => {
    const counts = { all: processedNotifications.length };
    const unreads = { all: 0 };

    processedNotifications.forEach((item) => {
      const cat = getCategoryForItem(item);
      counts[cat] = (counts[cat] || 0) + 1;
      if (!item.is_read) {
        unreads[cat] = (unreads[cat] || 0) + 1;
        unreads.all += 1;
      }
    });

    return { counts, unreads };
  }, [processedNotifications]);

  // 3. Filter by category
  const filteredNotifications = useMemo(() => {
    if (activeCategory === 'all') return processedNotifications;
    return processedNotifications.filter((item) => getCategoryForItem(item) === activeCategory);
  }, [processedNotifications, activeCategory]);

  // 4. Group by Date Sections (Today, Yesterday, Earlier)
  const sections = useMemo(() => {
    const todayItems = [];
    const yesterdayItems = [];
    const earlierItems = [];

    filteredNotifications.forEach((item) => {
      const section = getDateSection(item.created_at);
      if (section === 'Today') todayItems.push(item);
      else if (section === 'Yesterday') yesterdayItems.push(item);
      else earlierItems.push(item);
    });

    const list = [];
    if (todayItems.length > 0) {
      list.push({ type: 'header', label: 'Today', count: todayItems.length, id: 'sec-today' });
      list.push(...todayItems);
    }
    if (yesterdayItems.length > 0) {
      list.push({ type: 'header', label: 'Yesterday', count: yesterdayItems.length, id: 'sec-yesterday' });
      list.push(...yesterdayItems);
    }
    if (earlierItems.length > 0) {
      list.push({ type: 'header', label: 'Earlier', count: earlierItems.length, id: 'sec-earlier' });
      list.push(...earlierItems);
    }

    return list;
  }, [filteredNotifications]);

  const renderNotificationCard = (item) => {
    const badge = getCategoryBadgeDetails(item);
    const isUnread = !item.is_read;

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => onPressNotification(item)}
        activeOpacity={0.82}
      >
        {/* Left accent indicator */}
        <View style={[styles.leftAccent, isUnread && styles.leftAccentUnread]} />

        {/* Category Icon */}
        <View style={[styles.iconCircle, { backgroundColor: badge.bg }]}>
          <MaterialIcons name={badge.icon} size={22} color={badge.color} />
        </View>

        {/* Content Body */}
        <View style={styles.textContainer}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, isUnread && styles.titleUnread]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.time, isUnread && styles.timeUnread]}>
              {getRelativeTime(item.created_at)}
            </Text>
          </View>

          {/* Grouped chat unread message indicator */}
          {item.isGroupedChat && item.unreadCount > 0 && (
            <View style={styles.chatUnreadPill}>
              <Text style={styles.chatUnreadPillText}>
                {item.unreadCount === 1 ? '1 new message' : `${item.unreadCount} new messages`}
              </Text>
            </View>
          )}

          <Text style={[styles.message, isUnread && styles.messageUnread]} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.footerRow}>
            <View style={[styles.typePill, { backgroundColor: badge.bg }]}>
              <MaterialIcons name={badge.icon} size={11} color={badge.color} />
              <Text style={[styles.typePillText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
        </View>

        {/* Unread indicator dot */}
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="done-all" size={56} color={colors.outlineVariant} />
      <Text style={styles.emptyTitle}>You're all caught up!</Text>
      <Text style={styles.emptySubtitle}>
        {activeCategory === 'all'
          ? 'No notifications to display right now.'
          : `No ${activeCategory} notifications at the moment.`}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* ── Top Header Controls ── */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <Text style={styles.topBarTitle}>Notification Center</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <MaterialIcons name="done-all" size={16} color={colors.primary} />
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Category Filters (Horizontal Scroll) ── */}
      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            const count = categoryMeta.counts[cat.id] || 0;
            const unread = categoryMeta.unreads[cat.id] || 0;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setActiveCategory(cat.id)}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={15}
                  color={isActive ? colors.onPrimary : colors.onSurfaceVariant}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.categoryChipText, isActive && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.categoryCountBadge,
                      isActive && styles.categoryCountBadgeActive,
                      unread > 0 && !isActive && styles.categoryCountBadgeUnread,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryCountText,
                        isActive && styles.categoryCountTextActive,
                        unread > 0 && !isActive && styles.categoryCountTextUnread,
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Notification List ── */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{item.label}</Text>
                <Text style={styles.sectionHeaderCount}>{item.count}</Text>
              </View>
            );
          }
          return renderNotificationCard(item);
        }}
        contentContainerStyle={sections.length === 0 ? styles.flexGrow : styles.listPadding}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flexGrow: {
    flexGrow: 1,
  },
  listPadding: {
    paddingHorizontal: 16,
    paddingBottom: 28,
  },

  /* Top Bar */
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBarTitle: {
    ...typography.labelLg,
    fontSize: 18,
    fontWeight: '700',
    color: colors.onSurface,
  },
  unreadBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  unreadBadgeText: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryContainer,
  },
  markAllText: {
    ...typography.labelSm,
    color: colors.primary,
    fontWeight: '600',
  },

  /* Category Filter Chips */
  categoryBar: {
    backgroundColor: colors.surface,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  categoryScrollContent: {
    paddingHorizontal: 14,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: colors.onPrimary,
  },
  categoryCountBadge: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    backgroundColor: colors.surfaceContainerHigh,
  },
  categoryCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  categoryCountBadgeUnread: {
    backgroundColor: colors.primaryContainer,
  },
  categoryCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.onSurfaceVariant,
  },
  categoryCountTextActive: {
    color: colors.onPrimary,
  },
  categoryCountTextUnread: {
    color: colors.primary,
  },

  /* Section Header */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 12,
    marginBottom: 4,
  },
  sectionHeaderText: {
    ...typography.labelSm,
    fontSize: 12,
    fontWeight: '700',
    color: colors.outline,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.outline,
  },

  /* Notification Card */
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: colors.surfaceContainer,
  },
  cardUnread: {
    backgroundColor: '#F8FCFA',
    borderColor: 'rgba(23, 107, 77, 0.2)',
    elevation: 2,
    shadowOpacity: 0.08,
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
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    ...typography.labelMd,
    fontSize: 14,
    fontWeight: '600',
    color: colors.onSurface,
    flex: 1,
    marginRight: 6,
  },
  titleUnread: {
    fontWeight: '700',
    color: colors.onSurface,
  },
  time: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.outline,
  },
  timeUnread: {
    color: colors.primary,
    fontWeight: '600',
  },
  chatUnreadPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 8,
    marginBottom: 3,
  },
  chatUnreadPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  message: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  messageUnread: {
    color: colors.onSurface,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 14,
  },

  /* Empty State */
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...typography.headlineLgMobile,
    fontSize: 18,
    color: colors.onSurface,
    marginTop: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    ...typography.bodySm,
    color: colors.outline,
    textAlign: 'center',
  },
});
