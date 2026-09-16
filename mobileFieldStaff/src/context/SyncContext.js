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
  const [lastError, setLastError] = useState(null);
  const { session } = useAuth();
  
  const userId = session?.user?.id;

  const updatePendingCount = async () => {
    if (!userId) {
      setPendingCount(0);
      return;
    }
    const queue = await SyncService.getQueue(userId);
    if (queue === null) {
      setPendingCount('Unavailable');
      setFailedCount(0);
      setLastError(null);
    } else {
      const actionableCount = queue.filter(op => op.status !== 'SYNCED').length;
      const failedOps = queue.filter(op => op.status === 'FAILED');
      setPendingCount(actionableCount);
      setFailedCount(failedOps.length);
      if (failedOps.length > 0) {
        setLastError(failedOps[failedOps.length - 1].last_error || 'Unknown error');
      } else {
        setLastError(null);
      }
    }
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
        triggerSync(userId);
      }
    });

    // Initial queue count for current user
    if (userId) {
      updatePendingCount();
    } else {
      setPendingCount(0);
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

  const triggerSync = async (activeUserId = userId) => {
    if (isSyncing || !activeUserId) return;
    
    setIsSyncing(true);
    try {
      await SyncService.processQueue(activeUserId);
    } finally {
      setIsSyncing(false);
      await updatePendingCount();
    }
  };

  return (
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, failedCount, lastError, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};
