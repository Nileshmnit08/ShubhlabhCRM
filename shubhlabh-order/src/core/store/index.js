// State Management Foundation
// Using React Context for simple global state. Can be migrated to Zustand/Redux if needed.
import React, { createContext, useContext, useState } from 'react';

const AppStateContext = createContext(null);

export const AppStateProvider = ({ children }) => {
  const [session, setSession] = useState({
    isAuthenticated: false,
    user: null,
    token: null,
  });

  const [serverState, setServerState] = useState({
    isOnline: true,
    lastSync: null,
  });

  const value = {
    session,
    setSession,
    serverState,
    setServerState,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
};

// Local Persistent Storage Abstraction (Mock)
export const storage = {
  getItem: async (key) => {
    console.log(`Getting ${key} from storage`);
    return null;
  },
  setItem: async (key, value) => {
    console.log(`Setting ${key} in storage`);
  },
  removeItem: async (key) => {
    console.log(`Removing ${key} from storage`);
  }
};
