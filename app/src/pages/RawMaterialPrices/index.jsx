import React from 'react';
import { Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileEdit, 
  History, 
  BarChart2, 
  MessageCircle, 
  Settings 
} from 'lucide-react';

import Dashboard from './Dashboard';
import DailyPriceEntry from './DailyPriceEntry';
import PriceHistory from './PriceHistory';
import PriceAnalysis from './PriceAnalysis';
import WhatsAppUpdate from './WhatsAppUpdate';
import Configuration from './Configuration';

const RawMaterialPrices = () => {
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
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Raw Material Prices</h1>
          <p className="page-subtitle">Track and analyze daily cattle-feed material prices</p>
        </div>
      </div>

      <div className="bg-surface border border-base rounded-xl overflow-hidden mb-6">
        <div className="flex flex-wrap overflow-x-auto border-b border-base hide-scrollbar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const fullPath = `/raw-material-prices${tab.path ? `/${tab.path}` : ''}`;
            const isActive = location.pathname === fullPath || 
                            (tab.path === '' && location.pathname === '/raw-material-prices/');

            return (
              <NavLink
                key={tab.id}
                to={fullPath}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive 
                    ? 'text-primary border-b-2 border-primary bg-primary/5' 
                    : 'text-secondary hover:text-primary hover:bg-base'
                }`}
                end={tab.path === ''}
              >
                <Icon size={18} />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </div>

      <div className="tab-content">
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="daily-entry" element={<DailyPriceEntry />} />
          <Route path="history" element={<PriceHistory />} />
          <Route path="analysis" element={<PriceAnalysis />} />
          <Route path="whatsapp" element={<WhatsAppUpdate />} />
          <Route path="configuration" element={<Configuration />} />
          <Route path="*" element={<Navigate to="/raw-material-prices" replace />} />
        </Routes>
      </div>
    </div>
  );
};

export default RawMaterialPrices;
