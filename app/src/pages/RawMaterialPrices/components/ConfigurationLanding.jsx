import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIGURATION_TABS } from './ConfigurationNav';
import { ChevronRight } from 'lucide-react';

const ConfigurationLanding = () => {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-primary mb-2">Master Configuration</h2>
        <p className="text-secondary text-sm">
          Select a master data module to manage settings, lists, and parameters for the Raw Material Prices application.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {CONFIGURATION_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              to={tab.id}
              className="card bg-white border border-base rounded-xl p-6 hover:shadow-md hover:border-emerald-200 transition-all group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Icon size={24} />
                </div>
                <ChevronRight size={20} className="text-muted group-hover:text-emerald-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-lg text-primary mb-2 tracking-tight">{tab.label}</h3>
              <p className="text-sm text-secondary leading-relaxed flex-1">{tab.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigurationLanding;
