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
    <div className="bg-white flex flex-col border border-[#E2E8F0] shadow-sm h-full rounded-[16px] overflow-hidden w-full relative">
      <div className="p-5 border-b border-[#E2E8F0] bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="font-bold text-[17px] text-[#0F172A] tracking-tight">Price Trend</h3>
            <p className="text-[13px] text-[#64748B] mt-0.5">Average daily market price</p>
          </div>
          
          <select 
            className="w-full sm:w-auto min-w-[200px] h-[38px] px-3 text-[14px] bg-white font-medium text-[#0F172A] shadow-sm border border-[#E2E8F0] rounded-[10px] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none"
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
               <div className="text-[28px] font-bold text-[#0F172A] tracking-tight tabular-nums leading-none">
                 ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </div>
               {diff !== 0 ? (
                 <div className={`flex items-center gap-1 text-[13px] font-semibold mb-0.5 px-2 py-1 rounded-md ${diff > 0 ? 'text-red-700 bg-red-50 border border-red-100' : 'text-emerald-700 bg-emerald-50 border border-emerald-100'}`}>
                   {diff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                   {Math.abs(perc).toFixed(2)}%
                 </div>
               ) : (
                 <div className="flex items-center gap-1 text-[13px] font-semibold mb-0.5 px-2 py-1 rounded-md text-slate-600 bg-slate-50 border border-slate-200">
                   <Minus size={14} />
                   0.00%
                 </div>
               )}
               <div className="text-[12px] font-medium text-[#64748B] mb-1.5 ml-1">
                 vs prior update
               </div>
               
               <Link 
                 to={`/raw-material-prices/history?material=${selectedMaterial}`}
                 className="ml-auto text-[12px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors border border-emerald-100 mb-0.5"
               >
                 Full History <ArrowRight size={12} />
               </Link>
             </div>
          ) : (
             <div className="h-9"></div>
          )}
          
          {onTimeRangeChange && (
            <div className="flex p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg shrink-0">
              {ranges.map(range => (
                <button
                  key={range.value}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all ${
                    timeRange === range.value 
                      ? 'bg-white text-[#0F172A] shadow-sm border border-[#E2E8F0]' 
                      : 'text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 border border-transparent'
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
             <div className="flex items-end gap-2 h-full border-b border-[#E2E8F0] pb-2">
               {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                 <div key={i} className="flex-1 bg-[#F8FAFC] border-t border-[#E2E8F0] rounded-t-sm" style={{ height: `${h}%` }}></div>
               ))}
             </div>
             <div className="flex justify-between w-full h-4">
               <div className="w-12 h-3 bg-[#F8FAFC] rounded"></div>
               <div className="w-12 h-3 bg-[#F8FAFC] rounded"></div>
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
              <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
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
                  color: '#0f172a',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '12px'
                }}
                itemStyle={{ color: '#059669', fontSize: '15px', fontWeight: 700, marginTop: '4px' }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Price']}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
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
          <div className="h-full flex flex-col items-center justify-center text-[#64748B] text-[14px] bg-[#F8FAFC] rounded-xl border border-dashed border-[#E2E8F0]">
            <TrendingUp size={36} className="text-[#94A3B8] mb-4" />
            <h4 className="font-semibold text-[#0F172A] mb-1.5 text-[16px]">No Trend Data</h4>
            <p className="text-[14px] text-[#64748B] text-center max-w-[240px]">Select a different material or start logging data to view the trend.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendChart;
