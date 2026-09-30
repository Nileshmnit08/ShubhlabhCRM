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

const PriceTrendChart = ({ materials, selectedMaterial, onMaterialChange, trendData, loading, timeRange = 30, onTimeRangeChange, hideTitle }) => {
  
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
    <div className="glass-panel flex flex-col h-full overflow-hidden w-full relative">
      <div className="p-5" style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0' }}>
      {!hideTitle && (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="font-bold text-[17px] tracking-tight text-primary">Price Trend</h3>
            <p className="text-[13px] mt-0.5 text-secondary">Average daily market price</p>
          </div>
          
          <select 
            className="w-full sm:w-auto min-w-[200px]"
            style={{ height: '38px', padding: '0 12px', fontSize: '14px', background: 'var(--bg-surface)' }}
            value={selectedMaterial || ''}
            onChange={(e) => onMaterialChange(e.target.value)}
            disabled={loading}
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>
            ))}
          </select>
        </div>
      )}
        
        <div className="flex flex-wrap items-end justify-between gap-4 mt-2">
          {selectedMatInfo && !loading && trendData.length > 0 ? (
             <div className="flex items-end gap-3">
               <div className="text-[28px] font-bold tracking-tight tabular-nums leading-none text-primary">
                 ₹{currentPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
               </div>
               {diff !== 0 ? (
                 <div className="flex items-center gap-1 text-[13px] font-semibold mb-0.5 px-2 py-1 rounded-md" style={{ color: diff > 0 ? 'var(--danger)' : 'var(--success)', background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                   {diff > 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                   {Math.abs(perc).toFixed(2)}%
                 </div>
               ) : (
                 <div className="flex items-center gap-1 text-[13px] font-semibold mb-0.5 px-2 py-1 rounded-md" style={{ color: 'var(--text-muted)', background: 'var(--bg-base)', border: '1px solid var(--border)' }}>
                   <Minus size={14} />
                   0.00%
                 </div>
               )}
               <div className="text-[12px] font-medium mb-1.5 ml-1 text-muted">
                 vs prior update
               </div>
               
               <Link 
                 to={`/raw-material-prices/history?material=${selectedMaterial}`}
                 className="ml-auto btn btn-secondary text-[12px] font-semibold flex items-center gap-1 mb-0.5"
                 style={{ padding: '0.4rem 0.75rem' }}
               >
                 Full History <ArrowRight size={12} />
               </Link>
             </div>
          ) : (
             <div className="h-9"></div>
          )}
          
          {onTimeRangeChange && (
            <div className="flex p-1 rounded-lg shrink-0 bg-base border border-base">
              {ranges.map(range => (
                <button
                  key={range.value}
                  className={`px-3 py-1 text-[12px] font-semibold rounded-md transition-all`}
                  style={{ 
                    background: timeRange === range.value ? 'var(--bg-surface)' : 'transparent',
                    color: timeRange === range.value ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: timeRange === range.value ? '1px solid var(--border)' : '1px solid transparent',
                    boxShadow: timeRange === range.value ? 'var(--shadow-sm)' : 'none'
                  }}
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
      
      <div className="p-6 flex-1 min-h-[300px] bg-surface">
        {loading ? (
          <div className="h-full w-full animate-pulse flex flex-col justify-end gap-2 px-4 pb-4">
             <div className="flex items-end gap-2 h-full pb-2 border-b border-base">
               {[40, 60, 45, 70, 50, 80, 65, 90].map((h, i) => (
                 <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: 'var(--bg-base)', borderTop: '1px solid var(--border)' }}></div>
               ))}
             </div>
             <div className="flex justify-between w-full h-4">
               <div className="w-12 h-3 rounded bg-base"></div>
               <div className="w-12 h-3 rounded bg-base"></div>
             </div>
          </div>
        ) : trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.01}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: 'var(--text-secondary)', fontWeight: 500}} 
                axisLine={false} 
                tickLine={false} 
                tickMargin={12}
                minTickGap={20}
              />
              <YAxis 
                tick={{fontSize: 12, fill: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums', fontWeight: 500}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} 
                tickMargin={12}
                domain={['auto', 'auto']}
                width={70}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  borderColor: 'var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: 'var(--shadow-md)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  padding: '12px'
                }}
                itemStyle={{ color: 'var(--primary)', fontSize: '15px', fontWeight: 700, marginTop: '4px' }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Price']}
                labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area 
                type="monotone" 
                dataKey="price" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                fillOpacity={1} 
                fill="url(#colorPrice)"
                activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-surface)', strokeWidth: 3, boxShadow: '0 0 10px rgba(0,0,0,0.2)' }} 
                animationDuration={1000}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-[14px] rounded-xl border border-dashed" style={{ background: 'var(--bg-base)', color: 'var(--text-muted)', borderColor: 'var(--border)' }}>
            <TrendingUp size={36} className="mb-4 text-muted" />
            <h4 className="font-semibold mb-1.5 text-[16px] text-primary">No Trend Data</h4>
            <p className="text-[14px] text-center max-w-[240px] text-secondary">Select a different material or start logging data to view the trend.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendChart;
