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
              <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--border)' }}></div>
              <div className="h-3 w-20 rounded" style={{ background: 'var(--border)' }}></div>
            </div>
            <div className="h-8 w-16 rounded mb-2" style={{ background: 'var(--border)' }}></div>
            <div className="h-2 w-24 rounded mt-2" style={{ background: 'var(--bg-base)' }}></div>
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
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm" style={{ background: `var(--bg-base)`, color: `var(--${colorClass})`, border: '1px solid var(--border)' }}>
            <Icon size={16} />
          </div>
          <h3 className="text-[12px] font-semibold tracking-wider uppercase" style={{ color: 'var(--text-secondary)' }}>{title}</h3>
        </div>
        <div className="flex items-baseline gap-2 relative mt-1">
          <span className="text-[28px] font-bold tracking-tight tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>{value}</span>
        </div>
        <p className="text-[12px] mt-2 relative font-medium" style={{ color: 'var(--text-muted)' }}>{subtext}</p>
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
      <Link to="/raw-material-prices/daily-entry" className="action-card group relative overflow-hidden" style={{ textDecoration: 'none', color: 'inherit', borderColor: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--glass-border)' }}>
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform duration-500 group-hover:scale-110`} style={{ background: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--text-muted)', opacity: 0.1 }}></div>
        <div className="flex items-center gap-2.5 mb-3 relative">
          <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shadow-sm" style={{ background: `var(--bg-base)`, color: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <AlertCircle size={16} />
          </div>
          <h3 className="text-[12px] font-semibold tracking-wider uppercase" style={{ color: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--text-secondary)' }}>Pending Today</h3>
        </div>
        <div className="flex items-end justify-between relative mt-1">
          <span className="text-[28px] font-bold tracking-tight tabular-nums leading-none" style={{ color: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--text-primary)' }}>
            {stats.pendingToday || 0}
          </span>
          {stats.pendingToday > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-md shadow-sm whitespace-nowrap mb-0.5" style={{ background: 'var(--warning)', color: '#fff' }}>
              Update <ArrowRight size={12} />
            </div>
          )}
        </div>
        <p className="text-[12px] mt-2 relative font-medium" style={{ color: stats.pendingToday > 0 ? 'var(--warning)' : 'var(--text-muted)', opacity: stats.pendingToday > 0 ? 0.8 : 1 }}>Missing updates</p>
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
