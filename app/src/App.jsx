import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import { AuthContext } from './AuthContext';
import { LanguageContext } from './LanguageContext';
import { translations } from './lib/i18n';
import Today from './pages/Today';
import CustomerList from './pages/Customers/List';
import CustomerForm from './pages/Customers/Form';
import CustomerView from './pages/Customers/View';
import DormantList from './pages/Customers/DormantList';
import ReactivationQueue from './pages/Customers/ReactivationQueue';
import Opportunities from './pages/Opportunities';

import RequirementList from './pages/Requirements/List';
import RequirementView from './pages/Requirements/View';
import RequirementForm from './pages/Requirements/Form';

import DataImport from './pages/Data/Import';
import ReviewQueue from './pages/Data/Review';
import DataQuality from './pages/Data/DataQuality';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

import FollowUpList from './pages/FollowUps/List';
import FollowUpForm from './pages/FollowUps/Form';
import ActivityTimeline from './pages/Activity/Timeline';
import ControlRoom from './pages/ControlRoom';
import Performance from './pages/Performance';
import Settings from './pages/Settings';

// Placeholders for other routes
const Placeholder = ({ title }) => (
  <div className="animate-fade-in" style={{padding: '3rem', textAlign: 'center'}}>
    <h2>{title}</h2>
    <p className="text-secondary" style={{marginTop: '1rem'}}>This module will be built in a future sprint.</p>
  </div>
);

function App() {
  const [session, setSession] = React.useState(null);
  const [userProfile, setUserProfile] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [authError, setAuthError] = React.useState(null);
  const [language, setLanguage] = React.useState('en');
  const [crmSettings, setCrmSettings] = React.useState(null);

  const t = React.useCallback((key) => {
    return translations[language]?.[key] || translations['en']?.[key] || key;
  }, [language]);

  const handleSetLanguage = async (newLang) => {
    setLanguage(newLang);
    if (userProfile?.id) {
      // Optimistically update
      setUserProfile(prev => ({ ...prev, preferred_language: newLang }));
      await supabase.from('app_users').update({ preferred_language: newLang }).eq('id', userProfile.id);
    }
  };

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        fetchCrmSettings();
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
        fetchCrmSettings();
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase.from('app_users').select('*').eq('id', userId).single();
      if (error) {
        // If row doesn't exist yet (e.g. trigger hasn't finished), retry or handle
        if (error.code === 'PGRST116') {
           // Poll briefly for auto-provisioning
           setTimeout(async () => {
             const { data: retryData } = await supabase.from('app_users').select('*').eq('id', userId).single();
             setUserProfile(retryData || { role: 'Operator', is_active: false });
             setLoading(false);
           }, 1000);
           return;
        }
        throw error;
      }
      if (data?.preferred_language) {
        setLanguage(data.preferred_language);
      }
      
      // Apply personalization
      if (data) {
        applyPersonalization(data);
      }
      
      setUserProfile(data);
    } catch (err) {
      console.error(err);
      setAuthError("Failed to fetch user profile.");
    } finally {
      setLoading(false);
    }
  };

  const fetchCrmSettings = async () => {
    try {
      const { data, error } = await supabase.from('crm_settings').select('*').eq('id', 1).single();
      if (data) {
        setCrmSettings(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const applyPersonalization = (profile) => {
    const root = document.documentElement;
    if (profile.accent_color) {
      root.style.setProperty('--primary', profile.accent_color);
    }
    if (profile.theme_mode === 'dark') {
      root.classList.add('dark');
      root.style.setProperty('--bg-base', '#0f172a');
      root.style.setProperty('--bg-surface', '#1e293b');
      root.style.setProperty('--text-primary', '#f8fafc');
      root.style.setProperty('--text-secondary', '#94a3b8');
      root.style.setProperty('--border', '#334155');
    } else {
      root.classList.remove('dark');
      root.style.removeProperty('--bg-base');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--border');
    }
    if (profile.wallpaper_url) {
      document.body.style.backgroundImage = `url(${profile.wallpaper_url})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      document.body.style.backgroundImage = 'none';
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>Loading secure session...</div>;

  if (authError) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{authError}</div>;

  if (!session) {
    return <Auth />;
  }

  if (userProfile && !userProfile.is_active) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)'}}>
        <div className="glass-panel" style={{padding: '3rem', textAlign: 'center', maxWidth: '400px'}}>
          <h2 className="text-danger">Unauthorized</h2>
          <p className="text-secondary" style={{marginTop: '1rem'}}>Your account is currently inactive. Please contact your system administrator for access.</p>
          <button className="btn btn-secondary" style={{marginTop: '2rem'}} onClick={() => supabase.auth.signOut()}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ session, userProfile, setUserProfile, crmSettings, setCrmSettings }}>
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<AppShell />}>
              <Route index element={<Today />} />
              
              <Route path="customers">
                <Route index element={<CustomerList />} />
                <Route path="new" element={<CustomerForm />} />
                <Route path=":id" element={<CustomerView />} />
                <Route path=":id/edit" element={<CustomerForm />} />
              </Route>
              
              <Route path="leads">
                <Route index element={<CustomerList isLeadMode />} />
                <Route path="new" element={<CustomerForm isLeadMode />} />
                <Route path=":id" element={<CustomerView isLeadMode />} />
                <Route path=":id/edit" element={<CustomerForm isLeadMode />} />
              </Route>
              
              <Route path="opportunities" element={<Opportunities />} />
              
              <Route path="dormant" element={<DormantList />} />
              <Route path="reactivation" element={<ReactivationQueue />} />
              
              <Route path="data">
                <Route index element={<Navigate to="import" replace />} />
                <Route path="import" element={<DataImport />} />
                <Route path="review" element={<ReviewQueue />} />
                <Route path="quality" element={<DataQuality />} />
              </Route>
              <Route path="requirements">
                <Route index element={<RequirementList />} />
                <Route path="new" element={<RequirementForm />} />
                <Route path=":id" element={<RequirementView />} />
              </Route>
              <Route path="follow-ups">
                <Route index element={<FollowUpList />} />
                <Route path="new" element={<FollowUpForm />} />
                <Route path=":id/edit" element={<FollowUpForm />} />
              </Route>
              
              <Route path="activity" element={<ActivityTimeline />} />
              <Route path="performance" element={<Performance />} />
              <Route path="control-room" element={<ControlRoom />} />
              <Route path="settings" element={<Settings />} />
              
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
            </Routes>
          </BrowserRouter>
        </LanguageContext.Provider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
