import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Truck, Package, Users, AlertCircle, CheckCircle2, Search, ArrowRight, X, Edit2, Trash2, Save } from 'lucide-react';

export default function DispatchDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data State
  const [dispatches, setDispatches] = useState([]);
  const [reqSummaryMap, setReqSummaryMap] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter State
  const [dateRange, setDateRange] = useState('This Month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Drilldown Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [selectedReqHistory, setSelectedReqHistory] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [editingDispatchId, setEditingDispatchId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, startDate, endDate]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Determine Date Range in YYYY-MM-DD
      const today = new Date();
      let startStr = null;
      let endStr = null;

      const pad = (n) => n.toString().padStart(2, '0');
      const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (dateRange === 'Today') {
        startStr = formatDate(today);
        endStr = startStr;
      } else if (dateRange === 'This Month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        startStr = formatDate(firstDay);
        endStr = formatDate(lastDay);
      } else if (dateRange === 'Last Month') {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        startStr = formatDate(firstDay);
        endStr = formatDate(lastDay);
      } else if (dateRange === 'Custom' && startDate && endDate) {
        startStr = startDate;
        endStr = endDate;
      }

      // 2. Query valid dispatches for the selected range
      let query = supabase
        .from('requirement_dispatches')
        .select(`
          *,
          requirements (
            id, quantity, product_type, expected_date,
            crm_parties (id, display_name, city)
          )
        `)
        .not('status', 'in', '("Cancelled","Voided","Deleted","Reversed")');

      if (startStr && endStr && dateRange !== 'All Time') {
        query = query.gte('dispatch_date', startStr).lte('dispatch_date', endStr);
      }

      const { data, error: qErr } = await query;
      if (qErr) throw qErr;
      
      const validDispatches = data || [];
      setDispatches(validDispatches);

      // 3. Fetch cumulative dispatch summary for the requirements involved
      const reqIds = [...new Set(validDispatches.map(d => d.requirement_id))].filter(Boolean);
      
      if (reqIds.length > 0) {
        const { data: summaryData, error: sErr } = await supabase
          .from('v_requirement_dispatch_summary')
          .select('*')
          .in('requirement_id', reqIds);
          
        if (sErr) throw sErr;
        
        const map = {};
        summaryData?.forEach(s => {
          map[s.requirement_id] = s;
        });
        setReqSummaryMap(map);
      } else {
        setReqSummaryMap({});
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // KPI Calculations (Based on the filtered dispatches only)
  const totalDispatches = dispatches.length;
  const dispatchedQty = dispatches.reduce((sum, d) => sum + Number(d.quantity || 0), 0);
  const uniqueDealers = new Set(dispatches.map(d => d.requirements?.crm_parties?.id).filter(Boolean)).size;
  const missingInfo = dispatches.filter(d => !d.lr_bilty_number || !d.invoice_number).length;
  
  // Fully Dispatched Reqs is based on the all-time cumulative summary
  const fullyDispatchedReqs = Object.values(reqSummaryMap).filter(s => s.dispatch_progress === 'Fully Dispatched').length;

  // Aggregate dispatches by requirement for the table
  const reqAggregation = {};
  dispatches.forEach(d => {
    const req = d.requirements;
    if (!req) return;
    
    if (!reqAggregation[req.id]) {
      const summary = reqSummaryMap[req.id] || {};
      reqAggregation[req.id] = {
        id: req.id,
        number: req.id.slice(0,8), // using slice since requirement_number is likely missing too
        date: req.expected_date,
        product: req.product_type,
        dealer: req.crm_parties?.display_name || 'Unknown',
        territory: req.crm_parties?.city || 'N/A', // fallback to city
        owner: 'N/A',
        requiredQty: Number(req.quantity || 0),
        cumulativeDispatched: Number(summary.total_dispatched_quantity || 0),
        pendingQty: Number(summary.pending_quantity || 0),
        dispatchProgress: summary.dispatch_progress || 'Not Dispatched',
        latestDispatchDate: summary.latest_dispatch_date,
        dispatchCount: 0,
        missingDocs: 0
      };
    }
    
    reqAggregation[req.id].dispatchCount += 1;
    if (!d.lr_bilty_number || !d.invoice_number) {
       reqAggregation[req.id].missingDocs += 1;
    }
  });

  const tableData = Object.values(reqAggregation).filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.number?.toLowerCase().includes(q) ||
      row.dealer.toLowerCase().includes(q) ||
      row.product?.toLowerCase().includes(q) ||
      row.territory.toLowerCase().includes(q)
    );
  });

  // Drill Down Modal Handlers
  const handleViewDetails = async (req) => {
    setSelectedReq(req);
    setModalOpen(true);
    setModalLoading(true);
    try {
      // Fetch ALL dispatches for this requirement, regardless of date filter
      const { data, error } = await supabase
        .from('requirement_dispatches')
        .select('*')
        .eq('requirement_id', req.id)
        .order('dispatch_date', { ascending: false });
        
      if (error) throw error;
      setSelectedReqHistory(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load dispatch history.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteDispatch = async (id) => {
    if (!window.confirm('Are you sure you want to delete this dispatch record?')) return;
    try {
      const { error } = await supabase.from('requirement_dispatches').delete().eq('id', id);
      if (error) throw error;
      handleViewDetails(selectedReq);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete record.');
    }
  };

  const handleEditClick = (dispatch) => {
    setEditingDispatchId(dispatch.id);
    setEditForm({
      quantity: dispatch.quantity || '',
      invoice_number: dispatch.invoice_number || '',
      lr_bilty_number: dispatch.lr_bilty_number || '',
      truck_number: dispatch.truck_number || '',
      transporter_name: dispatch.transporter_name || '',
      remarks: dispatch.remarks || ''
    });
  };

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase.from('requirement_dispatches')
        .update({
          quantity: editForm.quantity,
          invoice_number: editForm.invoice_number,
          lr_bilty_number: editForm.lr_bilty_number,
          truck_number: editForm.truck_number,
          transporter_name: editForm.transporter_name,
          remarks: editForm.remarks
        })
        .eq('id', editingDispatchId);
        
      if (error) throw error;
      setEditingDispatchId(null);
      handleViewDetails(selectedReq);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert('Failed to update record.');
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Fully Dispatched' || status === 'Delivered') return 'badge-success';
    if (status === 'Partially Dispatched' || status === 'Dispatched') return 'badge-warning';
    if (status === 'Not Dispatched') return 'badge-secondary';
    if (status === 'Cancelled' || status === 'Voided' || status === 'Returned') return 'badge-danger';
    return 'badge-primary';
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0}}>Dispatch Dashboard</h1>
          <p className="text-secondary">Requirement fulfillment and logistics overview.</p>
        </div>
      </div>

      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">Date Range</label>
          <select 
            value={dateRange} onChange={(e) => setDateRange(e.target.value)}
            style={{padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          >
            <option value="Today">Today</option>
            <option value="This Month">This Month</option>
            <option value="Last Month">Last Month</option>
            <option value="All Time">All Time</option>
            <option value="Custom">Custom Date Range</option>
          </select>
        </div>
        
        {dateRange === 'Custom' && (
          <>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">From</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem'}} className="text-muted">To</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                style={{padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
              />
            </div>
          </>
        )}
      </div>

      {error ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3>{error}</h3>
          <button className="btn btn-primary" onClick={fetchDashboardData}>Retry</button>
        </div>
      ) : loading ? (
        <div style={{textAlign: 'center', padding: '3rem'}} className="text-muted">Loading dispatch records...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '2rem'}}>
            <div className="cv-panel kpi-card" style={{padding: '1.25rem', borderLeft: '4px solid #3b82f6'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
                <Truck size={16}/> <span style={{fontSize: '0.85rem'}}>Total Dispatches</span>
              </div>
              <div style={{fontSize: '1.75rem', fontWeight: 700}}>{totalDispatches}</div>
            </div>
            <div className="cv-panel kpi-card" style={{padding: '1.25rem', borderLeft: '4px solid #10b981'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
                <Package size={16}/> <span style={{fontSize: '0.85rem'}}>Dispatched Qty</span>
              </div>
              <div style={{fontSize: '1.75rem', fontWeight: 700}}>{dispatchedQty.toLocaleString()}</div>
            </div>
            <div className="cv-panel kpi-card" style={{padding: '1.25rem', borderLeft: '4px solid #8b5cf6'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
                <Users size={16}/> <span style={{fontSize: '0.85rem'}}>Unique Dealers</span>
              </div>
              <div style={{fontSize: '1.75rem', fontWeight: 700}}>{uniqueDealers}</div>
            </div>
            <div className="cv-panel kpi-card" style={{padding: '1.25rem', borderLeft: '4px solid var(--danger)'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
                <AlertCircle size={16}/> <span style={{fontSize: '0.85rem'}}>Missing LR/Invoice</span>
              </div>
              <div style={{fontSize: '1.75rem', fontWeight: 700, color: missingInfo > 0 ? 'var(--danger)' : 'inherit'}}>{missingInfo}</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)'}}>Dispatch Records</div>
            </div>
            <div className="cv-panel kpi-card" style={{padding: '1.25rem', borderLeft: '4px solid #10b981'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}>
                <CheckCircle2 size={16}/> <span style={{fontSize: '0.85rem'}}>Fully Dispatched Reqs</span>
              </div>
              <div style={{fontSize: '1.75rem', fontWeight: 700}}>{fullyDispatchedReqs}</div>
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0 }}>Requirement-wise Dispatches</h3>
              <div style={{ position: 'relative', width: '250px' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search req, dealer, product..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}
                />
              </div>
            </div>

            {tableData.length === 0 ? (
               <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
                 {dispatches.length === 0 ? "No dispatches found for the selected date range." : "No requirements match your search."}
               </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Requirement</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Dealer & Location</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Required Qty</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Dispatched Qty (All-time)</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Pending Qty</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>LR/Inv Status</th>
                      <th style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.map(row => (
                      <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 600 }}>{row.number || 'N/A'}</div>
                          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{row.product}</div>
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div style={{ fontWeight: 500 }}>{row.dealer}</div>
                          <div className="text-secondary" style={{ fontSize: '0.85rem' }}>{row.territory}</div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{row.requiredQty.toLocaleString()}</td>
                        <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--primary)' }}>{row.cumulativeDispatched.toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}>{row.pendingQty.toLocaleString()}</td>
                        <td style={{ padding: '1rem' }}>
                          <span className={`badge ${getStatusBadgeClass(row.dispatchProgress)}`}>
                            {row.dispatchProgress}
                          </span>
                        </td>
                        <td style={{ padding: '1rem' }}>
                           {row.missingDocs === 0 ? (
                             <span style={{color: 'var(--success)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                               <CheckCircle2 size={14}/> Complete
                             </span>
                           ) : (
                             <span style={{color: 'var(--danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px'}}>
                               <AlertCircle size={14}/> Missing in {row.missingDocs}
                             </span>
                           )}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(row)}>
                            View Details <ArrowRight size={14} style={{marginLeft: '4px'}}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Drill-down Modal */}
      {modalOpen && selectedReq && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '1000px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--bg-surface)' }}>
            
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 1 }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>Dispatch History: {selectedReq.number || 'Requirement'}</h2>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }} className="text-secondary">
                  <span><strong>Dealer:</strong> {selectedReq.dealer}</span>
                  <span><strong>Product:</strong> {selectedReq.product}</span>
                  <span><strong>Status:</strong> <span className={`badge ${getStatusBadgeClass(selectedReq.dispatchProgress)}`} style={{fontSize: '0.75rem', padding: '2px 6px'}}>{selectedReq.dispatchProgress}</span></span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setModalOpen(false)}><X size={24} /></button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              {modalLoading ? (
                 <div style={{textAlign: 'center', padding: '2rem'}} className="text-muted">Loading dispatch history...</div>
              ) : selectedReqHistory.length === 0 ? (
                 <div style={{textAlign: 'center', padding: '2rem'}} className="text-muted">No valid dispatches recorded for this requirement.</div>
              ) : (
                 <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Dispatch Date</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Status</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Qty</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Invoice / LR</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Transporter & Vehicle</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Remarks</th>
                          <th style={{ padding: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReqHistory.map(historyItem => {
                           const isCancelled = ['Cancelled', 'Voided', 'Deleted', 'Reversed'].includes(historyItem.status);
                           const isEditing = editingDispatchId === historyItem.id;
                           return (
                             <tr key={historyItem.id} style={{ borderBottom: '1px solid var(--border)', opacity: isCancelled && !isEditing ? 0.6 : 1 }}>
                               <td style={{ padding: '0.75rem' }}>{new Date(historyItem.dispatch_date).toLocaleDateString()}</td>
                               <td style={{ padding: '0.75rem' }}>
                                 <span className={`badge ${getStatusBadgeClass(historyItem.status)}`} style={{fontSize: '0.75rem', padding: '2px 6px'}}>
                                   {historyItem.status}
                                 </span>
                               </td>
                               {isEditing ? (
                                 <>
                                   <td style={{ padding: '0.75rem' }}>
                                     <input type="number" value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} style={{width: '70px', padding: '4px', fontSize: '0.85rem'}} />
                                   </td>
                                   <td style={{ padding: '0.75rem' }}>
                                     <input type="text" placeholder="Invoice" value={editForm.invoice_number} onChange={e => setEditForm({...editForm, invoice_number: e.target.value})} style={{width: '100px', padding: '4px', fontSize: '0.85rem', marginBottom: '4px'}} />
                                     <input type="text" placeholder="LR" value={editForm.lr_bilty_number} onChange={e => setEditForm({...editForm, lr_bilty_number: e.target.value})} style={{width: '100px', padding: '4px', fontSize: '0.85rem'}} />
                                   </td>
                                   <td style={{ padding: '0.75rem' }}>
                                     <input type="text" placeholder="Transporter" value={editForm.transporter_name} onChange={e => setEditForm({...editForm, transporter_name: e.target.value})} style={{width: '100px', padding: '4px', fontSize: '0.85rem', marginBottom: '4px'}} />
                                     <input type="text" placeholder="Truck No" value={editForm.truck_number} onChange={e => setEditForm({...editForm, truck_number: e.target.value})} style={{width: '100px', padding: '4px', fontSize: '0.85rem'}} />
                                   </td>
                                   <td style={{ padding: '0.75rem' }}>
                                     <input type="text" value={editForm.remarks} onChange={e => setEditForm({...editForm, remarks: e.target.value})} style={{width: '120px', padding: '4px', fontSize: '0.85rem'}} />
                                   </td>
                                   <td style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                     <button className="btn-icon" style={{color: 'var(--success)'}} onClick={handleSaveEdit} title="Save"><Save size={16} /></button>
                                     <button className="btn-icon" style={{color: 'var(--text-muted)'}} onClick={() => setEditingDispatchId(null)} title="Cancel"><X size={16} /></button>
                                   </td>
                                 </>
                               ) : (
                                 <>
                                   <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                                     {Number(historyItem.quantity).toLocaleString()}
                                     {historyItem.return_quantity > 0 && <span style={{color: 'var(--danger)', fontSize: '0.75rem', display: 'block'}}>(-{historyItem.return_quantity} Ret)</span>}
                                   </td>
                                   <td style={{ padding: '0.75rem' }}>
                                     <div>Inv: {historyItem.invoice_number || <span className="text-muted">Missing</span>}</div>
                                     <div>LR: {historyItem.lr_bilty_number || <span className="text-muted">Missing</span>}</div>
                                   </td>
                                   <td style={{ padding: '0.75rem' }}>
                                     <div>{historyItem.transporter_name || 'N/A'}</div>
                                     <div className="text-secondary">{historyItem.truck_number}</div>
                                   </td>
                                   <td style={{ padding: '0.75rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={historyItem.remarks}>
                                     {historyItem.remarks || '-'}
                                   </td>
                                   <td style={{ padding: '0.75rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                     <button className="btn-icon" style={{color: 'var(--primary)', marginRight: '4px'}} onClick={() => handleEditClick(historyItem)} title="Edit"><Edit2 size={16} /></button>
                                     <button className="btn-icon" style={{color: 'var(--danger)'}} onClick={() => handleDeleteDispatch(historyItem.id)} title="Delete"><Trash2 size={16} /></button>
                                   </td>
                                 </>
                               )}
                             </tr>
                           )
                        })}
                      </tbody>
                    </table>
                 </div>
              )}
            </div>
            
            <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
               <div>Required Qty: {selectedReq.requiredQty.toLocaleString()}</div>
               <div style={{ color: 'var(--primary)' }}>Cumulative Dispatched: {selectedReq.cumulativeDispatched.toLocaleString()}</div>
               <div>Pending: {selectedReq.pendingQty.toLocaleString()}</div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
