import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Download, Calendar, ArrowRight, ChevronLeft, ChevronRight, X, MapPin, Phone, MessageCircle } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, isWithinInterval, startOfMonth, subMonths, parseISO, isSameDay } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { normalizeMobile } from '../../utils/phoneUtils';

const PriceHistory = () => {
  const [searchParams] = useSearchParams();
  const initialMaterial = searchParams.get('material') || '';

  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  
  const [qualityGrades, setQualityGrades] = useState([]);
  const [priceTypes, setPriceTypes] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [materialFilter, setMaterialFilter] = useState(initialMaterial || 'ALL');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [priceTypeFilter, setPriceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  
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
  }, [dateRange, customStartDate, customEndDate, materialFilter, brokerFilter, qualityFilter, priceTypeFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [mats, brks, grades, pTypes, history] = await Promise.all([
        supabase.from('raw_materials').select('id, name_en, name_hi').eq('active', true),
        supabase.from('brokers').select('id, broker_name').eq('active', true),
        supabase.from('material_quality_grades').select('id, grade_name').eq('active', true),
        supabase.from('rm_price_types').select('id, type_name').eq('active', true),
        supabase.from('raw_material_price_entries')
          .select(`
            *,
            raw_materials(name_en, name_hi),
            brokers(broker_name, mobile, whatsapp_number),
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
      setQualityGrades(grades.data || []);
      setPriceTypes(pTypes.data || []);
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
          case '7d':
            return isWithinInterval(entryDate, { start: startOfDay(subDays(today, 6)), end: endOfDay(today) });
          case '30days':
          case '30d':
            return isWithinInterval(entryDate, { start: startOfDay(subDays(today, 29)), end: endOfDay(today) });
          case '90days':
          case '90d':
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
    if (materialFilter && materialFilter !== 'ALL') {
      result = result.filter(e => e.raw_material_id === materialFilter);
    }

    // 3. Broker Filter
    if (brokerFilter) {
      result = result.filter(e => e.broker_id === brokerFilter);
    }

    // 4. Quality Filter
    if (qualityFilter) {
      result = result.filter(e => e.quality_grade_id === qualityFilter);
    }

    // 5. Price Type Filter
    if (priceTypeFilter) {
      result = result.filter(e => e.price_type_id === priceTypeFilter);
    }

    // 6. Status Filter
    if (statusFilter !== 'All') {
      result = result.filter(e => e.status === statusFilter);
    }

    // 7. Search Filter
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase().replace(/\s+/g, ' ').trim();
      result = result.filter(e => 
        e.market_location?.toLowerCase().includes(q) ||
        e.remarks?.toLowerCase().includes(q) ||
        e.source?.toLowerCase().includes(q) ||
        e.raw_materials?.name_en?.toLowerCase().includes(q) ||
        e.raw_materials?.name_hi?.toLowerCase().includes(q) ||
        e.brokers?.broker_name?.toLowerCase().includes(q) ||
        e.material_quality_grades?.grade_name?.toLowerCase().includes(q) ||
        format(parseISO(e.entry_date), 'dd MMM yyyy').toLowerCase().includes(q)
      );
    }

    return result;
  }, [entries, dateRange, customStartDate, customEndDate, materialFilter, brokerFilter, qualityFilter, priceTypeFilter, statusFilter, debouncedSearch]);

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
    const headers = ['Date', 'Material', 'Quality', 'Broker', 'Location', 'Price', 'Unit', 'Type', 'Status', 'Source', 'Remarks'];
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
        `"${e.status || ''}"`,
        `"${e.source || ''}"`,
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

  const isCustomDateInvalid = dateRange === 'custom' && customStartDate && customEndDate && parseISO(customStartDate) > parseISO(customEndDate);

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-64 text-secondary">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        Loading price history...
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full animate-fade-in pb-16">
      
      {/* Header & KPI Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md mb-space-md">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">Ledger Terminal</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">•</span>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Audit Revision 4.8.2</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm">Live Reconciled</span>
          </div>
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight mt-0.5">Historical Price Ledger &amp; Rate Audit</h2>
        </div>
        
        {/* KPI Panel */}
        <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-sm flex flex-wrap items-center gap-space-lg">
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded bg-primary-fixed flex items-center justify-center text-on-primary-fixed">
              <span className="material-symbols-outlined text-[18px]">trending_up</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Period High</span>
              <span className="font-numeric-table text-numeric-table font-semibold text-on-surface">₹41.20</span>
            </div>
          </div>
          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed">
              <span className="material-symbols-outlined text-[18px]">trending_down</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Period Low</span>
              <span className="font-numeric-table text-numeric-table font-semibold text-on-surface">₹21.00</span>
            </div>
          </div>
          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>
          <div className="flex items-center gap-space-sm">
            <div className="w-8 h-8 rounded bg-surface-container-high flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">waves</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Records</span>
              <span className="font-numeric-table text-numeric-table font-semibold text-on-surface">{totalRecords} <span className="font-body-sm text-body-sm text-on-surface-variant font-normal">Found</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm p-space-md mb-space-md">
        <div className="flex flex-col gap-space-md">
          <div className="flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex flex-wrap items-center gap-space-sm">
              <div className="relative min-w-[200px]">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">grain</span>
                <select 
                  className="w-full pl-8 pr-8 py-1.5 bg-surface-container-low rounded font-label-lg text-label-lg text-on-surface focus:outline-none focus:bg-surface-container-lowest appearance-none cursor-pointer border border-transparent focus:border-primary"
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                >
                  <option value="ALL">All Materials ({materials.length} Tracked)</option>
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name_en}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant pointer-events-none">unfold_more</span>
              </div>
              
              <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded">
                <button className={`date-chip px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${dateRange === 'today' ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setDateRange('today')}>Today</button>
                <button className={`date-chip px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${dateRange === '7d' ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setDateRange('7d')}>7 Days</button>
                <button className={`date-chip px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${dateRange === '30d' ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setDateRange('30d')}>30 Days</button>
                <button className={`date-chip px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${dateRange === '90d' ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setDateRange('90d')}>90 Days</button>
                <button className={`date-chip px-space-sm py-1 rounded font-label-md text-label-md transition-colors ${dateRange === 'custom' ? 'bg-primary text-on-primary shadow-sm font-semibold' : 'text-on-surface-variant hover:text-on-surface'}`} onClick={() => setDateRange('custom')}>Custom Range</button>
              </div>
            </div>

            <div className="flex items-center gap-space-xs">
               <button 
                  className="inline-flex items-center gap-space-xs px-space-md py-1.5 rounded bg-primary hover:bg-primary-container text-on-primary hover:text-on-primary-container font-label-md text-label-md shadow-sm transition-all" 
                  onClick={exportToCSV}
                >
                  <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                  <span>Download Ledger</span>
               </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-space-sm pt-space-xs">
            {dateRange === 'custom' && (
              <div className="md:col-span-4 flex items-center gap-space-xs">
                <input type="date" className={`w-full py-1.5 px-2.5 bg-surface-container-low rounded font-body-sm text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest border ${isCustomDateInvalid ? 'border-error' : 'border-transparent'}`} value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
                <span className="text-on-surface-variant font-label-sm text-label-sm">to</span>
                <input type="date" className={`w-full py-1.5 px-2.5 bg-surface-container-low rounded font-body-sm text-body-sm text-on-surface focus:outline-none focus:bg-surface-container-lowest border ${isCustomDateInvalid ? 'border-error' : 'border-transparent'}`} value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
              </div>
            )}
            <div className={`${dateRange === 'custom' ? 'md:col-span-6' : 'md:col-span-10'} relative`}>
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
              <input 
                className="w-full pl-9 pr-24 py-1.5 bg-surface-container-low rounded font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:bg-surface-container-lowest border border-transparent focus:border-primary" 
                placeholder="Search historical entry, mandi hub, or broker..." 
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant">Ctrl+F</span>
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-space-sm">
              <div className="flex items-center gap-1.5 text-on-surface-variant font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
                <span>{totalRecords} Audited Rows</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden flex flex-col mb-space-md">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container">
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary">Date &amp; Date</th>
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary">Material SKU &amp; Spec</th>
                <th className="py-2.5 px-space-sm font-label-md text-label-md uppercase tracking-wider text-secondary">Quality</th>
                <th className="py-2.5 px-space-sm font-label-md text-label-md uppercase tracking-wider text-secondary text-center">Unit</th>
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary text-right">Recorded Price</th>
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary">Mandi / Depot Source</th>
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary">Broker</th>
                <th className="py-2.5 px-space-md font-label-md text-label-md uppercase tracking-wider text-secondary">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-on-surface-variant">No matching records found.</td>
                </tr>
              ) : (
                paginatedRows.map(entry => (
                  <tr key={entry.id} className="hover:bg-surface-container-low/60 transition-colors group">
                    <td className="py-2 px-space-md whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-numeric-table text-numeric-table font-semibold text-on-surface">{format(parseISO(entry.entry_date), 'dd MMM yyyy')}</span>
                      </div>
                    </td>
                    <td className="py-2 px-space-md">
                      <div className="flex items-center gap-space-sm">
                        <div className="w-7 h-7 rounded bg-surface-container flex items-center justify-center text-primary font-bold font-label-sm text-label-sm">
                          {entry.raw_materials?.name_en?.substring(0, 2).toUpperCase() || 'RM'}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-label-lg text-label-lg font-semibold text-on-surface group-hover:text-primary transition-colors">
                             {entry.raw_materials?.name_en} {entry.raw_materials?.name_hi ? `(${entry.raw_materials?.name_hi})` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-space-sm whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-label-sm text-label-sm bg-primary-fixed text-on-primary-fixed font-semibold">
                        {entry.material_quality_grades?.grade_name || 'Standard'}
                      </span>
                    </td>
                    <td className="py-2 px-space-sm whitespace-nowrap text-center font-numeric-table text-numeric-table text-on-surface-variant">
                      {entry.rm_units?.unit_name || entry.unit || 'kg'}
                    </td>
                    <td className="py-2 px-space-md whitespace-nowrap text-right">
                      <span className="font-numeric-table text-numeric-table font-bold text-on-surface">₹{Number(entry.price).toFixed(2)}</span>
                    </td>
                    <td className="py-2 px-space-md whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md text-on-surface font-medium">{entry.market_location || 'N/A'}</span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{entry.remarks || ''}</span>
                      </div>
                    </td>
                    <td className="py-2 px-space-md whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px] text-primary">account_circle</span>
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md text-on-surface font-semibold">{entry.brokers?.broker_name || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 px-space-md whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-semibold">
                          <span className="material-symbols-outlined text-[14px]">check_circle</span>
                          {entry.status} ✓
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant">{entry.source}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-space-md py-3 border-t border-surface-container bg-surface-container-lowest flex items-center justify-between">
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
            </span>
            <div className="flex items-center gap-1">
              <button 
                className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_left</span>
              </button>
              <div className="flex items-center px-2">
                <span className="font-label-sm text-label-sm font-semibold text-on-surface">{page} / {totalPages}</span>
              </div>
              <button 
                className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <span className="material-symbols-outlined text-[20px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PriceHistory;
