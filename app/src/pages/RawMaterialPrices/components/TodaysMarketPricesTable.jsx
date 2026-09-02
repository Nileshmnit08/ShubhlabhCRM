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
    <div className="glass-panel flex flex-col h-full overflow-hidden w-full">
      <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
        <div>
          <h3 className="font-bold text-[17px] tracking-tight text-primary">Today's Market Prices</h3>
          <p className="text-[13px] mt-0.5 flex items-center gap-2 text-secondary">
            <span className="w-2 h-2 rounded-full inline-block bg-success"></span>
            Updated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input 
            type="text"
            placeholder="Search material or broker..."
            style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem', height: '40px', fontSize: '14px', width: '100%', minWidth: '260px' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full transition-colors text-muted"
              onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-base)'; }}
              onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-auto data-table-container" style={{ border: 'none', borderRadius: '0 0 var(--radius-lg) var(--radius-lg)', boxShadow: 'none' }}>
        <table className="data-table w-full mobile-cards-table min-w-[700px]">
          <thead>
            <tr>
              <th>Material</th>
              <th>Quality/Grade</th>
              <th>Broker</th>
              <th className="text-right">Price (₹)</th>
              <th>Unit</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full shrink-0 bg-slate-200"></div>
                      <div className="flex-1">
                        <div className="h-4 w-28 rounded mb-1.5 bg-slate-200"></div>
                        <div className="h-3 w-20 rounded bg-base"></div>
                      </div>
                    </div>
                  </td>
                  <td><div className="h-6 w-24 rounded-md bg-slate-200"></div></td>
                  <td>
                    <div className="h-4 w-28 rounded mb-1.5 bg-slate-200"></div>
                    <div className="h-3 w-24 rounded bg-base"></div>
                  </td>
                  <td className="flex justify-end"><div className="h-5 w-24 rounded bg-slate-200"></div></td>
                  <td><div className="h-4 w-12 rounded bg-slate-200"></div></td>
                </tr>
              ))
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center h-[350px] text-secondary">
                  {searchQuery ? (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 bg-base border border-base text-muted">
                        <Search size={24} />
                      </div>
                      <h4 className="font-semibold mb-1 text-[16px] text-primary">No results found</h4>
                      <p className="text-[14px] text-secondary">We couldn't find anything matching "{searchQuery}"</p>
                      <button className="btn btn-secondary mt-5" onClick={() => setSearchQuery('')}>Clear search</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center mb-4 shadow-sm bg-base text-primary border border-base">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-semibold mb-1 text-[16px] text-primary">No prices recorded yet</h4>
                      <p className="text-[14px] mb-5 text-secondary">Start logging today's raw material prices from your brokers to populate this table.</p>
                      <button className="btn btn-primary" onClick={() => navigate('/raw-material-prices/daily-entry')}>
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
                <tr key={entry.id} className="group">
                  <td data-label="Material">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[13px] shrink-0 shadow-sm transition-colors bg-base text-primary border border-base">
                        {initial}
                      </div>
                      <div>
                        <div className="font-semibold text-[14.5px] text-primary">{enName}</div>
                        <div className="text-[12.5px] mt-0.5 text-secondary">{entry.raw_materials?.name_hi}</div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Quality/Grade">
                    <div className="inline-flex items-center text-[13px] font-medium px-2.5 py-1 rounded-md truncate max-w-[140px]" style={{ background: 'var(--bg-base)', color: 'var(--text-primary)', border: '1px solid var(--border)' }} title={entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}>
                      {entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}
                    </div>
                  </td>
                  <td data-label="Broker">
                    <div className="text-[14.5px] font-medium text-primary">{entry.brokers?.broker_name}</div>
                    {entry.market_location && (
                      <div className="text-[13px] mt-0.5 flex items-center gap-1 text-secondary">
                        {entry.market_location}
                      </div>
                    )}
                  </td>
                  <td className="text-right" data-label="Price (₹)">
                    <div className="font-bold text-[15px] tabular-nums tracking-tight text-primary">
                      ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {(() => {
                      const prevPrice = entry.previous_price ? Number(entry.previous_price) : null;
                      const currPrice = Number(entry.price);
                      
                      if (!prevPrice || prevPrice === 0) {
                        return <div className="text-[11px] mt-1 font-medium flex items-center justify-end gap-1 text-muted"><Minus size={12}/> No prior data</div>;
                      }

                      const diff = currPrice - prevPrice;
                      const pct = (Math.abs(diff) / prevPrice) * 100;
                      
                      if (diff > 0) {
                        return (
                          <div className="text-[12px] mt-1 font-medium flex items-center justify-end gap-1 tabular-nums text-danger" title={`Previous: ₹${prevPrice.toFixed(2)} on ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <TrendingUp size={12} strokeWidth={2.5}/>
                            +₹{diff.toFixed(2)} ({pct.toFixed(1)}%)
                          </div>
                        );
                      } else if (diff < 0) {
                        return (
                          <div className="text-[12px] mt-1 font-medium flex items-center justify-end gap-1 tabular-nums text-success" title={`Previous: ₹${prevPrice.toFixed(2)} on ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <TrendingDown size={12} strokeWidth={2.5}/>
                            -₹{Math.abs(diff).toFixed(2)} ({pct.toFixed(1)}%)
                          </div>
                        );
                      } else {
                        return (
                          <div className="text-[12px] mt-1 font-medium flex items-center justify-end gap-1 tabular-nums text-muted" title={`Stable since ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <Minus size={12} strokeWidth={2.5}/>
                            Stable
                          </div>
                        );
                      }
                    })()}
                  </td>
                  <td data-label="Unit">
                    <span className="text-[13.5px] font-medium tracking-wide text-secondary">{entry.rm_units?.unit_name || entry.unit}</span>
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
