import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../../core/api/supabase';
import { Alert } from 'react-native';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [customerProfile, setCustomerProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null); // Used to show errors like "not a buyer"

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        handleSessionExpired();
      } else {
        setSession(session);
        if (session) {
          fetchBuyerData(session.user.id);
        } else {
          setLoading(false);
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'TOKEN_REFRESHED') {
        // Token refreshed successfully
      }
      if (_event === 'SIGNED_OUT') {
        clearState();
      } else if (session) {
        setSession(session);
        fetchBuyerData(session.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSessionExpired = () => {
    clearState();
    Alert.alert('Session khatam ho gaya.', 'Kripaya dobara login karein.');
  };

  const clearState = () => {
    setSession(null);
    setUserProfile(null);
    setCustomerProfile(null);
    setAuthError(null);
    setLoading(false);
  };

    const fetchBuyerData = async (userId) => {
    try {
      setAuthError(null);
      // Log AUTH SUCCESS
      console.log('AUTH SUCCESS:', { id: userId, email: session?.user?.email });

      // 1. Fetch User Profile
      const { data: user, error: userError } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single();
      
      console.log('APP USER:', {
        exists: !!user,
        role: user?.role,
        is_active: user?.is_active,
        crm_party_id: user?.crm_party_id
      });

      if (userError) throw userError;

      // 2. Verify Buyer Role
      if (user.role !== 'Buyer' || !user.is_active) {
        setAuthError('ROLE_INVALID');
        setLoading(false);
        return;
      }

      // 3. Check Customer Mapping
      if (!user.crm_party_id) {
        setAuthError('MAPPING_INVALID');
        setLoading(false);
        return;
      }

      setUserProfile(user);

      // 4. Load Buyer Profile (Customer)
      const { data: customer, error: customerError } = await supabase
        .from('crm_parties')
        .select('id, display_name, legal_or_core_name, mobile, city, state, assigned_owner_id, territory_id, crm_status, latitude, longitude')
        .eq('id', user.crm_party_id)
        .single();
      
      console.log('CRM PARTY:', {
        exists: !!customer,
        party_id: customer?.id
      });

      if (customerError) throw customerError;

      setCustomerProfile(customer);

    } catch (err) {
      console.error('Failed to fetch buyer data:', err);
      // If we fail to fetch after auth, it could be RLS blocking access, 
      // or network issue. We can log them out if it's a persistent 401/403.
      if (err?.code === 'PGRST116') {
        // Not found, could be role blocked by RLS
        setAuthError('NOT_FOUND');
      } else {
         // Network or other
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    clearState();
  };

  return (
    <AuthContext.Provider value={{ session, userProfile, customerProfile, loading, authError, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
