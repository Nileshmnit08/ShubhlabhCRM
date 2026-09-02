import React, { useState } from 'react';
import { Filter, X, Search, FileText } from 'lucide-react';
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
    <div className="card bg-surface flex flex-col shadow-sm border border-base h-full rounded-xl overflow-hidden w-full">
      <div className="p-5 border-b border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white">
        <div>
          <h3 className="font-semibold text-lg text-primary">Today's Market Prices</h3>
          <p className="text-xs text-secondary mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
            Updated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input 
            type="text"
            placeholder="Search material or broker..."
            className="input pl-9 pr-8 py-2 text-sm w-full sm:w-64 bg-base/20 border-transparent focus:border-primary focus:bg-surface transition-colors rounded-lg"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary p-1 rounded-md"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="data-table-container border-0 shadow-none rounded-none flex-1 max-h-[500px]">
        <table className="data-table w-full mobile-cards-table">
          <thead>
            <tr>
              <th className="min-w-[200px] bg-white text-secondary font-semibold uppercase tracking-wider text-xs">Material</th>
              <th className="min-w-[120px] bg-white text-secondary font-semibold uppercase tracking-wider text-xs">Quality/Grade</th>
              <th className="min-w-[150px] bg-white text-secondary font-semibold uppercase tracking-wider text-xs">Broker</th>
              <th className="text-right min-w-[120px] bg-white text-secondary font-semibold uppercase tracking-wider text-xs">Price (₹)</th>
              <th className="min-w-[100px] bg-white text-secondary font-semibold uppercase tracking-wider text-xs">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {loading ? (
              [1, 2, 3, 4, 5].map(i => (
                <tr key={i} className="animate-pulse">
                  <td className="p-4" data-label="Material">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-base/50 shrink-0"></div>
                      <div className="flex-1">
                        <div className="h-4 w-24 bg-base/50 rounded mb-1.5"></div>
                        <div className="h-3 w-16 bg-base/50 rounded"></div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4" data-label="Quality/Grade"><div className="h-5 w-20 bg-base/50 rounded-md"></div></td>
                  <td className="p-4" data-label="Broker">
                    <div className="h-4 w-24 bg-base/50 rounded mb-1.5"></div>
                    <div className="h-3 w-20 bg-base/50 rounded"></div>
                  </td>
                  <td className="p-4 flex justify-end" data-label="Price (₹)"><div className="h-5 w-20 bg-base/50 rounded"></div></td>
                  <td className="p-4" data-label="Unit"><div className="h-4 w-12 bg-base/50 rounded"></div></td>
                </tr>
              ))
            ) : filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-secondary bg-base/10 h-64 border-b-0">
                  {searchQuery ? (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <Search size={32} className="mb-3 text-muted/50" />
                      <h4 className="font-semibold text-primary mb-1">No results found</h4>
                      <p className="text-sm">We couldn't find anything matching "{searchQuery}"</p>
                      <button className="btn btn-outline btn-sm mt-4 rounded-full" onClick={() => setSearchQuery('')}>Clear search</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center max-w-sm mx-auto">
                      <FileText size={32} className="mb-3 text-muted/50" />
                      <h4 className="font-semibold text-primary mb-1">No prices recorded yet</h4>
                      <p className="text-sm text-secondary mb-4">Start logging today's raw material prices from your brokers.</p>
                      <button className="btn btn-primary btn-sm rounded-full" onClick={() => navigate('/raw-material-prices/daily-entry')}>
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
                <tr key={entry.id} className="hover:bg-base/30 transition-colors group">
                  <td className="p-4" data-label="Material">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-sm shrink-0 border border-emerald-100 group-hover:bg-emerald-100 transition-colors">
                        {initial}
                      </div>
                      <div>
                        <div className="font-semibold text-primary text-sm">{enName}</div>
                        <div className="text-xs text-secondary mt-0.5">{entry.raw_materials?.name_hi}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4" data-label="Quality/Grade">
                    <div className="inline-flex items-center text-xs font-medium text-secondary bg-base/50 px-2 py-1 rounded-md border border-base/80 truncate max-w-[140px]" title={entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}>
                      {entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}
                    </div>
                  </td>
                  <td className="p-4" data-label="Broker">
                    <div className="text-sm font-medium text-primary">{entry.brokers?.broker_name}</div>
                    {entry.market_location && (
                      <div className="text-xs text-secondary mt-0.5 flex items-center gap-1">
                        {entry.market_location}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right" data-label="Price (₹)">
                    <div className="font-semibold text-primary">
                      ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </td>
                  <td className="p-4" data-label="Unit">
                    <span className="text-xs font-medium text-secondary tracking-wide">{entry.rm_units?.unit_name || entry.unit}</span>
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
