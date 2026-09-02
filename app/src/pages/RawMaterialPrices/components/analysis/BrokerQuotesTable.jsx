import React from 'react';
import { Store, MapPin, IndianRupee, Clock } from 'lucide-react';

const BrokerQuotesTable = ({ quotes, currMin, currMax, unit, currDateStr }) => {
  const spread = currMax - currMin;

  return (
    <div className="rounded-[16px] shadow-sm overflow-hidden" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
      <div className="p-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Today's Broker Quotes</h3>
          </div>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'} collected on {currDateStr}</p>
        </div>
        
        {quotes.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0 w-full lg:w-auto">
            <div className="rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[80px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Quotes</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{quotes.length}</span>
            </div>
            <div className="rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Low</span>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>₹{currMin.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>High</span>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>₹{currMax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[80px]" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Spread</span>
              <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>₹{spread.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}
      </div>

      {quotes.length > 0 ? (
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse hidden md:table">
            <thead style={{ background: 'var(--bg-base)', borderBottom: '1px solid var(--border)' }}>
              <tr>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Broker</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Location</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Quote Time</th>
                <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-secondary)' }}>Price / {unit.toLowerCase()}</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {quotes.map((q, idx) => (
                <tr key={idx} className="transition-colors hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--primary) 10%, transparent)', color: 'var(--primary)' }}>
                        <Store size={14} />
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{q.brokerName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      <MapPin size={14} />
                      {q.location || 'Not specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-sm italic whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      <Clock size={14} />
                      {q.quoteTime || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">
                    <span className="text-[15px] font-bold" style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-primary)' }}>
                      ₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-secondary)' }}>
                      / {unit.toLowerCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="md:hidden flex flex-col divide-y" style={{ borderColor: 'var(--border)' }}>
            {quotes.map((q, idx) => (
              <div key={idx} className="p-4 flex justify-between items-start gap-3" style={{ background: 'var(--bg-surface)' }}>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <Store size={14} className="shrink-0" style={{ color: 'var(--primary)' }} />
                    <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{q.brokerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <MapPin size={12} className="shrink-0" />
                    <span className="truncate">{q.location || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs italic" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={12} className="shrink-0" />
                    <span>{q.quoteTime || 'Unknown'}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <p className="text-[10px] uppercase mt-0.5 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>/ {unit.toLowerCase()}</p>
                </div>
              </div>
            ))}
          </div>

          {quotes.length === 1 && (
            <div className="p-3 text-center" style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border)' }}>
              <p className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Only one broker quote is available for this date.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <IndianRupee size={28} />
          </div>
          <h4 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No quotes available</h4>
          <p className="text-sm max-w-sm" style={{ color: 'var(--text-secondary)' }}>
            No broker quotes found for this date. Add a quote to begin analysis.
          </p>
        </div>
      )}
    </div>
  );
};

export default BrokerQuotesTable;
