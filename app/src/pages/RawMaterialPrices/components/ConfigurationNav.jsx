import React from 'react';
import { Package, Sliders, Users, Ruler, IndianRupee, Settings } from 'lucide-react';

const ConfigurationNav = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'raw-materials', label: 'Raw Materials', icon: Package },
    { id: 'quality-parameters', label: 'Quality Parameters', icon: Sliders },
    { id: 'brokers', label: 'Brokers', icon: Users },
    { id: 'units', label: 'Units', icon: Ruler },
    { id: 'price-types', label: 'Price Types', icon: IndianRupee },
    { id: 'general', label: 'General Settings', icon: Settings },
  ];

  return (
    <div className="bg-white border border-base rounded-xl shadow-sm mb-6 w-full overflow-hidden">
      <div className="flex overflow-x-auto hide-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] ${
                isActive 
                  ? 'text-emerald-700 bg-emerald-50/50 border-b-2 border-emerald-500' 
                  : 'text-secondary bg-transparent hover:bg-base/50 hover:text-primary border-b-2 border-transparent'
              }`}
            >
              <Icon size={16} className={isActive ? 'text-emerald-600' : 'text-muted'} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigurationNav;
