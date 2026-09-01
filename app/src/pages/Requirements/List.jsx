import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ClipboardList, Search, Filter, ChevronRight, AlertCircle, RefreshCw, XCircle, Trash2, MoreVertical, LayoutGrid, List as ListIcon, ChevronDown, ChevronUp, Plus, Edit } from 'lucide-react';
import CallAction from '../../components/CallAction';
import WhatsAppAction from '../../components/WhatsAppAction';
import { AuthContext } from '../../AuthContext';

export default function RequirementList() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
  // View Modes
  const [viewMode, setViewMode] = useState('customer');
  const [expandedCustomers, setExpandedCustomers] = useState(new Set());

  // Modal & Toast State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reqToDelete, setReqToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reqToCancel, setReqToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const [toast, setToast] = useState(null);
  const triggerRef = useRef(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  // URL Params State
  const [searchParams, setSearchParams] = useSearchParams();
  
  const statusFilter = searchParams.get('status') || 'All Open';
  const searchQuery = searchParams.get('q') || '';
  const ownerFilter = searchParams.get('owner') || 'All Owners';
  const dateField = searchParams.get('dateField') || 'expected_date';
  const dateRange = searchParams.get('dateRange') || 'All Time';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';
  const includeCompleted = searchParams.get('includeCompleted') === 'true';

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchRequirements();
  }, [statusFilter, ownerFilter, dateField, dateRange, startDate, endDate, includeCompleted]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Push filter changes to URL
  const updateFilter = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'All Open' && value !== 'All Owners' && value !== 'All Time' && value !== 'expected_date' && value !== 'false') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key === 'dateRange' && value !== 'Custom') {
      newParams.delete('startDate');
      newParams.delete('endDate');
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  async function fetchUsers() {
    try {
      const { data } = await supabase.from('v_board_requirements').select('assigned_to, owner_email').not('assigned_to', 'is', null);
      if (data) {
        const uniqueUsers = [];
        const map = new Map();
        for (const item of data) {
          if (!map.has(item.assigned_to)) {
            map.set(item.assigned_to, true);
            uniqueUsers.push({ id: item.assigned_to, email: item.owner_email });
          }
        }
        setUsers(uniqueUsers);
      }
    } catch (err) {
      console.error("Could not fetch users", err);
    }
  }

  async function fetchRequirements() {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('v_board_requirements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!includeCompleted) {
        query = query.eq('is_pending', true);
      }

      if (statusFilter === 'Overdue') {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('expected_date', today);
      } else if (statusFilter !== 'All Open' && statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      if (ownerFilter === 'My Requirements' && userProfile?.id) {
        query = query.eq('assigned_to', userProfile.id);
      } else if (ownerFilter === 'Unassigned') {
        query = query.is('assigned_to', null);
      } else if (ownerFilter !== 'All Owners') {
        query = query.eq('assigned_to', ownerFilter);
      }

      if (dateRange !== 'All Time') {
        const today = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const formatDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        
        let startStr = null;
        let endStr = null;

        if (dateRange === 'Today') {
          startStr = formatDateStr(today);
          endStr = startStr;
        } else if (dateRange === 'Tomorrow') {
          const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
          startStr = formatDateStr(tmrw);
          endStr = startStr;
        } else if (dateRange === 'This Week') {
          const first = today.getDate() - today.getDay();
          startStr = formatDateStr(new Date(today.setDate(first)));
          endStr = formatDateStr(new Date(today.setDate(first + 6)));
        } else if (dateRange === 'Next 7 Days') {
          startStr = formatDateStr(today);
          const next = new Date(today); next.setDate(next.getDate() + 7);
          endStr = formatDateStr(next);
        } else if (dateRange === 'This Month') {
          startStr = formatDateStr(new Date(today.getFullYear(), today.getMonth(), 1));
          endStr = formatDateStr(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        } else if (dateRange === 'Custom' && startDate && endDate) {
          startStr = startDate;
          endStr = endDate;
        } else if (dateRange === 'Overdue') {
          endStr = formatDateStr(today);
        }

        if (startStr && dateRange !== 'Overdue') query = query.gte(dateField, startStr);
        if (endStr && dateRange !== 'Overdue') query = query.lte(dateField, endStr);
        if (dateRange === 'Overdue') query = query.lt(dateField, endStr);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequirements(data || []);
      
      // Auto-expand customers with overdue requirements
      if (data && data.length > 0) {
        const newExpanded = new Set();
        data.forEach(req => {
          const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
          if (isOverdue) {
            newExpanded.add(req.party_id || req.customer_name);
          }
        });
        setExpandedCustomers(newExpanded);
      }

    } catch (err) {
      console.error("fetchRequirements caught error:", err);
      setError('Failed to load requirements. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const toggleExpand = (customerId) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  // --- Delete Flow ---
  const openDeleteModal = (e, req) => {
    e.preventDefault();
    e.stopPropagation();
    triggerRef.current = e.currentTarget;
    setReqToDelete(req);
    setDeleteModalOpen(true);
    setOpenMenuId(null);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setReqToDelete(null);
    if (triggerRef.current) triggerRef.current.focus();
  };

  const executeDelete = async () => {
    if (!reqToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('requirements').delete().eq('id', reqToDelete.id);
      if (error) throw error;
      
      setToast({ type: 'success', message: 'Requirement deleted. Other customer requirements are unchanged.' });
      setRequirements(prev => prev.filter(r => r.id !== reqToDelete.id));
      closeDeleteModal();
    } catch (err) {
      console.error("Delete Error:", err);
      setToast({ type: 'error', message: 'Could not delete requirement. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Cancel Flow ---
  const openCancelModal = (e, req) => {
    e.preventDefault();
    e.stopPropagation();
    triggerRef.current = e.currentTarget;
    setReqToCancel(req);
    setCancelReason('');
    setCancelModalOpen(true);
    setOpenMenuId(null);
  };

  const closeCancelModal = () => {
    setCancelModalOpen(false);
    setReqToCancel(null);
    if (triggerRef.current) triggerRef.current.focus();
  };

  const executeCancel = async () => {
    if (!reqToCancel) return;
    setIsCancelling(true);
    try {
      const { error } = await supabase
        .from('requirements')
        .update({ status: 'Cancelled' })
        .eq('id', reqToCancel.id);
        
      if (error) throw error;
      
      setToast({ type: 'success', message: 'Requirement cancelled successfully.' });
      // If we are not including completed/cancelled, remove it from view
      if (!includeCompleted) {
        setRequirements(prev => prev.filter(r => r.id !== reqToCancel.id));
      } else {
        fetchRequirements(); // Reload to get updated view state
      }
      closeCancelModal();
    } catch (err) {
      console.error("Cancel Error:", err);
      setToast({ type: 'error', message: 'Could not cancel requirement. Please try again.' });
    } finally {
      setIsCancelling(false);
    }
  };

  // --- Filtering ---
  const filteredRequirements = requirements.filter(req => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.customer_name?.toLowerCase().includes(q) ||
      req.product_type?.toLowerCase().includes(q) ||
      req.customer_city?.toLowerCase().includes(q)
    );
  });

  // --- Grouping for Customer View ---
  const groupedCustomers = [];
  if (viewMode === 'customer') {
    const map = new Map();
    filteredRequirements.forEach(req => {
      const pid = req.party_id || `unknown-${req.customer_name}`;
      if (!map.has(pid)) {
        map.set(pid, {
          party_id: req.party_id,
          customer_name: req.customer_name || 'Unknown Customer',
          customer_city: req.customer_city || '',
          customer_mobile: req.customer_mobile,
          customer_whatsapp: req.customer_whatsapp,
          requirements: [],
          total_qty: 0,
          earliest_date: null,
          has_overdue: false,
          has_high_priority: false,
          owner_email: req.owner_email || 'Unassigned',
          products: new Set()
        });
      }
      const group = map.get(pid);
      group.requirements.push(req);
      group.total_qty += Number(req.required_quantity) || 0;
      group.products.add(req.product_type);
      
      const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
      if (isOverdue) group.has_overdue = true;
      if (req.priority === 'High' || req.priority === 'Urgent') group.has_high_priority = true;
      
      if (req.expected_date) {
        if (!group.earliest_date || new Date(req.expected_date) < new Date(group.earliest_date)) {
          group.earliest_date = req.expected_date;
        }
      }
    });

    groupedCustomers.push(...Array.from(map.values()));
    
    groupedCustomers.sort((a, b) => {
      if (a.has_overdue !== b.has_overdue) return a.has_overdue ? -1 : 1;
      const todayStr = new Date().toDateString();
      const aDueToday = a.earliest_date && new Date(a.earliest_date).toDateString() === todayStr;
      const bDueToday = b.earliest_date && new Date(b.earliest_date).toDateString() === todayStr;
      if (aDueToday !== bDueToday) return aDueToday ? -1 : 1;
      if (a.has_high_priority !== b.has_high_priority) return a.has_high_priority ? -1 : 1;
      
      if (a.earliest_date && b.earliest_date) return new Date(a.earliest_date) - new Date(b.earliest_date);
      if (a.earliest_date) return -1;
      if (b.earliest_date) return 1;
      return 0;
    });
  }

  // --- Formatting Helpers ---
  const getStatusBadge = (status) => {
    if (status === 'Identified') return 'badge badge-dormant';
    if (status === 'Engaged' || status === 'Qualified') return 'badge badge-active';
    if (status === 'Commercial Intent') return 'badge badge-warning';
    if (status === 'Won' || status === 'Dispatched' || status === 'Fulfilled' || status === 'Completed') return 'badge badge-success';
    if (status === 'Lost' || status === 'Cancelled') return 'badge badge-danger';
    if (status === 'On Hold') return 'badge badge-neutral';
    return 'badge';
  };

  const formatRate = (rate) => {
    if (!rate) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(rate);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-GB', options);
  };

  const getFriendlyDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    date.setHours(0,0,0,0);
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    if (diffDays <= 7 && diffDays > 1) return `Due in ${diffDays} days`;
    
    return formatDate(dateString);
  };

  const getPriorityColor = (priority) => {
    if (priority === 'High' || priority === 'Urgent') return 'var(--danger)';
    if (priority === 'Normal') return 'var(--warning)';
    return 'var(--primary)'; // Low/Neutral
  };

  const activeFilterCount = Array.from(searchParams.keys()).length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0}}>Requirements Board</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            {viewMode === 'customer' ? (
              <span>{groupedCustomers.length} customers • {filteredRequirements.length} active requirements</span>
            ) : (
              <span>Showing {filteredRequirements.length} {includeCompleted ? 'total' : 'active'} requirements</span>
            )}
          </p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px'}}>
            <button 
              onClick={() => setViewMode('customer')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                border: 'none', background: viewMode === 'customer' ? 'var(--primary)' : 'transparent', color: viewMode === 'customer' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <ListIcon size={14} /> Customer View
            </button>
            <button 
              onClick={() => setViewMode('requirement')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                border: 'none', background: viewMode === 'requirement' ? 'var(--primary)' : 'transparent', color: viewMode === 'requirement' ? '#fff' : 'var(--text-secondary)'
              }}
            >
              <LayoutGrid size={14} /> Flat List
            </button>
          </div>
          <Link to="/customers" className="btn btn-primary">
            <Plus size={16}/> Add Requirement
          </Link>
        </div>
      </div>

      {/* Quick Filter Chips */}
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '4px'}}>
        <button onClick={() => { clearFilters(); updateFilter('status', 'All Open'); }} className={`badge ${statusFilter === 'All Open' ? 'badge-primary' : 'badge-neutral'}`} style={{cursor: 'pointer'}}>All active</button>
        <button onClick={() => updateFilter('status', 'Overdue')} className={`badge ${statusFilter === 'Overdue' ? 'badge-danger' : 'badge-neutral'}`} style={{cursor: 'pointer'}}>Overdue</button>
        <button onClick={() => updateFilter('dateRange', 'Today')} className={`badge ${dateRange === 'Today' ? 'badge-warning' : 'badge-neutral'}`} style={{cursor: 'pointer'}}>Due today</button>
        <button onClick={() => updateFilter('owner', 'My Requirements')} className={`badge ${ownerFilter === 'My Requirements' ? 'badge-primary' : 'badge-neutral'}`} style={{cursor: 'pointer'}}>My requirements</button>
      </div>

      {/* Filters Toolbar */}
      <div className="glass-panel" style={{display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', padding: '1rem', alignItems: 'flex-end'}}>
        <div style={{flex: '1 1 200px', position: 'relative'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Search</label>
          <Search size={16} style={{position: 'absolute', left: '0.75rem', top: '2.25rem', color: 'var(--text-muted)'}} />
          <input 
            type="text" 
            placeholder="Customer, product, city..." 
            value={searchQuery}
            onChange={(e) => updateFilter('q', e.target.value)}
            style={{width: '100%', padding: '0.5rem 1rem 0.5rem 2.25rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          />
        </div>
        
        <div style={{flex: '1 1 150px'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Pipeline Stage</label>
          <select value={statusFilter} onChange={(e) => updateFilter('status', e.target.value)} style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}>
            <option value="All Open">Active Pipeline</option>
            <option value="Overdue">Overdue</option>
            <option value="Identified">Identified</option>
            <option value="Engaged">Engaged</option>
            <option value="Qualified">Qualified</option>
            <option value="Commercial Intent">Commercial Intent</option>
            <option value="On Hold">On Hold</option>
            <option value="All">All Statuses</option>
          </select>
        </div>

        <div style={{flex: '1 1 150px'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Date Range</label>
          <select value={dateRange} onChange={(e) => updateFilter('dateRange', e.target.value)} style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}>
            <option value="All Time">All Time</option>
            <option value="Today">Today</option>
            <option value="Tomorrow">Tomorrow</option>
            <option value="This Week">This Week</option>
            <option value="Next 7 Days">Next 7 Days</option>
            <option value="This Month">This Month</option>
            <option value="Overdue">Overdue</option>
            <option value="Custom">Custom Range</option>
          </select>
        </div>
        
        <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', paddingBottom: '0.5rem'}} className="text-muted">
          <input type="checkbox" checked={includeCompleted} onChange={(e) => updateFilter('includeCompleted', e.target.checked.toString())} />
          Include completed
        </label>

        {activeFilterCount > 0 && (
          <button className="btn cv-btn-subtle" onClick={clearFilters} style={{color: 'var(--danger)', marginBottom: '0.2rem'}}>
            <XCircle size={16}/> Clear
          </button>
        )}
      </div>

      {error ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ margin: '0 auto 1rem', opacity: 0.8 }} />
          <h3>{error}</h3>
          <button className="btn btn-primary" onClick={fetchRequirements}><RefreshCw size={16}/> Retry</button>
        </div>
      ) : loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}} className="text-muted">Loading pipeline...</div>
      ) : filteredRequirements.length === 0 ? (
        <div className="glass-panel" style={{padding: '4rem', textAlign: 'center'}}>
          <ClipboardList size={48} className="text-secondary" style={{margin: '0 auto 1rem', opacity: 0.5}} />
          <h3 style={{marginBottom: '0.5rem'}}>Pipeline is clear</h3>
          <p className="text-secondary">No requirements match the selected filters.</p>
          {activeFilterCount > 0 && <button className="btn btn-secondary" style={{marginTop: '1rem'}} onClick={clearFilters}>Clear Filters</button>}
        </div>
      ) : viewMode === 'customer' ? (
        // CUSTOMER VIEW
        <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {groupedCustomers.map(group => {
            const isExpanded = expandedCustomers.has(group.party_id || group.customer_name);
            const productArr = Array.from(group.products);
            const productDisplay = productArr.slice(0, 2).join(', ') + (productArr.length > 2 ? ` + ${productArr.length - 2} more` : '');
            
            return (
              <div key={group.party_id || group.customer_name} className="glass-panel" style={{background: '#ffffff', borderRadius: '12px', border: group.has_overdue ? '1px solid var(--danger)' : '1px solid #E5E7EB', overflow: 'hidden'}}>
                
                {/* Collapsed Header Bar */}
                <div 
                  onClick={() => toggleExpand(group.party_id || group.customer_name)}
                  style={{padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'background 0.2s'}}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'}}>
                      <h3 style={{margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)'}}>{group.customer_name}</h3>
                      <span className="text-muted" style={{fontSize: '0.9rem'}}>{group.customer_city || 'Location N/A'}</span>
                      <span style={{background: '#F3F4F6', color: '#4B5563', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600}}>
                        {group.requirements.length} requirement{group.requirements.length !== 1 && 's'}
                      </span>
                    </div>
                    
                    <div style={{display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '0.9rem'}}>
                      {group.has_overdue && <span style={{color: 'var(--danger)', fontWeight: 600, fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '4px'}}>OVERDUE</span>}
                      {group.has_high_priority && !group.has_overdue && <span style={{color: 'var(--warning)', fontWeight: 600, fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '4px'}}>HIGH PRIORITY</span>}
                      {group.earliest_date && !group.has_overdue && !group.has_high_priority && (
                         <span style={{color: 'var(--primary)', fontWeight: 600, fontSize: '0.8rem', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px', textTransform: 'uppercase'}}>
                           {getFriendlyDate(group.earliest_date)}
                         </span>
                      )}
                      <span style={{color: 'var(--text-primary)', fontWeight: 600}}>• {group.total_qty} total active qty</span>
                      <span className="text-muted">• Owner: {group.owner_email.split('@')[0]}</span>
                    </div>
                    
                    <div className="text-muted" style={{fontSize: '0.85rem'}}>
                      Products: <strong style={{color: 'var(--text-primary)'}}>{productDisplay}</strong>
                    </div>
                  </div>
                  <div style={{paddingLeft: '16px', color: 'var(--text-muted)'}}>
                    {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                  </div>
                </div>

                {/* Expanded Requirements List */}
                {isExpanded && (
                  <div style={{borderTop: '1px solid #E5E7EB', padding: '16px 20px', background: 'rgba(249, 250, 251, 0.5)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                      <span className="text-muted" style={{fontSize: '0.85rem'}}>Showing {group.requirements.length} matching requirement(s)</span>
                      <div style={{display: 'flex', gap: '12px'}}>
                        {group.party_id && group.customer_mobile ? (
                           <>
                             <CallAction party={{id: group.party_id, mobile: group.customer_mobile}} onComplete={fetchRequirements} showLabel={false} />
                             <WhatsAppAction party={{id: group.party_id, whatsapp: group.customer_whatsapp, mobile: group.customer_mobile}} onComplete={fetchRequirements} />
                           </>
                        ) : (
                          <span className="text-muted" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center'}}>No valid phone number</span>
                        )}
                        <Link to={group.party_id ? `/requirements/new?party_id=${group.party_id}` : '/customers'} className="btn btn-secondary" style={{padding: '4px 12px', fontSize: '0.85rem'}}>
                          + Add requirement
                        </Link>
                      </div>
                    </div>
                    
                    {/* Desktop Table View */}
                    <div style={{overflowX: 'auto'}}>
                      <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', textAlign: 'left'}}>
                        <thead>
                          <tr style={{borderBottom: '2px solid #E5E7EB', color: 'var(--text-muted)'}}>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Product</th>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Qty</th>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Target Rate</th>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Required By</th>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Stage</th>
                            <th style={{padding: '8px 12px', fontWeight: 600}}>Priority</th>
                            <th style={{padding: '8px 12px', fontWeight: 600, textAlign: 'right'}}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.requirements.map(req => {
                            const isReqOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
                            return (
                              <tr key={req.id} style={{borderBottom: '1px solid #E5E7EB', transition: 'background 0.2s', cursor: 'default'}} onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{padding: '12px'}}><Link to={`/requirements/${req.id}`} style={{color: 'var(--primary)', fontWeight: 600, textDecoration: 'none'}}>{req.product_type}</Link></td>
                                <td style={{padding: '12px', fontWeight: 500}}>{req.required_quantity} {req.unit}</td>
                                <td style={{padding: '12px'}}>{formatRate(req.expected_rate)}</td>
                                <td style={{padding: '12px', color: isReqOverdue ? 'var(--danger)' : 'inherit', fontWeight: isReqOverdue ? 600 : 400}}>{getFriendlyDate(req.expected_date)}</td>
                                <td style={{padding: '12px'}}><span className={getStatusBadge(req.status)} style={{fontSize: '0.75rem', padding: '2px 6px'}}>{req.status}</span></td>
                                <td style={{padding: '12px'}}>
                                  <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                    <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getPriorityColor(req.priority)}}></div>
                                    {req.priority || 'Normal'}
                                  </div>
                                </td>
                                <td style={{padding: '12px', textAlign: 'right'}}>
                                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px'}}>
                                    <button onClick={() => navigate(`/requirements/${req.id}/edit`)} className="btn-icon" title="Edit requirement" style={{padding: '6px', color: 'var(--text-muted)'}}>
                                      <Edit size={16}/>
                                    </button>
                                    
                                    {/* Action Dropdown Menu */}
                                    <div style={{position: 'relative'}}>
                                      <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === req.id ? null : req.id); }}
                                        className="btn-icon"
                                        style={{padding: '6px', color: 'var(--text-muted)'}}
                                        aria-label="More actions"
                                      >
                                        <MoreVertical size={16} />
                                      </button>
                                      {openMenuId === req.id && (
                                        <>
                                          <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9}} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                                          <div style={{
                                            position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #E5E7EB', 
                                            borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, minWidth: '180px', padding: '4px 0', textAlign: 'left'
                                          }}>
                                            <button onClick={() => navigate(`/requirements/${req.id}`)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)'}}><ClipboardList size={14} /> View details</button>
                                            <button onClick={() => navigate(`/requirements/${req.id}/edit`)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)'}}><Edit size={14} /> Edit requirement</button>
                                            <button onClick={() => navigate(`/requirements/${req.id}/edit`)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)'}}><CheckCircle size={14} /> Change stage</button>
                                            <hr style={{margin: '4px 0', border: 'none', borderTop: '1px solid #E5E7EB'}}/>
                                            <button onClick={(e) => openCancelModal(e, req)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--warning)'}}><XSquare size={14} /> Cancel requirement</button>
                                            <button onClick={(e) => openDeleteModal(e, req)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)'}}><Trash2 size={14} /> Delete permanently</button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // REQUIREMENT VIEW (FLAT LIST) - Keeping the previous layout design for flat view
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
          {filteredRequirements.map(req => {
            const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
            const isPartiallyDispatched = req.dispatch_progress === 'Partially Dispatched' && req.total_dispatched_quantity > 0;
            
            return (
              <div 
                key={req.id} 
                className="glass-panel" 
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', padding: '20px', 
                  border: isOverdue ? '1px solid var(--danger)' : '1px solid #E5E7EB', transition: 'transform 0.2s, box-shadow 0.2s',
                }}
              >
                {/* 1. Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
                  <div style={{flex: 1, paddingRight: '12px'}}>
                    <div style={{fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', color: 'var(--text-primary)'}}>{req.customer_name}</div>
                    <div className="text-muted" style={{fontSize: '0.8rem'}}>{req.customer_city || 'Location N/A'} • {req.owner_email ? req.owner_email.split('@')[0] : 'Unassigned'}</div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span className={getStatusBadge(req.status)} style={{whiteSpace: 'nowrap'}}>{req.status}</span>
                    <div style={{position: 'relative'}}>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === req.id ? null : req.id); }} className="btn-icon" style={{padding: '4px', color: 'var(--text-muted)'}}>
                        <MoreVertical size={18} />
                      </button>
                      {openMenuId === req.id && (
                        <>
                          <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9}} onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }} />
                          <div style={{position: 'absolute', right: 0, top: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, minWidth: '160px', padding: '4px 0'}}>
                            <button onClick={() => navigate(`/requirements/${req.id}`)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)'}}><ClipboardList size={14} /> View details</button>
                            <button onClick={() => navigate(`/requirements/${req.id}/edit`)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-primary)'}}><Edit size={14} /> Edit</button>
                            <hr style={{margin: '4px 0', border: 'none', borderTop: '1px solid #E5E7EB'}}/>
                            <button onClick={(e) => openCancelModal(e, req)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--warning)'}}><XSquare size={14} /> Cancel</button>
                            <button onClick={(e) => openDeleteModal(e, req)} style={{width: '100%', padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--danger)'}}><Trash2 size={14} /> Delete</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 2. Main requirement summary */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '16px'}}>
                  <div style={{display: 'flex', alignItems: 'baseline', gap: '6px'}}>
                    <span style={{fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)'}}>{req.required_quantity}</span>
                    <span className="text-muted" style={{fontSize: '0.9rem'}}>{req.unit} (Est.)</span>
                  </div>
                  <div style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)'}}>{req.product_type}</div>
                  <div style={{marginTop: '4px'}}>
                     <span style={{display: 'inline-block', fontSize: '0.75rem', padding: '2px 8px', background: '#F3F4F6', color: '#4B5563', borderRadius: '4px', fontWeight: 500}}>
                       {req.intent_type || 'Product Interest'}
                     </span>
                  </div>
                  {isPartiallyDispatched && (
                    <div style={{ fontSize: '0.8rem', padding: '6px 10px', background: '#ECFDF5', borderRadius: '4px', border: '1px solid #D1FAE5', color: '#065F46', display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span>Dispatched: {req.total_dispatched_quantity}</span>
                      <strong style={{color: '#B45309'}}>Pending: {req.pending_quantity}</strong>
                    </div>
                  )}
                </div>

                {/* 3. Commercial and timeline details */}
                <hr style={{border: 'none', borderTop: '1px solid #F0F1F3', margin: '0 0 16px 0'}} />
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px'}}>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <span className="text-muted" style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Target Rate</span>
                    <span style={{fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)'}}>{formatRate(req.expected_rate)}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <span className="text-muted" style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Required By</span>
                    <span style={{fontSize: '0.9rem', fontWeight: 500, color: isOverdue ? 'var(--danger)' : 'var(--text-primary)'}}>{formatDate(req.expected_date)}</span>
                  </div>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                    <span className="text-muted" style={{fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600}}>Priority</span>
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)'}}>
                      <div style={{width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getPriorityColor(req.priority)}}></div>
                      {req.priority || 'Normal'}
                    </div>
                  </div>
                </div>

                {/* 4. Footer actions */}
                <hr style={{border: 'none', borderTop: '1px solid #F0F1F3', margin: 'auto 0 16px 0'}} />
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <div style={{display: 'flex', gap: '8px'}}>
                    <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                      {req.party_id && <CallAction party={{id: req.party_id, mobile: req.customer_mobile}} onComplete={fetchRequirements} showLabel={false} />}
                    </div>
                    <div onClick={e => { e.preventDefault(); e.stopPropagation(); }}>
                      {req.party_id && <WhatsAppAction party={{id: req.party_id, whatsapp: req.customer_whatsapp, mobile: req.customer_mobile}} onComplete={fetchRequirements} />}
                    </div>
                  </div>
                  <Link to={`/requirements/${req.id}`} className="btn btn-secondary" style={{padding: '6px 12px', fontSize: '0.85rem'}}>
                    View <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', padding: '1rem 1.5rem', background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', color: '#fff', borderRadius: '6px', zIndex: 9999, boxShadow: '0 4px 12px rgba(0,0,0,0.15)', fontWeight: 500, fontSize: '0.95rem'}}>
          {toast.message}
        </div>
      )}

      {/* Cancel Requirement Modal */}
      {cancelModalOpen && reqToCancel && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeCancelModal}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeCancelModal(); }} tabIndex={-1} ref={el => el && el.focus()}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>Cancel this requirement?</h3>
            <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Customer:</strong> {reqToCancel.customer_name}</div>
              <div><strong>Product:</strong> {reqToCancel.product_type}</div>
              <div><strong>Quantity:</strong> {reqToCancel.required_quantity} {reqToCancel.unit}</div>
              <div><strong>Required By:</strong> {formatDate(reqToCancel.expected_date)}</div>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.9rem' }}>
              This will cancel <strong>only this requirement</strong>. Other requirements for this customer will remain active.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={closeCancelModal} disabled={isCancelling}>Keep requirement</button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--warning)', borderColor: 'var(--warning)', color: '#000' }} onClick={executeCancel} disabled={isCancelling}>
                {isCancelling ? 'Cancelling...' : 'Cancel requirement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanently Delete Modal */}
      {deleteModalOpen && reqToDelete && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={closeDeleteModal}>
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Escape') closeDeleteModal(); }} tabIndex={-1} ref={el => el && el.focus()}>
            <h3 style={{ margin: '0 0 1rem 0', color: 'var(--danger)', fontSize: '1.25rem' }}>Permanently delete this requirement?</h3>
            <div style={{ background: 'var(--bg-base)', padding: '1rem', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}>
              <div><strong>Customer:</strong> {reqToDelete.customer_name}</div>
              <div><strong>Product:</strong> {reqToDelete.product_type}</div>
              <div><strong>Quantity:</strong> {reqToDelete.required_quantity} {reqToDelete.unit}</div>
            </div>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', lineHeight: 1.5, fontSize: '0.9rem' }}>
              This permanently removes <strong>only this requirement</strong>. The customer and their other active requirement(s) will remain unchanged.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={closeDeleteModal} disabled={isDeleting}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={executeDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
