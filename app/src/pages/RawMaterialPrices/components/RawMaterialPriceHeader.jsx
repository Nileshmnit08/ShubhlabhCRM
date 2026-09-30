import React from 'react';
import { Plus, Calendar as CalendarIcon, ChevronRight, AlertCircle, History, MessageCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { CONFIGURATION_TABS } from '../Configuration';

const RawMaterialPriceHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = format(new Date(), 'EEEE, dd MMM yyyy');

  const isConfiguration = location.pathname.includes('/configuration');
  const isAnalysis = location.pathname.includes('/analysis');
  const isHistory = location.pathname.includes('/history');
  const isAttention = location.pathname.includes('/attention');
  const isWhatsApp = location.pathname.includes('/whatsapp');
  const isDailyEntry = location.pathname.includes('/daily-entry');
  const isDashboard = !isConfiguration && !isAnalysis && !isHistory && !isAttention && !isWhatsApp && !isDailyEntry;
  
  // Extract sub-route if inside configuration
  const pathParts = location.pathname.split('/');
  const subRouteId = isConfiguration ? pathParts[pathParts.indexOf('configuration') + 1] : null;
  const activeConfigTab = subRouteId ? CONFIGURATION_TABS.find(tab => tab.id === subRouteId) : null;

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md mb-space-lg pt-space-md">
      <div className="flex flex-col">
        <div className="flex items-center text-label-sm font-label-sm tracking-wide uppercase text-on-surface-variant mb-1">
          <span className="cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/raw-material-prices')}>Raw Material Prices</span>
          
          {(isConfiguration || isAnalysis || isHistory || isAttention || isWhatsApp || isDailyEntry) && (
            <ChevronRight size={14} className="mx-1 opacity-50" />
          )}

          {isConfiguration && (
            <>
              <span 
                 className={activeConfigTab ? "cursor-pointer hover:text-primary transition-colors" : "text-primary"}
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
            </>
          )}

          {isDailyEntry && <span className="text-primary">Daily Entry</span>}
          {isHistory && <span className="text-primary">Price History</span>}
          {isAnalysis && <span className="text-primary">Analysis</span>}
          {isWhatsApp && <span className="text-primary">WhatsApp Broadcast</span>}
          {isAttention && <span className="text-primary">Attention Center</span>}
        </div>
        
        <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight m-0">
          {activeConfigTab ? activeConfigTab.label : (
            isConfiguration ? 'Configuration' : 
            isAnalysis ? 'Price Analysis' : 
            isHistory ? 'Price History' :
            isWhatsApp ? 'WhatsApp Broadcast' :
            isDailyEntry ? 'Daily Price Entry' :
            isAttention ? 'Attention Center' : 'Dashboard'
          )}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-2xl">
          {activeConfigTab 
            ? activeConfigTab.description 
            : (isConfiguration 
               ? 'Manage raw materials, quality parameters, brokers, units, price types, and operational settings.'
               : (isAnalysis 
                  ? 'Compare current material prices with historical market data and broker quotes.'
                  : (isHistory ? 'View historical price movements and export reports.' : 
                     isWhatsApp ? 'Format and send price updates via WhatsApp.' :
                     isDailyEntry ? 'Record daily commodity prices from various brokers.' :
                     isAttention ? 'Actionable workflow for pending prices and unreviewed broker responses.' : 
                     'Track and analyze daily cattle-feed material prices.')))}
        </p>
      </div>
      
      <div className="flex flex-wrap items-center gap-space-sm mt-space-sm md:mt-0">
        {isDashboard && (
          <div className="hidden sm:flex items-center gap-2 font-label-md text-label-md text-on-surface-variant bg-surface-container-lowest border border-outline-variant px-3 py-1.5 rounded-lg shadow-sm">
             <CalendarIcon size={16} />
             <span className="font-medium">{today}</span>
          </div>
        )}
        
        {isDashboard && (
          <button 
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-tertiary-fixed text-on-tertiary-fixed hover:bg-tertiary-fixed-dim transition-colors shadow-sm font-label-md text-label-md font-semibold"
            onClick={() => navigate('/raw-material-prices/attention')}
          >
            <AlertCircle size={16} />
            Attention Center
          </button>
        )}
        
        {(isDashboard || isAnalysis) && (
          <button 
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface hover:bg-surface-container transition-colors shadow-sm font-label-md text-label-md border border-outline-variant"
            onClick={() => navigate('/raw-material-prices/history')}
          >
            <History size={16} />
            History
          </button>
        )}

        {isDashboard && (
          <button 
            className="flex items-center gap-1.5 px-space-md py-2 rounded-lg bg-primary text-on-primary hover:bg-surface-tint transition-colors shadow-sm font-label-md text-label-md font-semibold"
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
