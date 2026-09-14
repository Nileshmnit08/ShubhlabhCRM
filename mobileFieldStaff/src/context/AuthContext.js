import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
        setAuthError(null);
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
        } else {
          setAuthError('BACKEND_ERROR');
          console.error('Error fetching user profile:', error);
        }
      } else if (data) {
        // Field Staff Authorization Logic based on verified backend architecture
        // They must be active and not an Admin to use the Field Assistant application
        if (data.is_active && data.role !== 'Admin') {
          setStaffProfile(data);
          setAuthError(null);
        } else {
          setAuthError('UNAUTHORIZED');
        }
      }
    } catch (err) {
      console.error('Failed to resolve field staff identity', err);
      setAuthError('NETWORK_ERROR');
    } finally {
      setLoading(false);
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

  const logout = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during logout', error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, staffProfile, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
