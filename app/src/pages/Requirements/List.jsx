import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Search, Filter, ChevronRight, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import CallAction from '../../components/CallAction';
import WhatsAppAction from '../../components/WhatsAppAction';
import { AuthContext } from '../../AuthContext';

export default function RequirementList() {
  const { userProfile } = useContext(AuthContext);
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [users, setUsers] = useState([]);
  
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
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem'}}>
          {filteredRequirements.map(req => {
            const isOverdue = req.expected_date && new Date(req.expected_date) < new Date(new Date().toDateString()) && req.is_pending;
            const isPartiallyDispatched = req.dispatch_progress === 'Partially Dispatched' && req.total_dispatched_quantity > 0;
            
            return (
            <Link key={req.id} to={`/requirements/${req.id}`} className="glass-panel" style={{display: 'block', textDecoration: 'none', color: 'inherit', transition: 'transform 0.2s, border-color 0.2s', border: isOverdue ? '1px solid var(--danger)' : ''}}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.customer_name}</div>
                <span className={getStatusBadge(req.status)}>{req.status}</span>
              </div>
              
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                <div style={{fontSize: '0.95rem'}}>
                  <strong>{req.required_quantity} {req.unit} (Est.)</strong> of {req.product_type}
                </div>
                
                {isPartiallyDispatched && (
                  <div style={{ fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '4px', border: '1px solid rgba(16, 185, 129, 0.2)', color: 'var(--success)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dispatched: {req.total_dispatched_quantity}</span>
                    <strong style={{color: 'var(--warning)'}}>Pending: {req.pending_quantity}</strong>
                  </div>
                )}

                <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                  Intent: <strong>{req.intent_type || 'Product Interest'}</strong>
                </div>
                {req.expected_rate && (
                  <div className="text-secondary" style={{fontSize: '0.85rem'}}>
                    Target Rate (Est.): ₹{req.expected_rate}
                  </div>
                )}
                {req.expected_date && (
                  <div className={isOverdue ? "text-danger" : "text-secondary"} style={{fontSize: '0.85rem', fontWeight: isOverdue ? 600 : 400}}>
                    {isOverdue && '⚠️ '}Required By: {new Date(req.expected_date).toLocaleDateString()}
                  </div>
                )}
              </div>
              
              <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                  <span style={{color: req.priority === 'High' ? 'var(--warning)' : 'var(--text-muted)'}}>
                    Priority: {req.priority}
                  </span>
                  {req.owner_email && (
                    <span style={{color: 'var(--text-muted)'}}>
                      Owner: {req.owner_email.split('@')[0]}
                    </span>
                  )}
                </div>
                <div style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                  <div onClick={e => e.preventDefault()}>
                     {req.party_id && <CallAction party={{id: req.party_id, mobile: req.customer_mobile}} onComplete={fetchRequirements} showLabel={false} />}
                  </div>
                  <div onClick={e => e.preventDefault()}>
                     {req.party_id && <WhatsAppAction party={{id: req.party_id, whatsapp: req.customer_whatsapp, mobile: req.customer_mobile}} onComplete={fetchRequirements} />}
                  </div>
                  <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--primary)', marginLeft: '0.5rem'}}>
                    View <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </Link>
          )})}
        </div>
      )}
    </div>
  );
}
