import React, { createContext, useContext, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import {
  generateSessionId,
  startPresenceSession,
  sendPresenceHeartbeat,
  transitionPresenceBackground,
  transitionPresenceForeground,
  endPresenceSession,
  HEARTBEAT_INTERVAL_MS,
} from './presenceService';

const PresenceContext = createContext(null);

export const usePresence = () => useContext(PresenceContext);

export function PresenceProvider({ children }) {
  const { session, userProfile } = useAuth();
  const sessionIdRef = useRef(null);
  const currentUserIdRef = useRef(null);
  const heartbeatTimerRef = useRef(null);
  const isForegroundRef = useRef(AppState.currentState === 'active');
  const isInitializedRef = useRef(false);

  const isEligibleBuyer = Boolean(
    session?.user?.id &&
    ['Buyer', 'Customer'].includes(userProfile?.role) &&
    userProfile?.crm_party_id
  );

  // Stop heartbeat timer safely
  const stopHeartbeat = () => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  };

  // Start periodic 60s heartbeat timer while foregrounded
  const startHeartbeat = () => {
    stopHeartbeat();
    heartbeatTimerRef.current = setInterval(async () => {
      if (sessionIdRef.current && isForegroundRef.current) {
        await sendPresenceHeartbeat(sessionIdRef.current);
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  // Initialize or terminate session based on auth eligibility
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      if (isEligibleBuyer) {
        const currentUserId = session?.user?.id;
        // If switched to a different buyer account without intermediate logout, terminate old session first
        if (sessionIdRef.current && currentUserIdRef.current && currentUserIdRef.current !== currentUserId) {
          const oldSessionId = sessionIdRef.current;
          sessionIdRef.current = null;
          isInitializedRef.current = false;
          stopHeartbeat();
          await endPresenceSession(oldSessionId);
        }

        if (!sessionIdRef.current) {
          currentUserIdRef.current = currentUserId;
          const newSessionId = generateSessionId();
          sessionIdRef.current = newSessionId;
          const res = await startPresenceSession(newSessionId);
          if (res.success && isMounted) {
            isInitializedRef.current = true;
            if (AppState.currentState === 'active') {
              isForegroundRef.current = true;
              startHeartbeat();
            }
          }
        }
      } else {
        // Buyer logged out or not eligible
        currentUserIdRef.current = null;
        if (sessionIdRef.current) {
          const activeSessionId = sessionIdRef.current;
          sessionIdRef.current = null;
          isInitializedRef.current = false;
          stopHeartbeat();
          await endPresenceSession(activeSessionId);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [isEligibleBuyer, session?.user?.id, userProfile?.crm_party_id]);

  // Handle AppState transitions (active vs background)
  useEffect(() => {
    const handleAppStateChange = async (nextAppState) => {
      if (!sessionIdRef.current || !isInitializedRef.current) return;

      if (nextAppState === 'active') {
        isForegroundRef.current = true;
        await transitionPresenceForeground(sessionIdRef.current);
        startHeartbeat();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        isForegroundRef.current = false;
        stopHeartbeat();
        await transitionPresenceBackground(sessionIdRef.current);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      stopHeartbeat();
    };
  }, []);

  return (
    <PresenceContext.Provider value={{ sessionId: sessionIdRef.current }}>
      {children}
    </PresenceContext.Provider>
  );
}
