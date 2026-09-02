import React, { useState } from 'react';
import { Filter, X, Search, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const TodaysMarketPricesTable = ({ prices, loading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  
  // Simple client-side search for demonstration
  const filteredPrices = prices.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.raw_materials?.name_en?.toLowerCase().includes(q) ||
      entry.raw_materials?.name_hi?.toLowerCase().includes(q) ||
      entry.brokers?.broker_name?.toLowerCase().includes(q) ||
      entry.market_location?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="card bg-white flex flex-col shadow-sm border border-base h-full rounded-xl overflow-hidden w-full">
      <div className="p-6 border-b border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h3 className="font-semibold text-lg text-primary tracking-tight">Today's Market Prices</h3>
          <p className="text-sm text-secondary mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Updated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
          <input 
            type="text"
            placeholder="Search material or broker..."
            className="input pl-10 pr-10 py-2.5 text-sm w-full sm:w-[280px] bg-slate-50 border-base/80 focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all rounded-full shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-slate-800 p-1 rounded-full hover:bg-slate-200/50 transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      <div className="data-table-container border-0 shadow-none rounded-none flex-1 max-h-[500px]">
        <table className="data-table w-full mobile-cards-table">
          <thead>
            <tr>
              <th className="min-w-[200px] bg-slate-50/50 text-secondary font-semibold uppercase tracking-wider text-xs px-6 py-4 border-b border-base">Material</th>
              <th className="min-w-[120px] bg-slate-50/50 text-secondary font-semibold uppercase tracking-wider text-xs px-6 py-4 border-b border-base">Quality/Grade</th>
              <th className="min-w-[150px] bg-slate-50/50 text-secondary font-semibold uppercase tracking-wider text-xs px-6 py-4 border-b border-base">Broker</th>
              <th className="text-right min-w-[120px] bg-slate-50/50 text-secondary font-semibold uppercase tracking-wider text-xs px-6 py-4 border-b border-base">Price (₹)</th>
              <th className="min-w-[100px] bg-slate-50/50 text-secondary font-semibold uppercase tracking-wider text-xs px-6 py-4 border-b border-base">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse bg-white">
                  <td className="px-6 py-4" data-label="Material">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-base/50 shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 w-28 bg-base/50 rounded mb-1.5"></div>
                        <div className="h-3 w-20 bg-base/50 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4" data-label="Quality/Grade"><div className="h-6 w-24 bg-base/50 rounded-md"></div></td>
                  <td className="px-6 py-4" data-label="Broker">
                    <div className="h-4 w-28 bg-base/50 rounded mb-1.5"></div>
                    <div className="h-3 w-24 bg-base/50 rounded"></div>
                  </td>
                  <td className="px-6 py-4 flex justify-end" data-label="Price (₹)"><div className="h-5 w-24 bg-base/50 rounded"></div></td>
                  <td className="px-6 py-4" data-label="Unit"><div className="h-4 w-12 bg-base/50 rounded"></div></td>
                </tr>
              ))
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-secondary bg-slate-50/30 border-b-0 h-[350px]">
                  {searchQuery ? (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center text-secondary mb-4 border border-base">
                        <Search size={32} className="text-muted/60" />
                      </div>
                      <h4 className="font-semibold text-primary mb-1 text-lg">No results found</h4>
                      <p className="text-sm">We couldn't find anything matching "{searchQuery}"</p>
                      <button className="btn btn-outline btn-sm mt-5 rounded-full px-5 shadow-sm" onClick={() => setSearchQuery('')}>Clear search</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 shadow-sm flex items-center justify-center text-emerald-600 mb-4 border border-emerald-100">
                        <FileText size={32} />
                      </div>
                      <h4 className="font-semibold text-primary mb-1 text-lg">No prices recorded yet</h4>
                      <p className="text-sm text-secondary mb-5">Start logging today's raw material prices from your brokers to populate this table.</p>
                      <button className="btn btn-primary px-6 py-2 rounded-full shadow-sm" onClick={() => navigate('/raw-material-prices/daily-entry')}>
                        Add Daily Price
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredPrices.map(entry => {
                const enName = entry.raw_materials?.name_en || 'Unknown';
                const initial = enName.charAt(0).toUpperCase();
                
                return (
                <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group bg-white">
                  <td className="px-6 py-4" data-label="Material">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[13px] shrink-0 border border-emerald-100 shadow-sm group-hover:bg-emerald-100 transition-colors">
                        {initial}
                      </div>
                      <div>
                        <div className="font-semibold text-primary text-sm">{enName}</div>
                        <div className="text-[13px] text-secondary mt-0.5">{entry.raw_materials?.name_hi}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4" data-label="Quality/Grade">
                    <div className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-[140px]" title={entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}>
                      {entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}
                    </div>
                  </td>
                  <td className="px-6 py-4" data-label="Broker">
                    <div className="text-sm font-medium text-primary">{entry.brokers?.broker_name}</div>
                    {entry.market_location && (
                      <div className="text-[13px] text-secondary mt-0.5 flex items-center gap-1">
                        {entry.market_location}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right" data-label="Price (₹)">
                    <div className="font-semibold text-primary text-[15px] tabular-nums tracking-tight">
                      ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {(() => {
                      const prevPrice = entry.previous_price ? Number(entry.previous_price) : null;
                      const currPrice = Number(entry.price);
                      
                      if (!prevPrice || prevPrice === 0) {
                        return <div className="text-[11px] text-muted mt-1 font-medium flex items-center justify-end gap-1"><Minus size={12}/> No prior data</div>;
                      }

                      const diff = currPrice - prevPrice;
                      const pct = (Math.abs(diff) / prevPrice) * 100;
                      
                      if (diff > 0) {
                        return (
                          <div className="text-[12px] text-red-600 mt-1 font-medium flex items-center justify-end gap-1 tabular-nums" title={`Previous: ₹${prevPrice.toFixed(2)} on ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <TrendingUp size={12} strokeWidth={2.5}/>
                            +₹{diff.toFixed(2)} ({pct.toFixed(1)}%)
                          </div>
                        );
                      } else if (diff < 0) {
                        return (
                          <div className="text-[12px] text-emerald-600 mt-1 font-medium flex items-center justify-end gap-1 tabular-nums" title={`Previous: ₹${prevPrice.toFixed(2)} on ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <TrendingDown size={12} strokeWidth={2.5}/>
                            -₹{Math.abs(diff).toFixed(2)} ({pct.toFixed(1)}%)
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-[12px] text-slate-500 mt-1 font-medium flex items-center justify-end gap-1 tabular-nums" title={`Stable since ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <Minus size={12} strokeWidth={2.5}/>
                            Stable
                          </div>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-6 py-4" data-label="Unit">
                    <span className="text-[13px] font-medium text-secondary tracking-wide">{entry.rm_units?.unit_name || entry.unit}</span>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TodaysMarketPricesTable;
