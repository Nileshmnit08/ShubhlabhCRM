import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import {
  Bell,
  BellOff,
  CheckCheck,
  Check,
  ChevronRight,
  RotateCcw,
  Calendar,
  Filter,
} from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { SLHeader } from '../../shared/components/SLHeader';
import { useNotifications } from './NotificationContext';
import { useTranslation } from '../../shared/localization/i18n';

export default function NotificationInboxScreen({ route, navigation }) {
  const { t } = useTranslation();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Initialize with optional initialFilter passed from Profile or other entry points
  const initialFilter = route?.params?.initialFilter || 'ALL';
  const [activeCategory, setActiveCategory] = useState(initialFilter);
  const [activeDateRange, setActiveDateRange] = useState('ALL_TIME');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route?.params?.initialFilter) {
      setActiveCategory(route.params.initialFilter);
    }
  }, [route?.params?.initialFilter]);

  const CATEGORY_TABS = [
    { id: 'ALL', label: t('notifications.filterAll') || 'All' },
    { id: 'BUSINESS', label: t('notifications.filterBusiness') || 'Business Updates' },
    { id: 'SHUBH_LABH', label: t('notifications.filterCompany') || 'Shubh Labh Updates' },
    { id: 'REWARDS', label: t('notifications.filterRewards') || 'Reward Updates' },
    { id: 'UNREAD', label: t('notifications.filterUnread') || 'Unread' },
  ];

  const DATE_TABS = [
    { id: 'ALL_TIME', label: t('notifications.dateAll') || 'All Time' },
    { id: 'TODAY', label: t('notifications.dateToday') || 'Today' },
    { id: '7_DAYS', label: t('notifications.date7Days') || 'Last 7 Days' },
    { id: '30_DAYS', label: t('notifications.date30Days') || 'Last 30 Days' },
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleOpenNotice = (item) => {
    if (!item.is_read) {
      markAsRead(item.id);
    }
    navigation.navigate('BusinessUpdateDetail', { updateId: item.id });
  };

  // Filter evaluation
  const filteredNotices = notifications.filter(item => {
    // 1. Category Filter
    if (activeCategory === 'UNREAD') {
      if (item.is_read) return false;
    } else if (activeCategory === 'BUSINESS') {
      const isBusiness =
        item.type === 'PRICE_UPDATE' ||
        item.type === 'RAW_MATERIAL_UPDATE' ||
        item.type === 'SUPPLY_UPDATE';
      if (!isBusiness) return false;
    } else if (activeCategory === 'SHUBH_LABH') {
      const isCompany =
        item.type === 'ANNOUNCEMENT' ||
        item.type === 'PRODUCT_UPDATE' ||
        item.type === 'IMPORTANT_NOTICE' ||
        item.type === 'OTHER';
      if (!isCompany) return false;
    } else if (activeCategory === 'REWARDS') {
      const isReward =
        item.type === 'REWARD' ||
        item.type === 'SCHEME' ||
        item.type === 'OFFER';
      if (!isReward) return false;
    }

    // 2. Date Range Filter
    if (activeDateRange !== 'ALL_TIME') {
      const noticeDate = new Date(item.published_at);
      const now = new Date();

      if (activeDateRange === 'TODAY') {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (noticeDate < startOfToday) return false;
      } else if (activeDateRange === '7_DAYS') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        if (noticeDate < sevenDaysAgo) return false;
      } else if (activeDateRange === '30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        if (noticeDate < thirtyDaysAgo) return false;
      }
    }

    return true;
  });

  const renderNoticeItem = ({ item }) => {
    const isUnread = !item.is_read;
    const dateObj = new Date(item.published_at);
    const dateFormatted = !isNaN(dateObj)
      ? dateObj.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : '';
    const timeFormatted = !isNaN(dateObj)
      ? dateObj.toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      : '';

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => handleOpenNotice(item)}
        activeOpacity={0.75}
      >
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            {isUnread && <View style={styles.unreadDot} />}
            <View
              style={[
                styles.categoryTag,
                { backgroundColor: item.categoryBg || '#FFEDD5' },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: item.categoryColor || '#EA580C' },
                ]}
              >
                {item.categoryLabel || item.type}
              </Text>
            </View>
          </View>
          <Text style={styles.timestampText}>
            {dateFormatted} {timeFormatted ? `• ${timeFormatted}` : ''}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.cardTextContent}>
            <Text
              style={[styles.titleText, isUnread && styles.unreadTitle]}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text style={styles.previewText} numberOfLines={2}>
              {item.message}
            </Text>
          </View>
          {item.image_url ? (
            <Image
              source={{ uri: item.image_url }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          {isUnread ? (
            <TouchableOpacity
              style={styles.markReadBtn}
              onPress={() => markAsRead(item.id)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Check size={14} color={theme.colors.primary} />
              <Text style={styles.markReadBtnText}>
                {t('notifications.markAsRead') || 'Mark as read'}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.readLabelRow}>
              <CheckCheck size={14} color="#9CA3AF" />
              <Text style={styles.readLabelText}>Read</Text>
            </View>
          )}
          <View style={styles.arrowRow}>
            <Text style={styles.viewDetailText}>
              {t('notifications.viewUpdate') || 'View Update'}
            </Text>
            <ChevronRight size={16} color={theme.colors.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <BellOff size={36} color="#9CA3AF" />
      </View>
      <Text style={styles.emptyTitle}>
        {activeCategory === 'UNREAD'
          ? (t('notifications.allCaughtUp') || 'All caught up!')
          : (t('notifications.emptyNotices') || 'No notices found')}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeCategory === 'UNREAD'
          ? (t('notifications.allCaughtUpSub') || 'You have read all customer notices.')
          : (t('notifications.emptyNoticesSub') || 'Notices and updates published by Shubh Labh will appear here.')}
      </Text>
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={refreshNotifications}
      >
        <RotateCcw size={16} color={theme.colors.primary} />
        <Text style={styles.refreshBtnText}>
          {t('common.refresh') || 'Refresh'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <SLHeader
        title={t('notifications.inboxTitle') || 'Notifications'}
        navigation={navigation}
        onBack={() => navigation.goBack()}
      />

      {/* Top Action & Unread Summary Bar */}
      <View style={styles.actionBar}>
        <View style={styles.unreadBadgeContainer}>
          <Text style={styles.actionBarTitle}>
            {unreadCount > 0
              ? `${unreadCount} ${t('notifications.unread') || 'unread'}`
              : (t('notifications.allRead') || 'All read')}
          </Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={markAllAsRead}
            activeOpacity={0.7}
          >
            <CheckCheck size={16} color={theme.colors.primary} />
            <Text style={styles.markAllText}>
              {t('notifications.markAllAsRead') || 'Mark all as read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={styles.filterSection}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORY_TABS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterScroll}
          renderItem={({ item }) => {
            const isActive = activeCategory === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                onPress={() => setActiveCategory(item.id)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isActive && styles.filterChipTextActive,
                  ]}
                >
                  {item.label}
                  {item.id === 'UNREAD' && unreadCount > 0
                    ? ` (${unreadCount})`
                    : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Date Range Sub-filter Row */}
      <View style={styles.dateFilterSection}>
        <View style={styles.dateFilterHeader}>
          <Calendar size={13} color={theme.colors.textSecondary} />
          <Text style={styles.dateFilterLabel}>Date:</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateScroll}
        >
          {DATE_TABS.map((tab) => {
            const isActive = activeDateRange === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.dateChip,
                  isActive && styles.dateChipActive,
                ]}
                onPress={() => setActiveDateRange(tab.id)}
              >
                <Text
                  style={[
                    styles.dateChipText,
                    isActive && styles.dateChipTextActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={refreshNotifications}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main Notice List */}
      {loading && !refreshing && notifications.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading notices...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotices}
          keyExtractor={(item) => item.id}
          renderItem={renderNoticeItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  actionBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#FFF7ED',
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  filterSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  dateFilterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  dateFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 8,
  },
  dateFilterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dateScroll: {
    gap: 6,
    alignItems: 'center',
  },
  dateChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateChipActive: {
    backgroundColor: '#374151',
    borderColor: '#374151',
  },
  dateChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dateChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
  retryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  unreadCard: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFCFA',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  timestampText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  cardBody: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  cardTextContent: {
    flex: 1,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 4,
    lineHeight: 20,
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#111827',
  },
  previewText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markReadBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  readLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  readLabelText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  refreshBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
