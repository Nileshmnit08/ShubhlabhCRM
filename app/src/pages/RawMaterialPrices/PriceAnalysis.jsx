import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Minus, CalendarDays, BarChart3, Info, Filter } from 'lucide-react';
import { format, subDays, subMonths, subYears, parseISO, differenceInDays } from 'date-fns';

import PriceComparisonHero from './components/analysis/PriceComparisonHero';
import PriceMetricCard from './components/analysis/PriceMetricCard';
import SampleSizeNotice from './components/analysis/SampleSizeNotice';
import BrokerQuotesTable from './components/analysis/BrokerQuotesTable';
import PriceTrendChart from './components/PriceTrendChart';

const PriceAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  
  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [comparisonPeriod, setComparisonPeriod] = useState('7days');
  const [baseDate, setBaseDate] = useState('');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [analysisData, setAnalysisData] = useState(null);

  // Trend Chart State
  const [trendData, setTrendData] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendTimeRange, setTrendTimeRange] = useState(30);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      calculateAnalysis();
      fetchTrendData();
    }
  }, [selectedMaterial, comparisonPeriod, baseDate, currentDate]);

  useEffect(() => {
    if (selectedMaterial) {
      fetchTrendData();
    }
  }, [trendTimeRange]);

  const fetchMaterials = async () => {
    const { data } = await supabase.from('raw_materials').select('id, name_en, name_hi, default_unit:rm_units(unit_name)').eq('active', true);
    setMaterials(data || []);
    if (data && data.length > 0) {
      setSelectedMaterial(data[0].id);
    }
  };

  const fetchTrendData = async () => {
    if (!selectedMaterial) return;
    setLoadingTrend(true);
    try {
      const startDate = format(subDays(new Date(), trendTimeRange), 'yyyy-MM-dd');
      const { data } = await supabase
        .from('raw_material_price_entries')
        .select('entry_date, price')
        .eq('raw_material_id', selectedMaterial)
        .gte('entry_date', startDate)
        .eq('is_deleted', false)
        .order('entry_date', { ascending: true });

      const dateMap = {};
      (data || []).forEach(item => {
        if (!dateMap[item.entry_date]) {
          dateMap[item.entry_date] = { sum: 0, count: 0 };
        }
        dateMap[item.entry_date].sum += Number(item.price);
        dateMap[item.entry_date].count += 1;
      });

      const chartData = Object.keys(dateMap).sort().map(dateStr => ({
        date: dateStr,
        price: dateMap[dateStr].sum / dateMap[dateStr].count,
        count: dateMap[dateStr].count
      }));

      setTrendData(chartData);
    } catch (error) {
      console.error("Error fetching trend data", error);
    } finally {
      setLoadingTrend(false);
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
      } else if (!baseDate) {
         calculatedBaseDate = format(subDays(today, 7), 'yyyy-MM-dd');
      }

      // Fetch base date prices
      const { data: baseData } = await supabase
        .from('raw_material_price_entries')
        .select('price, brokers(broker_name), market_location, created_at')
        .eq('raw_material_id', selectedMaterial)
        .eq('entry_date', calculatedBaseDate)
        .eq('is_deleted', false);

      // Fetch current date prices
      const { data: currentData } = await supabase
        .from('raw_material_price_entries')
        .select('price, brokers(broker_name), market_location, created_at')
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

      const brokerChartData = (currentData || []).map(d => ({
        brokerName: d.brokers?.broker_name || 'Unknown',
        price: Number(d.price),
        location: d.market_location,
        quoteTime: d.created_at ? format(new Date(d.created_at), 'h:mm a') : 'Unknown'
      }));

      const daysDiff = differenceInDays(new Date(currentDate), new Date(calculatedBaseDate));

      setAnalysisData({
        materialNameEn: matInfo?.name_en || '',
        materialNameHi: matInfo?.name_hi || '',
        unit: matInfo?.default_unit?.unit_name || 'Unit',
        baseDateStr: format(new Date(calculatedBaseDate), 'dd MMM yyyy'),
        currDateStr: format(new Date(currentDate), 'dd MMM yyyy'),
        calculatedBaseDate,
        daysDiff,
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

  return (
    <div className="space-y-6 pb-12">
      {/* Filter Card */}
      <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Filter size={18} className="text-slate-500" />
          <h3 className="font-semibold text-slate-800">Analysis Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="w-full">
            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Raw Material</label>
            <select className="input w-full bg-slate-50 border-slate-200" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name_en} {m.name_hi && `(${m.name_hi})`}</option>)}
            </select>
          </div>
          
          <div className="w-full">
            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Current Date</label>
            <input type="date" className="input w-full bg-slate-50 border-slate-200" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
          </div>

          <div className="w-full">
            <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Compare With</label>
            <select className="input w-full bg-slate-50 border-slate-200" value={comparisonPeriod} onChange={e => setComparisonPeriod(e.target.value)}>
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
            <div className="w-full">
              <label className="block text-[13px] font-medium text-slate-600 mb-1.5">Base Date</label>
              <input type="date" className="input w-full bg-slate-50 border-slate-200" value={baseDate} onChange={e => setBaseDate(e.target.value)} />
            </div>
          )}
        </div>
        
        {analysisData && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Comparing <span className="font-semibold text-slate-800">{analysisData.currDateStr}</span> with <span className="font-semibold text-slate-800">{analysisData.baseDateStr}</span> 
              <span className="text-slate-500 ml-1">({analysisData.daysDiff} days ago)</span>
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 bg-white rounded-[16px] border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
          <p className="text-sm font-medium">Analyzing market data...</p>
        </div>
      ) : analysisData ? (
        <div className="flex flex-col gap-6">
          <PriceComparisonHero 
            materialNameEn={analysisData.materialNameEn}
            materialNameHi={analysisData.materialNameHi}
            baseDateStr={analysisData.baseDateStr}
            currDateStr={analysisData.currDateStr}
            currAvg={analysisData.currAvg}
            unit={analysisData.unit}
            diff={analysisData.diff}
            perc={analysisData.perc}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PriceMetricCard 
              title="Previous average"
              value={analysisData.baseAvg > 0 ? `₹${analysisData.baseAvg.toFixed(2)}` : 'N/A'}
              supportText={`${analysisData.baseDateStr} • ${analysisData.baseCount} ${analysisData.baseCount === 1 ? 'quote' : 'quotes'}`}
              variant="neutral"
              icon={CalendarDays}
            />
            
            <PriceMetricCard 
              title="Current average"
              value={analysisData.currAvg > 0 ? `₹${analysisData.currAvg.toFixed(2)}` : 'N/A'}
              supportText={`${analysisData.currDateStr} • ${analysisData.currCount} ${analysisData.currCount === 1 ? 'quote' : 'quotes'}`}
              variant="highlight"
              icon={BarChart3}
            />

            <PriceMetricCard 
              title="Price movement"
              value={analysisData.diff === 0 ? '₹0.00' : `${analysisData.diff > 0 ? '+' : ''}₹${analysisData.diff.toFixed(2)}`}
              supportText={`${analysisData.diff === 0 ? '0.00' : (analysisData.diff > 0 ? '+' : '') + analysisData.perc.toFixed(2)}% in ${analysisData.daysDiff} days`}
              variant={analysisData.diff === 0 ? 'neutral' : (analysisData.diff > 0 ? 'positive' : 'negative')}
              icon={analysisData.diff === 0 ? Minus : (analysisData.diff > 0 ? TrendingUp : TrendingDown)}
            />

            <PriceMetricCard 
              title="Today's quoted range"
              value={analysisData.currMin > 0 ? (analysisData.currCount === 1 ? `₹${analysisData.currAvg.toFixed(2)}` : `₹${analysisData.currMin.toFixed(2)}–₹${analysisData.currMax.toFixed(2)}`) : 'N/A'}
              supportText={`${analysisData.currCount} ${analysisData.currCount === 1 ? 'quote available' : 'quotes available'}`}
              variant="neutral"
              badge={analysisData.currCount === 1 ? 'Single Quote' : null}
            />
          </div>

          <SampleSizeNotice 
            baseCount={analysisData.baseCount} 
            currCount={analysisData.currCount} 
          />

          <BrokerQuotesTable 
            quotes={analysisData.brokerChartData}
            currMin={analysisData.currMin}
            currMax={analysisData.currMax}
            unit={analysisData.unit}
            currDateStr={analysisData.currDateStr}
          />
          
          <div className="mt-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">Historical Context</h2>
              <p className="text-sm text-slate-500 mt-1">Review the average price trend for {analysisData.materialNameEn} over time.</p>
            </div>
            <div className="h-[400px]">
              <PriceTrendChart 
                materials={materials}
                selectedMaterial={selectedMaterial}
                onMaterialChange={setSelectedMaterial}
                trendData={trendData}
                loading={loadingTrend}
                timeRange={trendTimeRange}
                onTimeRangeChange={setTrendTimeRange}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[16px] border border-slate-200 p-12 text-center text-slate-500 shadow-sm flex flex-col items-center justify-center">
          <Filter size={32} className="text-slate-300 mb-3" />
          <p className="text-lg font-medium text-slate-700 mb-1">No analysis ready</p>
          <p className="text-sm">Select a material and date range to view analysis.</p>
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;
