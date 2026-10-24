import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SyncService } from '../services/SyncService';
import { useAuth } from './AuthContext';

const SyncContext = createContext();
export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [retryingCount, setRetryingCount] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [queueVersion, setQueueVersion] = useState(0);
  const { session } = useAuth();
  
  const userId = session?.user?.id;

  const updatePendingCount = async () => {
    if (!userId) {
      setPendingCount(0);
      setFailedCount(0);
      setRetryingCount(0);
      setLastError(null);
      return;
    }
    const queue = await SyncService.getQueue(userId);
    if (queue === null) {
      setPendingCount('Unavailable');
      setFailedCount(0);
      setRetryingCount(0);
      setLastError(null);
    } else {
      const actionableCount = queue.filter(op => op.status !== 'SYNCED').length;
      const failedOps = queue.filter(op => op.status === 'FAILED');
      const retryingOps = queue.filter(op => op.status === 'PENDING' && (op.attempts || 0) > 0);

      setPendingCount(actionableCount);
      setFailedCount(failedOps.length);
      setRetryingCount(retryingOps.length);

      if (failedOps.length > 0) {
        setLastError(failedOps[failedOps.length - 1].last_error || 'Unknown error');
      } else if (retryingOps.length > 0 && retryingOps[retryingOps.length - 1].last_error) {
        setLastError(retryingOps[retryingOps.length - 1].last_error);
      } else {
        setLastError(null);
      }
    }
    setQueueVersion(v => v + 1);
  };

  const getQueue = async () => {
    if (!userId) return [];
    return (await SyncService.getQueue(userId)) || [];
  };

  useEffect(() => {
    // Initial Network State
    NetInfo.fetch().then(state => {
      setIsOnline(state.isConnected);
    });

    // Subscribe to Network State Changes
    const unsubscribe = NetInfo.addEventListener(state => {
      const online = state.isConnected;
      setIsOnline(online);
      
      if (online && userId) {
        triggerSync(userId, false);
      }
    });

    // Recover stale items on startup/session change, then update counts
    if (userId) {
      SyncService.recoverStaleSyncingItems(userId)
        .catch(err => console.warn('[SyncContext] recoverStaleSyncingItems error:', err))
        .finally(() => {
          updatePendingCount();
        });
    } else {
      setPendingCount(0);
      setFailedCount(0);
      setRetryingCount(0);
    }

    // Register live queue change listener
    SyncService.onQueueChange = () => {
      if (userId) updatePendingCount();
    };

    // Poll the queue size periodically to update UI
    const interval = setInterval(() => {
      if (userId) updatePendingCount();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      SyncService.onQueueChange = null;
    };
  }, [userId]);

  const triggerSync = async (activeUserId = userId, isManual = true) => {
    if (isSyncing || !activeUserId) return;
    
    setIsSyncing(true);
    try {
      await SyncService.processQueue(activeUserId, isManual);
    } catch (err) {
      console.warn('[SyncContext] triggerSync error:', err);
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, failedCount, retryingCount, lastError, triggerSync, getQueue, queueVersion }}>
      {children}
    </SyncContext.Provider>
  );
};
