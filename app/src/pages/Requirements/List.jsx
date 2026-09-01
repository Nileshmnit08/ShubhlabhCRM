import React, { useEffect, useState, useContext, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Search, Filter, ChevronRight, AlertCircle, RefreshCw, XCircle, Trash2, MoreVertical } from 'lucide-react';
import CallAction from '../../components/CallAction';
import WhatsAppAction from '../../components/WhatsAppAction';
import { AuthContext } from '../../AuthContext';

export default function RequirementList() {
  const { userProfile } = useContext(AuthContext);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
  // Delete Modal & Toast State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [reqToDelete, setReqToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState(null);
  const deleteTriggerRef = useRef(null);
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
    // If changing date range from custom, clear custom dates
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
      // In a real app we might fetch active CRM users from a users table
      // Here we just fetch auth.users or profiles if available.
      // Supabase Edge Functions or admin access is usually needed for auth.users,
      // but since the view joins it, we can extract distinct owners from the view.
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

      // Pending logic enforcement
      if (!includeCompleted) {
        query = query.eq('is_pending', true);
      }

      // Status Filter
      if (statusFilter === 'All Open') {
        // 'All Open' is essentially handled by is_pending = true above
        // But if includeCompleted is toggled, it might show closed items.
        // We'll leave it as is.
      } else if (statusFilter === 'Overdue') {
        const today = new Date().toISOString().split('T')[0];
        query = query.lt('expected_date', today);
      } else if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      // Owner Filter
      if (ownerFilter === 'My Requirements' && userProfile?.id) {
        query = query.eq('assigned_to', userProfile.id);
      } else if (ownerFilter === 'Unassigned') {
        query = query.is('assigned_to', null);
      } else if (ownerFilter !== 'All Owners') {
         // Assuming ownerFilter is a UUID
        query = query.eq('assigned_to', ownerFilter);
      }

      // Date Range Logic
      if (dateRange !== 'All Time') {
        const today = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const formatDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
        
        let startStr = null;
        let endStr = null;

        if (dateRange === 'Today') {
          startStr = formatDate(today);
          endStr = startStr;
        } else if (dateRange === 'Tomorrow') {
          const tmrw = new Date(today); tmrw.setDate(tmrw.getDate() + 1);
          startStr = formatDate(tmrw);
          endStr = startStr;
        } else if (dateRange === 'This Week') {
          const first = today.getDate() - today.getDay();
          startStr = formatDate(new Date(today.setDate(first)));
          endStr = formatDate(new Date(today.setDate(first + 6)));
        } else if (dateRange === 'Next 7 Days') {
          startStr = formatDate(today);
          const next = new Date(today); next.setDate(next.getDate() + 7);
          endStr = formatDate(next);
        } else if (dateRange === 'This Month') {
          startStr = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
          endStr = formatDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
        } else if (dateRange === 'Custom' && startDate && endDate) {
          startStr = startDate;
          endStr = endDate;
        } else if (dateRange === 'Overdue') {
          // Already handled by status filter if they used that dropdown, but if they use Date Range:
          endStr = formatDate(today); // less than today
        }

        if (startStr && dateRange !== 'Overdue') query = query.gte(dateField, startStr);
        if (endStr && dateRange !== 'Overdue') query = query.lte(dateField, endStr);
        if (dateRange === 'Overdue') query = query.lt(dateField, endStr);
      }

      const { data, error, status, statusText } = await query;
      if (error) {
        console.error("Supabase Error Details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          httpStatus: status,
          statusText: statusText
        });
        throw error;
      }
      setRequirements(data || []);
    } catch (err) {
      console.error("fetchRequirements caught error:", err);
      setError('Failed to load requirements. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const openDeleteModal = (e, req) => {
    e.preventDefault();
    e.stopPropagation();
    deleteTriggerRef.current = e.currentTarget;
    setReqToDelete(req);
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setReqToDelete(null);
    if (deleteTriggerRef.current) {
      deleteTriggerRef.current.focus();
    }
  };

  const executeDelete = async () => {
    if (!reqToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('requirements').delete().eq('id', reqToDelete.id);
      if (error) throw error;
      
      setToast({ type: 'success', message: 'Requirement deleted successfully.' });
      setRequirements(prev => prev.filter(r => r.id !== reqToDelete.id));
      closeDeleteModal();
    } catch (err) {
      console.error("Delete Error:", err);
      setToast({ type: 'error', message: 'Could not delete requirement. Please try again.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Client-side search (Title, Product, City)
  const filteredRequirements = requirements.filter(req => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      req.customer_name?.toLowerCase().includes(q) ||
      req.product_type?.toLowerCase().includes(q) ||
      req.customer_city?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    if (status === 'Identified') return 'badge badge-dormant';
    if (status === 'Engaged') return 'badge badge-active';
    if (status === 'Qualified') return 'badge badge-active';
    if (status === 'Commercial Intent') return 'badge badge-warning';
    if (status === 'Won') return 'badge badge-success';
    if (status === 'Lost' || status === 'Cancelled') return 'badge badge-danger';
    if (status === 'On Hold') return 'badge badge-neutral';
    if (status === 'Dispatched' || status === 'Fulfilled' || status === 'Completed') return 'badge badge-success';
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

  const getPriorityColor = (priority) => {
    if (priority === 'High' || priority === 'Urgent') return 'var(--danger)';
    if (priority === 'Normal') return 'var(--warning)';
    return 'var(--primary)'; // Low/Neutral
  };

  const activeFilterCount = Array.from(searchParams.keys()).length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0}}>Requirements Board</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            Track open feed demands and ongoing negotiations.
          </p>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem'}} className="text-muted">
            <input 
              type="checkbox" 
              checked={includeCompleted} 
              onChange={(e) => updateFilter('includeCompleted', e.target.checked.toString())} 
            />
            Include completed / dispatched
          </label>
          <Link to="/customers" className="btn btn-primary">
            + New Requirement
          </Link>
        </div>
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
          <select 
            value={statusFilter}
            onChange={(e) => updateFilter('status', e.target.value)}
            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          >
            <option value="All Open">Active Pipeline</option>
            <option value="Overdue">Overdue</option>
            <option value="Identified">Identified</option>
            <option value="Engaged">Engaged</option>
            <option value="Qualified">Qualified</option>
            <option value="Commercial Intent">Commercial Intent</option>
            <option value="On Hold">On Hold</option>
            {includeCompleted && (
              <>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Fulfilled">Fulfilled</option>
              </>
            )}
            <option value="All">All Statuses</option>
          </select>
        </div>

        <div style={{flex: '1 1 150px'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Owner</label>
          <select 
            value={ownerFilter}
            onChange={(e) => updateFilter('owner', e.target.value)}
            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          >
            <option value="All Owners">All Owners</option>
            <option value="My Requirements">My Requirements</option>
            <option value="Unassigned">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email?.split('@')[0]}</option>
            ))}
          </select>
        </div>

        <div style={{flex: '1 1 150px'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Date Field</label>
          <select 
            value={dateField}
            onChange={(e) => updateFilter('dateField', e.target.value)}
            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          >
            <option value="expected_date">Required By</option>
            <option value="created_at">Created Date</option>
            <option value="updated_at">Last Updated</option>
          </select>
        </div>

        <div style={{flex: '1 1 150px'}}>
          <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>Date Range</label>
          <select 
            value={dateRange}
            onChange={(e) => updateFilter('dateRange', e.target.value)}
            style={{width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}
          >
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

        {dateRange === 'Custom' && (
          <>
            <div>
              <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>From</label>
              <input type="date" value={startDate} onChange={e => updateFilter('startDate', e.target.value)} style={{padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}/>
            </div>
            <div>
              <label className="text-muted" style={{display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem'}}>To</label>
              <input type="date" value={endDate} onChange={e => updateFilter('endDate', e.target.value)} style={{padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)'}}/>
            </div>
          </>
        )}

        {activeFilterCount > 0 && (
          <button className="btn cv-btn-subtle" onClick={clearFilters} style={{color: 'var(--danger)', marginBottom: '0.2rem'}}>
            <XCircle size={16}/> Clear
          </button>
        )}
      </div>
      
      <div style={{marginBottom: '1rem', fontSize: '0.9rem'}} className="text-secondary">
         Showing <strong>{filteredRequirements.length}</strong> {includeCompleted ? 'total' : 'pending'} requirement(s).
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
          {activeFilterCount > 0 && (
            <button className="btn btn-secondary" style={{marginTop: '1rem'}} onClick={clearFilters}>Clear Filters</button>
          )}
        </div>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem'}}>
          {filteredRequirements.map(req => {
            const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
            const isPartiallyDispatched = req.dispatch_progress === 'Partially Dispatched' && req.total_dispatched_quantity > 0;
            
            return (
              <div 
                key={req.id} 
                className="glass-panel" 
                style={{
                  position: 'relative',
                  display: 'flex', 
                  flexDirection: 'column',
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px', 
                  border: isOverdue ? '1px solid var(--danger)' : '1px solid #E5E7EB',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* 1. Header */}
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
                  <div style={{flex: 1, paddingRight: '12px'}}>
                    <div style={{fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.3, marginBottom: '4px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)'}}>{req.customer_name}</div>
                    <div className="text-muted" style={{fontSize: '0.8rem'}}>
                      {req.customer_city || 'Location N/A'} • {req.owner_email ? req.owner_email.split('@')[0] : 'Unassigned'}
                    </div>
                  </div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <span className={getStatusBadge(req.status)} style={{whiteSpace: 'nowrap'}}>{req.status}</span>
                    <div style={{position: 'relative'}}>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === req.id ? null : req.id);
                        }}
                        className="btn-icon"
                        style={{padding: '4px', color: 'var(--text-muted)'}}
                        aria-label="More actions"
                        title="More actions"
                      >
                        <MoreVertical size={18} />
                      </button>
                      {openMenuId === req.id && (
                        <>
                          <div style={{position: 'fixed', top:0, left:0, right:0, bottom:0, zIndex: 9}} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenMenuId(null); }} />
                          <div style={{
                            position: 'absolute', 
                            right: 0, top: '100%', 
                            background: '#fff', 
                            border: '1px solid #E5E7EB', 
                            borderRadius: '6px', 
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            zIndex: 10,
                            minWidth: '120px',
                            padding: '4px 0'
                          }}>
                            <button 
                              type="button"
                              onClick={(e) => {
                                setOpenMenuId(null);
                                openDeleteModal(e, req);
                              }}
                              style={{
                                width: '100%', padding: '8px 16px', background: 'none', border: 'none',
                                textAlign: 'left', color: 'var(--danger)', fontSize: '0.85rem',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={14} /> Delete
                            </button>
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
                  <div style={{fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)'}}>
                    {req.product_type}
                  </div>
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
                  <Link 
                    to={`/requirements/${req.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      color: 'var(--primary)', fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none',
                      padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--primary)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29, 78, 216, 0.05)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    View <ChevronRight size={16} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div 
          role="status"
          aria-live="polite"
          style={{ 
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', 
            padding: '1rem 1.5rem', 
            background: toast.type === 'success' ? 'var(--success)' : 'var(--danger)', 
            color: '#fff', borderRadius: '6px', zIndex: 9999, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            fontWeight: 500, fontSize: '0.95rem'
          }}
        >
          {toast.message}
        </div>
      )}

      {deleteModalOpen && reqToDelete && (
        <div 
          role="dialog" 
          aria-modal="true" 
          aria-labelledby="delete-dialog-title"
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1000, 
            display: 'flex', alignItems: 'center', justifyContent: 'center' 
          }}
          onClick={closeDeleteModal}
        >
          <div 
            style={{ 
              background: 'var(--bg-card)', padding: '2rem', borderRadius: '8px', 
              maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' 
            }} 
            onClick={e => e.stopPropagation()}
            onKeyDown={e => { if (e.key === 'Escape') closeDeleteModal(); }}
            tabIndex={-1}
            ref={el => el && el.focus()}
          >
            <h3 id="delete-dialog-title" style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)', fontSize: '1.25rem' }}>
              Delete requirement?
            </h3>
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              This will permanently delete the requirement for <strong>{reqToDelete.customer_name}</strong> — <strong>{reqToDelete.product_type}</strong>. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={closeDeleteModal} 
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }} 
                onClick={executeDelete} 
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
