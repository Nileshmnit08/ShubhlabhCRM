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
  const isAnalysis = location.pathname.includes('/analysis');
  const isDailyEntry = location.pathname.includes('/daily-entry');
  const isWhatsApp = location.pathname.includes('/whatsapp');
  
  // Extract sub-route if inside configuration
  const pathParts = location.pathname.split('/');
  const subRouteId = isConfiguration ? pathParts[pathParts.indexOf('configuration') + 1] : null;
  const activeConfigTab = subRouteId ? CONFIGURATION_TABS.find(tab => tab.id === subRouteId) : null;

  return (
    <div className="page-header" style={{ marginBottom: '1.5rem' }}>
      <div>
        {isConfiguration && (
          <div style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748B', marginBottom: '0.375rem', display: 'flex', alignItems: 'center' }}>
            <span className="hover:text-slate-900 cursor-pointer transition-colors" onClick={() => navigate('/raw-material-prices')}>Raw Material Prices</span>
            <ChevronRight size={14} className="mx-1.5 text-slate-400" />
            <span 
               className={activeConfigTab ? "hover:text-slate-900 cursor-pointer transition-colors" : "text-slate-900 font-semibold"}
               onClick={() => activeConfigTab && navigate('/raw-material-prices/configuration')}
            >
              Configuration
            </span>
            {activeConfigTab && (
              <>
                <ChevronRight size={14} className="mx-1.5 text-slate-400" />
                <span className="text-slate-900 font-semibold">{activeConfigTab.label}</span>
              </>
            )}
          </div>
        )}
        {!isConfiguration && (
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'flex', alignItems: 'center' }}>
            <span className="text-primary">RAW MATERIAL PRICES</span>
          </div>
        )}
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>
          {activeConfigTab ? activeConfigTab.label : (isConfiguration ? 'Raw Materials' : (isDailyEntry ? 'Daily Price Entry' : (isWhatsApp ? 'WhatsApp Price Update' : (isAnalysis ? 'Price Analysis' : 'Dashboard'))))}
        </h1>
        <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#64748B' }}>
          {activeConfigTab 
            ? (activeConfigTab.description || 'Manage raw materials, quality parameters, brokers, units and price types.')
            : (isConfiguration 
               ? 'Add, edit and manage raw materials with category, unit and status.'
               : (isDailyEntry
                  ? 'Add and manage daily raw material market prices.'
                  : (isWhatsApp
                     ? 'Prepare and share the daily raw material price report through WhatsApp.'
                     : (isAnalysis 
                        ? 'Compare current material prices with historical market data and broker quotes.'
                        : 'Track and analyze daily cattle-feed material prices'))))}
        </p>
      </div>
      <div className="flex items-center gap-4">
        {!isConfiguration && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-secondary bg-surface border border-base px-3 py-2 rounded-lg shadow-sm">
             <CalendarIcon size={16} className="text-muted" />
             <span className="font-medium">{today}</span>
          </div>
        )}
        {isAnalysis && (
          <button 
            className="btn btn-outline shadow-sm py-2 px-4 text-sm font-medium border-base bg-white hover:bg-slate-50 text-secondary"
            onClick={() => navigate('/raw-material-prices/history')}
          >
            View Price History
          </button>
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
