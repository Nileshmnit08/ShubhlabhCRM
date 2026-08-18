import React, { useContext } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, ClipboardList, Clock, Activity, Settings, Menu, Database, Globe } from 'lucide-react';
import { AuthContext } from '../AuthContext';
import { LanguageContext } from '../LanguageContext';

const navItems = [
  { path: '/', label: 'Today', icon: LayoutDashboard },
  { path: '/customers', label: 'Customers', icon: Users },
  { path: '/data', label: 'Data & Sync', icon: Database },
  { path: '/requirements', label: 'Requirements', icon: ClipboardList },
  { path: '/follow-ups', label: 'Follow-ups', icon: Clock },
  { path: '/activity', label: 'Activity', icon: Activity },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell() {
  const { userProfile } = useContext(AuthContext);
  const { language, setLanguage, t } = useContext(LanguageContext);
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="app-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <div style={{width: 24, height: 24, background: 'var(--primary)', borderRadius: '6px'}} />
            Feed CRM
          </div>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (item.path === '/data' && userProfile?.role !== 'Admin') return null;
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
             }}>
               {userProfile?.role === 'Admin' ? 'AD' : 'OP'}
             </div>
          </div>
        </header>

        <div className="page-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
