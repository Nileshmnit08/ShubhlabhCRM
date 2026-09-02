import React from 'react';
import { AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AttentionCenter = ({ alerts, loading }) => {
  if (loading) {
    return (
      <div className="card bg-white p-5 rounded-xl border border-base shadow-sm mb-6 animate-pulse">
        <div className="h-5 w-40 bg-base/50 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 w-full bg-base/50 rounded-lg"></div>
          <div className="h-16 w-full bg-base/50 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null; // Don't show if there's no attention needed
  }

  return (
    <div className="card bg-white border border-rose-200 shadow-sm mb-6 rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
        <AlertCircle size={18} className="text-rose-600" />
        <h3 className="font-semibold text-rose-800 tracking-tight">Attention Center</h3>
        <span className="bg-rose-200 text-rose-800 text-xs font-bold px-2 py-0.5 rounded-full ml-1">{alerts.length}</span>
      </div>
      <div className="divide-y divide-rose-50/50 bg-white">
        {alerts.map((alert, idx) => (
          <div key={idx} className="p-4 flex items-start gap-4 hover:bg-slate-50 transition-colors">
            <div className={`mt-0.5 p-2 rounded-full shrink-0 ${alert.iconBg} ${alert.iconColor}`}>
              <alert.icon size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-primary">{alert.title}</h4>
              <p className="text-xs text-secondary mt-0.5 leading-relaxed">{alert.description}</p>
            </div>
            {alert.actionLink && (
              <Link to={alert.actionLink} className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-emerald-600 bg-base/50 hover:bg-emerald-50 px-3 py-1.5 rounded-md transition-colors border border-base hover:border-emerald-200">
                {alert.actionText} <ChevronRight size={12} />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttentionCenter;
