import React from 'react';
import { Layers, Activity, AlertCircle, ArrowRight, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const PriceKpiCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#F8FAFC]"></div>
              <div className="h-3 w-20 bg-[#E2E8F0] rounded"></div>
            </div>
            <div className="h-8 w-16 bg-[#E2E8F0] rounded mb-2"></div>
            <div className="h-2 w-24 bg-[#F8FAFC] rounded mt-2"></div>
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
      <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-slate-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] bg-[#F8FAFC] flex items-center justify-center text-[#475569] border border-[#E2E8F0] shadow-sm">
            <Package size={16} />
          </div>
          <h3 className="text-[12px] font-semibold text-[#475569] tracking-wider uppercase">Active Materials</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-1">
          <span className="text-[28px] font-bold text-[#0F172A] tracking-tight tabular-nums leading-none">{stats.activeMaterials || 0}</span>
        </div>
        <p className="text-[12px] text-[#64748B] mt-2 relative font-medium">Total active in system</p>
      </div>

      {/* Daily Tracked Materials */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm">
            <Activity size={16} />
          </div>
          <h3 className="text-[12px] font-semibold text-[#475569] tracking-wider uppercase">Tracked Daily</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-1">
          <span className="text-[28px] font-bold text-[#0F172A] tracking-tight tabular-nums leading-none">{stats.trackedMaterials || 0}</span>
        </div>
        <p className="text-[12px] text-[#64748B] mt-2 relative font-medium">Materials requiring daily prices</p>
      </div>

      {/* Prices Updated Today */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
            <Layers size={16} />
          </div>
          <h3 className="text-[12px] font-semibold text-[#475569] tracking-wider uppercase">Updated Today</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-1">
          <span className="text-[28px] font-bold text-[#0F172A] tracking-tight tabular-nums leading-none">{stats.updatedToday || 0}</span>
        </div>
        <p className="text-[12px] text-[#64748B] mt-2 relative font-medium">Materials with prices today</p>
      </div>

      {/* Prices Pending Today */}
      <div className={`bg-white p-5 rounded-[16px] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow border ${stats.pendingToday > 0 ? 'border-amber-200 ring-1 ring-amber-400/20' : 'border-[#E2E8F0]'}`}>
        <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110 ${stats.pendingToday > 0 ? 'from-amber-500/10' : 'from-slate-500/10'}`}></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm border ${stats.pendingToday > 0 ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0]'}`}>
            <AlertCircle size={16} />
          </div>
          <h3 className={`text-[12px] font-semibold tracking-wider uppercase ${stats.pendingToday > 0 ? 'text-amber-800' : 'text-[#475569]'}`}>Pending Today</h3>
        </div>
        <div className="flex items-end justify-between relative mt-1">
          <span className={`text-[28px] font-bold tracking-tight tabular-nums leading-none ${stats.pendingToday > 0 ? 'text-amber-700' : 'text-[#0F172A]'}`}>
            {stats.pendingToday || 0}
          </span>
          {stats.pendingToday > 0 && (
            <Link to="/raw-material-prices/daily-entry" className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-white hover:bg-amber-600 bg-amber-100/80 px-2.5 py-1.5 rounded-md transition-all border border-amber-200 shadow-sm whitespace-nowrap mb-0.5">
              Update <ArrowRight size={12} />
            </Link>
          )}
        </div>
        <p className={`text-[12px] mt-2 relative font-medium ${stats.pendingToday > 0 ? 'text-amber-700/80' : 'text-[#64748B]'}`}>Missing updates</p>
      </div>

      {/* Latest Price Date */}
      <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-purple-500/10 to-transparent rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110"></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
            <Calendar size={16} />
          </div>
          <h3 className="text-[12px] font-semibold text-[#475569] tracking-wider uppercase">Latest Update</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-3 mb-1">
          <span className="text-[18px] font-bold text-[#0F172A] tracking-tight tabular-nums leading-none">{latestDateLabel}</span>
        </div>
        <p className="text-[12px] text-[#64748B] mt-2 relative font-medium">Most recent price entry</p>
      </div>
      
    </div>
  );
};

export default PriceKpiCards;
