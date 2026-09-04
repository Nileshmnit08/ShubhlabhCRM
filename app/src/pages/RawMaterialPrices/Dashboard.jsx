import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { 
  Search, X, Plus, Activity, Package, Calendar, Filter, AlertCircle, Phone, MessageCircle
} from 'lucide-react';
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
    const todayStr = new Date().toISOString().split('T')[0];
    
    if (dateRange === 'today') {
      startDateStr = todayStr;
      endDateStr = todayStr;
    } else if (dateRange === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startDateStr = d.toISOString().split('T')[0];
      endDateStr = todayStr;
    } else if (dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startDateStr = d.toISOString().split('T')[0];
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
    <div className="card bg-slate-50/30 border border-base rounded-xl overflow-hidden flex flex-col mb-8 animate-fade-in shadow-sm">
      {/* 1. Header */}
      <div className="p-6 border-b border-base bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary">Raw Material Prices Dashboard</h2>
          <p className="text-sm text-secondary mt-1">Overview of market prices based on selected filters.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link to="/raw-material-prices/analysis" className="btn btn-secondary shadow-sm py-2 px-4 whitespace-nowrap flex items-center justify-center">
            <Activity size={16} className="mr-1.5" />
            Analysis
          </Link>
          <Link to="/raw-material-prices/daily-entry" className="btn btn-primary shadow-sm py-2 px-4 whitespace-nowrap flex items-center justify-center">
            <Plus size={16} className="mr-1.5" />
            Daily Entry
          </Link>
        </div>
      </div>

      {/* Filter Toolbar & Table Container */}
      <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-[500px]">
        <div className="bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col flex-1">
          
          {/* Filters */}
          <div className="p-4 bg-white border-b border-base flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full md:min-w-[180px]">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} /> Date Range
              </label>
              <select 
                className="w-full h-10 px-3 border border-base rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 text-primary font-medium"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>
            
            {dateRange === 'custom' && (
              <div className="flex gap-4 w-full md:w-auto">
                <div className="flex-1 md:w-[140px]">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">From</label>
                  <input 
                    type="date" 
                    className={`w-full h-10 px-3 border ${isCustomDateInvalid ? 'border-red-500' : 'border-base'} rounded-lg text-sm focus:ring-2 focus:ring-primary bg-slate-50 text-primary font-medium`}
                    value={customStartDate} 
                    onChange={e => setCustomStartDate(e.target.value)} 
                  />
                </div>
                <div className="flex-1 md:w-[140px]">
                  <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block">To</label>
                  <input 
                    type="date" 
                    className={`w-full h-10 px-3 border ${isCustomDateInvalid ? 'border-red-500' : 'border-base'} rounded-lg text-sm focus:ring-2 focus:ring-primary bg-slate-50 text-primary font-medium`}
                    value={customEndDate} 
                    onChange={e => setCustomEndDate(e.target.value)} 
                  />
                </div>
              </div>
            )}

            <div className="flex-1 w-full md:min-w-[180px]">
              <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Package size={14} /> Raw Material
              </label>
              <select 
                className="w-full h-10 px-3 border border-base rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-primary bg-slate-50 text-primary font-medium" 
                value={materialFilter} 
                onChange={e => setMaterialFilter(e.target.value)}
              >
                <option value="">All Materials</option>
                {materialsList.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
              </select>
            </div>
            
            <div className="relative w-full md:w-[250px]">
               <label className="text-xs font-semibold text-secondary uppercase tracking-wider mb-1.5 block opacity-0 hidden md:block">Search</label>
              <Search size={16} className="absolute left-3 top-[32px] md:top-[12px] -translate-y-1/2 text-muted" />
              <input 
                type="text"
                className="input w-full h-10 pl-9 border-base rounded-lg text-sm bg-slate-50"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-[32px] md:top-[12px] -translate-y-1/2 text-muted hover:text-primary"
                  onClick={() => setSearchQuery('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="data-table-container border-0 rounded-none w-full overflow-x-auto flex-1">
            <table className="data-table mobile-cards-table w-full min-w-[800px]">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Material</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Quality/Grade</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Broker</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider text-right">Price (₹)</th>
                  <th className="px-6 py-4 text-xs font-semibold text-secondary uppercase tracking-wider">Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-base">
                {tableLoading ? (
                  [1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-20 bg-slate-200 rounded ml-auto"></div></td>
                      <td className="px-6 py-4"><div className="h-4 w-12 bg-slate-200 rounded"></div></td>
                    </tr>
                  ))
                ) : tableError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 border border-red-100 mb-3 text-red-500">
                        <AlertCircle size={24} />
                      </div>
                      <h3 className="text-sm font-medium text-danger">Error Loading Data</h3>
                      <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">{tableError}</p>
                      <button onClick={fetchTableData} className="mt-4 btn btn-secondary btn-sm">Try Again</button>
                    </td>
                  </tr>
                ) : filteredPrices.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-50 border border-base mb-3 text-muted">
                        <Filter size={24} />
                      </div>
                      <h3 className="text-sm font-medium text-primary">No prices found</h3>
                      <p className="text-xs text-secondary mt-1 max-w-sm mx-auto">Try adjusting your date range or material filter to see more results.</p>
                    </td>
                  </tr>
                ) : (
                  filteredPrices.map((entry, idx) => {
                    let formattedDate = '-';
                    if (entry.entry_date) {
                      try {
                        formattedDate = format(parseISO(entry.entry_date), 'dd MMM yyyy');
                      } catch (e) {
                        formattedDate = 'Invalid Date';
                      }
                    }

                    const numPrice = Number(entry.price);
                    const formattedPrice = !isNaN(numPrice) && entry.price !== null 
                      ? `₹${numPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                      : '-';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4" data-label="Date">
                          <span className="font-medium text-slate-700">{formattedDate}</span>
                        </td>
                        <td className="px-6 py-4" data-label="Material">
                          <span className="font-medium text-primary">{entry.raw_materials?.name_en || '-'}</span>
                          {entry.raw_materials?.name_hi && <span className="text-secondary text-xs ml-1">({entry.raw_materials?.name_hi})</span>}
                        </td>
                        <td className="px-6 py-4 text-secondary" data-label="Quality/Grade">{entry.material_quality_grades?.grade_name || 'Standard'}</td>
                        <td className="px-6 py-4" data-label="Broker">
                          <div className="font-medium text-secondary mb-1.5">{entry.brokers?.broker_name || '-'}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            {entry.brokers?.mobile ? (
                              <>
                                <a 
                                  href={`tel:${normalizeMobile(entry.brokers.mobile)}`}
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-secondary bg-white border border-base hover:text-blue-600 hover:bg-blue-50 hover:border-blue-200 rounded-md transition-colors"
                                  title={`Call ${entry.brokers.broker_name}`}
                                >
                                  <Phone size={13} /> <span className="hidden sm:inline">Call</span>
                                </a>
                                <a 
                                  href={`https://wa.me/91${normalizeMobile(entry.brokers.whatsapp_number || entry.brokers.mobile)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-secondary bg-white border border-base hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-md transition-colors"
                                  title={`Message ${entry.brokers.broker_name} on WhatsApp`}
                                >
                                  <MessageCircle size={13} className="text-emerald-500" /> <span className="hidden sm:inline">WhatsApp</span>
                                </a>
                              </>
                            ) : (
                              <span className="inline-flex items-center text-[11px] text-muted h-[26px]">No valid phone number</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right" data-label="Price (₹)">
                          <div className="font-semibold text-primary">
                            {formattedPrice}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary text-sm" data-label="Unit">{entry.rm_units?.unit_name || '-'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!tableLoading && filteredPrices.length > 0 && (
            <div className="px-6 py-3 border-t border-base bg-slate-50 text-xs font-medium text-secondary text-right">
              Showing {filteredPrices.length} records
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
