import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const PriceTrendChart = ({ materials, selectedMaterial, onMaterialChange, trendData, loading, timeRange = 30, onTimeRangeChange }) => {
  
  const selectedMatInfo = materials.find(m => m.id === selectedMaterial);
  
  // Calculate headline metrics
  const currentPrice = trendData.length > 0 ? trendData[trendData.length - 1].price : 0;
  const previousPrice = trendData.length > 1 ? trendData[trendData.length - 2].price : currentPrice;
  const diff = currentPrice - previousPrice;
  const perc = previousPrice > 0 ? (diff / previousPrice) * 100 : 0;
  
  const ranges = [
    { label: '7D', value: 7 },
    { label: '15D', value: 15 },
    { label: '30D', value: 30 },
  ];
  
  return (
    <div className="card bg-white flex flex-col shadow-sm border border-base h-full rounded-xl overflow-hidden w-full relative">
      <div className="p-6 border-b border-base bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-lg text-primary tracking-tight">Price Trend</h3>
            <p className="text-sm text-secondary mt-0.5">Average daily market price</p>
          </div>
          
          <select 
            className="input w-full sm:w-auto min-w-[200px] py-2 text-sm bg-slate-50 font-medium text-primary shadow-sm border-base/80 rounded-lg focus:border-emerald-500 transition-colors"
            value={selectedMaterial || ''}
            onChange={(e) => onMaterialChange(e.target.value)}
            disabled={loading}
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>
            ))}
          </select>
        </div>
        
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          {selectedMatInfo && !loading && trendData.length > 0 ? (
             <div className="flex items-end gap-3">
               <div className="text-3xl font-bold text-primary tracking-tight tabular-nums">
                 ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </div>
               {diff !== 0 ? (
                 <div className={`flex items-center gap-1 text-sm font-semibold mb-1.5 px-2 py-1 rounded-md ${diff > 0 ? 'text-red-700 bg-red-50 border border-red-100' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}>
                   {diff > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                   {Math.abs(perc).toFixed(2)}%
                 </div>
               ) : (
                 <div className="flex items-center gap-1 text-sm font-semibold mb-1.5 px-2 py-1 rounded-md text-slate-600 bg-slate-50 border border-slate-200">
                   <Minus size={16} />
                   0.00%
                 </div>
               )}
               <div className="text-xs font-medium text-secondary mb-2 ml-1">
                 vs prior update
               </div>
               
               <Link 
                 to={`/raw-material-prices/history?material=${selectedMaterial}`}
                 className="ml-auto text-xs font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors border border-emerald-100 mb-1"
               >
                 Full History <ArrowRight size={12} />
               </Link>
             </div>
          ) : (
             <div className="h-10"></div>
          )}
          
          {onTimeRangeChange && (
            <div className="flex p-1 bg-slate-100 rounded-lg shrink-0">
              {ranges.map(range => (
                <button
                  key={range.value}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
                    timeRange === range.value 
                      ? 'bg-white text-emerald-700 shadow-sm border border-slate-200/50' 
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                  }`}
                  onClick={() => onTimeRangeChange(range.value)}
                  disabled={loading}
                >
                  {range.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="p-6 flex-1 min-h-[300px]">
        {loading ? (
          <div className="h-full w-full animate-pulse flex flex-col justify-end gap-2 px-4 pb-4">
             <div className="flex items-end gap-2 h-full border-b border-base/50 pb-2">
               {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                 <div key={i} className="flex-1 bg-emerald-500/10 rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
             </div>
             <div className="flex justify-between w-full h-4">
               <div className="w-12 h-3 bg-base/50 rounded"></div>
               <div className="w-12 h-3 bg-base/50 rounded"></div>
             </div>
          </div>
        ) : trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} 
                axisLine={false} 
                tickLine={false} 
                tickMargin={12}
                minTickGap={20}
              />
              <YAxis 
                tick={{fontSize: 12, fill: '#64748b', fontVariantNumeric: 'tabular-nums', fontWeight: 500}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} 
                tickMargin={12}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  borderColor: '#e2e8f0', 
                  borderRadius: '12px', 
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '12px'
                }}
                itemStyle={{ color: '#059669', fontSize: '15px', fontWeight: 700, marginTop: '4px' }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Price']}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#059669" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorPrice)"
                activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff', strokeWidth: 3, boxShadow: '0 0 10px rgba(5,150,105,0.5)' }} 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-secondary text-sm bg-slate-50/50 rounded-xl border border-dashed border-base/80">
            <TrendingUp size={36} className="text-muted/40 mb-4" />
            <h4 className="font-semibold text-primary mb-1.5 text-base">No Trend Data</h4>
            <p className="text-sm text-muted text-center max-w-[220px]">Select a different material or start logging data to view the trend.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendChart;
