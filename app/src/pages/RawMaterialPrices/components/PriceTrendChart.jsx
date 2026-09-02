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
import { TrendingUp, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const PriceTrendChart = ({ materials, selectedMaterial, onMaterialChange, trendData, loading }) => {
  
  const selectedMatInfo = materials.find(m => m.id === selectedMaterial);
  
  // Calculate headline metrics
  const currentPrice = trendData.length > 0 ? trendData[trendData.length - 1].price : 0;
  const previousPrice = trendData.length > 1 ? trendData[trendData.length - 2].price : currentPrice;
  const diff = currentPrice - previousPrice;
  const perc = previousPrice > 0 ? (diff / previousPrice) * 100 : 0;
  
  return (
    <div className="card bg-surface flex flex-col shadow-sm border border-base h-full rounded-xl overflow-hidden w-full relative">
      <div className="p-5 border-b border-base bg-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
          <div>
            <h3 className="font-semibold text-lg text-primary">30-Day Price Trend</h3>
            <p className="text-xs text-secondary mt-0.5">Average daily market price</p>
          </div>
          
          <select 
            className="input w-full sm:w-auto min-w-[200px] py-2 text-sm bg-surface font-medium text-primary shadow-sm border-base/80 rounded-lg focus:border-emerald-500"
            value={selectedMaterial || ''}
            onChange={(e) => onMaterialChange(e.target.value)}
            disabled={loading}
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>
            ))}
          </select>
        </div>
        
        {selectedMatInfo && !loading && trendData.length > 0 && (
           <div className="flex items-end gap-3 mt-2">
             <div className="text-3xl font-bold text-primary tracking-tight">
               ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </div>
             {diff !== 0 ? (
               <div className={`flex items-center gap-1 text-sm font-semibold mb-1 px-2 py-0.5 rounded-md ${diff > 0 ? 'text-red-600 bg-red-50' : 'text-emerald-600 bg-emerald-50'}`}>
                 {diff > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                 {Math.abs(perc).toFixed(2)}%
               </div>
             ) : (
               <div className="flex items-center gap-1 text-sm font-semibold mb-1 px-2 py-0.5 rounded-md text-secondary bg-base/50">
                 <Minus size={16} />
                 0.00%
               </div>
             )}
             <div className="text-xs text-secondary mb-1.5 ml-1">
               vs prior update
             </div>
           </div>
        )}
      </div>
      
      <div className="p-5 flex-1 min-h-[300px]">
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
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: '#64748b'}} 
                axisLine={false} 
                tickLine={false} 
                tickMargin={12}
                minTickGap={20}
              />
              <YAxis 
                tick={{fontSize: 12, fill: '#64748b', fontVariantNumeric: 'tabular-nums'}} 
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
                  borderRadius: '8px', 
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                  color: '#1e293b',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
                itemStyle={{ color: '#0f766e', fontSize: '14px', fontWeight: 700 }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Price']}
                labelStyle={{ color: '#64748b', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}
                cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="#0f766e" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorPrice)"
                activeDot={{ r: 6, fill: '#0f766e', stroke: '#ffffff', strokeWidth: 2 }} 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-secondary text-sm bg-base/5 rounded-xl border border-dashed border-base/60">
            <TrendingUp size={32} className="text-muted/50 mb-3" />
            <h4 className="font-semibold text-primary mb-1">No Trend Data</h4>
            <p className="text-xs text-muted text-center max-w-[200px]">Select a different material or start logging data to view the trend.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendChart;
