import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { TrendingUp } from 'lucide-react';

const PriceTrendChart = ({ materials, selectedMaterial, onMaterialChange, trendData }) => {
  
  const selectedMatInfo = materials.find(m => m.id === selectedMaterial);
  
  return (
    <div className="card bg-surface flex flex-col shadow-sm border border-base h-full">
      <div className="p-5 border-b border-base bg-base/20 rounded-t-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <TrendingUp size={16} />
            </div>
            <h3 className="font-semibold text-lg text-primary">30-Day Trend</h3>
          </div>
          
          <select 
            className="input w-full sm:w-64 py-2 text-sm bg-surface font-medium text-primary shadow-sm"
            value={selectedMaterial || ''}
            onChange={(e) => onMaterialChange(e.target.value)}
          >
            {materials.map(m => (
              <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>
            ))}
          </select>
        </div>
        
        {selectedMatInfo && (
           <div className="text-sm text-secondary">
             Showing average daily prices for <span className="font-semibold text-primary">{selectedMatInfo.name_en}</span>
           </div>
        )}
      </div>
      
      <div className="p-5 flex-1 min-h-[350px]">
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis 
                dataKey="date" 
                tick={{fontSize: 12, fill: 'var(--text-secondary)'}} 
                axisLine={false} 
                tickLine={false} 
                tickMargin={10}
              />
              <YAxis 
                tick={{fontSize: 12, fill: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums'}} 
                axisLine={false} 
                tickLine={false} 
                tickFormatter={(val) => `₹${val.toLocaleString('en-IN')}`} 
                tickMargin={10}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-surface)', 
                  borderColor: 'var(--border)', 
                  borderRadius: 'var(--radius-md)', 
                  boxShadow: 'var(--shadow-md)',
                  color: 'var(--text-primary)',
                  fontWeight: 500
                }}
                itemStyle={{ color: 'var(--primary)' }}
                formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Avg Price']}
                labelStyle={{ color: 'var(--text-secondary)', marginBottom: '4px' }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="var(--primary)" 
                strokeWidth={3} 
                dot={{ r: 4, fill: 'var(--bg-surface)', strokeWidth: 2, stroke: 'var(--primary)' }} 
                activeDot={{ r: 6, fill: 'var(--primary)', stroke: 'var(--bg-surface)', strokeWidth: 2 }} 
                animationDuration={1000}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-secondary text-sm border-2 border-dashed border-base rounded-lg bg-base/10">
            <TrendingUp size={32} className="text-muted mb-3 opacity-50" />
            <p>No historical trend data available</p>
            <p className="text-xs text-muted mt-1">Select a different material or start logging data.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendChart;
