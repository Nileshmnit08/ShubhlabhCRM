import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState, View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { InAppNotificationService } from '../services/InAppNotificationService';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';
import { navigate } from '../navigation/RootNavigation';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  // Chat specific states
  const [activeChatId, setActiveChatId] = useState(null);
  
  // Toast states
  const [toastData, setToastData] = useState(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const hideTimeout = useRef(null);

  // Initialize from local storage on mount/auth change
  useEffect(() => {
    if (userId) {
      loadLocalState();
      syncWithBackend();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userId]);

  // Listen to network changes and sync when coming online
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

  const showToast = (notification) => {
    setToastData(notification);
    Animated.spring(toastAnim, {
      toValue: 50, // slide down to y=50
      useNativeDriver: true,
      bounciness: 12
    }).start();

    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    
    hideTimeout.current = setTimeout(() => {
      hideToast();
    }, 4000);
  };

  const hideToast = () => {
    Animated.timing(toastAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setToastData(null));
  };

  const handleToastPress = () => {
    if (!toastData) return;
    hideToast();
    markAsRead(toastData.id);
    
    if (toastData.entity_type === 'CHAT_MESSAGE' && toastData.entity_id) {
      // Navigate to chat
      // We need otherUser info, but we only have conversationId.
      // ChatConversationScreen can handle fetching otherUser if missing, or we can just pass id.
      // Since our ChatConversationScreen currently expects otherUser, we might need to modify it 
      // or pass a partial object.
      navigate('ChatConversation', {
        conversationId: toastData.entity_id,
        otherUser: { full_name: toastData.title } // pass title as fallback name
      });
    } else if (toastData.link_url) {
      // Basic navigation for other types (if mapped)
      if (toastData.link_url === '/my-work') navigate('My Work');
    }
  };

  // Listen to AppState (foreground) and Supabase Realtime
  useEffect(() => {
    if (!userId) return;

    // 1. AppState Listener for foreground recovery (Fallback/Robustness)
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        syncWithBackend();
      }
    });

    // 2. Supabase Realtime Listener (Live Sync while app is open)
    const channel = supabase.channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'crm_notifications', filter: `user_id=eq.${userId}` },
        async (payload) => {
          const newNotif = payload.new;
          
          if (newNotif.entity_type === 'CHAT_MESSAGE') {
            if (newNotif.entity_id === activeChatId) {
              // Suppress duplicate/noisy notification if user is in that chat
              await InAppNotificationService.markAsRead(userId, newNotif.id);
            } else {
              showToast(newNotif);
            }
          }
          
          syncWithBackend();
        }
      )
      .subscribe();

    return () => {
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, syncWithBackend, activeChatId]);

  const markAsRead = async (notificationId) => {
    if (!userId) return;
    
    // Optimistic local UI update
    const updated = notifications.map(n => 
      n.id === notificationId ? { ...n, is_read: true } : n
    );
    updateState(updated);
    
    // Background service delegation
    await InAppNotificationService.markAsRead(userId, notificationId);
  };

  const updateState = (data) => {
    setNotifications(data);
    setUnreadCount(data.filter(n => !n.is_read).length);
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      syncNotifications: syncWithBackend, 
      markAsRead,
      setActiveChatId
    }}>
      {children}
      
      {/* Toast Overlay */}
      <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }] }]}>
        {toastData && (
          <TouchableOpacity 
            style={styles.toastCard} 
            onPress={handleToastPress}
            activeOpacity={0.9}
          >
            <View style={styles.toastIconWrapper}>
              <MaterialIcons 
                name={toastData.entity_type === 'CHAT_MESSAGE' ? "chat" : "notifications"} 
                size={22} 
                color={colors.primary} 
              />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle} numberOfLines={1}>{toastData.title}</Text>
              <Text style={styles.toastMessage} numberOfLines={2}>{toastData.message}</Text>
            </View>
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
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toastCard: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    alignItems: 'center',
  },
  toastIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceContainer,
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
  }
});
