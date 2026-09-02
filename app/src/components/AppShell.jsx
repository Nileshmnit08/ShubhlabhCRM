import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Clock, Activity, Settings, Menu, Database, Globe, LogOut, Target, RefreshCw, BarChart, ShieldAlert, Rocket, TrendingUp, DollarSign, Layers, Map, Zap, AlertTriangle, ChevronDown, ChevronRight, Pin, PinOff } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { LanguageContext } from '../LanguageContext';
import { supabase } from '../lib/supabase';
import { logActivity } from '../lib/activityLogger';
import NotificationBell from './NotificationBell';

const allNavItems = [
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
  { path: '/dealer-control', label: 'Dealer Growth Hub', icon: Map },
  { path: '/dispatches', label: 'Dispatch Dashboard', icon: Map },
  { path: '/coverage', label: 'Coverage Gaps', icon: Map },
  { path: '/automation-control', label: 'Automation Control', icon: Zap },
  { path: '/raw-material-prices', label: 'Raw Material Prices', icon: TrendingUp },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const menuGroups = [
  {
    id: 'customers-growth',
    title: 'CUSTOMERS & GROWTH',
    items: ['/customers', '/dealer-control', '/dormant', '/reactivation', '/leads', '/opportunities']
  },
  {
    id: 'demand-insights',
    title: 'DEMAND INSIGHTS',
    items: ['/demand-control-tower', '/demand-signals', '/product-demand', '/territory-demand', '/coverage']
  },
  {
    id: 'operations',
    title: 'OPERATIONS',
    items: ['/activity', '/performance', '/control-room', '/account-control']
  },
  {
    id: 'data-automation',
    title: 'DATA & AUTOMATION',
    items: ['/data', '/data/quality', '/automation-control']
  },
  {
    id: 'settings',
    title: 'SETTINGS',
    items: ['/raw-material-prices', '/settings']
  }
];

const defaultPinned = ['/', '/requirements', '/follow-ups', '/payments', '/dispatches', '/customers'];

const getBadge = (path) => {
  if (path === '/requirements') return { count: 3, type: 'amber' };
  if (path === '/follow-ups') return { count: 5, type: 'amber' };
  if (path === '/payments') return { count: 2, type: 'red' };
  if (path === '/dispatches') return { count: 1, type: 'red' };
  return null;
};

export default function AppShell() {
  const { userProfile, crmSettings } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const [pinnedItems, setPinnedItems] = React.useState(() => {
    try {
      const saved = localStorage.getItem('shublabh_pinned_nav');
      let items = saved ? JSON.parse(saved) : defaultPinned;
      if (!items.includes('/')) {
         items = ['/', ...items]; // Restore Today if it was removed
      }
      return items;
    } catch {
      return defaultPinned;
    }
  });

  const [expandedGroups, setExpandedGroups] = React.useState({
    'pinned': true,
    'customers-growth': false,
    'demand-insights': false,
    'operations': false,
    'data-automation': false,
    'settings': false
  });

  React.useEffect(() => {
    localStorage.setItem('shublabh_pinned_nav', JSON.stringify(pinnedItems));
  }, [pinnedItems]);

  const togglePin = (e, path) => {
    e.preventDefault();
    e.stopPropagation();
    if (path === '/') return; // Prevent unpinning the homepage
    setPinnedItems(prev => 
      prev.includes(path) 
        ? prev.filter(p => p !== path) 
        : [...prev, path]
    );
  };

  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const handleLogout = async () => {
    await logActivity({
      module: 'Auth',
      actionType: 'LOGOUT',
      summary: `User logged out.`
    });
    await supabase.auth.signOut();
  };

  const renderNavItem = (path) => {
    if (['/data', '/data/quality', '/control-room', '/account-control', '/dealer-control', '/automation-control'].includes(path) && userProfile?.role !== 'Admin') return null;
    
    const itemInfo = allNavItems.find(item => item.path === path);
    if (!itemInfo) return null;
    
    const Icon = itemInfo.icon;
    const isPinned = pinnedItems.includes(path);
    const badge = getBadge(path);
    
    return (
      <NavLink
        key={itemInfo.path}
        to={itemInfo.path}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        title={sidebarOpen ? '' : itemInfo.label}
      >
        <div className="nav-item-content">
          <Icon size={20} className="nav-icon" />
          <span className="nav-label">{itemInfo.label}</span>
          {badge && (
            <span className={`nav-badge nav-badge-${badge.type}`}>
              {badge.count}
            </span>
          )}
        </div>
        {path !== '/' && (
          <button 
            className={`pin-btn ${isPinned ? 'is-pinned' : ''}`}
            onClick={(e) => togglePin(e, path)}
            title={isPinned ? 'Unpin' : 'Pin to top'}
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
          </button>
        )}
      </NavLink>
    );
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
          <div className="nav-group">
            <button 
              className="nav-section-header" 
              onClick={() => toggleGroup('pinned')}
            >
              <span>PINNED / DAILY WORK</span>
              {expandedGroups['pinned'] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {expandedGroups['pinned'] && (
              <div className="nav-group-items">
                {pinnedItems.map(path => renderNavItem(path))}
                {pinnedItems.length === 0 && (
                  <div className="nav-empty-state">No items pinned</div>
                )}
              </div>
            )}
          </div>

          {menuGroups.map(group => (
            <div key={group.id} className="nav-group">
              <button 
                className="nav-section-header" 
                onClick={() => toggleGroup(group.id)}
              >
                <span>{group.title}</span>
                {expandedGroups[group.id] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expandedGroups[group.id] && (
                <div className="nav-group-items">
                  {group.items.map(path => renderNavItem(path))}
                </div>
              )}
            </div>
          ))}
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
