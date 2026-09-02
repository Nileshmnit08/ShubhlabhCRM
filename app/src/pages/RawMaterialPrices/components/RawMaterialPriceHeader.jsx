import React from 'react';
import { Plus, Calendar as CalendarIcon, ChevronRight } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';

const RawMaterialPriceHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const today = format(new Date(), 'EEEE, dd MMM yyyy');

  const isConfiguration = location.pathname.includes('/configuration');

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        {isConfiguration && (
          <div className="flex items-center text-xs font-medium text-secondary mb-2 uppercase tracking-wider">
            <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/raw-material-prices')}>Raw Material Prices</span>
            <ChevronRight size={14} className="mx-1 opacity-50" />
            <span className="text-primary">Configuration</span>
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight text-primary mb-1">
          {isConfiguration ? 'Configuration' : 'Raw Material Prices'}
        </h1>
        <p className="text-sm text-secondary">
          {isConfiguration 
            ? 'Manage raw materials, quality parameters, brokers, units, price types, and operational settings.'
            : 'Track and analyze daily cattle-feed material prices'}
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
