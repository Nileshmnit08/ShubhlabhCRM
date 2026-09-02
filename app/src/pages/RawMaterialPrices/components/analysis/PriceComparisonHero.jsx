import React from 'react';
import { TrendingUp, TrendingDown, Minus, PackageOpen, ArrowRight } from 'lucide-react';

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
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'var(--bg-base)', color: 'var(--success)' }}>
          <TrendingUp size={16} /> {perc > 3 ? 'Sharp Increase' : 'Increase'} · +{perc.toFixed(2)}%
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'var(--bg-base)', color: 'var(--danger)' }}>
          <TrendingDown size={16} /> {perc < -3 ? 'Sharp Decrease' : 'Decrease'} · {perc.toFixed(2)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)' }}>
        <Minus size={16} /> Stable · 0.00%
      </span>
    );
  };

  const trendInsight = () => {
    if (diff === 0) return `${materialNameEn} price is unchanged compared to the base date.`;
    const direction = diff > 0 ? 'higher' : 'lower';
    return `${materialNameEn} is ₹${Math.abs(diff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} per ${unit.toLowerCase()} ${direction} than the comparison date.`;
  };

  return (
    <div className="rounded-[16px] shadow-sm p-6 sm:p-8 overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <PackageOpen size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {materialNameEn} {materialNameHi && <span className="whitespace-nowrap">({materialNameHi})</span>}
            </h2>
          </div>
        </div>
        
        <div className="flex flex-col items-start md:items-end gap-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
            <span>{baseDateStr}</span>
            <ArrowRight size={14} className="mx-1 shrink-0" style={{ color: 'var(--text-secondary)' }} />
            <span>{currDateStr}</span>
          </div>
          {currAvg > 0 && getTrendPill()}
        </div>
      </div>

      {currAvg > 0 ? (
        <div className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>Current average price</p>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-3">
            <div className="flex items-baseline whitespace-nowrap">
              <span className="text-4xl sm:text-5xl font-bold" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                ₹{currAvg.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-medium ml-2" style={{ color: 'var(--text-secondary)' }}>/ {unit.toLowerCase()}</span>
            </div>
            
            {diff !== 0 && (
              <span className="text-lg font-bold whitespace-nowrap" style={{ color: diff > 0 ? 'var(--success)' : 'var(--danger)' }}>
                {diff > 0 ? '+' : ''}₹{Math.abs(diff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({diff > 0 ? '+' : ''}{perc.toFixed(2)}%)
              </span>
            )}
          </div>
          <p className="text-[15px]" style={{ color: 'var(--text-secondary)' }}>{trendInsight()}</p>
        </div>
      ) : (
        <div className="pt-6" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="px-4 py-3 rounded-lg text-sm inline-block" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            Insufficient data for current date average.
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceComparisonHero;
