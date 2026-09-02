import React from 'react';
import { Link } from 'react-router-dom';
import { CONFIGURATION_TABS } from './ConfigurationNav';
import { ChevronRight } from 'lucide-react';

const ConfigurationLanding = () => {
  return (
    <div className="glass-panel animate-fade-in" style={{ padding: '2.5rem' }}>
      <div className="mb-8">
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>Master Configuration</h2>
        <p className="text-secondary" style={{ fontSize: '0.95rem', margin: 0 }}>
          Select a module to manage settings, lists, and parameters for Raw Material Prices.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {CONFIGURATION_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              to={tab.id}
              className="action-card group"
              style={{ textDecoration: 'none' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-surface rounded-lg flex items-center justify-center text-secondary group-hover:text-primary transition-colors border border-base group-hover:border-primary/20 shadow-sm">
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-primary m-0 tracking-tight" style={{ fontSize: '1.05rem' }}>{tab.label}</h3>
                <ChevronRight size={18} className="text-muted group-hover:text-primary transition-colors ml-auto" />
              </div>
              <p className="text-sm text-secondary leading-relaxed m-0">{tab.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default ConfigurationLanding;
