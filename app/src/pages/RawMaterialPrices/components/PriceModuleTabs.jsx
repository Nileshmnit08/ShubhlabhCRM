import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileEdit, 
  History, 
  BarChart2, 
  MessageCircle, 
  Settings 
} from 'lucide-react';

const PriceModuleTabs = () => {
  const location = useLocation();

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '' },
    { id: 'daily-entry', label: 'Daily Price Entry', icon: FileEdit, path: 'daily-entry' },
    { id: 'history', label: 'Price History', icon: History, path: 'history' },
    { id: 'analysis', label: 'Price Analysis', icon: BarChart2, path: 'analysis' },
    { id: 'whatsapp', label: 'WhatsApp Update', icon: MessageCircle, path: 'whatsapp' },
    { id: 'configuration', label: 'Configuration', icon: Settings, path: 'configuration' },
  ];

  return (
    <div className="mb-8 w-full overflow-hidden" style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="flex overflow-x-auto hide-scrollbar gap-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const fullPath = `/raw-material-prices${tab.path ? `/${tab.path}` : ''}`;
          return (
            <NavLink
              key={tab.id}
              to={fullPath}
              end={tab.path === ''}
              className={({ isActive }) => `flex items-center gap-2 px-4 py-3 text-sm transition-colors whitespace-nowrap ${
                isActive 
                  ? 'text-primary font-semibold border-b-4 border-primary' 
                  : 'text-secondary font-medium hover:bg-base/50 hover:text-primary border-b-4 border-transparent'
              }`}
              style={{ marginBottom: '-1px' }}
            >
              <Icon size={16} />
              {tab.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};

export default PriceModuleTabs;
