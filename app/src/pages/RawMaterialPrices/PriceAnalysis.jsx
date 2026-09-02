import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { BarChart2, TrendingUp, TrendingDown, Minus, Filter, Calendar } from 'lucide-react';
import { format, subDays, subMonths, subYears, parseISO } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer 
} from 'recharts';

const PriceAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  
  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [comparisonPeriod, setComparisonPeriod] = useState('7days');
  const [baseDate, setBaseDate] = useState('');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [analysisData, setAnalysisData] = useState(null);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      calculateAnalysis();
    }
  }, [selectedMaterial, comparisonPeriod, baseDate, currentDate]);

  const fetchMaterials = async () => {
    const { data } = await supabase.from('raw_materials').select('id, name_en, name_hi, default_unit').eq('active', true);
    setMaterials(data || []);
    if (data && data.length > 0) {
      setSelectedMaterial(data[0].id);
    }
  };

  const calculateAnalysis = async () => {
    if (!selectedMaterial) return;
    setLoading(true);

    try {
      const today = new Date(currentDate);
      let calculatedBaseDate = baseDate;

      if (comparisonPeriod !== 'custom') {
        switch (comparisonPeriod) {
          case 'yesterday': calculatedBaseDate = format(subDays(today, 1), 'yyyy-MM-dd'); break;
          case '7days': calculatedBaseDate = format(subDays(today, 7), 'yyyy-MM-dd'); break;
          case '30days': calculatedBaseDate = format(subDays(today, 30), 'yyyy-MM-dd'); break;
          case '3months': calculatedBaseDate = format(subMonths(today, 3), 'yyyy-MM-dd'); break;
          case '6months': calculatedBaseDate = format(subMonths(today, 6), 'yyyy-MM-dd'); break;
          case '1year': calculatedBaseDate = format(subYears(today, 1), 'yyyy-MM-dd'); break;
          default: calculatedBaseDate = format(subDays(today, 7), 'yyyy-MM-dd');
        }
      }

      // Fetch base date prices
      const { data: baseData } = await supabase
        .from('raw_material_price_entries')
        .select('price, brokers(broker_name), market_location')
        .eq('raw_material_id', selectedMaterial)
        .eq('entry_date', calculatedBaseDate)
        .eq('is_deleted', false);

      // Fetch current date prices
      const { data: currentData } = await supabase
        .from('raw_material_price_entries')
        .select('price, brokers(broker_name), market_location')
        .eq('raw_material_id', selectedMaterial)
        .eq('entry_date', currentDate)
        .eq('is_deleted', false);

      const matInfo = materials.find(m => m.id === selectedMaterial);

      const getAvg = (data) => data && data.length > 0 ? data.reduce((sum, item) => sum + Number(item.price), 0) / data.length : 0;
      const getMin = (data) => data && data.length > 0 ? Math.min(...data.map(i => Number(i.price))) : 0;
      const getMax = (data) => data && data.length > 0 ? Math.max(...data.map(i => Number(i.price))) : 0;

      const baseAvg = getAvg(baseData);
      const currAvg = getAvg(currentData);
      
      const diff = currAvg - baseAvg;
      const perc = baseAvg > 0 ? (diff / baseAvg) * 100 : 0;

      // Group for broker chart (comparing brokers on current date)
      const brokerChartData = (currentData || []).map(d => ({
        name: d.brokers?.broker_name || 'Unknown',
        price: Number(d.price)
      }));

      setAnalysisData({
        materialName: `${matInfo?.name_en} (${matInfo?.name_hi})`,
        unit: matInfo?.default_unit,
        baseDateStr: format(new Date(calculatedBaseDate), 'dd MMM yyyy'),
        currDateStr: format(new Date(currentDate), 'dd MMM yyyy'),
        baseAvg,
        currAvg,
        diff,
        perc,
        currMin: getMin(currentData),
        currMax: getMax(currentData),
        currCount: currentData?.length || 0,
        baseCount: baseData?.length || 0,
        brokerChartData
      });

    } catch (error) {
      console.error("Analysis calculation error", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendBadge = (diff, perc) => {
    if (diff > 0) {
      return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${perc > 3 ? 'bg-red-500/10 text-red-600' : 'bg-orange-500/10 text-orange-600'}`}>
          <TrendingUp size={16} /> {perc > 3 ? 'Sharp Increase' : 'Increased'} (+{perc.toFixed(2)}%)
        </span>
      );
    } else if (diff < 0) {
      return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${perc < -3 ? 'bg-green-500/10 text-green-600' : 'bg-teal-500/10 text-teal-600'}`}>
          <TrendingDown size={16} /> {perc < -3 ? 'Sharp Decrease' : 'Decreased'} ({perc.toFixed(2)}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold bg-gray-500/10 text-gray-600">
        <Minus size={16} /> Stable (0.00%)
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Configuration Bar */}
      <div className="card bg-surface p-4 border border-base flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-secondary mb-1">Raw Material</label>
          <select className="input w-full" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
            {materials.map(m => <option key={m.id} value={m.id}>{m.name_en} ({m.name_hi})</option>)}
          </select>
        </div>
        
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-secondary mb-1">Current Date</label>
          <input type="date" className="input w-full" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="text-xs font-medium text-secondary mb-1">Compare With</label>
          <select className="input w-full" value={comparisonPeriod} onChange={e => setComparisonPeriod(e.target.value)}>
            <option value="yesterday">Yesterday</option>
            <option value="7days">7 Days Ago</option>
            <option value="30days">30 Days Ago</option>
            <option value="3months">3 Months Ago</option>
            <option value="6months">6 Months Ago</option>
            <option value="1year">1 Year Ago</option>
            <option value="custom">Custom Date</option>
          </select>
        </div>

        {comparisonPeriod === 'custom' && (
          <div className="flex-1 min-w-[150px]">
            <label className="text-xs font-medium text-secondary mb-1">Base Date</label>
            <input type="date" className="input w-full" value={baseDate} onChange={e => setBaseDate(e.target.value)} />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
          Analyzing data...
        </div>
      ) : analysisData ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card bg-surface p-6 col-span-1 md:col-span-4 border-l-4 border-primary">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-primary">{analysisData.materialName}</h2>
                  <p className="text-secondary mt-1">Comparison: {analysisData.baseDateStr} vs {analysisData.currDateStr}</p>
                </div>
                <div>
                  {analysisData.baseAvg > 0 && analysisData.currAvg > 0 
                    ? getTrendBadge(analysisData.diff, analysisData.perc)
                    : <span className="px-3 py-1 bg-base text-secondary rounded-full text-sm">Insufficient Data</span>
                  }
                </div>
              </div>
            </div>

            <div className="card bg-surface p-5">
              <p className="text-sm text-secondary mb-1">Base Avg Price ({analysisData.baseDateStr})</p>
              <h3 className="text-xl font-semibold">
                {analysisData.baseAvg > 0 ? `₹${analysisData.baseAvg.toFixed(2)}` : 'N/A'}
                <span className="text-sm font-normal text-secondary ml-1">/{analysisData.unit}</span>
              </h3>
              <p className="text-xs text-secondary mt-2">Based on {analysisData.baseCount} quotes</p>
            </div>

            <div className="card bg-surface p-5">
              <p className="text-sm text-secondary mb-1">Current Avg Price ({analysisData.currDateStr})</p>
              <h3 className="text-xl font-semibold">
                {analysisData.currAvg > 0 ? `₹${analysisData.currAvg.toFixed(2)}` : 'N/A'}
                <span className="text-sm font-normal text-secondary ml-1">/{analysisData.unit}</span>
              </h3>
              <p className="text-xs text-secondary mt-2">Based on {analysisData.currCount} quotes</p>
            </div>

            <div className="card bg-surface p-5">
              <p className="text-sm text-secondary mb-1">Absolute Change</p>
              <h3 className={`text-xl font-semibold ${analysisData.diff > 0 ? 'text-red-500' : analysisData.diff < 0 ? 'text-green-500' : ''}`}>
                {analysisData.diff > 0 ? '+' : ''}{analysisData.diff ? `₹${analysisData.diff.toFixed(2)}` : '0.00'}
              </h3>
            </div>

            <div className="card bg-surface p-5">
              <p className="text-sm text-secondary mb-1">Current Range</p>
              <h3 className="text-lg font-semibold">
                {analysisData.currMin > 0 ? `₹${analysisData.currMin} - ₹${analysisData.currMax}` : 'N/A'}
              </h3>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6">
            <div className="card bg-surface p-5">
              <h3 className="font-semibold mb-6">Broker Comparison (Current Date)</h3>
              <div className="h-[300px]">
                {analysisData.brokerChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analysisData.brokerChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tick={{fontSize: 12, fill: 'var(--text-secondary)'}} />
                      <YAxis tick={{fontSize: 12, fill: 'var(--text-secondary)'}} tickFormatter={(val) => `₹${val}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border)', borderRadius: '8px' }}
                        cursor={{fill: 'var(--base)'}}
                      />
                      <Bar dataKey="price" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Price" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-secondary border border-dashed border-base rounded-lg">
                    No broker quotes available for the current date.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card bg-surface p-12 text-center text-secondary">
          Select a material and date range to view analysis.
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;
