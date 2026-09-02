import React from 'react';
import { Plus, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { CONFIGURATION_TABS } from '../Configuration';

const RawMaterialPriceHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = format(new Date(), 'EEEE, dd MMM yyyy');

  const isConfiguration = location.pathname.includes('/configuration');
  
  // Extract sub-route if inside configuration
  const pathParts = location.pathname.split('/');
  const subRouteId = isConfiguration ? pathParts[pathParts.indexOf('configuration') + 1] : null;
  const activeConfigTab = subRouteId ? CONFIGURATION_TABS.find(tab => tab.id === subRouteId) : null;

  return (
    <div className="page-header" style={{ marginBottom: '2rem' }}>
      <div>
        {isConfiguration && (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/raw-material-prices')}>Raw Material Prices</span>
            <ChevronRight size={14} className="mx-1 opacity-50" />
            <span 
               className={activeConfigTab ? "hover:text-primary cursor-pointer transition-colors" : "text-primary"}
               onClick={() => activeConfigTab && navigate('/raw-material-prices/configuration')}
            >
              Configuration
            </span>
            {activeConfigTab && (
              <>
                <ChevronRight size={14} className="mx-1 opacity-50" />
                <span className="text-primary">{activeConfigTab.label}</span>
              </>
            )}
          </div>
        )}
        {!isConfiguration && (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span className="text-primary">Raw Material Prices</span>
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: '2rem', tracking: 'tight' }}>
          {activeConfigTab ? activeConfigTab.label : (isConfiguration ? 'Configuration' : 'Dashboard')}
        </h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem', fontSize: '0.95rem' }}>
          {activeConfigTab 
            ? activeConfigTab.description 
            : (isConfiguration 
               ? 'Manage raw materials, quality parameters, brokers, units, price types, and operational settings.'
               : 'Track and analyze daily cattle-feed material prices')}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {!isConfiguration && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-secondary bg-surface border border-base px-3 py-2 rounded-lg shadow-sm">
             <CalendarIcon size={16} className="text-muted" />
             <span className="font-medium">{today}</span>
          </div>
        )}
        {!isConfiguration && (
          <button 
            className="btn btn-primary shadow-md py-2.5 px-5"
            onClick={() => navigate('/raw-material-prices/daily-entry')}
          >
            <Plus size={18} />
            Add Daily Price
          </button>
        )}
      </div>
    </div>
  );
};

export default RawMaterialPriceHeader;
