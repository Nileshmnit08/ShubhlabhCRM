import React from 'react';
import { AlertCircle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AttentionCenter = ({ alerts, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel p-5 mb-6 animate-pulse">
        <div className="h-5 w-40 rounded mb-4 bg-base"></div>
        <div className="space-y-3">
          <div className="h-16 w-full rounded-lg bg-slate-200"></div>
          <div className="h-16 w-full rounded-lg bg-slate-200"></div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null; 
  }

  return (
    <div className="glass-panel mb-6 overflow-hidden border border-danger">
      <div className="px-5 py-3.5 flex items-center gap-2.5 bg-base border-b border-base">
        <AlertCircle size={18} className="text-danger" />
        <h3 className="font-bold tracking-tight text-[15px] text-danger">Attention Center</h3>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full ml-1 leading-none bg-danger text-white">{alerts.length}</span>
      </div>
      <div className="flex flex-col">
        {alerts.map((alert, idx) => (
          <div key={idx} className={`p-4 sm:px-5 flex items-start gap-4 transition-colors group bg-surface ${idx === alerts.length - 1 ? '' : 'border-b border-base'}`}>
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${alert.iconBg || 'bg-base text-danger border border-base'}`}>
              <alert.icon size={16} strokeWidth={2.5} className={alert.iconColor || ''} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[14.5px] font-semibold text-primary">{alert.title}</h4>
              <p className="text-[13px] mt-1 leading-relaxed max-w-4xl text-secondary">{alert.description}</p>
            </div>
            {alert.actionLink && (
              <Link to={alert.actionLink} className="btn btn-secondary shrink-0 flex items-center gap-1.5" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
                {alert.actionText} <ChevronRight size={14} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttentionCenter;
