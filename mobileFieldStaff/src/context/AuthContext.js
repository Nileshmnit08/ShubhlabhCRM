import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InAppNotificationService } from '../services/InAppNotificationService';

const AUTH_PROFILE_KEY = '@auth_profile';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [staffProfile, setStaffProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        resolveFieldStaffIdentity(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        resolveFieldStaffIdentity(session.user.id);
      } else {
        setStaffProfile(null);
        setAuthError(prev => prev === 'SESSION_EXPIRED' ? prev : null);
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const resolveFieldStaffIdentity = async (userId) => {
    try {
      setLoading(true);
      setAuthError(null);
      
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          setAuthError('MISSING_PROFILE');
        } else if (error.code && error.code.startsWith('PGRST3')) {
          // JWT Authentication error (e.g., PGRST301 expired, PGRST303 issued at future)
          console.warn('JWT Auth Error (PGRST3), attempting session refresh:', error.code, error.message);
          
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('Session refresh failed:', refreshError);
              if (refreshError.name === 'AuthApiError' || refreshError.status >= 400 || (refreshError.message && refreshError.message.toLowerCase().includes('invalid refresh token'))) {
                // Token is definitively revoked/invalid
                console.warn('Session definitively invalid. Forcing explicit expiration.');
                await logout(true);
              } else {
                // Network issue or other retryable error, fallback to offline cache gracefully
                console.warn('Session refresh failed due to network. Falling back to offline cache.');
                await loadCachedProfile();
              }
            } else if (refreshData?.session) {
              console.log('Session refreshed. Re-attempting profile fetch...');
              const { data: retryData, error: retryError } = await supabase
                .from('app_users')
                .select('*')
                .eq('id', userId)
                .single();
                
              if (retryError) {
                await loadCachedProfile();
              } else if (retryData) {
                if (retryData.is_active && retryData.role !== 'Admin') {
                  setStaffProfile(retryData);
                  setAuthError(null);
                  await AsyncStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(retryData));
                } else {
                  setAuthError('UNAUTHORIZED');
                }
              }
            } else {
              await loadCachedProfile();
            }
          } catch (e) {
            console.error('Exception during session refresh fallback:', e);
            await loadCachedProfile();
          }
        } else {
          // On network/backend error, try to load from cache
          console.error('Error fetching user profile:', error);
          await loadCachedProfile();
        }
      } else if (data) {
        // Field Staff Authorization Logic based on verified backend architecture
        // They must be active and not an Admin to use the Field Assistant application
        if (data.is_active && data.role !== 'Admin') {
          setStaffProfile(data);
          setAuthError(null);
          await AsyncStorage.setItem(AUTH_PROFILE_KEY, JSON.stringify(data));
        } else {
          setAuthError('UNAUTHORIZED');
        }
      }
    } catch (err) {
      console.error('Failed to resolve field staff identity', err);
      await loadCachedProfile();
    } finally {
      setLoading(false);
    }
  };

  const loadCachedProfile = async () => {
    try {
      const cachedStr = await AsyncStorage.getItem(AUTH_PROFILE_KEY);
      if (cachedStr) {
        const cachedProfile = JSON.parse(cachedStr);
        setStaffProfile(cachedProfile);
        setAuthError(null);
        console.log('Loaded staff profile from offline cache.');
      } else {
        setAuthError('NETWORK_ERROR');
      }
    } catch (e) {
      setAuthError('NETWORK_ERROR');
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async (isSessionExpired = false) => {
    try {
      setLoading(true);
      if (isSessionExpired) {
        setAuthError('SESSION_EXPIRED');
      }
      // Ensure staff notification isolation
      if (session?.user?.id) {
        await InAppNotificationService.clearLocalState(session.user.id);
      }
      await AsyncStorage.removeItem(AUTH_PROFILE_KEY);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout', error);
    } finally {
      // FORCE clear local state regardless of Supabase network/JWT errors
      setSession(null);
      setStaffProfile(null);
      if (!isSessionExpired) {
        setAuthError(null);
      }
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, staffProfile, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
