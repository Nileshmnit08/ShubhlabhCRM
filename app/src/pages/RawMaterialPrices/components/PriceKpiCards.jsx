import React from 'react';
import { Layers, Activity, AlertCircle, ArrowRight, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const PriceKpiCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="card bg-white p-5 rounded-xl border border-base shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-base/50"></div>
              <div className="h-3 w-20 bg-base/50 rounded"></div>
            </div>
            <div className="h-8 w-16 bg-base/50 rounded mb-2"></div>
            <div className="h-2 w-24 bg-base/50 rounded mt-2"></div>
          </div>
        ))}
      </div>
    );
  }

  const latestDateLabel = stats.latestPriceDate 
    ? (stats.latestPriceDate === new Date().toISOString().split('T')[0] ? 'Today' : format(new Date(stats.latestPriceDate), 'dd MMM yyyy'))
    : 'No Data';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      
      {/* Active Raw Materials */}
      <div className="card bg-white p-5 rounded-xl border border-base shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2 mb-3 relative">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-100 shadow-sm">
            <Package size={16} />
          </div>
          <h3 className="text-xs font-semibold text-secondary tracking-wide uppercase">Active Materials</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">{stats.activeMaterials || 0}</span>
        </div>
        <p className="text-[11px] text-muted mt-1.5 relative font-medium">Total active in system</p>
      </div>

      {/* Daily Tracked Materials */}
      <div className="card bg-white p-5 rounded-xl border border-base shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2 mb-3 relative">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
            <Activity size={16} />
          </div>
          <h3 className="text-xs font-semibold text-secondary tracking-wide uppercase">Tracked Daily</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">{stats.trackedMaterials || 0}</span>
        </div>
        <p className="text-[11px] text-muted mt-1.5 relative font-medium">Materials requiring daily prices</p>
      </div>

      {/* Prices Updated Today */}
      <div className="card bg-white p-5 rounded-xl border border-base shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2 mb-3 relative">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <Layers size={16} />
          </div>
          <h3 className="text-xs font-semibold text-secondary tracking-wide uppercase">Updated Today</h3>
        </div>
        <div className="flex items-baseline gap-2 relative">
          <span className="text-3xl font-bold text-primary tracking-tight tabular-nums">{stats.updatedToday || 0}</span>
        </div>
        <p className="text-[11px] text-muted mt-1.5 relative font-medium">Materials with prices today</p>
      </div>

      {/* Prices Pending Today */}
      <div className={`card bg-white p-5 rounded-xl shadow-sm relative overflow-hidden group ${stats.pendingToday > 0 ? 'border-amber-200/60 ring-1 ring-amber-400/20' : 'border-base'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110 ${stats.pendingToday > 0 ? 'from-amber-500/10' : 'from-slate-500/10'}`}></div>
        <div className="flex items-center gap-2 mb-3 relative">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm border ${stats.pendingToday > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
            <AlertCircle size={16} />
          </div>
          <h3 className={`text-xs font-semibold tracking-wide uppercase ${stats.pendingToday > 0 ? 'text-amber-800' : 'text-secondary'}`}>Pending Today</h3>
        </div>
        <div className="flex items-end justify-between relative">
          <span className={`text-3xl font-bold tracking-tight tabular-nums ${stats.pendingToday > 0 ? 'text-amber-600' : 'text-primary'}`}>
            {stats.pendingToday || 0}
          </span>
          {stats.pendingToday > 0 && (
            <Link to="/raw-material-prices/daily-entry" className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 hover:text-white hover:bg-amber-600 bg-amber-100/80 px-2 py-1 rounded transition-all border border-amber-200/80 shadow-sm whitespace-nowrap">
              Update <ArrowRight size={10} />
            </Link>
          )}
        </div>
        <p className={`text-[11px] mt-1.5 relative font-medium ${stats.pendingToday > 0 ? 'text-amber-700/70' : 'text-muted'}`}>Missing updates</p>
      </div>

      {/* Latest Price Date */}
      <div className="card bg-white p-5 rounded-xl border border-base shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2 mb-3 relative">
          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
            <Calendar size={16} />
          </div>
          <h3 className="text-xs font-semibold text-secondary tracking-wide uppercase">Latest Update</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-2">
          <span className="text-xl font-bold text-primary tracking-tight">{latestDateLabel}</span>
        </div>
        <p className="text-[11px] text-muted mt-2 relative font-medium">Most recent price entry</p>
      </div>
      
    </div>
  );
};

export default PriceKpiCards;
