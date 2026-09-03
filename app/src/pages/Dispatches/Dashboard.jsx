import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Link } from 'react-router-dom';
import { Truck, Package, Users, AlertCircle, CheckCircle2, Search, ArrowRight, X, Edit2, Trash2, Save, MessageCircle, Copy } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import DataTable from '../../components/DataTable';

export default function DispatchDashboard() {
  const { userProfile } = useContext(AuthContext);
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

  // Tab State
  const [activeTab, setActiveTab] = useState('Requirement-wise');

  // WhatsApp Modal State
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waSelectedReq, setWaSelectedReq] = useState(null);
  const [waMessage, setWaMessage] = useState('');
  const [whatsappSentStatus, setWhatsappSentStatus] = useState({});

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
            id, quantity, unit, product_type, expected_date,
            crm_parties (id, display_name, city, mobile, whatsapp)
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
        mobile: req.crm_parties?.whatsapp || req.crm_parties?.mobile || '',
        unit: req.unit || 'Bags',
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

  const handleOpenWhatsAppModal = async (reqRow) => {
    setWaSelectedReq(reqRow);
    setWaModalOpen(true);
    setWaMessage('Loading details...');
    
    try {
      const { data, error } = await supabase
        .from('requirement_dispatches')
        .select('*')
        .eq('requirement_id', reqRow.id)
        .not('status', 'in', '("Cancelled","Voided","Deleted","Reversed")')
        .order('dispatch_date', { ascending: false });
        
      if (error) throw error;
      
      const activeDispatches = data || [];
      
      const invoices = [...new Set(activeDispatches.map(d => d.invoice_number).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      const lrs = [...new Set(activeDispatches.map(d => d.lr_bilty_number).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      const trucks = [...new Set(activeDispatches.map(d => d.truck_number).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      const transporters = [...new Set(activeDispatches.map(d => d.transporter_name).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      
      const dispatchDatesArr = [...new Set(activeDispatches.map(d => d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString('en-GB') : null).filter(Boolean))];
      const dispatchDates = dispatchDatesArr.join(', ') || 'उपलब्ध नहीं';
      
      const drivers = [...new Set(activeDispatches.map(d => d.driver_name).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      const driverPhones = [...new Set(activeDispatches.map(d => d.driver_mobile).filter(Boolean))].join(', ') || 'उपलब्ध नहीं';
      
      const validityDate = reqRow.date ? new Date(reqRow.date).toLocaleDateString('en-GB') : 'उपलब्ध नहीं';
      const validityDetails = reqRow.date ? `कृपया ${validityDate} तक डिलीवरी की अपेक्षा करें।` : 'डिलीवरी जल्द ही अपेक्षित है।';

      const template = `नमस्कार ${reqRow.dealer} जी,

आपका ऑर्डर सफलतापूर्वक डिस्पैच कर दिया गया है।

ऑर्डर विवरण:
• उत्पाद: ${reqRow.product}
• डिस्पैच मात्रा: ${reqRow.cumulativeDispatched} ${reqRow.unit}
• बिल नंबर: ${invoices}
• LR/डिस्पैच नंबर: ${lrs}
• डिस्पैच दिनांक: ${dispatchDates}

वाहन विवरण:
• ड्राइवर का नाम: ${drivers}
• ड्राइवर मोबाइल नंबर: ${driverPhones}
• ट्रक/वाहन नंबर: ${trucks}
• ट्रांसपोर्टर: ${transporters}

डिलीवरी संबंधी विवरण:
${validityDetails}

कृपया वाहन/माल प्राप्त होने पर पुष्टि करें।

धन्यवाद,
Shubh Labh Team`;

      setWaMessage(template);
    } catch (err) {
      console.error(err);
      setWaMessage('Error loading dispatch details.');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!waSelectedReq || !waSelectedReq.mobile) return;
    
    let phone = String(waSelectedReq.mobile).replace(/\D/g, '');
    if (phone.length === 10) {
      phone = '91' + phone;
    }
    
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}`;
    window.open(url, '_blank');
    
    if (userProfile?.id) {
      try {
        await supabase.from('activity_logs').insert([{
          actor_id: userProfile.id,
          module: 'Dispatches',
          action_type: 'WHATSAPP_SENT',
          entity_type: 'requirements',
          entity_id: waSelectedReq.id,
          summary: `Dispatch WhatsApp confirmation initiated for ${waSelectedReq.product}`,
          metadata: {
            requirement_id: waSelectedReq.id,
            customer: waSelectedReq.dealer,
            mobile: phone,
            user_email: userProfile.email
          }
        }]);
      } catch (e) {
        console.error("Failed to log activity:", e);
      }
    }
    
    setWhatsappSentStatus(prev => ({
      ...prev,
      [waSelectedReq.id]: {
        time: new Date(),
        user: userProfile?.email?.split('@')[0] || 'User'
      }
    }));
    
    setWaModalOpen(false);
  };

  const getStatusBadgeClass = (status) => {
    if (status === 'Fully Dispatched' || status === 'Delivered') return 'badge-success';
    if (status === 'Partially Dispatched' || status === 'Dispatched') return 'badge-warning';
    if (status === 'Not Dispatched') return 'badge-secondary';
    if (status === 'Cancelled' || status === 'Voided' || status === 'Returned') return 'badge-danger';
    return 'badge-primary';
  };

  // --- Dispatch Report (Flat Data) Logic ---
  const flatReportData = React.useMemo(() => {
    let data = [...dispatches];
    
    // Sort newest first
    data.sort((a, b) => new Date(b.dispatch_date) - new Date(a.dispatch_date));

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      data = data.filter(d => {
        const dealer = d.requirements?.crm_parties?.display_name?.toLowerCase() || '';
        const product = d.requirements?.product_type?.toLowerCase() || '';
        const inv = d.invoice_number?.toLowerCase() || '';
        return dealer.includes(q) || product.includes(q) || inv.includes(q);
      });
    }
    
    return data;
  }, [dispatches, searchQuery]);

  const reportTotalQty = flatReportData.reduce((sum, d) => sum + Number(d.quantity || 0), 0);

  const reportColumns = [
    {
      id: 'customer',
      header: 'Customer',
      renderCell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-[14px] text-primary">{item.requirements?.crm_parties?.display_name || 'Unknown'}</span>
          <span className="text-xs text-secondary">{item.requirements?.crm_parties?.city || 'No Location'}</span>
        </div>
      )
    },
    {
      id: 'date',
      header: 'Dispatch Date',
      renderCell: (item) => (
        <span className="text-[14px] font-medium text-secondary">
          {item.dispatch_date ? new Date(item.dispatch_date).toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}
        </span>
      )
    },
    {
      id: 'product',
      header: 'Product',
      renderCell: (item) => (
        <span className="text-[14px] text-secondary">
          {item.requirements?.product_type || '-'}
        </span>
      )
    },
    {
      id: 'quantity',
      header: 'Quantity',
      renderCell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] font-bold text-primary">{Number(item.quantity).toLocaleString()}</span>
          <span className="text-[11px] text-muted">{item.requirements?.unit || 'Bags'}</span>
        </div>
      )
    },
    {
      id: 'bill',
      header: 'Bill / LR',
      renderCell: (item) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px]"><span className="text-muted">Inv:</span> {item.invoice_number || '-'}</span>
          <span className="text-[13px]"><span className="text-muted">LR:</span> {item.lr_bilty_number || '-'}</span>
        </div>
      )
    },
    {
      id: 'transport',
      header: 'Transport',
      renderCell: (item) => (
        <div className="flex flex-col gap-0.5 max-w-[150px] truncate" title={item.transporter_name}>
          <span className="text-[13px] font-medium">{item.transporter_name || '-'}</span>
          <span className="text-[12px] text-secondary">{item.truck_number || '-'}</span>
        </div>
      )
    },
    {
      id: 'status',
      header: 'Status',
      renderCell: (item) => (
        <span className={`badge ${getStatusBadgeClass(item.status)}`} style={{fontSize: '0.75rem', padding: '2px 6px'}}>
          {item.status}
        </span>
      )
    }
  ];

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

          {/* Tabs */}
          <div style={{display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto'}}>
            {['Requirement-wise', 'Dispatch Report'].map(tab => (
              <button 
                key={tab}
                className={`nav-item ${activeTab === tab ? 'active' : ''}`} 
                style={{
                  borderRadius: 0, 
                  padding: '0.75rem 1rem', 
                  whiteSpace: 'nowrap', 
                  border: 'none', 
                  background: 'transparent', 
                  cursor: 'pointer', 
                  fontWeight: activeTab === tab ? 600 : 500, 
                  color: activeTab === tab ? 'var(--primary)' : 'var(--text-secondary)', 
                  borderBottom: activeTab === tab ? '2px solid var(--primary)' : '2px solid transparent'
                }} 
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'Requirement-wise' ? 'Requirement-wise Dispatches' : 'Dispatch Report'}
              </button>
            ))}
          </div>

          {/* Table Container */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3 style={{ margin: 0 }}>
                {activeTab === 'Requirement-wise' ? 'Requirement-wise Dispatches' : 'Dispatch Report'}
              </h3>
              
              {activeTab === 'Dispatch Report' && (
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', background: 'var(--bg-base)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div className="text-right">
                    <div className="text-xs text-muted uppercase font-bold tracking-wide">Total Dispatches</div>
                    <div className="text-lg font-bold text-primary">{flatReportData.length}</div>
                  </div>
                  <div style={{ width: '1px', height: '32px', background: 'var(--border)' }}></div>
                  <div className="text-right">
                    <div className="text-xs text-muted uppercase font-bold tracking-wide">Total Quantity</div>
                    <div className="text-lg font-bold" style={{color: 'var(--success)'}}>{reportTotalQty.toLocaleString()}</div>
                  </div>
                </div>
              )}

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

            {activeTab === 'Dispatch Report' ? (
              flatReportData.length === 0 ? (
                 <div style={{ padding: '4rem 2rem', textAlign: 'center' }} className="text-muted">
                   No dispatches match your search or date filter.
                 </div>
              ) : (
                <DataTable 
                  columns={reportColumns} 
                  data={flatReportData} 
                  theadClassName="bg-slate-50 border-b border-base"
                  tbodyClassName="divide-y divide-base"
                />
              )
            ) : tableData.length === 0 ? (
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
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleViewDetails(row)}>
                              View Details <ArrowRight size={14} style={{marginLeft: '4px'}}/>
                            </button>
                            
                            {row.dispatchProgress === 'Fully Dispatched' && (
                              <>
                                <button 
                                  className="btn btn-sm" 
                                  style={{ background: '#25D366', color: '#fff', border: 'none', width: '100%', opacity: !row.mobile ? 0.5 : 1 }}
                                  onClick={() => handleOpenWhatsAppModal(row)}
                                  disabled={!row.mobile}
                                  title={!row.mobile ? "Customer WhatsApp number is not available." : "Send WhatsApp Confirmation"}
                                >
                                  <MessageCircle size={14} style={{marginRight: '4px'}}/> WhatsApp Confirmation
                                </button>
                                {whatsappSentStatus[row.id] && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '-4px' }}>
                                    <CheckCircle2 size={12} /> Sent
                                  </div>
                                )}
                              </>
                            )}
                          </div>
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

      {/* WhatsApp Modal */}
      {waModalOpen && waSelectedReq && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '500px', background: 'var(--bg-surface)', padding: '1.5rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#25D366' }}>
                <MessageCircle size={20} /> WhatsApp Confirmation
              </h3>
              <button className="btn-icon" onClick={() => setWaModalOpen(false)}><X size={20} /></button>
            </div>
            
            <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-base)', borderRadius: '8px', fontSize: '0.9rem' }}>
              <div><strong>Recipient:</strong> {waSelectedReq.dealer}</div>
              <div><strong>Number:</strong> {waSelectedReq.mobile}</div>
            </div>

            <textarea 
              value={waMessage} 
              onChange={e => setWaMessage(e.target.value)}
              style={{ width: '100%', height: '300px', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-base)', fontSize: '0.9rem', resize: 'vertical', fontFamily: 'inherit', lineHeight: '1.5' }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setWaModalOpen(false)}>Cancel</button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  navigator.clipboard.writeText(waMessage);
                  alert('Message copied to clipboard!');
                }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Copy size={16} /> Copy Message
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleSendWhatsApp}
                style={{ background: '#25D366', borderColor: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageCircle size={16} /> Open WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
