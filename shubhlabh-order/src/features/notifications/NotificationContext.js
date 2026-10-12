import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { AppState, Vibration } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../../core/api/supabase';
import {
  fetchCustomerNotifications,
  markNoticeAsRead,
  markAllNoticesAsRead,
  calculateUnreadCount,
} from './customerNotificationService';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { userProfile, customerProfile } = useAuth();
  const customerId = userProfile?.crm_party_id || customerProfile?.id || null;

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activePopup, setActivePopup] = useState(null);

  // Track notices already seen in this session to prevent duplicate popups
  const knownNoticeIdsRef = useRef(new Set());
  const isInitialFetchRef = useRef(true);
  const pollingTimerRef = useRef(null);
  const isFetchingRef = useRef(false);

  const fetchNotices = useCallback(async (isBackgroundRefresh = false) => {
    if (!customerId) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Prevent duplicate concurrent in-flight requests
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!isBackgroundRefresh) {
      setLoading(true);
    }
    setError(null);

    try {
      const res = await fetchCustomerNotifications(customerId);
      if (res.success) {
        const fetchedList = res.data || [];
        setNotifications(fetchedList);
        const count = calculateUnreadCount(fetchedList);
        setUnreadCount(count);

        if (isInitialFetchRef.current) {
          // On first load of this session, record existing IDs without triggering popups
          fetchedList.forEach(n => knownNoticeIdsRef.current.add(n.id));
          isInitialFetchRef.current = false;
        } else {
          // Identify genuinely new unread notices that were not in knownNoticeIdsRef
          const newNotices = fetchedList.filter(
            n => !n.is_read && !knownNoticeIdsRef.current.has(n.id)
          );

          if (newNotices.length > 0) {
            const latestNewNotice = newNotices[0];
            // Mark as known
            newNotices.forEach(n => knownNoticeIdsRef.current.add(n.id));
            
            // Trigger in-app popup banner
            setActivePopup(latestNewNotice);

            // Brief, gentle haptic alert (200ms)
            try {
              Vibration.vibrate(200);
            } catch (vErr) {
              // Ignore vibration failure if device does not support it
            }
          }
        }
      } else {
        setError(res.error || 'Failed to fetch notifications');
      }
    } catch (e) {
      setError(e.message || 'Error fetching notifications');
    } finally {
      isFetchingRef.current = false;
      if (!isBackgroundRefresh) {
        setLoading(false);
      }
    }
  }, [customerId]);

  // Handle AppState changes (pause polling when backgrounded, refresh on resume)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        fetchNotices(true);
        startPolling();
      } else {
        stopPolling();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    startPolling();

    return () => {
      subscription.remove();
      stopPolling();
    };
  }, [fetchNotices]);

  const startPolling = () => {
    stopPolling();
    // Poll every 25 seconds while app is in foreground
    pollingTimerRef.current = setInterval(() => {
      fetchNotices(true);
    }, 25000);
  };

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
  };

  // Real-time Supabase Subscription
  useEffect(() => {
    if (!customerId) return;

    fetchNotices(false);

    // Subscribe to changes on business_updates and business_update_recipients
    const channel = supabase
      .channel('public:customer-notices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_updates' },
        () => {
          fetchNotices(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'business_update_recipients' },
        () => {
          fetchNotices(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [customerId, fetchNotices]);

  // Stable callback for manual / focus refresh
  const refreshNotifications = useCallback(() => {
    return fetchNotices(false);
  }, [fetchNotices]);

  // Mark single notice as read
  const markAsRead = useCallback(async (updateId) => {
    if (!updateId || !customerId) return;

    // Optimistic local update
    setNotifications(prev =>
      prev.map(n => (n.id === updateId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    if (activePopup?.id === updateId) {
      setActivePopup(null);
    }

    await markNoticeAsRead(updateId, customerId);
  }, [customerId, activePopup?.id]);

  // Mark all notices as read
  const markAllAsRead = useCallback(async () => {
    if (!customerId) return;

    // Optimistic local update
    const unreadSnapshot = [...notifications];
    setNotifications(prev =>
      prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);
    setActivePopup(null);

    await markAllNoticesAsRead(unreadSnapshot, customerId);
  }, [customerId, notifications]);

  const dismissPopup = useCallback(() => {
    setActivePopup(null);
  }, []);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    error,
    activePopup,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    dismissPopup,
    setActivePopup,
  }), [
    notifications,
    unreadCount,
    loading,
    error,
    activePopup,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    dismissPopup,
  ]);

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
