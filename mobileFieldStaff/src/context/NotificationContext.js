import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { useAuth } from './AuthContext';
import { InAppNotificationService } from '../services/InAppNotificationService';

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
