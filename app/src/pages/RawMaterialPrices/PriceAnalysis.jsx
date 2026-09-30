import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, TrendingDown, Minus, CalendarDays, BarChart3, Info, Filter, Phone, MessageCircle } from 'lucide-react';
import { format, subDays, subMonths, subYears, parseISO, differenceInDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import { normalizeMobile } from '../../utils/phoneUtils';

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
        .select('price, brokers(broker_name, mobile, whatsapp_number), market_location, created_at')
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
        mobile: d.brokers?.mobile,
        whatsapp_number: d.brokers?.whatsapp_number,
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
    <div className="animate-fade-in pb-12">
      <div className="page-header mb-6">
        <h1 className="text-2xl font-bold text-primary">Price Analysis</h1>
      </div>

      <div className="card p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="w-full">
            <label className="block text-[13px] font-medium text-secondary mb-1.5">Material</label>
            <select className="input w-full" value={selectedMaterial} onChange={e => setSelectedMaterial(e.target.value)}>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name_en} {m.name_hi && `(${m.name_hi})`}</option>)}
            </select>
          </div>
          
          <div className="w-full">
            <label className="block text-[13px] font-medium text-secondary mb-1.5">Analysis Date</label>
            <input type="date" className="input w-full" value={currentDate} onChange={e => setCurrentDate(e.target.value)} />
          </div>

          <div className="w-full">
            <label className="block text-[13px] font-medium text-secondary mb-1.5">Compare With</label>
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
            <div className="w-full">
              <label className="block text-[13px] font-medium text-secondary mb-1.5">Base Date</label>
              <input type="date" className="input w-full" value={baseDate} onChange={e => setBaseDate(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center text-secondary">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
          <p className="text-sm font-medium">Analyzing market data...</p>
        </div>
      ) : analysisData ? (
        <div className="space-y-6">
          <div className="card p-6">

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Graphical Format */}
              <div className="card p-5">

                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={[
                        { name: analysisData.baseDateStr, price: analysisData.baseAvg > 0 ? analysisData.baseAvg : 0 },
                        { name: analysisData.currDateStr, price: analysisData.currAvg > 0 ? analysisData.currAvg : 0 }
                      ]} 
                      margin={{ top: 20, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} tickFormatter={val => `₹${val}`} width={60} />
                      <RechartsTooltip 
                        cursor={{ fill: 'var(--bg-base)' }} 
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
                        formatter={(value) => [`₹${value.toFixed(2)}`, 'Average Price']}
                      />
                      <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={80}>
                        {
                          [
                            { name: analysisData.baseDateStr, price: analysisData.baseAvg },
                            { name: analysisData.currDateStr, price: analysisData.currAvg }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? 'var(--text-muted)' : (analysisData.diff > 0 ? 'var(--danger)' : analysisData.diff < 0 ? 'var(--success)' : 'var(--primary)')} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Table Format */}
              <div className="card p-0 overflow-hidden flex flex-col justify-center">

                <div className="data-table-container border-0 rounded-none h-full">
                  <table className="data-table w-full h-full">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 bg-slate-50 text-xs font-semibold text-secondary uppercase tracking-wider">Metric</th>
                        <th className="px-4 py-3 bg-slate-50 text-xs font-semibold text-secondary uppercase tracking-wider">{analysisData.baseDateStr}</th>
                        <th className="px-4 py-3 bg-slate-50 text-xs font-semibold text-secondary uppercase tracking-wider">{analysisData.currDateStr}</th>
                        <th className="px-4 py-3 bg-slate-50 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base">
                      <tr>
                        <td className="px-4 py-4 font-semibold text-primary">Average Price</td>
                        <td className="px-4 py-4 text-secondary">{analysisData.baseAvg > 0 ? `₹${analysisData.baseAvg.toFixed(2)}` : 'N/A'}</td>
                        <td className="px-4 py-4 text-primary font-medium">{analysisData.currAvg > 0 ? `₹${analysisData.currAvg.toFixed(2)}` : 'N/A'}</td>
                        <td className={`px-4 py-4 text-right font-bold ${analysisData.diff > 0 ? 'text-danger' : analysisData.diff < 0 ? 'text-success' : 'text-secondary'}`}>
                          {analysisData.currAvg > 0 && analysisData.baseAvg > 0 ? `${analysisData.diff > 0 ? '+' : ''}₹${Math.abs(analysisData.diff).toFixed(2)}` : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-semibold text-primary">Percentage Change</td>
                        <td className="px-4 py-4 text-muted">-</td>
                        <td className="px-4 py-4 text-muted">-</td>
                        <td className={`px-4 py-4 text-right font-bold flex items-center justify-end gap-1 ${analysisData.diff > 0 ? 'text-danger' : analysisData.diff < 0 ? 'text-success' : 'text-secondary'}`}>
                          {analysisData.currAvg > 0 && analysisData.baseAvg > 0 ? (
                            <>
                              {analysisData.diff > 0 ? <TrendingUp size={16}/> : analysisData.diff < 0 ? <TrendingDown size={16}/> : <Minus size={16}/>}
                              {analysisData.diff > 0 ? '+' : ''}{analysisData.perc.toFixed(2)}%
                            </>
                          ) : '-'}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-4 font-semibold text-primary">Quotes Recorded</td>
                        <td className="px-4 py-4 text-secondary">{analysisData.baseCount}</td>
                        <td className="px-4 py-4 text-primary font-medium">{analysisData.currCount}</td>
                        <td className={`px-4 py-4 text-right font-semibold ${analysisData.currCount - analysisData.baseCount > 0 ? 'text-primary' : analysisData.currCount - analysisData.baseCount < 0 ? 'text-danger' : 'text-secondary'}`}>
                          {analysisData.currCount - analysisData.baseCount > 0 ? '+' : ''}{analysisData.currCount - analysisData.baseCount}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>

          {analysisData.brokerChartData && analysisData.brokerChartData.length > 0 && (
            <div className="card">
              <div className="p-5 border-b border-base flex justify-between items-center flex-wrap gap-3">
                <h3 className="font-semibold text-primary">Broker Quotes ({analysisData.currCount})</h3>
                {analysisData.currMin > 0 && analysisData.currMax > 0 && analysisData.currMin !== analysisData.currMax && (
                  <div className="text-sm text-secondary">
                    Market Range: <span className="font-semibold text-primary">₹{analysisData.currMin.toFixed(2)} - ₹{analysisData.currMax.toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="data-table-container border-0 rounded-none">
                <table className="data-table mobile-cards-table w-full">
                  <thead>
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Broker</th>
                      <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Time</th>
                      <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Price / {analysisData.unit.toLowerCase()}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-base">
                    {analysisData.brokerChartData.map((q, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4" data-label="Broker">
                          <div className="font-medium text-primary mb-1.5">{q.brokerName}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {q.mobile ? (
                              <>
                                <a 
                                  href={`tel:${normalizeMobile(q.mobile)}`}
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-secondary bg-white border border-base hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-md transition-colors"
                                  title={`Call ${q.brokerName}`}
                                >
                                  <Phone size={13} /> <span className="hidden sm:inline">Call</span>
                                </a>
                                <a 
                                  href={`https://wa.me/91${normalizeMobile(q.whatsapp_number || q.mobile)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-secondary bg-white border border-base hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-md transition-colors"
                                  title={`Message ${q.brokerName} on WhatsApp`}
                                >
                                  <MessageCircle size={13} className="text-emerald-500" /> <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                              </>
                            ) : (
                              <span className="inline-flex items-center text-[11px] text-muted h-[26px]">No valid phone number</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-secondary" data-label="Location">
                          {q.location || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted" data-label="Time">
                          {q.quoteTime || '-'}
                        </td>
                        <td className="px-6 py-4 text-right" data-label="Price">
                          <span className="font-semibold text-primary">₹{Number(q.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="font-semibold text-primary mb-4">Historical Trend</h3>
            <div className="h-[350px]">
              <PriceTrendChart 
                materials={materials}
                selectedMaterial={selectedMaterial}
                onMaterialChange={setSelectedMaterial}
                trendData={trendData}
                loading={loadingTrend}
                timeRange={trendTimeRange}
                onTimeRangeChange={setTrendTimeRange}
                hideTitle={true}
              />
            </div>
          </div>

        </div>
      ) : (
        <div className="card p-12 text-center text-secondary flex flex-col items-center justify-center">
          <p className="text-lg font-medium text-primary mb-1">No analysis ready</p>
          <p className="text-sm">Select a material and date range to view analysis.</p>
        </div>
      )}
    </div>
  );
};

export default PriceAnalysis;
