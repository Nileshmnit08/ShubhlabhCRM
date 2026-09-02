import React from 'react';
import { Layers, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PriceKpiCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card bg-surface p-6 rounded-xl border border-base animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-base/50"></div>
              <div className="h-4 w-24 bg-base/50 rounded"></div>
            </div>
            <div className="h-10 w-16 bg-base/50 rounded mb-2"></div>
            <div className="h-3 w-32 bg-base/50 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <div className="card bg-surface p-6 rounded-xl border border-base shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <Layers size={16} />
          </div>
          <h3 className="text-sm font-semibold text-secondary tracking-wide">Materials Updated</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-4xl font-bold text-primary tracking-tight">{stats.updatedToday || 0}</span>
        </div>
        <p className="text-xs text-muted mt-2 relative">Unique raw materials updated today</p>
      </div>
      
      <div className="card bg-surface p-6 rounded-xl border border-base shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
            <FileText size={16} />
          </div>
          <h3 className="text-sm font-semibold text-secondary tracking-wide">Total Quotes</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-4xl font-bold text-primary tracking-tight">{stats.totalEntriesToday || 0}</span>
        </div>
        <p className="text-xs text-muted mt-2 relative">Broker quotes logged today</p>
      </div>

      <div className="card bg-surface p-6 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group sm:col-span-2 lg:col-span-1">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
            <AlertCircle size={16} />
          </div>
          <h3 className="text-sm font-semibold text-amber-800 tracking-wide">Pending Tracking</h3>
        </div>
        <div className="flex items-baseline justify-between relative">
          <span className="text-4xl font-bold text-amber-600 tracking-tight">{stats.pendingToday || 0}</span>
          {stats.pendingToday > 0 && (
            <Link to="/raw-material-prices/daily-entry" className="flex items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-full transition-colors border border-amber-100">
              Update now <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <p className="text-xs text-amber-700/70 mt-2 relative">Materials awaiting price updates</p>
      </div>
    </div>
  );
};

export default PriceKpiCards;
