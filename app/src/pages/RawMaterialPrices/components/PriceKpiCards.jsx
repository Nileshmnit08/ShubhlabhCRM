import React from 'react';
import { Layers, FileText, AlertCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PriceKpiCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="card bg-white p-6 rounded-xl border border-base shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-base/50"></div>
              <div className="h-4 w-28 bg-base/50 rounded"></div>
            </div>
            <div className="h-10 w-20 bg-base/50 rounded mb-2"></div>
            <div className="h-3 w-36 bg-base/50 rounded mt-3"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
      <div className="card bg-white p-6 rounded-xl border border-base shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <Layers size={20} />
          </div>
          <h3 className="text-sm font-semibold text-secondary tracking-wide uppercase">Materials Updated</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-4xl font-bold text-primary tracking-tight tabular-nums">{stats.updatedToday || 0}</span>
        </div>
        <p className="text-xs text-muted mt-2 relative font-medium">Unique raw materials updated today</p>
      </div>
      
      <div className="card bg-white p-6 rounded-xl border border-base shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
            <FileText size={20} />
          </div>
          <h3 className="text-sm font-semibold text-secondary tracking-wide uppercase">Total Quotes</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-4xl font-bold text-primary tracking-tight tabular-nums">{stats.totalEntriesToday || 0}</span>
        </div>
        <p className="text-xs text-muted mt-2 relative font-medium">Broker quotes logged today</p>
      </div>

      <div className="card bg-white p-6 rounded-xl border border-amber-200/60 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group sm:col-span-2 lg:col-span-1 ring-1 ring-amber-400/20">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full -mr-16 -mt-16 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
            <AlertCircle size={20} />
          </div>
          <h3 className="text-sm font-semibold text-amber-800 tracking-wide uppercase">Pending Tracking</h3>
        </div>
        <div className="flex items-end justify-between relative mt-1">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-amber-600 tracking-tight tabular-nums">{stats.pendingToday || 0}</span>
          </div>
          {stats.pendingToday > 0 && (
            <Link to="/raw-material-prices/daily-entry" className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-white hover:bg-amber-600 bg-amber-100/80 px-3.5 py-2 rounded-lg transition-all duration-300 border border-amber-200/80 shadow-sm">
              Update now <ArrowRight size={14} />
            </Link>
          )}
        </div>
        <p className="text-xs text-amber-700/70 mt-2 relative font-medium">Materials awaiting price updates</p>
      </div>
    </div>
  );
};

export default PriceKpiCards;
