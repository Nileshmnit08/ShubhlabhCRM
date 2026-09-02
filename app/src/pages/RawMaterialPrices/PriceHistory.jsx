import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Download, Calendar, ArrowRight, ChevronLeft, ChevronRight, X, MapPin } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, subMonths, parseISO, isSameDay } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const PriceHistory = () => {
  const [searchParams] = useSearchParams();
  const initialMaterial = searchParams.get('material') || '';

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [materialFilter, setMaterialFilter] = useState(initialMaterial);
  const [brokerFilter, setBrokerFilter] = useState('');
  
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 50;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchInput), 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [dateRange, customStartDate, customEndDate, materialFilter, brokerFilter, debouncedSearch]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [mats, brks, history] = await Promise.all([
        supabase.from('raw_materials').select('id, name_en, name_hi').eq('active', true),
        supabase.from('brokers').select('id, broker_name').eq('active', true),
        supabase.from('raw_material_price_entries')
          .select(`
            *,
            raw_materials(name_en, name_hi),
            brokers(broker_name),
            material_quality_grades(grade_name),
            rm_units(unit_name),
            rm_price_types(type_name)
          `)
          .eq('is_deleted', false)
          .order('entry_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(5000) // fetch a large dataset for client-side filtering
      ]);
      
      setMaterials(mats.data || []);
      setBrokers(brks.data || []);
      setEntries(history.data || []);
    } catch (error) {
      console.error("Error fetching initial data", error);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredRows = useMemo(() => {
    let result = entries;
    const today = new Date();

    // 1. Date Range Filter
    if (dateRange !== 'all') {
      result = result.filter(entry => {
        const entryDate = parseISO(entry.entry_date);
        switch (dateRange) {
          case 'today':
            return isSameDay(entryDate, today);
          case '7days':
            return isWithinInterval(entryDate, { start: startOfDay(subDays(today, 6)), end: endOfDay(today) });
          case '30days':
            return isWithinInterval(entryDate, { start: startOfDay(subDays(today, 29)), end: endOfDay(today) });
          case '3months':
            return isWithinInterval(entryDate, { start: startOfDay(subMonths(today, 3)), end: endOfDay(today) });
          case 'custom':
            if (customStartDate && customEndDate) {
              const start = startOfDay(parseISO(customStartDate));
              const end = endOfDay(parseISO(customEndDate));
              if (start <= end) {
                return isWithinInterval(entryDate, { start, end });
              }
              return false; // Invalid range
            }
            return true; // Don't filter if dates are missing
          default:
            return true;
        }
      });
    }

    // 2. Material Filter
    if (materialFilter) {
      result = result.filter(e => e.raw_material_id === materialFilter);
    }

    // 3. Broker Filter
    if (brokerFilter) {
      result = result.filter(e => e.broker_id === brokerFilter);
    }

    // 4. Search Filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().replace(/\s+/g, ' ').trim();
      result = result.filter(e => 
        e.market_location?.toLowerCase().includes(q) ||
        e.remarks?.toLowerCase().includes(q) ||
        e.raw_materials?.name_en?.toLowerCase().includes(q) ||
        e.raw_materials?.name_hi?.toLowerCase().includes(q) ||
        e.brokers?.broker_name?.toLowerCase().includes(q) ||
        e.material_quality_grades?.grade_name?.toLowerCase().includes(q) ||
        format(parseISO(e.entry_date), 'dd MMM yyyy').toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, dateRange, customStartDate, customEndDate, materialFilter, brokerFilter, debouncedSearch]);

  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  
  // Reset if page out of bounds
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(1);
    }
  }, [totalPages, page]);

  const paginatedRows = useMemo(() => {
    const from = (page - 1) * pageSize;
    return filteredRows.slice(from, from + pageSize);
  }, [filteredRows, page]);

  const exportToCSV = () => {
    const headers = ['Date', 'Material', 'Quality', 'Broker', 'Location', 'Price', 'Unit', 'Type', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...filteredRows.map(e => [
        e.entry_date,
        `"${e.raw_materials?.name_en || ''}"`,
        `"${e.material_quality_grades?.grade_name || ''}"`,
        `"${e.brokers?.broker_name || ''}"`,
        `"${e.market_location || ''}"`,
        e.price,
        `"${e.rm_units?.unit_name || e.unit || ''}"`,
        `"${e.rm_price_types?.type_name || e.price_type || ''}"`,
        `"${e.remarks || ''}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `Price_History_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setDateRange('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setMaterialFilter('');
    setBrokerFilter('');
    setSearchInput('');
    setPage(1);
  };

  const isCustomDateInvalid = dateRange === 'custom' && customStartDate && customEndDate && parseISO(customStartDate) > parseISO(customEndDate);
  const hasActiveFilters = dateRange !== 'all' || materialFilter || brokerFilter || searchInput;

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-sm p-4 sm:p-5">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
          <div className="flex-1 w-full lg:min-w-[180px]">
            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar size={14} /> Date Range
            </label>
            <select 
              className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="3months">Last 3 Months</option>
              <option value="all">All Time</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          {dateRange === 'custom' && (
            <div className="flex gap-4 w-full lg:w-auto">
              <div className="flex-1 lg:w-[140px]">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">From</label>
                <input 
                  type="date" 
                  className={`w-full h-[42px] px-3 border ${isCustomDateInvalid ? 'border-red-500' : 'border-[#E2E8F0]'} rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow`} 
                  value={customStartDate} 
                  onChange={e => setCustomStartDate(e.target.value)} 
                />
              </div>
              <div className="flex-1 lg:w-[140px]">
                <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">To</label>
                <input 
                  type="date" 
                  className={`w-full h-[42px] px-3 border ${isCustomDateInvalid ? 'border-red-500' : 'border-[#E2E8F0]'} rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow`} 
                  value={customEndDate} 
                  onChange={e => setCustomEndDate(e.target.value)} 
                />
              </div>
            </div>
          )}

          <div className="flex-1 w-full lg:min-w-[180px]">
            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">Material</label>
            <select 
              className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]" 
              value={materialFilter} 
              onChange={e => setMaterialFilter(e.target.value)}
            >
              <option value="">All Materials</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
            </select>
          </div>
          
          <div className="flex-1 w-full lg:min-w-[180px]">
            <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">Broker</label>
            <select 
              className="w-full h-[42px] px-3 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white text-[#0F172A]" 
              value={brokerFilter} 
              onChange={e => setBrokerFilter(e.target.value)}
            >
              <option value="">All Brokers</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
            </select>
          </div>
          
          <div className="flex-[1.5] w-full lg:min-w-[220px]">
             <label className="text-xs font-semibold text-[#475569] uppercase tracking-wider mb-1.5 block">Search</label>
             <div className="relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
               <input 
                 type="text" 
                 placeholder="Search location, remarks..." 
                 className="w-full h-[42px] pl-9 pr-9 border border-[#E2E8F0] rounded-lg text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                 value={searchInput}
                 onChange={e => setSearchInput(e.target.value)}
               />
               {searchInput && (
                 <button 
                   onClick={() => setSearchInput('')}
                   className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-[#64748B] hover:bg-slate-100 rounded-full transition-colors"
                 >
                   <X size={14} />
                 </button>
               )}
             </div>
          </div>
          
          <button 
            className="h-[42px] px-5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors w-full lg:w-auto shrink-0" 
            onClick={exportToCSV}
            disabled={totalRecords === 0}
          >
            <Download size={18} /> <span className="lg:hidden">Export CSV</span>
          </button>
        </div>

        {/* Invalid Date Warning */}
        {isCustomDateInvalid && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200 font-medium flex items-center gap-2">
            Start date must be before or equal to end date.
          </div>
        )}

        {/* Active Filter Chips */}
        {hasActiveFilters && !isCustomDateInvalid && (
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-[#E2E8F0]">
            <span className="text-[13px] text-[#64748B] mr-1 font-medium">Active filters:</span>
            {dateRange !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]">
                Date: {dateRange === 'custom' ? 'Custom' : dateRange === 'today' ? 'Today' : dateRange.replace('days', ' Days').replace('months', ' Months')}
                <button onClick={() => setDateRange('all')} className="text-[#64748B] hover:text-[#0F172A] transition-colors"><X size={14}/></button>
              </span>
            )}
            {materialFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]">
                Material: {materials.find(m => m.id === materialFilter)?.name_en}
                <button onClick={() => setMaterialFilter('')} className="text-[#64748B] hover:text-[#0F172A] transition-colors"><X size={14}/></button>
              </span>
            )}
            {brokerFilter && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]">
                Broker: {brokers.find(b => b.id === brokerFilter)?.broker_name}
                <button onClick={() => setBrokerFilter('')} className="text-[#64748B] hover:text-[#0F172A] transition-colors"><X size={14}/></button>
              </span>
            )}
            {searchInput && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A]">
                Search: "{searchInput}"
                <button onClick={() => setSearchInput('')} className="text-[#64748B] hover:text-[#0F172A] transition-colors"><X size={14}/></button>
              </span>
            )}
            <button onClick={clearFilters} className="text-[13px] font-medium text-primary hover:underline ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Table Card */}
      <div className="data-table-container">
          <table className="data-table mobile-cards-table" style={{minWidth: '1000px'}}>
            <thead>
              <tr>
                <th style={{whiteSpace: 'nowrap'}}>Date</th>
                <th>Material</th>
                <th>Quality</th>
                <th>Broker</th>
                <th>Location</th>
                <th style={{textAlign: 'right'}}>Price</th>
                <th>Unit</th>
                <th>Type</th>
                <th style={{maxWidth: '200px'}}>Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-16 text-center">
                    <div className="flex flex-col items-center justify-center text-[#64748B]">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                      <p className="text-[15px] font-medium">Loading history...</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-0">
                    <div className="py-20 flex flex-col items-center justify-center text-center">
                      <div className="w-16 h-16 rounded-full bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] mb-5">
                        <Filter size={28} />
                      </div>
                      <h4 className="text-[17px] font-bold text-[#0F172A] mb-2">No price records found</h4>
                      <p className="text-[#64748B] text-[15px] max-w-sm mb-6">
                        {isCustomDateInvalid 
                          ? "The custom date range selected is invalid."
                          : "Try changing the date range, search term, or clearing one or more filters to see results."}
                      </p>
                      {hasActiveFilters && (
                        <button 
                          className="h-[42px] px-5 bg-white border border-[#E2E8F0] hover:bg-slate-50 text-[#0F172A] font-medium rounded-lg shadow-sm transition-colors"
                          onClick={clearFilters}
                        >
                          Clear filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map(entry => {
                  const typeName = entry.rm_price_types?.type_name || entry.price_type || '';
                  const isDelivered = typeName.toLowerCase().includes('delivered');
                  
                  return (
                    <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors group">
                      <td data-label="Date" className="whitespace-nowrap" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {format(parseISO(entry.entry_date), 'dd MMM yyyy')}
                      </td>
                      <td data-label="Material">
                        <div className="font-semibold text-primary text-[14.5px]">{entry.raw_materials?.name_en}</div>
                        {entry.raw_materials?.name_hi && (
                          <div className="text-[12.5px] text-secondary mt-0.5">{entry.raw_materials?.name_hi}</div>
                        )}
                      </td>
                      <td data-label="Quality" className="text-secondary text-[14.5px]">
                        <div className="truncate max-w-[120px]" title={entry.material_quality_grades?.grade_name || ''}>
                          {entry.material_quality_grades?.grade_name || <span className="text-muted">-</span>}
                        </div>
                      </td>
                      <td data-label="Broker" className="text-primary text-[14.5px]">{entry.brokers?.broker_name}</td>
                      <td data-label="Location" className="text-secondary text-[14.5px]">
                        {entry.market_location ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin size={14} className="text-muted shrink-0" />
                            <span className="truncate max-w-[120px]" title={entry.market_location}>{entry.market_location}</span>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td data-label="Price" className="text-right font-bold text-primary text-[15px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ₹{Number(entry.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td data-label="Unit" className="text-secondary text-[14.5px]">
                        {entry.rm_units?.unit_name || entry.unit}
                      </td>
                      <td data-label="Type">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[12px] font-semibold border ${isDelivered ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-violet-50 text-violet-700 border-violet-200'}`}>
                          {typeName}
                        </span>
                      </td>
                      <td data-label="Remarks" className="text-secondary text-[14px]">
                        <div className="truncate max-w-[180px]" title={entry.remarks || ''}>
                          {entry.remarks || <span className="text-muted">-</span>}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {!loading && totalRecords > 0 && (
          <div className="px-5 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto rounded-b-lg">
            <div className="text-[14px] text-[#64748B]">
              Showing <span className="font-semibold text-[#0F172A]">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-[#0F172A]">{Math.min(page * pageSize, totalRecords)}</span> of <span className="font-semibold text-[#0F172A]">{totalRecords}</span> records
            </div>
            <div className="flex items-center gap-1.5">
              <button 
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${page === 1 ? 'border-transparent text-[#94A3B8] cursor-not-allowed' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 shadow-sm'}`}
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={18} />
              </button>
              <div className="px-3 h-9 flex items-center justify-center text-[14px] font-medium text-[#475569]">
                Page {page} of {totalPages}
              </div>
              <button 
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${page === totalPages ? 'border-transparent text-[#94A3B8] cursor-not-allowed' : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 shadow-sm'}`}
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistory;
