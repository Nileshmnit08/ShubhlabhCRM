import React, { createContext, useContext, useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { SyncService } from '../services/SyncService';

const SyncContext = createContext();
export const useSync = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const updatePendingCount = async () => {
    const queue = await SyncService.getQueue();
    setPendingCount(queue.length);
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
      
      if (online) {
        triggerSync();
      }
    });

    // Initial queue count
    updatePendingCount();

    // Poll the queue size periodically to update UI
    const interval = setInterval(updatePendingCount, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const triggerSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      await SyncService.processQueue();
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
