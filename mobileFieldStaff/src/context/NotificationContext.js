import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import {
  AppState,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { InAppNotificationService } from '../services/InAppNotificationService';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { handleNotificationPress } from '../navigation/NotificationRouter';
import * as Notifications from 'expo-notifications';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

// UUID validation guard – prevents routing on malformed entity_id values
function isValidUUID(value) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export const NotificationProvider = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Configure foreground notification behavior
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      // If the user is actively viewing the exact same conversation, 
      // DO NOT show the foreground system notification.
      const currentActiveChatId = activeChatIdRef.current;
      const data = notification.request.content.data;
      if (
        data?.type === 'chat_message' &&
        data?.conversation_id &&
        data.conversation_id === currentActiveChatId
      ) {
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
      
      // Otherwise, show standard foreground notification
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      };
    },
  });

  // Track which conversation the user is currently viewing so we
  // suppress redundant in-app toasts while they're already reading it.
  const [activeChatId, setActiveChatId] = useState(null);
  const activeChatIdRef = useRef(null);

  // Keep ref in sync so the Realtime callback always reads the latest value
  // without needing to be re-subscribed every time activeChatId changes.
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Toast states
  const [toastData, setToastData] = useState(null);
  const toastAnim = useRef(new Animated.Value(-120)).current;
  const hideTimeout = useRef(null);

  // Store the last cold-start pending notification so we can route it
  // once the nav stack is ready (after auth resolves).
  const pendingColdStartRef = useRef(null);

  // ─────────────────────────────────────────────────────────────────
  // INITIAL LOAD & NETWORK RECOVERY
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (userId) {
      loadLocalState();
      syncWithBackend();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && userId) {
        syncWithBackend();
      }
    });
    return () => unsubscribe();
  }, [userId]);

  const loadLocalState = async () => {
    if (!userId) return;
    const local = await InAppNotificationService.getLocalNotifications(userId);
    updateState(local);
  };

  const syncWithBackend = useCallback(async () => {
    if (!userId) return;
    const synced = await InAppNotificationService.syncNotifications(userId);
    updateState(synced);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────
  // PUSH NOTIFICATION LISTENERS
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Listen for user tapping a push notification
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (!userId || !data) return;

      // Construct a pseudo crm_notifications object so handleNotificationPress can route it
      if (data.type === 'chat_message' && data.conversation_id) {
        const fakeNotification = {
          entity_type: 'CHAT_MESSAGE',
          entity_id: data.conversation_id,
          title: response.notification.request.content.title || 'Staff Member',
        };
        handleNotificationPress(fakeNotification, userId);
      }
    });

    // 2. Handle cold start tap (app was completely closed)
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (!response) return;
      const data = response.notification.request.content.data;
      
      if (data?.type === 'chat_message' && data?.conversation_id) {
        const fakeNotification = {
          entity_type: 'CHAT_MESSAGE',
          entity_id: data.conversation_id,
          title: response.notification.request.content.title || 'Staff Member',
        };
        
        // Either route it now (if we somehow missed the initial boot)
        // or let the root navigator's cold-start delay pick it up.
        pendingColdStartRef.current = fakeNotification;
      }
    });

    return () => {
      if (responseListener && typeof responseListener.remove === 'function') {
        responseListener.remove();
      }
    };
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((notification) => {
    setToastData(notification);
    Animated.spring(toastAnim, {
      toValue: 50,
      useNativeDriver: true,
      bounciness: 12,
    }).start();

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    hideTimeout.current = setTimeout(() => {
      hideToast();
    }, 4000);
  }, [toastAnim]);

  const hideToast = useCallback(() => {
    Animated.timing(toastAnim, {
      toValue: -120,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setToastData(null));
  }, [toastAnim]);

  const handleToastPress = useCallback(async () => {
    if (!toastData) return;
    const snapshot = toastData;
    hideToast();
    // Mark read first (optimistic)
    markAsRead(snapshot.id);
    // Route via the centralised router
    await handleNotificationPress(snapshot, userId);
  }, [toastData, userId, hideToast]);

  // ─────────────────────────────────────────────────────────────────
  // REALTIME + APP STATE
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        syncWithBackend();
      }
    });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'crm_notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const newNotif = payload.new;

          if (newNotif.entity_type === 'CHAT_MESSAGE') {
            const currentActiveChatId = activeChatIdRef.current;
            if (
              newNotif.entity_id &&
              isValidUUID(newNotif.entity_id) &&
              newNotif.entity_id === currentActiveChatId &&
              AppState.currentState === 'active'
            ) {
              // User is actively viewing this conversation in the foreground – silently mark read
              await InAppNotificationService.markAsRead(userId, newNotif.id);
            } else {
              // Instead of a fake toast, fire a real Android system notification
              await Notifications.scheduleNotificationAsync({
                identifier: newNotif.id,
                content: {
                  title: newNotif.title || 'Shubh Labh Staff',
                  body: newNotif.message || 'New message',
                  data: {
                    type: 'chat_message',
                    conversation_id: newNotif.entity_id,
                    notification_id: newNotif.id
                  },
                },
                trigger: null, // trigger immediately
              });
            }
          } else {
            // Non-chat notifications still get a toast for now
            showToast(newNotif);
          }

          syncWithBackend();
        }
      )
      .subscribe();

    return () => {
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, syncWithBackend, showToast]);

  // ─────────────────────────────────────────────────────────────────
  // COLD START: route any pending notification after nav is ready
  // ─────────────────────────────────────────────────────────────────
  const routePendingColdStart = useCallback(async () => {
    const pending = pendingColdStartRef.current;
    if (!pending || !userId) return;
    pendingColdStartRef.current = null;
    await handleNotificationPress(pending, userId);
  }, [userId]);

  // ─────────────────────────────────────────────────────────────────
  // READ STATE
  // ─────────────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (notificationId) => {
    if (!userId) return;
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    updateState(updated);
    await InAppNotificationService.markAsRead(userId, notificationId);
  }, [userId, notifications]);

  const updateState = (data) => {
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.is_read).length);
  };

  // ─────────────────────────────────────────────────────────────────
  // ICON HELPER
  // ─────────────────────────────────────────────────────────────────
  const getToastIcon = (notification) => {
    if (!notification) return 'notifications';
    switch (notification.entity_type) {
      case 'CHAT_MESSAGE': return 'chat';
      case 'follow_ups':   return 'alarm';
      case 'requirements': return 'assignment';
      default:             return 'notifications';
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        syncNotifications: syncWithBackend,
        markAsRead,
        setActiveChatId,
        routePendingColdStart,
        setPendingColdStart: (notif) => { pendingColdStartRef.current = notif; },
      }}
    >
      {children}

      {/* ── WhatsApp-style Toast ── */}
      <Animated.View
        style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}
        pointerEvents="box-none"
      >
        {toastData && (
          <TouchableOpacity
            style={styles.toastCard}
            onPress={handleToastPress}
            activeOpacity={0.92}
          >
            <View style={styles.toastIconWrapper}>
              <MaterialIcons
                name={getToastIcon(toastData)}
                size={20}
                color={colors.onPrimary}
              />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle} numberOfLines={1}>
                {toastData.title}
              </Text>
              <Text style={styles.toastMessage} numberOfLines={2}>
                {toastData.message}
              </Text>
            </View>
            <TouchableOpacity onPress={hideToast} style={styles.toastDismiss} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <MaterialIcons name="close" size={16} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      </Animated.View>
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  toastIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  toastMessage: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  toastDismiss: {
    marginLeft: 8,
    padding: 4,
  },
});
