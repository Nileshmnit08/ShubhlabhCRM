import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, History, BarChart2, MessageSquare, Settings } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Daily Entry', icon: PlusCircle, path: '/raw-material-prices/daily-entry', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { label: 'Price History', icon: History, path: '/raw-material-prices/history', color: 'text-blue-600', bg: 'bg-blue-50' },
  { label: 'Analysis', icon: BarChart2, path: '/raw-material-prices/analysis', color: 'text-purple-600', bg: 'bg-purple-50' },
  { label: 'WhatsApp', icon: MessageSquare, path: '/raw-material-prices/whatsapp', color: 'text-green-600', bg: 'bg-green-50' },
  { label: 'Configuration', icon: Settings, path: '/raw-material-prices/configuration', color: 'text-slate-600', bg: 'bg-slate-100' },
];

const DashboardQuickActions = () => {
  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link 
              key={idx} 
              to={action.path}
              className="card bg-white p-3 rounded-xl border border-base shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col items-center justify-center gap-2 group"
            >
              <div className={`w-10 h-10 rounded-full ${action.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                <Icon size={18} className={action.color} />
              </div>
              <span className="text-sm font-medium text-primary">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
