import React from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, History, BarChart2, MessageSquare, Settings } from 'lucide-react';

const QUICK_ACTIONS = [
  { label: 'Daily Entry', icon: PlusCircle, path: '/raw-material-prices/daily-entry', color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100' },
  { label: 'Price History', icon: History, path: '/raw-material-prices/history', color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100' },
  { label: 'Analysis', icon: BarChart2, path: '/raw-material-prices/analysis', color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100' },
  { label: 'WhatsApp', icon: MessageSquare, path: '/raw-material-prices/whatsapp', color: 'text-green-600', bg: 'bg-green-50 border border-green-100' },
  { label: 'Configuration', icon: Settings, path: '/raw-material-prices/configuration', color: 'text-[#475569]', bg: 'bg-[#F8FAFC] border border-[#E2E8F0]' },
];

const DashboardQuickActions = () => {
  return (
    <div className="mb-6">
      <h3 className="text-[12px] font-semibold text-[#475569] uppercase tracking-wider mb-3 px-1">Quick Actions</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {QUICK_ACTIONS.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link 
              key={idx} 
              to={action.path}
              className="bg-white p-4 rounded-[16px] border border-[#E2E8F0] shadow-sm hover:shadow-md hover:border-emerald-200 transition-all flex flex-col items-center justify-center gap-3 group"
            >
              <div className={`w-12 h-12 rounded-full ${action.bg} flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm`}>
                <Icon size={20} className={action.color} />
              </div>
              <span className="text-[14px] font-semibold text-[#0F172A]">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardQuickActions;
