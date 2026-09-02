import React from 'react';
import { AlertCircle, AlertTriangle, TrendingUp, TrendingDown, Clock, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const AttentionCenter = ({ alerts, loading }) => {
  if (loading) {
    return (
      <div className="bg-white p-5 rounded-[16px] border border-[#E2E8F0] shadow-sm mb-6 animate-pulse">
        <div className="h-5 w-40 bg-[#F8FAFC] rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 w-full bg-[#E2E8F0] rounded-lg"></div>
          <div className="h-16 w-full bg-[#E2E8F0] rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return null; // Don't show if there's no attention needed
  }

  return (
    <div className="bg-white border border-rose-200 shadow-sm mb-6 rounded-[16px] overflow-hidden">
      <div className="px-5 py-3.5 bg-rose-50 border-b border-rose-100 flex items-center gap-2.5">
        <AlertCircle size={18} className="text-rose-600" />
        <h3 className="font-bold text-rose-800 tracking-tight text-[15px]">Attention Center</h3>
        <span className="bg-rose-200 text-rose-800 text-[11px] font-bold px-2 py-0.5 rounded-full ml-1 leading-none">{alerts.length}</span>
      </div>
      <div className="divide-y divide-rose-100/50 bg-white">
        {alerts.map((alert, idx) => (
          <div key={idx} className="p-4 sm:px-5 flex items-start gap-4 hover:bg-slate-50/80 transition-colors group">
            <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${alert.iconBg} ${alert.iconColor} border border-white shadow-sm`}>
              <alert.icon size={16} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-[14.5px] font-semibold text-[#0F172A]">{alert.title}</h4>
              <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed max-w-4xl">{alert.description}</p>
            </div>
            {alert.actionLink && (
              <Link to={alert.actionLink} className="shrink-0 flex items-center gap-1.5 text-[12px] font-semibold text-[#0F172A] hover:text-emerald-700 bg-white hover:bg-emerald-50 px-3.5 py-2 rounded-md transition-colors border border-[#E2E8F0] hover:border-emerald-200 shadow-sm">
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
