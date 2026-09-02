import React from 'react';
import { Layers, Activity, AlertCircle, ArrowRight, Package, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const PriceKpiCards = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="glass-panel p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200"></div>
              <div className="h-3 w-20 rounded bg-slate-200"></div>
            </div>
            <div className="h-8 w-16 rounded mb-2 bg-slate-200"></div>
            <div className="h-2 w-24 rounded mt-2 bg-base"></div>
          </div>
        ))}
      </div>
    );
  }

  const latestDateLabel = stats.latestPriceDate 
    ? (stats.latestPriceDate === new Date().toISOString().split('T')[0] ? 'Today' : format(new Date(stats.latestPriceDate), 'dd MMM yyyy'))
    : 'No Data';

  const KpiCard = ({ title, value, icon: Icon, colorClass, link, subtext }) => {
    return (
      <Link to={link || '#'} className="action-card group relative overflow-hidden" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110`} style={{ background: `var(--${colorClass})`, opacity: 0.1 }}></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm bg-base border border-base" style={{ color: `var(--${colorClass})` }}>
            <Icon size={16} />
          </div>
          <h3 className="text-[12px] font-semibold tracking-wider uppercase text-secondary">{title}</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-1">
          <span className="text-[28px] font-bold tracking-tight tabular-nums leading-none text-primary">{value}</span>
        </div>
        <p className="text-[12px] mt-2 relative font-medium text-muted">{subtext}</p>
      </Link>
    );
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
      <KpiCard 
        title="Active Materials" 
        value={stats.activeMaterials || 0} 
        icon={Package} 
        colorClass="primary" 
        subtext="Total active in system" 
        link="/raw-material-prices/configuration/raw-materials" 
      />
      <KpiCard 
        title="Tracked Daily" 
        value={stats.trackedMaterials || 0} 
        icon={Activity} 
        colorClass="primary" 
        subtext="Materials requiring daily prices" 
        link="/raw-material-prices/configuration/raw-materials" 
      />
      <KpiCard 
        title="Updated Today" 
        value={stats.updatedToday || 0} 
        icon={Layers} 
        colorClass="success" 
        subtext="Materials with prices today" 
        link="/raw-material-prices/daily-entry" 
      />
      
      {/* Pending Today needs special attention styling if > 0 */}
      <Link to="/raw-material-prices/daily-entry" className={`action-card group relative overflow-hidden ${stats.pendingToday > 0 ? 'border-warning' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110 ${stats.pendingToday > 0 ? 'bg-warning' : 'bg-muted'}`} style={{ opacity: 0.1 }}></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm bg-base border border-base ${stats.pendingToday > 0 ? 'text-warning' : 'text-muted'}`}>
            <AlertCircle size={16} />
          </div>
          <h3 className={`text-[12px] font-semibold tracking-wider uppercase ${stats.pendingToday > 0 ? 'text-warning' : 'text-secondary'}`}>Pending Today</h3>
        </div>
        <div className="flex items-end justify-between relative mt-1">
          <span className={`text-[28px] font-bold tracking-tight tabular-nums leading-none ${stats.pendingToday > 0 ? 'text-warning' : 'text-primary'}`}>
            {stats.pendingToday || 0}
          </span>
          {stats.pendingToday > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-sm whitespace-nowrap mb-0.5 bg-warning text-white">
              Update <ArrowRight size={12} />
            </div>
          )}
        </div>
        <p className={`text-[12px] mt-2 relative font-medium ${stats.pendingToday > 0 ? 'text-warning opacity-80' : 'text-muted'}`}>Missing updates</p>
      </Link>

      <KpiCard 
        title="Latest Update" 
        value={latestDateLabel} 
        icon={Calendar} 
        colorClass="primary" 
        subtext="Most recent price entry" 
        link="/raw-material-prices/history" 
      />
    </div>
  );
};

export default PriceKpiCards;
