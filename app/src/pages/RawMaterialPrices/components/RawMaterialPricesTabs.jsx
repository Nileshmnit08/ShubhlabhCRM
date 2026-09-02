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

const RawMaterialPricesTabs = () => {
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
    <nav aria-label="Raw Material Prices Navigation" className="mb-6 w-full">
      <div className="border-b border-base w-full">
        <ul className="flex overflow-x-auto hide-scrollbar gap-2" role="tablist">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const fullPath = `/raw-material-prices${tab.path ? `/${tab.path}` : ''}`;
            const isActive = tab.path === '' 
              ? location.pathname === '/raw-material-prices' 
              : location.pathname.startsWith(`/raw-material-prices/${tab.path}`);

            return (
              <li key={tab.id} role="presentation">
                <NavLink
                  to={fullPath}
                  end={tab.path === ''}
                  aria-current={isActive ? 'page' : undefined}
                  role="tab"
                  aria-selected={isActive}
                  className={`flex items-center gap-2 px-4 py-3 text-[15px] transition-colors whitespace-nowrap -mb-[1px] ${
                    isActive 
                      ? 'text-primary font-semibold border-b-2 border-primary' 
                      : 'text-secondary font-medium hover:bg-slate-50 hover:text-primary border-b-2 border-transparent'
                  }`}
                >
                  <Icon size={18} />
                  {tab.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default RawMaterialPricesTabs;
