import React from 'react';
import { Package, Sliders, Users, Ruler, IndianRupee, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export const CONFIGURATION_TABS = [
  { id: 'raw-materials', label: 'Raw Materials', icon: Package, description: 'Manage raw material definitions and default units.' },
  { id: 'quality-parameters', label: 'Quality Parameters', icon: Sliders, description: 'Define specific quality parameters or grades.' },
  { id: 'brokers', label: 'Brokers', icon: Users, description: 'Manage brokers and their contact information.' },
  { id: 'units', label: 'Units', icon: Ruler, description: 'Manage units of measurement (e.g., Kg, Quintal, Ton).' },
  { id: 'price-types', label: 'Price Types', icon: IndianRupee, description: 'Create and manage price classifications.' },
  { id: 'general-settings', label: 'General Settings', icon: Settings, description: 'Global report preferences and WhatsApp defaults.' },
];

const ConfigurationNav = () => {
  return (
    <nav className="bg-white border border-base rounded-xl shadow-sm w-full overflow-hidden">
      <div className="flex flex-row md:flex-col overflow-x-auto hide-scrollbar">
        {CONFIGURATION_TABS.map(tab => {
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.id}
              to={tab.id}
              className={({ isActive }) => `flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap md:border-b border-base last:border-0 ${
                isActive 
                  ? 'text-emerald-700 bg-emerald-50/50 border-b-2 md:border-b md:border-l-4 md:border-l-emerald-500 md:pl-4 md:border-b-base border-emerald-500' 
                  : 'text-secondary bg-transparent hover:bg-base/50 hover:text-primary border-b-2 md:border-b md:border-l-4 md:border-l-transparent md:border-b-base border-transparent'
              }`}
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-emerald-600' : 'text-muted'} />
                  {tab.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default ConfigurationNav;

