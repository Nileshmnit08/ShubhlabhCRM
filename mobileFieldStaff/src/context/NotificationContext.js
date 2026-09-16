import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { InAppNotificationService } from '../services/InAppNotificationService';
import { supabase } from '../lib/supabase';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

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
        () => {
          syncWithBackend();
        }
      )
      .subscribe();

    return () => {
      appStateSubscription.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, syncWithBackend]);

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
    <NotificationContext.Provider value={{ notifications, unreadCount, syncNotifications: syncWithBackend, markAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
