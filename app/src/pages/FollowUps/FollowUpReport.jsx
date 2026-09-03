import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Calendar, User, Search, RefreshCw } from 'lucide-react';
import DataTable from '../../components/DataTable';

export default function FollowUpReport({ searchQuery }) {
  // Date State (Defaults to 1st of current month to today)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const { data, error } = await supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, crm_status, city )`)
        .gte('due_at', start.toISOString())
        .lte('due_at', end.toISOString())
        .order('due_at', { ascending: false });

      if (error) throw error;
      setReportData(data || []);
    } catch (err) {
      console.error('Error fetching follow-up report:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    if (!searchQuery) return reportData;
    const q = searchQuery.toLowerCase();
    return reportData.filter(f => (
      f.reason?.toLowerCase().includes(q) ||
      f.notes?.toLowerCase().includes(q) ||
      f.crm_parties?.display_name?.toLowerCase().includes(q) ||
      f.crm_parties?.mobile?.includes(q) ||
      f.crm_parties?.city?.toLowerCase().includes(q)
    ));
  }, [reportData, searchQuery]);

  const columns = [
    {
      id: 'customer',
      header: 'Customer',
      renderCell: (item) => (
        <div className="flex flex-col gap-1">
          <Link 
            to={item.crm_parties?.crm_status === 'Lead' ? `/leads/${item.party_id}` : `/customers/${item.party_id}`} 
            className="font-semibold text-[15px] text-primary flex items-center gap-1.5 hover:underline"
          >
            <User size={14} /> {item.crm_parties?.display_name || 'Unknown'}
          </Link>
          {item.crm_parties?.mobile && (
             <span className="text-xs text-secondary">{item.crm_parties.mobile}</span>
          )}
        </div>
      )
    },
    {
      id: 'date',
      header: 'Follow-Up Date',
      renderCell: (item) => (
        <div className="flex flex-col gap-1">
          <span className="text-[14px] font-medium text-secondary">
            {item.due_at ? new Date(item.due_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
          </span>
          <span className="text-[12px] text-muted">
            {item.due_at ? new Date(item.due_at).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'}) : ''}
          </span>
        </div>
      )
    },
    {
      id: 'type',
      header: 'Type & Priority',
      renderCell: (item) => (
        <div className="flex flex-col gap-1.5 items-start">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-md font-medium border border-slate-200">
            {item.follow_up_type}
          </span>
          <span className={`text-[11px] font-bold ${item.priority === 'High' ? 'text-red-600' : 'text-slate-500'}`}>
            {item.priority?.toUpperCase()}
          </span>
        </div>
      )
    },
    {
      id: 'comment',
      header: 'Reason / Comment',
      renderCell: (item) => (
        <div className="max-w-xs">
          <div className="text-[14px] font-medium text-primary mb-0.5">{item.reason}</div>
          {item.notes && <div className="text-[13px] text-secondary line-clamp-2" title={item.notes}>{item.notes}</div>}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      renderCell: (item) => (
        <div className="flex flex-col items-start gap-1">
            <span className={`px-2.5 py-1 rounded-full text-[12px] font-semibold tracking-wide ${
            item.status === 'Completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            item.status === 'Cancelled' ? 'bg-red-50 text-red-700 border border-red-200' :
            'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
            {item.status}
            </span>
            {item.status === 'Completed' && item.completed_at && (
               <span className="text-[11px] text-emerald-600 font-medium">
                 {new Date(item.completed_at).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})}
               </span>
            )}
        </div>
      )
    }
  ];

  return (
    <div className="animate-fade-in flex flex-col space-y-6">
      {/* Filters & Metrics */}
      <div className="bg-white border border-base rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-base rounded-lg p-1.5 shadow-sm">
            <Calendar size={16} className="text-secondary ml-1" />
            <input 
              type="date" 
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-primary py-1 outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-slate-300 font-bold">-</span>
            <input 
              type="date" 
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-primary py-1 outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-outline bg-white shadow-sm h-[42px] px-3 flex items-center justify-center text-secondary hover:text-primary hover:bg-slate-50 transition-colors"
            onClick={fetchReport}
            title="Refresh Report"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex flex-col text-right">
            <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Total Follow-Ups</span>
            <span className="text-xl font-bold text-primary">{filteredData.length}</span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-base rounded-xl shadow-sm overflow-hidden flex flex-col mb-8">
        {loading ? (
           <div className="p-8 text-center text-secondary flex flex-col items-center gap-3">
             <RefreshCw size={24} className="animate-spin text-primary" />
             Generating report...
           </div>
        ) : filteredData.length === 0 ? (
           <div className="p-12 text-center flex flex-col items-center">
             <Search size={32} className="text-slate-300 mb-3" />
             <h3 className="text-lg font-semibold text-primary mb-1">No follow-ups found</h3>
             <p className="text-sm text-secondary max-w-sm mx-auto">
               Try adjusting your date range or search query to find more records.
             </p>
           </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={filteredData} 
            theadClassName="bg-slate-50 border-b border-base"
            tbodyClassName="divide-y divide-base"
          />
        )}
      </div>
    </div>
  );
}
