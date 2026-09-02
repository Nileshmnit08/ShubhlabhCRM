import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, History, BarChart2, MessageSquare, Settings } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Daily Entry', icon: PlusCircle, path: '/raw-material-prices/daily-entry' },
  { label: 'Price History', icon: History, path: '/raw-material-prices/history' },
  { label: 'Analysis', icon: BarChart2, path: '/raw-material-prices/analysis' },
  { label: 'WhatsApp', icon: MessageSquare, path: '/raw-material-prices/whatsapp' },
  { label: 'Configuration', icon: Settings, path: '/raw-material-prices/configuration' },
];

const DashboardQuickActions = () => {
  return (
    <div className="mb-6">
      <h3 className="text-[12px] font-semibold uppercase tracking-wider mb-3 px-1" style={{ color: 'var(--text-secondary)' }}>Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link 
              key={idx} 
              to={action.path}
              className="action-card flex flex-col items-center justify-center gap-3"
              style={{ padding: '1.25rem' }}
            >
              <div className="w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--primary)' }}>
                <Icon size={20} />
              </div>
              <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
