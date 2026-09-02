import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Minus, CalendarDays, BarChart3, Info } from 'lucide-react';
import { format, subDays, subMonths, subYears, parseISO } from 'date-fns';

import PriceComparisonHero from './components/analysis/PriceComparisonHero';
import PriceMetricCard from './components/analysis/PriceMetricCard';
import SampleSizeNotice from './components/analysis/SampleSizeNotice';
import BrokerQuotesTable from './components/analysis/BrokerQuotesTable';

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
    const { data } = await supabase.from('raw_materials').select('id, name_en, name_hi, default_unit:rm_units(unit_name)').eq('active', true);
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

      // Group for broker table (comparing brokers on current date)
      const brokerChartData = (currentData || []).map(d => ({
        brokerName: d.brokers?.broker_name || 'Unknown',
        price: Number(d.price),
        location: d.market_location
      }));

      setAnalysisData({
        materialNameEn: matInfo?.name_en || '',
        materialNameHi: matInfo?.name_hi || '',
        unit: matInfo?.default_unit?.unit_name || 'Unit',
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
          {/* Hero Section */}
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

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <PriceMetricCard 
              title="Previous average"
              value={analysisData.baseAvg > 0 ? `₹${analysisData.baseAvg.toFixed(2)}` : 'N/A'}
              supportText={`${analysisData.baseDateStr} · ${analysisData.baseCount} ${analysisData.baseCount === 1 ? 'quote' : 'quotes'}`}
              variant="neutral"
              icon={CalendarDays}
            />
            
            <PriceMetricCard 
              title="Current average"
              value={analysisData.currAvg > 0 ? `₹${analysisData.currAvg.toFixed(2)}` : 'N/A'}
              supportText={`${analysisData.currDateStr} · ${analysisData.currCount} ${analysisData.currCount === 1 ? 'quote' : 'quotes'}`}
              variant="highlight"
              icon={BarChart3}
            />

            <PriceMetricCard 
              title="Price movement"
              value={analysisData.diff === 0 ? '₹0.00' : `${analysisData.diff > 0 ? '+' : ''}₹${analysisData.diff.toFixed(2)}`}
              supportText={`${analysisData.diff === 0 ? '0.00' : (analysisData.diff > 0 ? '+' : '') + analysisData.perc.toFixed(2)}% in ${comparisonPeriod.replace('days', ' days')}`}
              variant={analysisData.diff === 0 ? 'neutral' : (analysisData.diff > 0 ? 'negative' : 'positive')}
              icon={analysisData.diff === 0 ? Minus : (analysisData.diff > 0 ? TrendingUp : TrendingDown)}
            />

            <PriceMetricCard 
              title="Today's quoted range"
              value={analysisData.currMin > 0 ? `₹${analysisData.currMin.toFixed(2)}–₹${analysisData.currMax.toFixed(2)}` : 'N/A'}
              supportText={`${analysisData.currCount} ${analysisData.currCount === 1 ? 'quote available' : 'quotes available'}`}
              variant="neutral"
            />
          </div>

          <div className="mt-4">
            <SampleSizeNotice 
              baseCount={analysisData.baseCount} 
              currCount={analysisData.currCount} 
            />
          </div>

          <div className="mt-8">
            <BrokerQuotesTable 
              quotes={analysisData.brokerChartData}
              currMin={analysisData.currMin}
              currMax={analysisData.currMax}
              unit={analysisData.unit}
              currDateStr={analysisData.currDateStr}
            />
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
