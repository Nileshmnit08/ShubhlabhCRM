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
    } else {
      const actionableCount = queue.filter(op => op.status !== 'SYNCED').length;
      setPendingCount(actionableCount);
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

    // Poll the queue size periodically to update UI
    const interval = setInterval(() => {
      if (userId) updatePendingCount();
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
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
    <SyncContext.Provider value={{ isOnline, isSyncing, pendingCount, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
};
