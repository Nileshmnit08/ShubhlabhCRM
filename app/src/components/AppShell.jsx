import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Clock, Activity, Settings, Menu, Database, Globe, LogOut, Target, RefreshCw, BarChart, ShieldAlert, Rocket, TrendingUp, DollarSign, Layers, Map, Zap } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { LanguageContext } from '../LanguageContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import { AlertTriangle } from 'lucide-react';
import NotificationBell from './NotificationBell';

const navItems = [
  { path: '/', label: 'Today', icon: LayoutDashboard },
  { path: '/demand-control-tower', label: 'Demand Control Tower', icon: Target },
  { path: '/leads', label: 'Leads', icon: Target },
  { path: '/opportunities', label: 'Opportunities', icon: Rocket },
  { path: '/demand-signals', label: 'Demand Signals', icon: Activity },
  { path: '/product-demand', label: 'Product Demand', icon: Layers },
  { path: '/territory-demand', label: 'Territory Demand', icon: Map },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/dormant', label: 'Dormant', icon: AlertTriangle },
  { path: '/reactivation', label: 'Reactivation', icon: RefreshCw },
  { path: '/data', label: 'Data & Sync', icon: Database },
  { path: '/data/quality', label: 'Data Quality', icon: ShieldAlert },
  { path: '/requirements', label: 'Requirements', icon: ClipboardList },
  { path: '/follow-ups', label: 'Follow-ups', icon: Clock },
  { path: '/payments', label: 'Payments', icon: DollarSign },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/performance', label: 'My Performance', icon: TrendingUp },
  { path: '/control-room', label: 'Control Room', icon: BarChart },
  { path: '/account-control', label: 'Account Control', icon: ShieldAlert },
  { path: '/dealer-control', label: 'Dealer Control', icon: Map },
  { path: '/coverage', label: 'Coverage Gaps', icon: Map },
  { path: '/automation-control', label: 'Automation Control', icon: Zap },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { userProfile, crmSettings } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = async () => {
    await logActivity({
      module: 'Auth',
      actionType: 'LOGOUT',
      summary: `User logged out.`
    });
    await supabase.auth.signOut();
  };

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {crmSettings?.app_logo_url ? (
              <img src={crmSettings.app_logo_url} alt="Logo" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            ) : (
              <div style={{width: 24, height: 24, background: 'var(--primary)', borderRadius: '6px'}} />
            )}
            <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {crmSettings?.crm_name || 'Feed CRM'}
            </span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (['/data', '/data/quality', '/control-room', '/account-control', '/dealer-control', '/automation-control'].includes(item.path) && userProfile?.role !== 'Admin') return null;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon size={20} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button 
            className="btn-icon" 
            style={{display: 'none'}} // In a full implementation, use media queries to show this on mobile
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu />
          </button>
          
          <div style={{marginLeft: 'auto', display: 'flex', gap: '1rem', alignItems: 'center'}}>
             <NotificationBell />
             <button 
               className="btn-icon" 
               style={{display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.85rem', fontWeight: 600}} 
               onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
               title="Toggle Language (English/Hindi)"
             >
               <Globe size={18} /> {language.toUpperCase()}
             </button>
             <div style={{
               width: 36, height: 36, borderRadius: '50%', 
               background: 'var(--bg-surface-hover)', display: 'flex', 
               alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
             }} title={userProfile?.role}>
               {userProfile?.role === 'Admin' ? 'AD' : 'OP'}
             </div>
             <button 
               className="btn-icon" 
               onClick={handleLogout}
               title="Log Out"
               style={{color: 'var(--danger)'}}
             >
               <LogOut size={18} />
             </button>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
