import React, { useEffect, useState, useContext, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Building2, AlertTriangle, ArrowUpDown, Users, X, Filter, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';
import { AuthContext } from '../../AuthContext';
import { logActivity } from '../../lib/activityLogger';

export default function CustomerList() {
  const { t } = useContext(LanguageContext);
  const { userProfile } = useContext(AuthContext);

  const [customers, setCustomers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);

  // Unified State Model
  const [filters, setFilters] = useState({
    search: '',
    owner_id: 'ALL',
    missing_gst: false,
    show_duplicates: false,
    financial_status: 'ALL',
    profile_completeness: 'ALL',
    activity_status: 'ALL'
  });
  
  const [sort, setSort] = useState({ column: 'created_at', ascending: false });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [expandedRow, setExpandedRow] = useState(null);
  
  // Bulk Actions
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [bulkAssignTarget, setBulkAssignTarget] = useState('');

  // Duplicate Management
  const [duplicates, setDuplicates] = useState({});
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [mergingCandidates, setMergingCandidates] = useState(null);
  const [mergeLoading, setMergeLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    // Debounce search slightly
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [filters, sort]);

  async function fetchTeamMembers() {
    try {
      const { data } = await supabase.from('app_users').select('id, display_name').eq('is_active', true);
      if (data) setTeamMembers(data);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    try {
      // Base Query
      let query = supabase.from('v_customer_master').select('*', { count: 'exact' });
      
      // 1. Search Filter
      const trimmedSearch = filters.search.trim();
      if (trimmedSearch) {
        query = query.or(`display_name.ilike.%${trimmedSearch}%,legal_or_core_name.ilike.%${trimmedSearch}%,mobile.ilike.%${trimmedSearch}%,city.ilike.%${trimmedSearch}%,gst_number.ilike.%${trimmedSearch}%,owner_name.ilike.%${trimmedSearch}%`);
      }
      
      // 2. Owner Filter
      if (filters.owner_id === 'UNASSIGNED') {
        query = query.is('assigned_owner_id', null);
      } else if (filters.owner_id !== 'ALL') {
        query = query.eq('assigned_owner_id', filters.owner_id);
      }

      // 3. Missing GST
      if (filters.missing_gst) {
        query = query.or('gst_number.is.null,gst_number.eq.');
      }

      // 4. Financial Status
      if (filters.financial_status === 'OUTSTANDING') {
        query = query.gt('outstanding_balance', 0);
      } else if (filters.financial_status === 'NO_CREDIT_LIMIT') {
        query = query.or('credit_limit.is.null,credit_limit.eq.0');
      }

      // 5. Profile Completeness
      if (filters.profile_completeness === '0-25') query = query.lte('profile_completeness', 25);
      else if (filters.profile_completeness === '26-50') query = query.and('profile_completeness.gt.25,profile_completeness.lte.50');
      else if (filters.profile_completeness === '51-75') query = query.and('profile_completeness.gt.50,profile_completeness.lte.75');
      else if (filters.profile_completeness === '76-100') query = query.gt('profile_completeness', 75);

      // 6. Activity Status
      if (filters.activity_status === 'NEVER_ORDERED') {
        query = query.is('last_order_date', null);
      } else if (filters.activity_status === 'NEVER_PAID') {
        query = query.is('last_payment_date', null);
      } else if (filters.activity_status === 'STALE_30_DAYS') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.or(`last_order_date.lt.${thirtyDaysAgo.toISOString()},last_order_date.is.null`);
      }

      // 7. Sorting
      query = query.order(sort.column, { ascending: sort.ascending });

      // Keep limit large enough for JS duplicate detection but safe for performance
      query = query.limit(1000);

      const { data, count, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      
      let processedData = data || [];
      if (count !== null) setTotalCount(count);

      // JS-side Duplicate Detection Engine
      const dupMap = {};
      const mobileGroups = {};
      const nameGroups = {};

      processedData.forEach(c => {
        if (c.mobile && c.mobile.length >= 10) {
          const normMob = c.mobile.replace(/\D/g, '').slice(-10);
          if (!mobileGroups[normMob]) mobileGroups[normMob] = [];
          mobileGroups[normMob].push(c.id);
        }
        if (c.display_name) {
          const normName = c.display_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normName.length > 5) {
            if (!nameGroups[normName]) nameGroups[normName] = [];
            nameGroups[normName].push(c.id);
          }
        }
      });

      const addDups = (group) => {
        if (group.length > 1) {
          const primaryId = group[0];
          if (!dupMap[primaryId]) dupMap[primaryId] = new Set();
          for (let i = 1; i < group.length; i++) {
            dupMap[primaryId].add(group[i]);
          }
        }
      };
      Object.values(mobileGroups).forEach(addDups);
      Object.values(nameGroups).forEach(addDups);

      const finalDups = {};
      const duplicateChildIds = new Set();
      Object.keys(dupMap).forEach(key => {
        const arr = Array.from(dupMap[key]);
        finalDups[key] = arr;
        arr.forEach(id => duplicateChildIds.add(id));
      });
      setDuplicates(finalDups);

      processedData = processedData.map(c => ({
        ...c,
        isDuplicatePrimary: !!finalDups[c.id],
        isDuplicateChild: duplicateChildIds.has(c.id)
      }));

      if (filters.show_duplicates) {
        processedData = processedData.filter(c => c.isDuplicatePrimary || c.isDuplicateChild);
        setTotalCount(processedData.length);
      }

      setCustomers(processedData);
      
      // Clean up selected rows that might no longer be in the dataset
      const dataIds = new Set(processedData.map(c => c.id));
      setSelectedRows(prev => {
        const newSet = new Set(prev);
        newSet.forEach(id => { if (!dataIds.has(id)) newSet.delete(id); });
        return newSet;
      });

    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Sorting
  const handleSort = (column) => {
    setSort(prev => ({
      column,
      ascending: prev.column === column ? !prev.ascending : true
    }));
  };

  const getSortIcon = (col) => {
    if (sort.column !== col) return <ArrowUpDown size={12} style={{opacity: 0.3, marginLeft: '4px'}} />;
    return <ArrowUpDown size={12} style={{marginLeft: '4px', color: 'var(--primary)', transform: sort.ascending ? 'none' : 'rotate(180deg)'}} />;
  };

  // Selection
  const toggleRowSelection = (id) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleAllSelection = () => {
    if (selectedRows.size === customers.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(customers.map(c => c.id)));
  };

  // Bulk Actions
  const handleBulkAssign = async () => {
    if (selectedRows.size === 0) return;
    if (bulkAssignTarget === '') {
      alert("Please select a team member to assign.");
      return;
    }

    setBulkActionLoading(true);
    try {
      const ownerVal = bulkAssignTarget === 'UNASSIGNED' ? null : bulkAssignTarget;
      const ids = Array.from(selectedRows);
      
      const { error } = await supabase
        .from('crm_parties')
        .update({ assigned_owner_id: ownerVal })
        .in('id', ids);
        
      if (error) throw error;
      
      // Trigger handles activity logging natively!
      
      alert(`Successfully reassigned ${ids.length} customers.`);
      setSelectedRows(new Set());
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert("Bulk assignment failed.");
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Filter Chips Logic
  const activeFilters = useMemo(() => {
    const active = [];
    if (filters.search) active.push({ key: 'search', label: `Search: ${filters.search}` });
    if (filters.owner_id !== 'ALL') {
      const name = filters.owner_id === 'UNASSIGNED' ? 'Unassigned' : teamMembers.find(t => t.id === filters.owner_id)?.display_name;
      active.push({ key: 'owner_id', label: `Owner: ${name || 'Unknown'}` });
    }
    if (filters.missing_gst) active.push({ key: 'missing_gst', label: 'Missing GST' });
    if (filters.show_duplicates) active.push({ key: 'show_duplicates', label: 'Duplicates Only' });
    
    if (filters.financial_status === 'OUTSTANDING') active.push({ key: 'financial_status', label: 'Has Outstanding' });
    if (filters.financial_status === 'NO_CREDIT_LIMIT') active.push({ key: 'financial_status', label: 'No Credit Limit' });
    
    if (filters.profile_completeness !== 'ALL') active.push({ key: 'profile_completeness', label: `Profile: ${filters.profile_completeness}%` });
    
    if (filters.activity_status === 'NEVER_ORDERED') active.push({ key: 'activity_status', label: 'Never Ordered' });
    if (filters.activity_status === 'NEVER_PAID') active.push({ key: 'activity_status', label: 'Never Paid' });
    if (filters.activity_status === 'STALE_30_DAYS') active.push({ key: 'activity_status', label: 'Stale (>30 Days)' });

    return active;
  }, [filters, teamMembers]);

  const removeFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: key === 'missing_gst' || key === 'show_duplicates' ? false : (key === 'search' ? '' : 'ALL') }));
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      owner_id: 'ALL',
      missing_gst: false,
      show_duplicates: false,
      financial_status: 'ALL',
      profile_completeness: 'ALL',
      activity_status: 'ALL'
    });
  };

  // Risk logic
  const getRiskLevel = (c) => {
    if (!c.outstanding_balance || c.outstanding_balance <= 0) return 'Good';
    if (c.credit_limit && c.outstanding_balance > c.credit_limit) return 'High Risk';
    const daysSincePayment = c.last_payment_date ? (new Date() - new Date(c.last_payment_date)) / (1000 * 60 * 60 * 24) : 999;
    if (c.outstanding_balance > 50000 && daysSincePayment > 30) return 'High Risk';
    return 'Due';
  };

  const getRiskBadge = (c) => {
    const level = getRiskLevel(c);
    if (level === 'Good') return <span className="badge badge-success">Good</span>;
    if (level === 'Due') return <span className="badge badge-warning">Due</span>;
    return <span className="badge badge-danger">High Risk</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  // Duplicate Modal Logic (same as before)
  const openReviewModal = (primaryCustomer) => {
    const childIds = duplicates[primaryCustomer.id] || [];
    const childCustomers = customers.filter(c => childIds.includes(c.id));
    if (childCustomers.length > 0) {
      setMergingCandidates({ primary: primaryCustomer, children: childCustomers });
      setReviewModalOpen(true);
    }
  };

  const executeMerge = async (duplicateId) => {
    if (!window.confirm('Are you sure you want to merge these records? This cannot be undone.')) return;
    setMergeLoading(true);
    try {
      const { error } = await supabase.rpc('merge_customers', { primary_id: mergingCandidates.primary.id, duplicate_id: duplicateId });
      if (error) throw error;
      await logActivity({ module: 'Customers', actionType: 'UPDATED', entityId: mergingCandidates.primary.id, summary: `Merged duplicate customer into this record.` });
      alert('Successfully merged!');
      setReviewModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert('Merge failed: ' + err.message);
    } finally {
      setMergeLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      {/* 1. Header */}
      <div className="page-header" style={{flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Users size={28}/> Customers</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Manage and filter your CRM parties securely.</p>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <button className="btn btn-secondary" onClick={fetchCustomers}>Refresh</button>
          <Link to="/customers/new" className="btn btn-primary"><Plus size={18} /> Add Customer</Link>
        </div>
      </div>

      {/* 2. Unified Filter Toolbar */}
      <div className="glass-panel" style={{margin: '1.5rem 0', padding: '1rem 1.5rem'}}>
        <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center'}}>
          
          <div style={{position: 'relative', flex: '1 1 300px', minWidth: '250px'}}>
            <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
            <input 
              type="text" 
              placeholder="Search customers..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              style={{paddingLeft: '2.75rem', width: '100%', paddingRight: '1rem'}}
            />
          </div>

          <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center'}}>
            <select className="filter-select" value={filters.owner_id} onChange={e => setFilters(p => ({...p, owner_id: e.target.value}))}>
              <option value="ALL">All Owners</option>
              <option value="UNASSIGNED">Unassigned Only</option>
              {teamMembers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>

            <select className="filter-select" value={filters.financial_status} onChange={e => setFilters(p => ({...p, financial_status: e.target.value}))}>
              <option value="ALL">All Financials</option>
              <option value="OUTSTANDING">Has Outstanding</option>
              <option value="NO_CREDIT_LIMIT">No Credit Limit</option>
            </select>

            <select className="filter-select" value={filters.activity_status} onChange={e => setFilters(p => ({...p, activity_status: e.target.value}))}>
              <option value="ALL">All Activity</option>
              <option value="STALE_30_DAYS">Stale (&gt;30 Days)</option>
              <option value="NEVER_ORDERED">Never Ordered</option>
              <option value="NEVER_PAID">Never Paid</option>
            </select>

            <select className="filter-select" value={filters.profile_completeness} onChange={e => setFilters(p => ({...p, profile_completeness: e.target.value}))}>
              <option value="ALL">Profile: All</option>
              <option value="0-25">0-25% Complete</option>
              <option value="26-50">26-50% Complete</option>
              <option value="51-75">51-75% Complete</option>
              <option value="76-100">76-100% Complete</option>
            </select>
          </div>
        </div>
        
        {/* Quick Toggles */}
        <div style={{display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
           <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'}}>
              <input type="checkbox" checked={filters.missing_gst} onChange={e => setFilters(p => ({...p, missing_gst: e.target.checked}))} />
              Missing GST
           </label>
           <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem'}}>
              <input type="checkbox" checked={filters.show_duplicates} onChange={e => setFilters(p => ({...p, show_duplicates: e.target.checked}))} />
              Possible Duplicates
           </label>
        </div>
      </div>

      {/* 3. Active Chips Row */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
        <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
          {activeFilters.length > 0 ? (
            <>
              <span className="text-secondary" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', marginRight: '0.5rem'}}><Filter size={14} style={{marginRight: '0.25rem'}}/> Active Filters:</span>
              {activeFilters.map(af => (
                <span key={af.key} className="badge badge-active" style={{display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                  {af.label}
                  <button onClick={() => removeFilter(af.key)} style={{background:'none',border:'none',color:'inherit',cursor:'pointer',display:'flex',alignItems:'center'}}><X size={12}/></button>
                </span>
              ))}
              <button onClick={clearAllFilters} className="btn-link" style={{fontSize: '0.85rem'}}>Clear All</button>
            </>
          ) : (
            <span className="text-secondary" style={{fontSize: '0.85rem'}}>No active filters.</span>
          )}
        </div>
        <div className="text-secondary" style={{fontSize: '0.9rem', fontWeight: 500}}>
          Showing {customers.length} {customers.length !== totalCount ? `of ~${totalCount}` : ''} customers
        </div>
      </div>

      {/* 4. Bulk Action Bar */}
      {selectedRows.size > 0 && (
        <div className="glass-panel slide-up" style={{padding: '0.75rem 1.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--primary-light)', border: '1px solid var(--primary)'}}>
          <div style={{fontWeight: 600, color: 'var(--text-primary)'}}>
            {selectedRows.size} customers selected
          </div>
          <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
            <select value={bulkAssignTarget} onChange={e => setBulkAssignTarget(e.target.value)} style={{padding: '0.4rem', borderRadius: '4px'}}>
              <option value="">-- Select Owner to Assign --</option>
              <option value="UNASSIGNED">Remove Assignment (Unassigned)</option>
              {teamMembers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>
            <button className="btn btn-primary" onClick={handleBulkAssign} disabled={bulkActionLoading}>
              {bulkActionLoading ? 'Assigning...' : 'Bulk Assign'}
            </button>
          </div>
        </div>
      )}

      {/* 5. Data Table */}
      <div className="data-table-container">
        {error ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}><p>{error}</p><button className="btn btn-secondary" onClick={fetchCustomers}>Try Again</button></div>
        ) : loading && customers.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Loading...</div>
        ) : customers.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <Building2 size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <h3>No customers match criteria</h3>
            <p>Try adjusting or clearing your filters.</p>
            <button className="btn btn-secondary" style={{marginTop:'1rem'}} onClick={clearAllFilters}>Clear Filters</button>
          </div>
        ) : (
          <table className="data-table mobile-cards-table" style={{minWidth: '1000px'}}>
            <thead>
              <tr>
                <th style={{width: '40px', textAlign: 'center'}}>
                  <input type="checkbox" checked={selectedRows.size === customers.length && customers.length > 0} onChange={toggleAllSelection} />
                </th>
                <th style={{width: '25%', cursor: 'pointer'}} onClick={() => handleSort('display_name')}>
                  Customer {getSortIcon('display_name')}
                </th>
                <th style={{width: '25%', cursor: 'pointer'}} onClick={() => handleSort('outstanding_balance')}>
                  Financials {getSortIcon('outstanding_balance')}
                </th>
                <th style={{width: '20%', cursor: 'pointer'}} onClick={() => handleSort('last_order_date')}>
                  Activity {getSortIcon('last_order_date')}
                </th>
                <th style={{width: '15%', cursor: 'pointer'}} onClick={() => handleSort('owner_name')}>
                  Assigned Owner {getSortIcon('owner_name')}
                </th>
                <th style={{width: '15%'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <React.Fragment key={c.id}>
                  <tr style={{background: selectedRows.has(c.id) ? 'rgba(255,255,255,0.05)' : (c.isDuplicateChild ? 'var(--bg-surface-hover)' : 'transparent'), transition: 'background 0.2s'}}>
                    <td data-label="Select" style={{textAlign: 'center'}}>
                      <input type="checkbox" checked={selectedRows.has(c.id)} onChange={() => toggleRowSelection(c.id)} />
                    </td>
                    <td data-label="Customer">
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem'}}>
                        <Link to={`/customers/${c.id}`} style={{fontWeight: 600, color: 'var(--primary)', textDecoration: 'none'}}>{c.display_name}</Link>
                        {c.isDuplicatePrimary && (
                          <span className="badge badge-warning" style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem', cursor: 'pointer'}} onClick={() => openReviewModal(c)}>Possible Duplicate</span>
                        )}
                        {c.isDuplicateChild && <span className="badge badge-neutral" style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem'}}>Duplicate Child</span>}
                      </div>
                      
                      {c.gst_number ? (
                        <div className="text-secondary" style={{fontSize: '0.85rem'}}>GST: {c.gst_number}</div>
                      ) : (
                        <div className="text-danger" style={{fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}><AlertTriangle size={12} /> Missing GST</div>
                      )}
                      
                      <div style={{marginTop: '0.5rem', maxWidth: '150px'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem'}} className="text-secondary">
                          <span>Profile</span>
                          <span>{c.profile_completeness}%</span>
                        </div>
                        <div style={{width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden'}}>
                          <div style={{width: `${c.profile_completeness}%`, height: '100%', background: c.profile_completeness === 100 ? 'var(--success)' : (c.profile_completeness > 50 ? 'var(--warning)' : 'var(--danger)')}} />
                        </div>
                      </div>
                    </td>

                    <td data-label="Financials">
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="text-secondary" style={{fontSize: '0.85rem'}}>Outstanding:</span>
                          <span style={{fontWeight: 600, color: c.outstanding_balance > 0 ? 'var(--danger)' : 'inherit'}}>{formatCurrency(c.outstanding_balance)}</span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="text-secondary" style={{fontSize: '0.85rem'}}>Limit:</span>
                          <span style={{fontSize: '0.9rem'}}>{c.credit_limit ? formatCurrency(c.credit_limit) : 'N/A'}</span>
                        </div>
                        <div style={{marginTop: '0.25rem'}}>{getRiskBadge(c)}</div>
                      </div>
                    </td>

                    <td data-label="Activity" style={{fontSize: '0.85rem'}}>
                      <div style={{marginBottom: '0.25rem'}}>
                        <span className="text-secondary">Last Order:</span><br/>
                        {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : <span className="text-muted">Never</span>}
                      </div>
                      <div>
                        <span className="text-secondary">Last Payment:</span><br/>
                        {c.last_payment_date ? new Date(c.last_payment_date).toLocaleDateString() : <span className="text-muted">Never</span>}
                      </div>
                    </td>

                    <td data-label="Assigned Owner">
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.35rem', alignItems: 'flex-start'}}>
                        <div className={`badge ${!c.owner_name ? 'badge-danger' : 'badge-neutral'}`} style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                          {c.owner_name || 'Unassigned'}
                        </div>
                        {c.owner_name && c.assignment_notification_status && (
                          <span style={{fontSize: '0.65rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', color: c.assignment_notification_status === 'SENT' ? 'var(--success)' : (c.assignment_notification_status === 'FAILED' ? 'var(--danger)' : 'var(--warning)')}}>
                            {c.assignment_notification_status === 'SENT' && <CheckCircle2 size={10}/>}
                            {c.assignment_notification_status}
                          </span>
                        )}
                      </div>
                    </td>

                    <td data-label="Action">
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <Link to={`/customers/${c.id}`} className="btn btn-primary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem', textAlign: 'center'}}>View</Link>
                        <button className="btn btn-secondary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--bg-surface-hover)'}} onClick={() => setExpandedRow(c.id)}>
                          Quick View
                        </button>
                      </div>
                    </td>
                  </tr>


                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* REVIEW DUPLICATE MODAL */}
      {reviewModalOpen && mergingCandidates && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'}}>
          <div className="glass-panel slide-up" style={{width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <h2>Review Duplicates</h2>
              <button className="btn btn-secondary" onClick={() => setReviewModalOpen(false)}>Close</button>
            </div>
            
            <p className="text-warning" style={{marginBottom: '2rem'}}><AlertTriangle size={16} style={{display: 'inline', verticalAlign: 'text-bottom'}} /> Merging will move all requirements, transactions, and activity to the Primary Record and delete the duplicate. This action cannot be undone. Requires Admin role.</p>

            <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
              {/* PRIMARY */}
              <div style={{flex: 1, minWidth: '300px', border: '2px solid var(--primary)', borderRadius: '12px', padding: '1.5rem'}}>
                <div className="badge badge-active" style={{marginBottom: '1rem'}}>Primary Record (Keeper)</div>
                <h3>{mergingCandidates.primary.display_name}</h3>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><MapPin size={14}/> {mergingCandidates.primary.city || 'No City'}</p>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><Phone size={14}/> {mergingCandidates.primary.mobile || 'No Mobile'}</p>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>GST: {mergingCandidates.primary.gst_number || 'N/A'}</p>
              </div>

              {/* DUPLICATES */}
              <div style={{flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {mergingCandidates.children.map(dup => (
                  <div key={dup.id} style={{border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', background: 'var(--bg-surface-hover)'}}>
                    <div className="badge badge-danger" style={{marginBottom: '1rem'}}>Duplicate to Delete</div>
                    <h3>{dup.display_name}</h3>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><MapPin size={14}/> {dup.city || 'No City'}</p>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><Phone size={14}/> {dup.mobile || 'No Mobile'}</p>
                    <button className="btn btn-primary" style={{width: '100%', marginTop: '1rem'}} onClick={() => executeMerge(dup.id)} disabled={userProfile?.role !== 'Admin' || mergeLoading}>
                      {userProfile?.role !== 'Admin' ? 'Admin Required' : (mergeLoading ? 'Merging...' : 'Merge into Primary')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK VIEW DRAWER */}
      {expandedRow && (
        <div className="slide-over-backdrop" onClick={() => setExpandedRow(null)}>
          <div className="slide-over-drawer" onClick={e => e.stopPropagation()}>
            {(() => {
              const c = customers.find(x => x.id === expandedRow);
              if (!c) return null;
              return (
                <>
                  <div className="drawer-header">
                    <h3 style={{margin: 0}}>{c.display_name}</h3>
                    <button onClick={() => setExpandedRow(null)} className="btn-icon"><X size={20}/></button>
                  </div>
                  <div className="drawer-body">
                    <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
                      <div className="glass-panel" style={{padding: '1.5rem', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)'}}>
                        <h4 style={{marginBottom: '1rem'}}>Ledger Summary</h4>
                        <table style={{width: '100%', fontSize: '0.85rem'}}>
                          <tbody>
                            <tr><td className="text-secondary" style={{padding: '0.25rem 0'}}>Total Billed</td><td style={{textAlign: 'right'}}>{formatCurrency(c.total_billed)}</td></tr>
                            <tr><td className="text-secondary" style={{padding: '0.25rem 0'}}>Total Received</td><td style={{textAlign: 'right'}}>{formatCurrency(c.total_received)}</td></tr>
                            <tr style={{fontWeight: 600, borderTop: '1px solid var(--border)'}}><td style={{padding: '0.5rem 0'}}>Current Balance</td><td style={{textAlign: 'right', color: c.outstanding_balance > 0 ? 'var(--danger)' : 'inherit'}}>{formatCurrency(c.outstanding_balance)}</td></tr>
                          </tbody>
                        </table>
                      </div>
                      <div className="glass-panel" style={{padding: '1.5rem', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)'}}>
                        <h4 style={{marginBottom: '1rem'}}>Contact Info</h4>
                        <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}><strong>Legal Name:</strong> {c.legal_or_core_name || 'N/A'}</p>
                        <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}><strong>Mobile:</strong> {c.mobile || 'N/A'}</p>
                        <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}><strong>City:</strong> {c.city || 'N/A'} {c.state ? `, ${c.state}` : ''}</p>
                        <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}><strong>WhatsApp:</strong> {c.whatsapp || 'N/A'}</p>
                      </div>
                      <Link to={`/customers/${c.id}`} className="btn btn-primary" style={{justifyContent: 'center', marginTop: 'auto'}}>Open Full Profile</Link>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
