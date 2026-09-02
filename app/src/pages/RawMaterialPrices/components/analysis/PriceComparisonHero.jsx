import React from 'react';
import { TrendingUp, TrendingDown, Minus, PackageOpen } from 'lucide-react';

const PriceComparisonHero = ({ 
  materialNameEn, 
  materialNameHi, 
  baseDateStr, 
  currDateStr, 
  currAvg, 
  unit, 
  diff, 
  perc 
}) => {
  const getTrendPill = () => {
    if (diff > 0) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${perc > 3 ? 'bg-red-50 text-red-700' : 'bg-red-50 text-red-700'}`}>
          <TrendingUp size={16} /> {perc > 3 ? 'Sharp increase' : 'Increased'} · {perc.toFixed(2)}%
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold ${perc < -3 ? 'bg-[#F0FDF4] text-[#15803D]' : 'bg-[#F0FDF4] text-[#15803D]'}`}>
          <TrendingDown size={16} /> {perc < -3 ? 'Sharp decrease' : 'Decreased'} · {Math.abs(perc).toFixed(2)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold bg-slate-100 text-slate-600">
        <Minus size={16} /> Stable · 0.00%
      </span>
    );
  };

  const trendInsight = () => {
    if (diff === 0) return `${materialNameEn} price is unchanged compared to the base date.`;
    const direction = diff > 0 ? 'higher' : 'lower';
    return `${materialNameEn} is ₹${Math.abs(diff).toFixed(2)} per ${unit.toLowerCase()} ${direction} than the comparison date.`;
  };

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-6 sm:p-8 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] shrink-0">
            <PackageOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#0F172A] tracking-tight">{materialNameEn}</h2>
            {materialNameHi && <p className="text-[#64748B] text-[15px]">{materialNameHi}</p>}
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-[#E2E8F0] px-4 py-1.5 rounded-full text-sm font-medium text-[#64748B]">
            <span>{baseDateStr}</span>
            <span className="text-slate-400">→</span>
            <span>{currDateStr}</span>
          </div>
          {currAvg > 0 && getTrendPill()}
        </div>
      </div>

      {currAvg > 0 ? (
        <div className="pt-6 border-t border-[#E2E8F0]">
          <p className="text-sm font-semibold text-[#64748B] uppercase tracking-wider mb-2">Current average price</p>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-4xl sm:text-5xl font-bold text-[#0F172A]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              ₹{currAvg.toFixed(2)}
            </span>
            <span className="text-lg text-[#64748B] font-medium">/ {unit.toLowerCase()}</span>
          </div>
          <p className="text-[#64748B] text-[15px]">{trendInsight()}</p>
        </div>
      ) : (
        <div className="pt-6 border-t border-[#E2E8F0]">
          <div className="px-4 py-3 bg-slate-50 text-[#64748B] rounded-lg text-sm border border-[#E2E8F0] inline-block">
            Insufficient data for current date average.
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceComparisonHero;
