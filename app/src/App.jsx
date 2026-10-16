import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell';
import { AuthContext } from './AuthContext';
import { LanguageContext } from './LanguageContext';
import { translations } from './lib/i18n';
import Auth from './components/Auth';
import { supabase } from './lib/supabase';
import ErrorBoundary from './components/ErrorBoundary';

// Public Website, Login & 404 (Directly imported for instantaneous first-paint)
import PublicWebsite from './pages/PublicWebsite/PublicWebsite';
import ProductDetailPage from './pages/PublicWebsite/ProductDetailPage';
import LaboratoryPage from './pages/PublicWebsite/LaboratoryPage';
import LoginPortal from './pages/Login/LoginPortal';
import NotFound from './components/NotFound';

// Lazy-loaded CRM workspace modules (isolates large libraries like country-state-city, pdfjs-dist, and jspdf)
const Today = lazy(() => import('./pages/Today'));
const CustomerList = lazy(() => import('./pages/Customers/List'));
const CustomerForm = lazy(() => import('./pages/Customers/Form'));
const CustomerView = lazy(() => import('./pages/Customers/View'));
const DormantList = lazy(() => import('./pages/Customers/DormantList'));
const ReactivationQueue = lazy(() => import('./pages/Customers/ReactivationQueue'));
const Opportunities = lazy(() => import('./pages/Opportunities'));

const RequirementList = lazy(() => import('./pages/Requirements/List'));
const RequirementView = lazy(() => import('./pages/Requirements/View'));
const RequirementForm = lazy(() => import('./pages/Requirements/Form'));
const SystemRequirementsBoard = lazy(() => import('./pages/SystemRequirements/SystemRequirementsBoard'));
const AutomationControl = lazy(() => import('./pages/AutomationControl'));

const DataImport = lazy(() => import('./pages/Data/Import'));
const ReviewQueue = lazy(() => import('./pages/Data/Review'));
const DataQuality = lazy(() => import('./pages/Data/DataQuality'));

const FollowUpList = lazy(() => import('./pages/FollowUps/List'));
const FollowUpForm = lazy(() => import('./pages/FollowUps/Form'));
const PaymentWorkspace = lazy(() => import('./pages/FollowUps/PaymentWorkspace'));
const ActivityTimeline = lazy(() => import('./pages/Activity/Timeline'));
const ControlRoom = lazy(() => import('./pages/ControlRoom'));
const AccountControl = lazy(() => import('./pages/AccountControl'));
const CoverageIntelligence = lazy(() => import('./pages/CoverageIntelligence'));
const DealerControlTower = lazy(() => import('./pages/DealerControlTower'));
const DemandSignals = lazy(() => import('./pages/DemandSignals'));
const ProductDemand = lazy(() => import('./pages/ProductDemand'));
const TerritoryDemand = lazy(() => import('./pages/TerritoryDemand'));
const DemandControlTower = lazy(() => import('./pages/DemandControlTower'));
const Performance = lazy(() => import('./pages/Performance'));
const Settings = lazy(() => import('./pages/Settings'));
const FollowUpActivityReport = lazy(() => import('./pages/Activity/FollowUpActivityReport'));
const RawMaterialPrices = lazy(() => import('./pages/RawMaterialPrices'));
const CustomerPricePublishing = lazy(() => import('./pages/CustomerPricePublishing'));
const StaffMessages = lazy(() => import('./pages/StaffMessages'));

const DispatchDashboard = lazy(() => import('./pages/Dispatches/Dashboard'));
const DispatchList = lazy(() => import('./pages/Dispatches/List'));
const DispatchDetail = lazy(() => import('./pages/Dispatches/Detail'));

const Logistics = lazy(() => import('./pages/Logistics'));
const CommunicationDashboard = lazy(() => import('./pages/CommunicationDashboard'));

const BusinessUpdatesList = lazy(() => import('./pages/BusinessUpdates/List'));
const BusinessUpdateForm = lazy(() => import('./pages/BusinessUpdates/Form'));
const BusinessUpdateDetail = lazy(() => import('./pages/BusinessUpdates/Detail'));

const TravelExpenses = lazy(() => import('./pages/TravelExpenses'));
const FieldMobility = lazy(() => import('./pages/FieldMobility'));

const WebsiteCMS = lazy(() => import('./pages/WebsiteCMS'));
const WebsiteLeads = lazy(() => import('./pages/WebsiteLeads'));

// Clean, lightweight workspace module loading fallback
const WorkspaceLoadingFallback = () => (
  <div style={{
    minHeight: '50vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted, #64748b)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  }}>
    <div style={{
      width: '32px',
      height: '32px',
      border: '3px solid rgba(18, 61, 38, 0.15)',
      borderTopColor: '#123d26',
      borderRadius: '50%',
      animation: 'crmModuleSpin 0.8s linear infinite',
      marginBottom: '1rem'
    }} />
    <style>{`@keyframes crmModuleSpin { to { transform: rotate(360deg); } }`}</style>
    <span style={{ fontSize: '0.9rem' }}>Loading workspace module...</span>
  </div>
);

// Placeholders for other routes
const Placeholder = ({ title }) => (
  <div className="animate-fade-in" style={{padding: '3rem', textAlign: 'center'}}>
    <h2>{title}</h2>
    <p className="text-secondary" style={{marginTop: '1rem'}}>This module will be built in a future sprint.</p>
  </div>
);

const AdminRoute = () => {
  const { userProfile } = React.useContext(AuthContext);
  if (!userProfile) return null;
  if (userProfile.role !== 'Admin') return <Navigate to="/today" replace />;
  return <Outlet />;
};

const ProtectedRoute = () => {
  const { session, userProfile, loading, authError } = React.useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-muted)'}}>
        Loading secure session...
      </div>
    );
  }

  if (authError) {
    return (
      <div style={{minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-base)'}}>
        <div className="glass-panel" style={{padding: '3rem', textAlign: 'center', maxWidth: '450px'}}>
          <h2 className="text-danger" style={{ marginBottom: '1rem' }}>Session Error</h2>
          <p className="text-secondary">{authError}</p>
          <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => supabase.auth.signOut()}>Sign Out</button>
            <a className="btn btn-primary" href="/">Go to Website</a>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login?destination=crm" state={{ from: location }} replace />;
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

  return <Outlet />;
};

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
    }).catch((err) => {
      console.warn('supabase.auth.getSession failed, continuing as guest:', err);
      setSession(null);
      setLoading(false);
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

  const fetchUserProfile = async (userId, retries = 3) => {
    try {
      const { data, error } = await supabase.from('app_users').select('*').eq('id', userId).single();
      if (error) {
        // Handle clock skew (PGRST303 / JWT issued at future) or auto-provisioning delay (PGRST116)
        const isClockSkew = error.code === 'PGRST303' || (error.message && error.message.includes('future'));
        const isNotReady = error.code === 'PGRST116';
        if ((isClockSkew || isNotReady) && retries > 0) {
          setTimeout(() => {
            fetchUserProfile(userId, retries - 1);
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
      setAuthError(null);
    } catch (err) {
      console.error('fetchUserProfile error:', err);
      setAuthError("Failed to fetch user profile: " + (err.message || 'Unknown error'));
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

  return (
    <ErrorBoundary>
      <AuthContext.Provider value={{ session, userProfile, setUserProfile, crmSettings, setCrmSettings, loading, authError }}>
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
          <BrowserRouter>
            <Suspense fallback={<WorkspaceLoadingFallback />}>
              <Routes>
                {/* Public Website */}
                <Route path="/" element={<PublicWebsite />} />
              <Route path="products/:slug" element={<ProductDetailPage />} />
              <Route path="laboratory" element={<LaboratoryPage />} />
              <Route path="lab" element={<Navigate to="/laboratory" replace />} />

              {/* Workspace Destination Selector & Auth */}
              <Route path="/login" element={<LoginPortal />} />

              {/* Protected CRM Workspace */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppShell />}>
                  <Route path="today" element={<Today />} />
                  
                  {/* Operational Areas (Daily Work) - Available to all Users */}
                  <Route path="customers">
                    <Route index element={<CustomerList />} />
                    <Route path="new" element={<CustomerForm />} />
                    <Route path=":id" element={<CustomerView />} />
                    <Route path=":id/edit" element={<CustomerForm />} />
                  </Route>
                  <Route path="requirements">
                    <Route index element={<RequirementList />} />
                    <Route path="new" element={<RequirementForm />} />
                    <Route path=":id" element={<RequirementView />} />
                    <Route path=":id/edit" element={<RequirementForm />} />
                  </Route>
                  <Route path="follow-ups">
                    <Route index element={<FollowUpList />} />
                    <Route path="new" element={<FollowUpForm />} />
                    <Route path=":id/edit" element={<FollowUpForm />} />
                  </Route>
                  <Route path="payments" element={<PaymentWorkspace />} />
                  <Route path="dispatches">
                    <Route index element={<DispatchDashboard />} />
                    <Route path="list" element={<DispatchList />} />
                    <Route path=":id" element={<DispatchDetail />} />
                  </Route>

                  {/* Admin-Only Routes */}
                  <Route element={<AdminRoute />}>
                    <Route path="communication" element={<CommunicationDashboard />} />
                    <Route path="customer-updates">
                      <Route index element={<BusinessUpdatesList />} />
                      <Route path="new" element={<BusinessUpdateForm />} />
                      <Route path=":id" element={<BusinessUpdateDetail />} />
                    </Route>
                    <Route path="system-requirements" element={<SystemRequirementsBoard />} />
                    <Route path="leads" element={<WebsiteLeads />} />
                    <Route path="website-leads" element={<WebsiteLeads />} />
                    <Route path="leads/accounts">
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
                    
                    <Route path="activity" element={<ActivityTimeline />} />
                    <Route path="staff-messages" element={<StaffMessages />} />
                    <Route path="reports/follow-up-activity" element={<FollowUpActivityReport />} />
                    <Route path="performance" element={<Performance />} />
                    <Route path="control-room" element={<ControlRoom />} />
                    <Route path="account-control" element={<AccountControl />} />
                    <Route path="communication" element={<CommunicationDashboard />} />
                    <Route path="dealer-control" element={<DealerControlTower />} />
                    <Route path="demand-signals" element={<DemandSignals />} />
                    <Route path="product-demand" element={<ProductDemand />} />
                    <Route path="territory-demand" element={<TerritoryDemand />} />
                    <Route path="demand-control-tower" element={<DemandControlTower />} />
                    <Route path="coverage" element={<CoverageIntelligence />} />
                    <Route path="automation-control" element={<AutomationControl />} />
                    <Route path="raw-material-prices/*" element={<RawMaterialPrices />} />
                    <Route path="customer-price-publishing/*" element={<CustomerPricePublishing />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="logistics" element={<Logistics />} />
                    <Route path="travel-expenses" element={<TravelExpenses />} />
                    <Route path="field-mobility" element={<FieldMobility />} />
                    <Route path="website-cms/*" element={<WebsiteCMS />} />
                  </Route>
                </Route>
              </Route>
              
              {/* Not Found */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        </LanguageContext.Provider>
      </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
