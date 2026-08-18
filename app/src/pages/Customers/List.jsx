import React, { useEffect, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Search, Plus, Building2, AlertTriangle, IndianRupee, MapPin, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';
import { AuthContext } from '../../AuthContext';
import { logActivity } from '../../lib/activityLogger';

export default function CustomerList() {
  const { t } = useContext(LanguageContext);
  const { userProfile } = useContext(AuthContext);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [search, setSearch] = useState('');
  const [filterMissing, setFilterMissing] = useState(false);
  const [filterDuplicate, setFilterDuplicate] = useState(false);
  const [filterHighRisk, setFilterHighRisk] = useState(false);
  
  const [expandedRow, setExpandedRow] = useState(null);
  
  // Duplicate Management
  const [duplicates, setDuplicates] = useState({}); // primary_id -> [duplicate_ids]
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [mergingCandidates, setMergingCandidates] = useState(null);
  const [mergeLoading, setMergeLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search, filterMissing, filterDuplicate, filterHighRisk]);

  async function fetchCustomers() {
    setLoading(true);
    setError(null);
    try {
      // Query our new master view
      let query = supabase.from('v_customer_master').select('*').order('created_at', { ascending: false }).limit(200);
      
      const trimmedSearch = search.trim();
      if (trimmedSearch) {
        query = query.or(`display_name.ilike.%${trimmedSearch}%,legal_or_core_name.ilike.%${trimmedSearch}%,mobile.ilike.%${trimmedSearch}%,city.ilike.%${trimmedSearch}%,gst_number.ilike.%${trimmedSearch}%,owner_name.ilike.%${trimmedSearch}%`);
      }
      
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      
      let processedData = data || [];

      // JS-side Duplicate Detection Engine
      const dupMap = {};
      const mobileGroups = {};
      const nameGroups = {};

      processedData.forEach(c => {
        // Group by exact mobile
        if (c.mobile && c.mobile.length >= 10) {
          const normMob = c.mobile.replace(/\D/g, '').slice(-10);
          if (!mobileGroups[normMob]) mobileGroups[normMob] = [];
          mobileGroups[normMob].push(c.id);
        }
        
        // Group by normalized name (very naive fuzzy)
        if (c.display_name) {
          const normName = c.display_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normName.length > 5) { // Avoid grouping very short names
            if (!nameGroups[normName]) nameGroups[normName] = [];
            nameGroups[normName].push(c.id);
          }
        }
      });

      // Populate dupMap
      const addDups = (group) => {
        if (group.length > 1) {
          // first one is arbitrary primary for UI grouping
          const primaryId = group[0];
          if (!dupMap[primaryId]) dupMap[primaryId] = new Set();
          for (let i = 1; i < group.length; i++) {
            dupMap[primaryId].add(group[i]);
          }
        }
      };

      Object.values(mobileGroups).forEach(addDups);
      Object.values(nameGroups).forEach(addDups);

      // Convert Sets to Arrays
      const finalDups = {};
      const duplicateChildIds = new Set();
      Object.keys(dupMap).forEach(key => {
        const arr = Array.from(dupMap[key]);
        finalDups[key] = arr;
        arr.forEach(id => duplicateChildIds.add(id));
      });
      setDuplicates(finalDups);

      // Attach duplicate flags to rows
      processedData = processedData.map(c => ({
        ...c,
        isDuplicatePrimary: !!finalDups[c.id],
        isDuplicateChild: duplicateChildIds.has(c.id)
      }));

      // Apply Filters
      if (filterDuplicate) {
        processedData = processedData.filter(c => c.isDuplicatePrimary || c.isDuplicateChild);
      }
      if (filterMissing) {
        processedData = processedData.filter(c => !c.mobile || !c.city || !c.gst_number);
      }
      if (filterHighRisk) {
        processedData = processedData.filter(c => getRiskLevel(c) === 'High Risk');
      }

      setCustomers(processedData);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Failed to load customers. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const getRiskLevel = (c) => {
    if (!c.outstanding_balance || c.outstanding_balance <= 0) return 'Good';
    
    // Simplistic risk logic
    if (c.credit_limit && c.outstanding_balance > c.credit_limit) return 'High Risk';
    
    // If outstanding > 50k and no payment in 30 days
    const daysSincePayment = c.last_payment_date ? (new Date() - new Date(c.last_payment_date)) / (1000 * 60 * 60 * 24) : 999;
    if (c.outstanding_balance > 50000 && daysSincePayment > 30) return 'High Risk';
    
    return 'Due';
  };

  const getRiskBadge = (c) => {
    const level = getRiskLevel(c);
    if (level === 'Good') return <span className="badge badge-success">{t('customers.risk.good') || 'Good'}</span>;
    if (level === 'Due') return <span className="badge badge-warning">{t('customers.risk.due') || 'Due'}</span>;
    return <span className="badge badge-danger">{t('customers.risk.highRisk') || 'High Risk'}</span>;
  };

  const openReviewModal = (primaryCustomer) => {
    // Find all children
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
      const { error } = await supabase.rpc('merge_customers', {
        primary_id: mergingCandidates.primary.id,
        duplicate_id: duplicateId
      });
      if (error) throw error;

      await logActivity({
        module: 'Customers',
        actionType: 'UPDATED',
        entityId: mergingCandidates.primary.id,
        summary: `Merged duplicate customer into this record.`
      });

      alert('Successfully merged!');
      setReviewModalOpen(false);
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Merge failed: ' + err.message);
    } finally {
      setMergeLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{flexWrap: 'wrap', gap: '1rem'}}>
        <div>
          <h1 style={{margin: 0}}>{t('customers.title') || 'Customers'}</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>
            {t('customers.subtitle') || 'Manage your CRM parties, relationships, and contacts.'}
          </p>
        </div>
        
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <button className="btn btn-secondary" onClick={fetchCustomers}>Refresh</button>
          <Link to="/customers/new" className="btn btn-primary">
            <Plus size={18} /> {t('customers.add') || 'Add Customer'}
          </Link>
        </div>
      </div>

      <div className="glass-panel" style={{marginBottom: '2rem', padding: '1.5rem'}}>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap'}}>
          <div style={{position: 'relative', flex: '1 1 300px', maxWidth: '400px'}}>
            <Search size={18} style={{position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)'}} />
            <input 
              type="text" 
              placeholder={t('customers.search') || "Search by name, phone, or GST..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{paddingLeft: '2.75rem', width: '100%'}}
            />
          </div>
          
          <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
            <button 
              className={`badge ${filterDuplicate ? 'badge-warning' : 'badge-neutral'}`} 
              onClick={() => setFilterDuplicate(!filterDuplicate)} 
              style={{cursor: 'pointer', border: 'none'}}
            >
              Duplicates
            </button>
            <button 
              className={`badge ${filterMissing ? 'badge-danger' : 'badge-neutral'}`} 
              onClick={() => setFilterMissing(!filterMissing)} 
              style={{cursor: 'pointer', border: 'none'}}
            >
              Missing Info
            </button>
            <button 
              className={`badge ${filterHighRisk ? 'badge-danger' : 'badge-neutral'}`} 
              onClick={() => setFilterHighRisk(!filterHighRisk)} 
              style={{cursor: 'pointer', border: 'none'}}
            >
              High Risk
            </button>
          </div>
        </div>
      </div>

      <div className="data-table-container">
        {error ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>
            <p>{error}</p>
            <button className="btn btn-secondary" style={{marginTop: '1rem'}} onClick={fetchCustomers}>Try Again</button>
          </div>
        ) : loading && customers.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Loading...</div>
        ) : customers.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <Building2 size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <h3>{t('customers.empty') || 'No customers found'}</h3>
            <p>{t('customers.emptySub') || 'Get started by creating your first CRM party.'}</p>
          </div>
        ) : (
          <table className="data-table" style={{minWidth: '1000px'}}>
            <thead>
              <tr>
                <th style={{width: '35%'}}>{t('customers.col.customer') || 'Customer Info'}</th>
                <th style={{width: '25%'}}>{t('customers.col.finance') || 'Financials'}</th>
                <th style={{width: '20%'}}>{t('customers.col.activity') || 'Activity'}</th>
                <th style={{width: '10%'}}>{t('customers.col.owner') || 'Owner'}</th>
                <th style={{width: '10%'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <React.Fragment key={c.id}>
                  <tr style={{background: c.isDuplicateChild ? 'var(--bg-surface-hover)' : 'transparent'}}>
                    <td>
                      <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem'}}>
                        <Link to={`/customers/${c.id}`} style={{fontWeight: 600, color: 'var(--primary)', textDecoration: 'none'}}>
                          {c.display_name}
                        </Link>
                        {c.isDuplicatePrimary && (
                          <span className="badge badge-warning" style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem', cursor: 'pointer'}} onClick={() => openReviewModal(c)}>
                            {t('customers.badge.duplicate') || 'Possible Duplicate'}
                          </span>
                        )}
                        {c.isDuplicateChild && (
                          <span className="badge badge-neutral" style={{fontSize: '0.7rem', padding: '0.1rem 0.4rem'}}>
                            Duplicate Child
                          </span>
                        )}
                      </div>
                      
                      {c.gst_number ? (
                        <div className="text-secondary" style={{fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                          GST: {c.gst_number}
                        </div>
                      ) : (
                        <div className="text-danger" style={{fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
                          <AlertTriangle size={12} /> {t('customers.missing.gst') || 'Missing GST'}
                        </div>
                      )}
                      
                      {/* Profile Completeness Bar */}
                      <div style={{marginTop: '0.5rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.2rem'}} className="text-secondary">
                          <span>{t('customers.profile.completeness') || 'Profile Completeness'}</span>
                          <span>{c.profile_completeness}%</span>
                        </div>
                        <div style={{width: '100%', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden'}}>
                          <div style={{
                            width: `${c.profile_completeness}%`, 
                            height: '100%', 
                            background: c.profile_completeness === 100 ? 'var(--success)' : (c.profile_completeness > 50 ? 'var(--warning)' : 'var(--danger)')
                          }} />
                        </div>
                      </div>
                    </td>

                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="text-secondary" style={{fontSize: '0.85rem'}}>{t('customers.finance.outstanding') || 'Outstanding'}:</span>
                          <span style={{fontWeight: 600, color: c.outstanding_balance > 0 ? 'var(--danger)' : 'inherit'}}>
                            {formatCurrency(c.outstanding_balance)}
                          </span>
                        </div>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                          <span className="text-secondary" style={{fontSize: '0.85rem'}}>{t('customers.finance.limit') || 'Limit'}:</span>
                          <span style={{fontSize: '0.9rem'}}>{c.credit_limit ? formatCurrency(c.credit_limit) : 'N/A'}</span>
                        </div>
                        <div style={{marginTop: '0.25rem'}}>
                          {getRiskBadge(c)}
                        </div>
                      </div>
                    </td>

                    <td style={{fontSize: '0.85rem'}}>
                      <div style={{marginBottom: '0.25rem'}}>
                        <span className="text-secondary">Last Order:</span><br/>
                        {c.last_order_date ? new Date(c.last_order_date).toLocaleDateString() : 'Never'}
                      </div>
                      <div>
                        <span className="text-secondary">Last Payment:</span><br/>
                        {c.last_payment_date ? new Date(c.last_payment_date).toLocaleDateString() : 'Never'}
                      </div>
                    </td>

                    <td>
                      <div className="badge badge-neutral" style={{maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {c.owner_name || 'Unassigned'}
                      </div>
                    </td>

                    <td>
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                        <Link to={`/customers/${c.id}`} className="btn btn-primary" style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem', textAlign: 'center'}}>
                          View Details
                        </Link>
                        <button 
                          className="btn btn-secondary" 
                          style={{padding: '0.25rem 0.5rem', fontSize: '0.8rem', background: 'var(--bg-surface-hover)'}}
                          onClick={() => setExpandedRow(expandedRow === c.id ? null : c.id)}
                        >
                          {t('customers.action.quickView') || 'Quick View'}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* QUICK VIEW ROW */}
                  {expandedRow === c.id && (
                    <tr>
                      <td colSpan="5" style={{padding: 0, border: 'none'}}>
                        <div style={{padding: '1.5rem', background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)', borderTop: '1px solid var(--border)'}}>
                          <div style={{display: 'flex', gap: '2rem'}}>
                            <div style={{flex: 1}}>
                              <h4 style={{marginBottom: '1rem'}}>Ledger Summary</h4>
                              <table style={{width: '100%', fontSize: '0.85rem'}}>
                                <tbody>
                                  <tr>
                                    <td className="text-secondary" style={{padding: '0.25rem 0'}}>{t('customers.finance.billed') || 'Total Billed'}</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(c.total_billed)}</td>
                                  </tr>
                                  <tr>
                                    <td className="text-secondary" style={{padding: '0.25rem 0'}}>{t('customers.finance.received') || 'Total Received'}</td>
                                    <td style={{textAlign: 'right'}}>{formatCurrency(c.total_received)}</td>
                                  </tr>
                                  <tr style={{fontWeight: 600, borderTop: '1px solid var(--border)'}}>
                                    <td style={{padding: '0.5rem 0'}}>Current Balance</td>
                                    <td style={{textAlign: 'right', color: c.outstanding_balance > 0 ? 'var(--danger)' : 'inherit'}}>
                                      {formatCurrency(c.outstanding_balance)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                            <div style={{flex: 1}}>
                              <h4 style={{marginBottom: '1rem'}}>Contact Info</h4>
                              <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
                                <strong>Legal Name:</strong> {c.legal_or_core_name || 'N/A'}
                              </p>
                              <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
                                <strong>Mobile:</strong> {c.mobile || 'N/A'}
                              </p>
                              <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
                                <strong>City:</strong> {c.city || 'N/A'} {c.state ? `, ${c.state}` : ''}
                              </p>
                              <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>
                                <strong>WhatsApp:</strong> {c.whatsapp || 'N/A'}
                              </p>
                            </div>
                            <div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                               <Link to={`/customers/${c.id}`} className="btn btn-primary">Open Full Profile</Link>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* REVIEW DUPLICATE MODAL */}
      {reviewModalOpen && mergingCandidates && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
        }}>
          <div className="glass-panel" style={{width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
              <h2>Review Duplicates</h2>
              <button className="btn btn-secondary" onClick={() => setReviewModalOpen(false)}>Close</button>
            </div>
            
            <p className="text-warning" style={{marginBottom: '2rem'}}>
              <AlertTriangle size={16} style={{display: 'inline', verticalAlign: 'text-bottom'}} /> 
              Merging will move all requirements, transactions, and activity to the Primary Record and delete the duplicate. This action cannot be undone. Requires Admin role.
            </p>

            <div style={{display: 'flex', gap: '2rem'}}>
              {/* PRIMARY */}
              <div style={{flex: 1, border: '2px solid var(--primary)', borderRadius: '12px', padding: '1.5rem'}}>
                <div className="badge badge-active" style={{marginBottom: '1rem'}}>Primary Record (Keeper)</div>
                <h3>{mergingCandidates.primary.display_name}</h3>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><MapPin size={14}/> {mergingCandidates.primary.city || 'No City'}</p>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><Phone size={14}/> {mergingCandidates.primary.mobile || 'No Mobile'}</p>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>GST: {mergingCandidates.primary.gst_number || 'N/A'}</p>
                <p className="text-secondary" style={{fontSize: '0.9rem', marginTop: '1rem'}}>Created: {new Date(mergingCandidates.primary.created_at).toLocaleDateString()}</p>
              </div>

              {/* DUPLICATES TO MERGE */}
              <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                {mergingCandidates.children.map(dup => (
                  <div key={dup.id} style={{border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', background: 'var(--bg-surface-hover)'}}>
                    <div className="badge badge-danger" style={{marginBottom: '1rem'}}>Duplicate to Delete</div>
                    <h3>{dup.display_name}</h3>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><MapPin size={14}/> {dup.city || 'No City'}</p>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}><Phone size={14}/> {dup.mobile || 'No Mobile'}</p>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>GST: {dup.gst_number || 'N/A'}</p>
                    <p className="text-secondary" style={{fontSize: '0.9rem', marginTop: '1rem'}}>Created: {new Date(dup.created_at).toLocaleDateString()}</p>
                    
                    <button 
                      className="btn btn-primary" 
                      style={{width: '100%', marginTop: '1rem'}} 
                      onClick={() => executeMerge(dup.id)}
                      disabled={userProfile?.role !== 'Admin' || mergeLoading}
                    >
                      {userProfile?.role !== 'Admin' ? 'Admin Required' : (mergeLoading ? 'Merging...' : t('customers.action.merge') || 'Merge into Primary')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
