import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Minus, CalendarDays, BarChart3, Info, Filter, Phone, MessageCircle } from 'lucide-react';
import { format, subDays, subMonths, subYears, parseISO, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { normalizeMobile } from '../../utils/phoneUtils';

import PriceTrendChart from './components/PriceTrendChart';

const PriceAnalysis = () => {
  const [loading, setLoading] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [qualityGrades, setQualityGrades] = useState([]);
  const [units, setUnits] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  
  // Filters
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedQuality, setSelectedQuality] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedPriceType, setSelectedPriceType] = useState('');

  const [comparisonPeriod, setComparisonPeriod] = useState('30days');
  const [baseDate, setBaseDate] = useState('');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const [analysisData, setAnalysisData] = useState(null);
  const [insufficientDataMsg, setInsufficientDataMsg] = useState(null);

  // Trend Chart State
  const [trendData, setTrendData] = useState([]);
  const [loadingTrend, setLoadingTrend] = useState(false);
  const [trendTimeRange, setTrendTimeRange] = useState(30);
  
  // Matrix data
  const [matrixData, setMatrixData] = useState([]);

  useEffect(() => {
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (selectedMaterial) {
      calculateAnalysis();
      fetchTrendData();
    }
  }, [selectedMaterial, selectedQuality, selectedUnit, selectedPriceType, comparisonPeriod, baseDate, currentDate]);

  useEffect(() => {
    if (selectedMaterial) {
      fetchTrendData();
    }
  }, [trendTimeRange]);
  
  useEffect(() => {
     if(materials.length > 0) {
        calculateMatrixData();
     }
  }, [materials]);

  const fetchMaterials = async () => {
    const [mats, grades, unitRes, types] = await Promise.all([
      supabase.from('raw_materials').select('id, name_en, name_hi, default_unit:rm_units(unit_name), default_unit_id, default_price_type_id').eq('active', true),
      supabase.from('material_quality_grades').select('id, grade_name, raw_material_id').eq('active', true),
      supabase.from('rm_units').select('id, unit_name').eq('active', true),
      supabase.from('rm_price_types').select('id, type_name').eq('active', true)
    ]);
    
    setMaterials(mats.data || []);
    setQualityGrades(grades.data || []);
    setUnits(unitRes.data || []);
    setPriceTypes(types.data || []);

    if (mats.data && mats.data.length > 0) {
      const firstMat = mats.data[0];
      setSelectedMaterial(firstMat.id);
      setSelectedUnit(firstMat.default_unit_id || '');
      setSelectedPriceType(firstMat.default_price_type_id || '');
    }
  };
  
  const calculateMatrixData = async () => {
    // A simplified matrix calculation for the UI
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const past30Str = format(subDays(new Date(), 30), 'yyyy-MM-dd');
    
    try {
        const { data: currentData } = await supabase
            .from('raw_material_price_entries')
            .select('raw_material_id, price, rm_units(unit_name)')
            .eq('entry_date', todayStr)
            .eq('is_deleted', false)
            .eq('status', 'Official');
            
        const { data: pastData } = await supabase
            .from('raw_material_price_entries')
            .select('raw_material_id, price')
            .gte('entry_date', past30Str)
            .eq('is_deleted', false)
            .eq('status', 'Official');
            
        const matrix = materials.slice(0, 5).map(mat => {
            const matCurr = currentData?.filter(d => d.raw_material_id === mat.id) || [];
            const matPast = pastData?.filter(d => d.raw_material_id === mat.id) || [];
            
            const currAvg = matCurr.length > 0 ? matCurr.reduce((sum, item) => sum + Number(item.price), 0) / matCurr.length : 0;
            const pastAvg = matPast.length > 0 ? matPast.reduce((sum, item) => sum + Number(item.price), 0) / matPast.length : 0;
            
            const diff = currAvg - pastAvg;
            const perc = pastAvg > 0 ? (diff / pastAvg) * 100 : 0;
            
            return {
                id: mat.id,
                name: mat.name_en,
                unit: matCurr[0]?.rm_units?.unit_name || 'kg',
                price: currAvg,
                diff,
                perc
            }
        });
        
        setMatrixData(matrix.filter(m => m.price > 0));
    } catch(err) {
        console.error("Matrix error", err);
    }
  }

  const fetchTrendData = async () => {
    if (!selectedMaterial) return;
    setLoadingTrend(true);
    
    let daysToFetch = 30;
    if (comparisonPeriod === '1month') daysToFetch = 30;
    else if (comparisonPeriod === '3months') daysToFetch = 90;
    else if (comparisonPeriod === '6months') daysToFetch = 180;
    else if (comparisonPeriod === '1year') daysToFetch = 365;
    
    try {
      const startDate = format(subDays(new Date(), daysToFetch), 'yyyy-MM-dd');
      let query = supabase
        .from('raw_material_price_entries')
        .select('entry_date, price')
        .eq('raw_material_id', selectedMaterial)
        .gte('entry_date', startDate)
        .eq('is_deleted', false)
        .eq('status', 'Official')
        .order('entry_date', { ascending: true });

      if (selectedQuality) query = query.eq('quality_grade_id', selectedQuality);
      else query = query.is('quality_grade_id', null);

      if (selectedUnit) query = query.eq('unit_id', selectedUnit);
      if (selectedPriceType) query = query.eq('price_type_id', selectedPriceType);

      const { data } = await query;

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

      let daysToFetch = 30;
      if (comparisonPeriod === '1month') daysToFetch = 30;
      else if (comparisonPeriod === '3months') daysToFetch = 90;
      else if (comparisonPeriod === '6months') daysToFetch = 180;
      else if (comparisonPeriod === '1year') daysToFetch = 365;

      calculatedBaseDate = format(subDays(today, daysToFetch), 'yyyy-MM-dd');

      // Fetch base date prices (or closest previous if none)
      let baseQuery = supabase
        .from('raw_material_price_entries')
        .select('price')
        .eq('raw_material_id', selectedMaterial)
        .gte('entry_date', calculatedBaseDate)
        .eq('is_deleted', false)
        .eq('status', 'Official')
        .order('entry_date', { ascending: true })
        .limit(20);

      if (selectedQuality) baseQuery = baseQuery.eq('quality_grade_id', selectedQuality);
      else baseQuery = baseQuery.is('quality_grade_id', null);
      if (selectedUnit) baseQuery = baseQuery.eq('unit_id', selectedUnit);
      if (selectedPriceType) baseQuery = baseQuery.eq('price_type_id', selectedPriceType);

      const { data: baseDataRes } = await baseQuery;
      
      // Fetch current date prices
      let currentQuery = supabase
        .from('raw_material_price_entries')
        .select('price, brokers(broker_name, mobile, whatsapp_number), market_location, created_at')
        .eq('raw_material_id', selectedMaterial)
        .eq('entry_date', currentDate)
        .eq('is_deleted', false)
        .eq('status', 'Official');

      if (selectedQuality) currentQuery = currentQuery.eq('quality_grade_id', selectedQuality);
      else currentQuery = currentQuery.is('quality_grade_id', null);
      if (selectedUnit) currentQuery = currentQuery.eq('unit_id', selectedUnit);
      if (selectedPriceType) currentQuery = currentQuery.eq('price_type_id', selectedPriceType);

      const { data: currentData } = await currentQuery;
      
      // Fetch entire period for stats
      let periodQuery = supabase
        .from('raw_material_price_entries')
        .select('price')
        .eq('raw_material_id', selectedMaterial)
        .gte('entry_date', calculatedBaseDate)
        .lte('entry_date', currentDate)
        .eq('is_deleted', false)
        .eq('status', 'Official');
        
      if (selectedQuality) periodQuery = periodQuery.eq('quality_grade_id', selectedQuality);
      else periodQuery = periodQuery.is('quality_grade_id', null);
      if (selectedUnit) periodQuery = periodQuery.eq('unit_id', selectedUnit);
      if (selectedPriceType) periodQuery = periodQuery.eq('price_type_id', selectedPriceType);

      const { data: periodData } = await periodQuery;

      const matInfo = materials.find(m => m.id === selectedMaterial);
      const unitInfo = units.find(u => u.id === selectedUnit);

      if (!baseDataRes?.length && !currentData?.length) {
        setAnalysisData(null);
        setInsufficientDataMsg('Insufficient comparable data for the selected period.');
        return;
      }

      setInsufficientDataMsg(null);

      const getAvg = (data) => data && data.length > 0 ? data.reduce((sum, item) => sum + Number(item.price), 0) / data.length : 0;
      const getMin = (data) => data && data.length > 0 ? Math.min(...data.map(i => Number(i.price))) : 0;
      const getMax = (data) => data && data.length > 0 ? Math.max(...data.map(i => Number(i.price))) : 0;
      
      // Standard deviation
      const calculateStdDev = (arr) => {
         if(!arr || arr.length === 0) return 0;
         const mean = arr.reduce((acc, val) => acc + Number(val.price), 0) / arr.length;
         const variance = arr.reduce((acc, val) => acc + Math.pow(Number(val.price) - mean, 2), 0) / arr.length;
         return Math.sqrt(variance);
      }

      // Group base data by first available date
      let baseAvg = 0;
      if (baseDataRes && baseDataRes.length > 0) {
         baseAvg = getAvg(baseDataRes); // Just taking average of earliest records
      }
      
      const currAvg = getAvg(currentData);
      const periodAvg = getAvg(periodData);
      const periodMin = getMin(periodData);
      const periodMax = getMax(periodData);
      const stdDev = calculateStdDev(periodData);
      
      const diff = currAvg - baseAvg;
      const perc = baseAvg > 0 ? (diff / baseAvg) * 100 : 0;
      
      const spread = periodMax - periodMin;
      const spreadPerc = periodMax > 0 ? (spread / periodMax) * 100 : 0;
      
      let volatilityStr = 'Low';
      if(stdDev > 2) volatilityStr = 'High';
      else if(stdDev > 0.5) volatilityStr = 'Moderate';

      setAnalysisData({
        materialNameEn: matInfo?.name_en || '',
        materialNameHi: matInfo?.name_hi || '',
        unit: unitInfo?.unit_name || matInfo?.default_unit?.unit_name || 'Unit',
        baseDateStr: format(new Date(calculatedBaseDate), 'dd MMM yyyy'),
        currDateStr: format(new Date(currentDate), 'dd MMM yyyy'),
        calculatedBaseDate,
        daysDiff: daysToFetch,
        baseAvg,
        currAvg,
        periodAvg,
        periodMin,
        periodMax,
        stdDev,
        volatilityStr,
        spread,
        spreadPerc,
        diff,
        perc,
        currCount: currentData?.length || 0,
      });

    } catch (error) {
      console.error("Analysis calculation error", error);
    } finally {
      setLoading(false);
    }
  };
  
  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-inverse-surface text-inverse-on-surface p-space-sm rounded-lg shadow-xl pointer-events-none flex flex-col gap-0.5 z-10 w-48">
          <div className="flex items-center justify-between border-b border-outline/30 pb-1">
            <span className="font-label-sm text-label-sm text-surface-variant font-medium">
                {format(parseISO(label), 'dd MMM yyyy')}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="font-label-sm text-label-sm text-surface-variant">Procured:</span>
            <span className="font-numeric-table text-numeric-table font-bold text-inverse-on-surface">
                ₹{Number(payload[0].value).toFixed(2)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col w-full space-y-space-md animate-fade-in pb-16">
      
      {/* Top Filter Bar */}
      <div className="w-full bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md w-full lg:w-auto">
          <div className="flex items-center gap-space-sm w-full sm:w-auto">
            <label className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold" htmlFor="commodity-select">Commodity Focus</label>
            <div className="relative inline-flex items-center flex-1 sm:flex-none">
              <select 
                className="appearance-none w-full sm:w-auto bg-surface-container-low text-on-surface font-label-lg text-label-lg pl-3 pr-8 py-1.5 rounded-lg focus:outline-none cursor-pointer border border-transparent focus:border-primary" 
                id="commodity-select"
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
              >
                {materials.map(m => (
                  <option key={m.id} value={m.id}>{m.name_en} {m.name_hi ? `(${m.name_hi})` : ''}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 text-on-surface-variant pointer-events-none text-[18px]">expand_more</span>
            </div>
          </div>
          
          {/* Quick Pills */}
          <div className="hidden lg:flex items-center gap-space-xs pl-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant">Pill Switch:</span>
            {materials.slice(0, 4).map(m => (
              <button 
                key={m.id}
                className={`px-space-xs py-1 rounded font-label-sm text-label-sm font-semibold transition-colors ${selectedMaterial === m.id ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} 
                type="button"
                onClick={() => setSelectedMaterial(m.id)}
              >
                {m.name_en.substring(0, 15)}{m.name_en.length > 15 ? '...' : ''}
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Period Filter */}
        <div className="flex items-center gap-space-md flex-wrap w-full sm:w-auto justify-between sm:justify-start">
          <div className="inline-flex rounded-lg bg-surface-container p-0.5 w-full sm:w-auto flex-wrap" role="group">
            <button className={`flex-1 sm:flex-none px-3 py-1 font-label-md text-label-md rounded transition-colors ${comparisonPeriod === '1month' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`} type="button" onClick={() => setComparisonPeriod('1month')}>1 Month</button>
            <button className={`flex-1 sm:flex-none px-3 py-1 font-label-md text-label-md rounded transition-colors ${comparisonPeriod === '3months' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`} type="button" onClick={() => setComparisonPeriod('3months')}>3 Months</button>
            <button className={`flex-1 sm:flex-none px-3 py-1 font-label-md text-label-md rounded transition-colors ${comparisonPeriod === '6months' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`} type="button" onClick={() => setComparisonPeriod('6months')}>6 Months</button>
            <button className={`flex-1 sm:flex-none px-3 py-1 font-label-md text-label-md rounded transition-colors ${comparisonPeriod === '1year' ? 'bg-surface-container-lowest text-primary font-semibold shadow-sm' : 'text-on-surface-variant hover:text-on-surface'}`} type="button" onClick={() => setComparisonPeriod('1year')}>1 Year</button>
          </div>
          <label className="flex items-center gap-space-xs cursor-pointer select-none">
            <input className="accent-primary h-3.5 w-3.5 rounded cursor-pointer" type="checkbox" disabled />
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">Compare Mandi APMC</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : insufficientDataMsg ? (
        <div className="bg-surface-container-lowest rounded-xl p-space-md text-center shadow-sm">
          <span className="material-symbols-outlined text-secondary text-4xl mb-2">query_stats</span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Insufficient Data</h3>
          <p className="font-body-md text-body-md text-on-surface-variant">{insufficientDataMsg}</p>
        </div>
      ) : analysisData ? (
        <>
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-space-sm">
            
            {/* Current */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between border-t-2 border-primary">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Current Procurement</span>
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-semibold">
                  <span className="material-symbols-outlined text-[12px]">verified</span> Spot
                </span>
              </div>
              <div className="my-space-xs">
                <div className="font-headline-lg text-headline-lg text-primary font-bold">
                  ₹{analysisData.currAvg.toFixed(2)}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal"> /{analysisData.unit}</span>
                </div>
              </div>
              <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                <span>As of {analysisData.currDateStr}</span>
              </div>
            </div>

            {/* Average */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Period Average ({analysisData.daysDiff}D)</span>
                <span className="material-symbols-outlined text-secondary text-[16px]">stacked_line_chart</span>
              </div>
              <div className="my-space-xs">
                <div className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  ₹{analysisData.periodAvg.toFixed(2)}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal"> /{analysisData.unit}</span>
                </div>
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                <span>Rolling Weighted Mean</span>
              </div>
            </div>

            {/* Spread */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">{analysisData.daysDiff}-Day Spread</span>
                <span className="font-numeric-table text-numeric-table text-secondary font-semibold">Δ ₹{analysisData.spread.toFixed(2)}</span>
              </div>
              <div className="my-space-xs flex items-baseline gap-space-sm justify-between">
                <div className="flex flex-col">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Min</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">₹{analysisData.periodMin.toFixed(2)}</span>
                </div>
                <span className="text-on-surface-variant">—</span>
                <div className="flex flex-col text-right">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Max</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">₹{analysisData.periodMax.toFixed(2)}</span>
                </div>
              </div>
              <div className="w-full bg-surface-container rounded-full h-1.5 overflow-hidden">
                <div className="bg-primary h-full rounded-full" style={{width: `${analysisData.spreadPerc > 100 ? 100 : analysisData.spreadPerc}%`}}></div>
              </div>
            </div>

            {/* Shift */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Period Shift</span>
                <span className={`material-symbols-outlined text-[18px] ${analysisData.diff >= 0 ? 'text-primary' : 'text-error'}`}>
                  {analysisData.diff >= 0 ? 'arrow_outward' : 'south_east'}
                </span>
              </div>
              <div className="my-space-xs">
                <div className={`font-headline-lg text-headline-lg font-bold ${analysisData.diff >= 0 ? 'text-primary' : 'text-error'}`}>
                  {analysisData.diff >= 0 ? '+' : ''}₹{analysisData.diff.toFixed(2)}
                  <span className="font-label-lg text-label-lg font-semibold ml-1">
                    ({analysisData.perc > 0 ? '+' : ''}{analysisData.perc.toFixed(2)}%)
                  </span>
                </div>
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                <span>Base: ₹{analysisData.baseAvg.toFixed(2)} on {analysisData.baseDateStr}</span>
              </div>
            </div>

            {/* Volatility */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Price Volatility</span>
                <span className={`px-1.5 py-0.5 rounded font-label-sm text-label-sm font-semibold ${
                  analysisData.volatilityStr === 'Low' ? 'bg-primary-fixed text-on-primary-fixed' : 
                  analysisData.volatilityStr === 'Moderate' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : 
                  'bg-error-container text-on-error-container'
                }`}>
                  {analysisData.volatilityStr}
                </span>
              </div>
              <div className="my-space-xs">
                <div className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  σ ₹{analysisData.stdDev.toFixed(2)}
                  <span className="font-body-sm text-body-sm text-on-surface-variant font-normal"> /{analysisData.unit}</span>
                </div>
              </div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">
                <span>Std Dev / Market Period</span>
              </div>
            </div>

          </div>

          {/* Main Chart */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md flex flex-col gap-space-sm">
            <div className="flex flex-wrap items-center justify-between gap-space-sm pb-space-xs">
              <div className="flex items-center gap-space-md">
                <div>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    {analysisData.materialNameEn} — Price Trajectory
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Daily realized purchase rate ({analysisData.baseDateStr} – {analysisData.currDateStr})
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-space-md">
                <div className="flex items-center gap-space-xs">
                  <span className="w-3.5 h-1 bg-surface-tint rounded-full inline-block"></span>
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">SL Actual Procurement (₹/{analysisData.unit})</span>
                </div>
              </div>
            </div>

            <div className="relative w-full h-80 bg-surface-container-lowest overflow-hidden select-none">
              {loadingTrend ? (
                <div className="flex justify-center items-center h-full text-secondary">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                  Loading trend...
                </div>
              ) : trendData.length === 0 ? (
                <div className="flex justify-center items-center h-full text-secondary">No trend data available for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#176b4d" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#176b4d" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bec9c1" strokeOpacity={0.35} />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(val) => format(parseISO(val), 'dd MMM')} 
                      tick={{ fill: '#3f4943', fontSize: 11, fontWeight: 500 }}
                      tickMargin={10}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => `₹${val.toFixed(2)}`}
                      tick={{ fill: '#3f4943', fontSize: 11, fontWeight: 500 }}
                      axisLine={false}
                      tickLine={false}
                      width={60}
                    />
                    <RechartsTooltip content={<CustomTooltip />} />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#176b4d" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorPrice)" 
                      activeDot={{ r: 6, fill: '#176b4d', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="flex items-center justify-between px-space-xs font-label-sm text-label-sm text-on-surface-variant pt-2 border-t border-surface-container-low">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-[16px] text-primary">info</span>
                <span>Procurement premium remains within standard mill delivery threshold.</span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span>Basis: Free on Truck (FOT) Warehouse</span>
              </div>
            </div>
          </div>
          
          {/* Cross Commodity Matrix */}
          {matrixData.length > 0 && (
          <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden">
            <div className="p-space-md flex flex-wrap items-center justify-between gap-space-sm bg-surface-container-low">
              <div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">Cross-Commodity Pricing Matrix</h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">Side-by-side feed ingredient metrics (30-day snapshot)</p>
              </div>
              <div className="flex items-center gap-space-xs">
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase font-semibold">Feed Formulation Standard:</span>
                <span className="font-label-sm text-label-sm font-semibold text-primary px-2 py-0.5 rounded bg-surface-container-lowest border border-outline-variant">Standard</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-high text-secondary uppercase font-label-md text-label-md">
                  <tr>
                    <th className="py-2.5 px-space-md">Raw Material</th>
                    <th className="py-2.5 px-space-md text-right">Current Price</th>
                    <th className="py-2.5 px-space-md text-right">30D Diff</th>
                    <th className="py-2.5 px-space-md">Signal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low font-body-md text-body-md">
                  {matrixData.map(m => (
                     <tr key={m.id} className="hover:bg-surface-container-low/50">
                        <td className="py-3 px-space-md font-semibold text-on-surface">{m.name}</td>
                        <td className="py-3 px-space-md text-right font-numeric-table text-numeric-table font-bold">₹{m.price.toFixed(2)}<span className="font-normal text-on-surface-variant text-sm">/{m.unit}</span></td>
                        <td className={`py-3 px-space-md text-right font-numeric-table text-numeric-table font-semibold ${m.diff > 0 ? 'text-primary' : m.diff < 0 ? 'text-error' : 'text-on-surface-variant'}`}>
                           {m.diff > 0 ? '+' : ''}₹{m.diff.toFixed(2)} ({m.perc > 0 ? '+' : ''}{m.perc.toFixed(1)}%)
                        </td>
                        <td className="py-3 px-space-md">
                           {m.diff > 1 ? (
                              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-semibold">
                                <span className="material-symbols-outlined text-[14px]">trending_up</span> Cost Warning
                              </span>
                           ) : m.diff < -1 ? (
                              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-semibold">
                                <span className="material-symbols-outlined text-[14px]">trending_down</span> Buy Signal
                              </span>
                           ) : (
                              <span className="inline-flex items-center gap-1 font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-semibold">
                                <span className="material-symbols-outlined text-[14px]">horizontal_rule</span> Stable
                              </span>
                           )}
                        </td>
                     </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

        </>
      ) : null}
    </div>
  );
};

export default PriceAnalysis;
