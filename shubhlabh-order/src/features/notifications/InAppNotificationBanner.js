import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Platform,
} from 'react-native';
import { X, ChevronRight, BellRing } from 'lucide-react-native';
import { theme } from '../../shared/theme';
import { useNotifications } from './NotificationContext';
import { useTranslation } from '../../shared/localization/i18n';

export default function InAppNotificationBanner({ onNavigateToNotice }) {
  const { activePopup, dismissPopup, markAsRead } = useNotifications();
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const dismissTimerRef = useRef(null);

  useEffect(() => {
    if (activePopup) {
      // Slide in
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }).start();

      // Clear any prior timer and auto-dismiss after 7 seconds
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, 7000);
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [activePopup]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      dismissPopup();
    });
  };

  const handlePressView = () => {
    if (!activePopup) return;
    const updateId = activePopup.id;
    markAsRead(updateId);
    handleDismiss();
    if (onNavigateToNotice) {
      onNavigateToNotice(updateId);
    }
  };

  if (!activePopup) return null;

  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safeContainer}>
      <Animated.View
        style={[
          styles.bannerCard,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Header row */}
        <View style={styles.topRow}>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.categoryBadge,
                { backgroundColor: activePopup.categoryBg || '#FFEDD5' },
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  { color: activePopup.categoryColor || '#EA580C' },
                ]}
              >
                {activePopup.categoryLabel || 'Notice'}
              </Text>
            </View>
            <View style={styles.liveIndicator}>
              <BellRing size={12} color="#DC2626" />
              <Text style={styles.liveText}>New Notice</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleDismiss}
            style={styles.closeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Dismiss notice"
          >
            <X size={16} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Title and message preview */}
        <Text style={styles.title} numberOfLines={1}>
          {activePopup.title}
        </Text>
        <Text style={styles.preview} numberOfLines={2}>
          {activePopup.message}
        </Text>

        {/* Action button */}
        <TouchableOpacity
          style={styles.viewActionBtn}
          onPress={handlePressView}
          activeOpacity={0.8}
        >
          <Text style={styles.viewActionText}>
            {t('notifications.viewUpdate') || 'View Update'}
          </Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 10 : 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  bannerCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#DC2626',
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary || '#111827',
    marginBottom: 4,
  },
  preview: {
    fontSize: 13,
    color: theme.colors.textSecondary || '#4B5563',
    lineHeight: 18,
    marginBottom: 10,
  },
  viewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary || '#F97316',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start',
    gap: 4,
  },
  viewActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
