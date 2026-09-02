import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Filter, Download, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, subDays, startOfMonth, subMonths } from 'date-fns';

const PriceHistory = () => {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [brokers, setBrokers] = useState([]);
  
  // Filters
  const [dateRange, setDateRange] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [materialFilter, setMaterialFilter] = useState('');
  const [brokerFilter, setBrokerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [page, dateRange, customStartDate, customEndDate, materialFilter, brokerFilter, searchQuery]);

  const fetchFilters = async () => {
    const [mats, brks] = await Promise.all([
      supabase.from('raw_materials').select('id, name_en, name_hi').eq('active', true),
      supabase.from('brokers').select('id, broker_name').eq('active', true)
    ]);
    setMaterials(mats.data || []);
    setBrokers(brks.data || []);
  };

  const fetchHistory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('raw_material_price_entries')
        .select(`
          *,
          raw_materials(name_en, name_hi),
          brokers(broker_name),
          material_quality_grades(grade_name)
        `, { count: 'exact' })
        .eq('is_deleted', false);

      // Apply date filters
      const today = new Date();
      if (dateRange === 'today') {
        query = query.eq('entry_date', format(today, 'yyyy-MM-dd'));
      } else if (dateRange === '7days') {
        query = query.gte('entry_date', format(subDays(today, 7), 'yyyy-MM-dd'));
      } else if (dateRange === '30days') {
        query = query.gte('entry_date', format(subDays(today, 30), 'yyyy-MM-dd'));
      } else if (dateRange === '3months') {
        query = query.gte('entry_date', format(subMonths(today, 3), 'yyyy-MM-dd'));
      } else if (dateRange === 'custom' && customStartDate && customEndDate) {
        query = query.gte('entry_date', customStartDate).lte('entry_date', customEndDate);
      }

      if (materialFilter) query = query.eq('raw_material_id', materialFilter);
      if (brokerFilter) query = query.eq('broker_id', brokerFilter);
      
      // Note: Full text search would require a specific DB function, we'll do basic ilike if needed or filter on client side if limited records. For real implementation, RPC or multiple ilike conditions.
      if (searchQuery) {
         // Simplifying search for UI demo, filtering on client if small enough, but here using a basic approach
         // Supabase doesn't easily do OR across joined tables without specific syntax or RPC.
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count, error } = await query
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Basic client-side search since joined table search is complex in PostgREST without views
      let processedData = data;
      if (searchQuery) {
         const q = searchQuery.toLowerCase();
         processedData = data.filter(item => 
           item.market_location?.toLowerCase().includes(q) ||
           item.remarks?.toLowerCase().includes(q) ||
           item.raw_materials?.name_en?.toLowerCase().includes(q) ||
           item.brokers?.broker_name?.toLowerCase().includes(q)
         );
      }

      setEntries(processedData || []);
      setTotalRecords(count || 0);
    } catch (error) {
      console.error("Error fetching history", error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    // Generate CSV logic here
    const headers = ['Date', 'Material', 'Quality', 'Broker', 'Location', 'Price', 'Unit', 'Type', 'Remarks'];
    const csvContent = [
      headers.join(','),
      ...entries.map(e => [
        e.entry_date,
        `"${e.raw_materials?.name_en || ''}"`,
        `"${e.material_quality_grades?.grade_name || ''}"`,
        `"${e.brokers?.broker_name || ''}"`,
        `"${e.market_location || ''}"`,
        e.price,
        e.unit,
        e.price_type,
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

  const totalPages = Math.ceil(totalRecords / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card bg-surface p-4">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-secondary mb-1 flex items-center gap-1">
              <Calendar size={14} /> Date Range
            </label>
            <select 
              className="input w-full"
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
            <>
              <div>
                <label className="text-xs font-medium text-secondary mb-1">From</label>
                <input type="date" className="input w-full" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-secondary mb-1">To</label>
                <input type="date" className="input w-full" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} />
              </div>
            </>
          )}

          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-secondary mb-1">Material</label>
            <select className="input w-full" value={materialFilter} onChange={e => setMaterialFilter(e.target.value)}>
              <option value="">All Materials</option>
              {materials.map(m => <option key={m.id} value={m.id}>{m.name_en}</option>)}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs font-medium text-secondary mb-1">Broker</label>
            <select className="input w-full" value={brokerFilter} onChange={e => setBrokerFilter(e.target.value)}>
              <option value="">All Brokers</option>
              {brokers.map(b => <option key={b.id} value={b.id}>{b.broker_name}</option>)}
            </select>
          </div>
          
          <div className="flex-[2] min-w-[200px]">
             <label className="text-xs font-medium text-secondary mb-1">Search</label>
             <div className="relative">
               <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
               <input 
                 type="text" 
                 placeholder="Search location, remarks..." 
                 className="input w-full pl-9"
                 value={searchQuery}
                 onChange={e => setSearchQuery(e.target.value)}
               />
             </div>
          </div>
          
          <button className="btn btn-outline flex items-center gap-2" onClick={exportToCSV}>
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card bg-surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-base/50 text-secondary text-sm">
                <th className="p-4 font-medium whitespace-nowrap">Date</th>
                <th className="p-4 font-medium min-w-[150px]">Material</th>
                <th className="p-4 font-medium min-w-[150px]">Quality</th>
                <th className="p-4 font-medium">Broker</th>
                <th className="p-4 font-medium">Location</th>
                <th className="p-4 font-medium text-right">Price</th>
                <th className="p-4 font-medium">Unit</th>
                <th className="p-4 font-medium">Type</th>
                <th className="p-4 font-medium min-w-[150px]">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-base">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-secondary">
                    <div className="flex justify-center mb-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                    Loading history...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-secondary">
                    No records found matching your filters.
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-base/30 text-sm">
                    <td className="p-4 whitespace-nowrap">{format(new Date(entry.entry_date), 'dd MMM yyyy')}</td>
                    <td className="p-4">
                      <div className="font-medium text-primary">{entry.raw_materials?.name_en}</div>
                      <div className="text-xs text-secondary">{entry.raw_materials?.name_hi}</div>
                    </td>
                    <td className="p-4 text-secondary">{entry.material_quality_grades?.grade_name || '-'}</td>
                    <td className="p-4">{entry.brokers?.broker_name}</td>
                    <td className="p-4 text-secondary">{entry.market_location || '-'}</td>
                    <td className="p-4 text-right font-semibold">₹{Number(entry.price).toLocaleString('en-IN')}</td>
                    <td className="p-4 text-secondary">{entry.unit}</td>
                    <td className="p-4 text-secondary">
                      <span className="px-2 py-0.5 bg-base rounded-md text-xs">{entry.price_type}</span>
                    </td>
                    <td className="p-4 text-secondary truncate max-w-[200px]" title={entry.remarks}>{entry.remarks || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="p-4 border-t border-base flex items-center justify-between">
            <div className="text-sm text-secondary">
              Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
            </div>
            <div className="flex gap-2">
              <button 
                className="btn btn-outline p-2" 
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-4 py-2 text-sm font-medium border border-base rounded-lg bg-base/50">
                Page {page} of {totalPages}
              </div>
              <button 
                className="btn btn-outline p-2" 
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceHistory;
