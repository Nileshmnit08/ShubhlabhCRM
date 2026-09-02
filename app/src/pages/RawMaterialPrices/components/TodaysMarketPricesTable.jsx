import React, { useState } from 'react';
import { Filter, X, Search } from 'lucide-react';
import { format } from 'date-fns';

const TodaysMarketPricesTable = ({ prices }) => {
  const [searchQuery, setSearchQuery] = useState('');
  
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
    <div className="card bg-surface flex flex-col shadow-sm border border-base h-full">
      <div className="p-5 border-b border-base flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-base/20 rounded-t-lg">
        <div>
          <h3 className="font-semibold text-lg text-primary">Today's Market Prices</h3>
          <p className="text-xs text-secondary mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-success inline-block"></span>
            Updated {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input 
            type="text"
            placeholder="Search material or broker..."
            className="input pl-9 pr-8 py-2 text-sm w-full sm:w-64"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>
      
      <div className="data-table-container border-0 shadow-none rounded-none flex-1">
        <table className="data-table">
          <thead>
            <tr>
              <th className="min-w-[150px]">Material</th>
              <th className="min-w-[120px]">Quality/Grade</th>
              <th className="min-w-[150px]">Broker</th>
              <th className="text-right min-w-[120px]">Price (₹)</th>
              <th className="min-w-[100px]">Unit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base">
            {filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-10 text-center text-secondary">
                  {searchQuery ? (
                    <div className="flex flex-col items-center">
                      <Search size={24} className="mb-2 text-muted" />
                      <p>No results found for "{searchQuery}"</p>
                      <button className="text-primary mt-2 text-sm hover:underline" onClick={() => setSearchQuery('')}>Clear search</button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <p>No price entries recorded for today.</p>
                      <p className="text-xs mt-1 text-muted">Use the 'Add Daily Price' button to start logging quotes.</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              filteredPrices.map(entry => (
                <tr key={entry.id}>
                  <td>
                    <div className="font-medium text-primary">{entry.raw_materials?.name_en}</div>
                    <div className="text-xs text-secondary mt-0.5">{entry.raw_materials?.name_hi}</div>
                  </td>
                  <td>
                    <span className="text-sm text-secondary bg-base px-2 py-1 rounded-md border border-base">
                      {entry.material_quality_grades?.grade_name || entry.quality_description || 'Standard'}
                    </span>
                  </td>
                  <td>
                    <div className="text-sm font-medium">{entry.brokers?.broker_name}</div>
                    {entry.market_location && (
                      <div className="text-xs text-secondary mt-0.5">{entry.market_location}</div>
                    )}
                  </td>
                  <td className="text-right font-semibold text-primary">
                    ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td>
                    <span className="text-xs text-secondary uppercase tracking-wider">{entry.rm_units?.unit_name || entry.unit}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TodaysMarketPricesTable;
