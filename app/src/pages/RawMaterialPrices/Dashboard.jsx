import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { normalizeMobile } from '../../utils/phoneUtils';

const Dashboard = () => {
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState(null);
  
  // Master Data for Selects
  const [materialsList, setMaterialsList] = useState([]);

  // Table Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  
  const [tableData, setTableData] = useState([]);
  
  useEffect(() => {
    fetchMaterialsList();
  }, []);

  useEffect(() => {
    fetchTableData();
  }, [dateRange, customStartDate, customEndDate, materialFilter]);

  const fetchMaterialsList = async () => {
    const { data } = await supabase.from('raw_materials').select('id, name_en').eq('active', true).order('name_en');
    setMaterialsList(data || []);
  };

  const fetchTableData = async () => {
    // Determine date boundaries
    let startDateStr = null;
    let endDateStr = null;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    
    if (dateRange === 'today') {
      startDateStr = todayStr;
      endDateStr = todayStr;
    } else if (dateRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDateStr = format(d, 'yyyy-MM-dd');
      endDateStr = todayStr;
    } else if (dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDateStr = format(d, 'yyyy-MM-dd');
      endDateStr = todayStr;
    } else if (dateRange === 'custom') {
      if (customStartDate && customEndDate) {
        startDateStr = customStartDate;
        endDateStr = customEndDate;
      } else {
        return; // wait for valid custom dates
      }
    } // if 'all', both remain null

    setTableLoading(true);
    setTableError(null);
    try {
      let query = supabase
        .from('raw_material_price_entries')
        .select(`
          *,
          raw_materials (name_en, name_hi, category),
          brokers (broker_name, mobile, whatsapp_number),
          material_quality_grades (grade_name),
          rm_units (unit_name),
          rm_price_types (type_name)
        `)
        .eq('is_deleted', false)
        .eq('status', 'Official')
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1000); // safety limit

      if (startDateStr) query = query.gte('entry_date', startDateStr);
      if (endDateStr) query = query.lte('entry_date', endDateStr);
      if (materialFilter) query = query.eq('raw_material_id', materialFilter);

      const { data, error } = await query;
      if (error) throw error;
      setTableData(data || []);
    } catch (error) {
      console.error('Error fetching table data:', error);
      setTableError(error.message || 'Failed to fetch market prices.');
      setTableData([]);
    } finally {
      setTableLoading(false);
    }
  };

  const filteredPrices = tableData.filter(entry => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      entry.raw_materials?.name_en?.toLowerCase().includes(q) ||
      entry.raw_materials?.name_hi?.toLowerCase().includes(q) ||
      entry.brokers?.broker_name?.toLowerCase().includes(q) ||
      entry.market_location?.toLowerCase().includes(q)
    );
  });

  const isCustomDateInvalid = dateRange === 'custom' && customStartDate && customEndDate && parseISO(customStartDate) > parseISO(customEndDate);

  return (
    <div className="flex flex-col w-full animate-fade-in">
      <div className="flex flex-col gap-space-md">
        
        {/* Top Action Bar & Time Filter */}
        <div className="flex flex-wrap items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-lg shadow-sm">
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs bg-surface-container-low px-space-md py-1.5 rounded">
              <span className="material-symbols-outlined text-primary text-[18px]">calendar_month</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant">Session Date:</span>
              <span className="font-label-lg text-label-lg font-semibold text-on-surface">{format(new Date(), 'dd MMM yyyy')}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">({format(new Date(), 'eeee')})</span>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm pl-space-xs">
              <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
              <span>Last Feed Refresh: <strong className="text-on-surface">{format(new Date(), 'hh:mm a')}</strong></span>
              <button className="ml-space-xs p-1 rounded hover:bg-surface-container transition-colors text-on-surface-variant hover:text-primary" onClick={fetchTableData} type="button">
                <span className="material-symbols-outlined text-[16px]">sync</span>
              </button>
            </div>
          </div>
          <div className="flex items-center gap-space-sm">
            <div className="relative group">
              <button 
                className={`flex items-center gap-1.5 px-space-md py-1.5 rounded font-label-md text-label-md transition-colors ${filteredPrices.length === 0 ? 'bg-surface-container-low text-on-surface-variant opacity-50 cursor-not-allowed' : 'bg-surface-container-low text-on-surface hover:bg-surface-container'}`} 
                type="button"
                disabled={filteredPrices.length === 0}
                title={filteredPrices.length === 0 ? "No rates available for the selected filters." : ""}
              >
                <span className="material-symbols-outlined text-[16px] text-secondary">file_download</span>
                <span>Export Rate Sheet</span>
                <span className="material-symbols-outlined text-[14px]">expand_more</span>
              </button>
            </div>
            {filteredPrices.length === 0 ? (
               <button 
                 className="flex items-center gap-1.5 px-space-md py-1.5 rounded font-label-md text-label-md font-semibold tracking-wide bg-primary text-on-primary opacity-50 cursor-not-allowed"
                 disabled
                 title="No rates available for the selected filters."
               >
                 <span className="material-symbols-outlined text-[18px]">send</span>
                 <span>Broadcast Rates via WhatsApp</span>
               </button>
            ) : (
               <Link to="/raw-material-prices/whatsapp" className="flex items-center gap-1.5 px-space-md py-1.5 rounded bg-primary text-on-primary hover:bg-surface-tint transition-colors shadow-sm font-label-md text-label-md font-semibold tracking-wide">
                 <span className="material-symbols-outlined text-[18px]">send</span>
                 <span>Broadcast Rates via WhatsApp</span>
               </Link>
            )}
          </div>
        </div>

        {/* Executive KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-md">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between relative ">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Active Commodities</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-xl text-headline-xl text-primary font-bold">{new Set(filteredPrices.map(p => p.raw_material_id)).size}</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Items Today</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">layers</span>
              </div>
            </div>
            <div className="mt-space-sm flex items-center gap-1.5 font-body-sm text-body-sm text-on-surface-variant">
              <span className={`inline-block w-2 h-2 rounded-full ${filteredPrices.length > 0 ? 'bg-primary' : 'bg-on-surface-variant'}`}></span>
              <span>{filteredPrices.length > 0 ? 'Mandi feeds connected & synced' : 'No records synced'}</span>
            </div>
          </div>
          
          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Daily Movement Split</span>
                <div className="flex items-center gap-space-sm mt-1">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-numeric-table text-numeric-table font-semibold">
                    No movement data
                  </span>
                </div>
              </div>
              <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[20px]">sync_alt</span>
              </div>
            </div>
            <div className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <span>Requires historical comparison</span>
            </div>
          </div>
          
          {/* Metric 3 */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-semibold">Avg Weighted Change</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-sm text-headline-sm text-on-surface-variant font-medium">No benchmark change available</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[20px]">trending_flat</span>
              </div>
            </div>
            <div className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <span>Insufficient data for selected period</span>
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between relative ">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary"></div>
            <div className="flex items-start justify-between pl-1">
              <div className="flex flex-col">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-tertiary font-semibold">Total Price Entries</span>
                <div className="flex items-baseline gap-space-xs mt-1">
                  <span className="font-headline-xl text-headline-xl text-on-surface font-bold">{filteredPrices.length}</span>
                  <span className="font-label-sm text-label-sm text-tertiary font-medium">Quotations</span>
                </div>
              </div>
              <div className="w-9 h-9 rounded bg-tertiary-fixed text-on-tertiary-fixed flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">lock_clock</span>
              </div>
            </div>
            <div className="mt-space-sm pl-1 font-body-sm text-body-sm text-on-surface-variant">
              <span>Based on selected date range</span>
            </div>
          </div>
        </div>

        {/* Main Content Grid: Table + Side Insights */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-md items-start">
          
          {/* Primary Market Rates Data Table (xl:col-span-9) */}
          <div className="xl:col-span-9 bg-surface-container-lowest rounded-lg shadow-sm ">
            
            {/* Table Toolbar */}
            <div className="p-space-md bg-surface-container-lowest flex flex-col gap-4 border-b border-outline-variant">
              <div className="flex flex-wrap items-center justify-between gap-space-sm">
                <div className="flex items-center gap-space-xs">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">Today's Benchmark Rates</span>
                  <span className="px-space-xs py-0.5 rounded bg-surface-container text-on-surface-variant font-label-sm text-label-sm font-medium">{filteredPrices.length} Verified Quotations</span>
                </div>
                <div className="flex items-center gap-space-xs">
                  <select 
                    className="h-8 px-2 border border-outline-variant rounded text-label-sm focus:ring-1 focus:ring-primary focus:border-primary bg-surface-container-lowest text-on-surface font-medium"
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                  >
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="all">All Time</option>
                    <option value="custom">Custom Range</option>
                  </select>
                  
                  {dateRange === 'custom' && (
                    <>
                      <input 
                        type="date" 
                        className={`h-8 px-2 border ${isCustomDateInvalid ? 'border-error' : 'border-outline-variant'} rounded text-label-sm focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface`}
                        value={customStartDate} 
                        onChange={e => setCustomStartDate(e.target.value)} 
                      />
                      <input 
                        type="date" 
                        className={`h-8 px-2 border ${isCustomDateInvalid ? 'border-error' : 'border-outline-variant'} rounded text-label-sm focus:ring-1 focus:ring-primary bg-surface-container-lowest text-on-surface`}
                        value={customEndDate} 
                        onChange={e => setCustomEndDate(e.target.value)} 
                      />
                    </>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                 <div className="relative flex-1 max-w-sm">
                    <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">search</span>
                    <input 
                      type="text"
                      className="w-full h-8 pl-8 pr-3 border border-outline-variant rounded text-body-sm bg-surface-container-lowest placeholder:text-on-surface-variant focus:outline-none focus:border-primary"
                      placeholder="Search commodity, grade, supplier..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
                 <select 
                    className="h-8 px-2 border border-outline-variant rounded text-body-sm focus:ring-1 focus:ring-primary focus:border-primary bg-surface-container-lowest text-on-surface min-w-[150px]" 
                    value={materialFilter} 
                    onChange={e => setMaterialFilter(e.target.value)}
                  >
                    <option value="">All Materials</option>
                    {materialsList.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
                  </select>
              </div>
            </div>

            {/* Dense Data Table */}
            <div className="overflow-x-auto min-h-[300px]">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-secondary font-label-md text-label-md uppercase tracking-wider">
                    <th className="py-2.5 px-space-md font-semibold">Commodity &amp; Grade</th>
                    <th className="py-2.5 px-space-sm font-semibold text-center">UoM</th>
                    <th className="py-2.5 px-space-sm font-semibold text-center">Date</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Today (₹)</th>
                    <th className="py-2.5 px-space-md font-semibold">Market Tone / Source</th>
                    <th className="py-2.5 px-space-sm font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {tableLoading ? (
                     <tr><td colSpan={6} className="py-8 text-center text-on-surface-variant">Loading market data...</td></tr>
                  ) : tableError ? (
                     <tr><td colSpan={6} className="py-8 text-center text-error">{tableError}</td></tr>
                  ) : filteredPrices.length === 0 ? (
                     <tr>
                      <td colSpan={6} className="py-12 text-center">
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-2">database</span>
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-1">No price entries</h3>
                          <p className="font-body-sm text-body-sm text-on-surface-variant mb-4 text-center">
                            {dateRange === 'today' ? "No price entries have been recorded for today." : "No price entries found for the selected filters."}
                          </p>
                          <div className="flex gap-2">
                            {dateRange === 'today' && (
                               <button 
                                  onClick={() => setDateRange('7days')} 
                                  className="btn btn-outline border-outline-variant hover:bg-surface-container-low text-on-surface text-label-sm px-4 py-1.5 rounded"
                               >
                                  View Last 7 Days
                               </button>
                            )}
                            <Link to="/raw-material-prices/daily-entry" className="btn btn-primary bg-primary text-on-primary hover:bg-surface-tint text-label-sm px-4 py-1.5 rounded flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              Add Price Entry
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredPrices.map(entry => (
                      <tr key={entry.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="py-2 px-space-md">
                          <div className="flex items-center gap-space-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                            <div className="flex flex-col">
                              <span className="font-label-lg text-label-lg font-semibold text-on-surface leading-tight">
                                {entry.raw_materials?.name_en} {entry.raw_materials?.name_hi ? `(${entry.raw_materials?.name_hi})` : ''}
                              </span>
                              <span className="font-label-sm text-label-sm text-on-surface-variant">
                                {entry.material_quality_grades?.grade_name || 'Standard'} • {entry.raw_materials?.category || 'General'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-space-sm text-center">
                          <span className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                            {entry.rm_units?.unit_name || 'kg'}
                          </span>
                        </td>
                        <td className="py-2 px-space-sm text-center font-numeric-table text-numeric-table text-on-surface-variant">
                          {format(parseISO(entry.entry_date), 'dd MMM yyyy')}
                        </td>
                        <td className="py-2 px-space-sm text-right font-numeric-table text-numeric-table font-bold text-on-surface text-[14px]">
                          {entry.price?.toFixed(2)}
                        </td>
                        <td className="py-2 px-space-md">
                          <div className="flex flex-col">
                            <span className="font-body-sm text-body-sm font-medium text-on-surface">{entry.brokers?.broker_name || '-'}</span>
                            <span className="font-label-sm text-label-sm text-on-surface-variant">{entry.market_location || 'N/A'}</span>
                          </div>
                        </td>
                        <td className="py-2 px-space-sm text-right">
                          <div className="flex items-center justify-end gap-1 text-on-surface-variant">
                            <Link to={`/raw-material-prices/history?material=${entry.raw_material_id}`} className="p-1 rounded hover:bg-surface-container hover:text-primary transition-colors" title="View History">
                              <span className="material-symbols-outlined text-[17px]">history</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer / Quick Summary Bar */}
            <div className="p-space-md bg-surface-container-low flex flex-wrap items-center justify-between gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
              <div className="flex items-center gap-space-md">
                <span>Showing <strong>{filteredPrices.length}</strong> of <strong>{tableData.length}</strong> commodities</span>
              </div>
              <Link to="/raw-material-prices/history" className="inline-flex items-center gap-1 font-label-md text-label-md text-primary font-semibold hover:underline">
                <span>Open Detailed History</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          </div>

          {/* Side/Lower Insights Panels (xl:col-span-3) */}
          <div className="xl:col-span-3 flex flex-col gap-space-md">
            {/* Mandi Arrivals & Key Commentary */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-[20px]">insights</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-bold">Mandi Arrivals</h2>
                </div>
                <span className="font-label-sm text-label-sm text-primary uppercase font-semibold bg-surface-container px-1.5 py-0.5 rounded">Active Session</span>
              </div>
              
              <div className="relative w-full h-32 rounded  bg-surface-container-low flex items-center justify-center">
                 <span className="material-symbols-outlined text-primary opacity-20 text-6xl">storefront</span>
                 <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 to-transparent flex flex-col justify-end p-space-sm">
                  <span className="font-label-sm text-label-sm text-inverse-on-surface uppercase font-semibold tracking-wider">Indore Hub</span>
                  <span className="font-body-sm text-body-sm text-inverse-on-surface/90">Moderate arrivals expected due to localized rain. Quality average.</span>
                 </div>
              </div>

              <div className="flex flex-col gap-space-sm mt-1">
                <div className="flex items-start gap-space-xs">
                  <span className="material-symbols-outlined text-error text-[16px] mt-0.5">warning</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Soybean Moisture Alert</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Incoming lots showing 14-16% moisture. Adjust bids accordingly.</span>
                  </div>
                </div>
                <div className="flex items-start gap-space-xs mt-2">
                  <span className="material-symbols-outlined text-primary text-[16px] mt-0.5">info</span>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface font-semibold">Maize Procurement Drive</span>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">Procurement target increased for Dewas plant this week.</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col gap-space-sm">
               <h3 className="font-label-md text-label-md uppercase text-on-surface-variant font-semibold tracking-wider mb-1">Quick Actions</h3>
               <Link to="/raw-material-prices/daily-entry" className="flex items-center gap-space-sm p-space-sm rounded border border-outline-variant hover:bg-surface-container-low hover:border-primary transition-all group">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                     <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="font-label-sm text-label-sm font-semibold text-on-surface">New Price Entry</span>
                     <span className="font-body-sm text-body-sm text-on-surface-variant">Record today's rates</span>
                  </div>
               </Link>
               <Link to="/raw-material-prices/analysis" className="flex items-center gap-space-sm p-space-sm rounded border border-outline-variant hover:bg-surface-container-low hover:border-primary transition-all group">
                  <div className="w-8 h-8 rounded bg-surface-container flex items-center justify-center group-hover:bg-primary group-hover:text-on-primary transition-colors">
                     <span className="material-symbols-outlined text-[18px]">analytics</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="font-label-sm text-label-sm font-semibold text-on-surface">Trend Analysis</span>
                     <span className="font-body-sm text-body-sm text-on-surface-variant">View historical charts</span>
                  </div>
               </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
