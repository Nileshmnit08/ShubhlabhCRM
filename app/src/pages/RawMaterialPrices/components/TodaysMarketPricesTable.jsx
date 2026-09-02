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
    <div className="bg-white flex flex-col border border-[#E2E8F0] shadow-sm h-full rounded-[16px] overflow-hidden w-full">
      <div className="p-5 border-b border-[#E2E8F0] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h3 className="font-bold text-[17px] text-[#0F172A] tracking-tight">Today's Market Prices</h3>
          <p className="text-[13px] text-[#64748B] mt-0.5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Updated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input 
            type="text"
            placeholder="Search material or broker..."
            className="pl-9 pr-9 h-[40px] text-[14px] w-full sm:w-[260px] bg-white border border-[#E2E8F0] focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all rounded-[10px] shadow-sm outline-none text-[#0F172A]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="flex-1 max-h-[500px] overflow-auto">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead className="sticky top-0 bg-[#F8FAFC] z-10 border-b border-[#E2E8F0] shadow-sm">
            <tr>
              <th className="px-5 py-3.5 text-[12px] font-semibold text-[#475569] uppercase tracking-wider whitespace-nowrap">Material</th>
              <th className="px-5 py-3.5 text-[12px] font-semibold text-[#475569] uppercase tracking-wider">Quality/Grade</th>
              <th className="px-5 py-3.5 text-[12px] font-semibold text-[#475569] uppercase tracking-wider">Broker</th>
              <th className="px-5 py-3.5 text-[12px] font-semibold text-[#475569] uppercase tracking-wider text-right">Price (₹)</th>
              <th className="px-5 py-3.5 text-[12px] font-semibold text-[#475569] uppercase tracking-wider">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0]">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse bg-white">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#F8FAFC] shrink-0 border border-[#E2E8F0]"></div>
                      <div className="flex-1">
                        <div className="h-4 w-28 bg-[#F8FAFC] rounded mb-1.5"></div>
                        <div className="h-3 w-20 bg-[#E2E8F0] rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4"><div className="h-6 w-24 bg-[#F8FAFC] rounded-md"></div></td>
                  <td className="px-5 py-4">
                    <div className="h-4 w-28 bg-[#F8FAFC] rounded mb-1.5"></div>
                    <div className="h-3 w-24 bg-[#E2E8F0] rounded"></div>
                  </td>
                  <td className="px-5 py-4 flex justify-end"><div className="h-5 w-24 bg-[#F8FAFC] rounded"></div></td>
                  <td className="px-5 py-4"><div className="h-4 w-12 bg-[#F8FAFC] rounded"></div></td>
                </tr>
              ))
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-secondary h-[350px]">
                  {searchQuery ? (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-4">
                        <Search size={24} className="text-[#94A3B8]" />
                      </div>
                      <h4 className="font-semibold text-[#0F172A] mb-1 text-[16px]">No results found</h4>
                      <p className="text-[14px] text-[#64748B]">We couldn't find anything matching "{searchQuery}"</p>
                      <button className="mt-5 px-4 py-2 bg-white border border-[#E2E8F0] text-[#0F172A] font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm text-[13px]" onClick={() => setSearchQuery('')}>Clear search</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4 shadow-sm">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-semibold text-[#0F172A] mb-1 text-[16px]">No prices recorded yet</h4>
                      <p className="text-[14px] text-[#64748B] mb-5">Start logging today's raw material prices from your brokers to populate this table.</p>
                      <button className="px-5 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-[14px]" onClick={() => navigate('/raw-material-prices/daily-entry')}>
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
                <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors group bg-white">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-[13px] shrink-0 border border-emerald-100 shadow-sm group-hover:bg-emerald-100 transition-colors">
                        {initial}
                      </div>
                      <div>
                        <div className="font-semibold text-[#0F172A] text-[14.5px]">{enName}</div>
                        <div className="text-[12.5px] text-[#64748B] mt-0.5">{entry.raw_materials?.name_hi}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="inline-flex items-center text-[13px] font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 truncate max-w-[140px]" title={entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}>
                      {entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-[14.5px] font-medium text-[#0F172A]">{entry.brokers?.broker_name}</div>
                    {entry.market_location && (
                      <div className="text-[13px] text-[#64748B] mt-0.5 flex items-center gap-1">
                        {entry.market_location}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="font-bold text-[#0F172A] text-[15px] tabular-nums tracking-tight">
                      ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {(() => {
                      const prevPrice = entry.previous_price ? Number(entry.previous_price) : null;
                      const currPrice = Number(entry.price);
                      
                      if (!prevPrice || prevPrice === 0) {
                        return <div className="text-[11px] text-[#94A3B8] mt-1 font-medium flex items-center justify-end gap-1"><Minus size={12}/> No prior data</div>;
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
                          <div className="text-[12px] text-[#94A3B8] mt-1 font-medium flex items-center justify-end gap-1 tabular-nums" title={`Stable since ${format(new Date(entry.previous_date), 'dd MMM')}`}>
                            <Minus size={12} strokeWidth={2.5}/>
                            Stable
                          </div>
                        );
                      }
                    })()}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-[13.5px] font-medium text-[#64748B] tracking-wide">{entry.rm_units?.unit_name || entry.unit}</span>
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
