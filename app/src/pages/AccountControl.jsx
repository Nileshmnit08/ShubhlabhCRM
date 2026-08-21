import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert, Search, Filter, AlertTriangle, CheckCircle2, AlertCircle, Clock, ChevronDown, ChevronRight, DollarSign } from 'lucide-react';

export default function AccountControl() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Filters
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterHealth, setFilterHealth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [owners, setOwners] = useState([]);

  // Expanded row state
  const [expandedRows, setExpandedRows] = useState(new Set());

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase.from('v_management_account_control').select('*').order('display_name');
      if (fetchErr) throw fetchErr;

      setAccounts(data || []);

      // Extract unique owners for filter
      const uniqueOwners = new Set();
      data?.forEach(r => {
        if (r.owner_name) uniqueOwners.add(r.owner_name);
      });
      setOwners(Array.from(uniqueOwners).sort());

    } catch (err) {
      console.error(err);
      setError("Failed to load management account control data.");
    } finally {
      setLoading(false);
    }
  }

  const toggleRow = (id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredAccounts = accounts.filter(acc => {
    if (filterOwner !== 'All' && acc.owner_name !== filterOwner) return false;
    if (filterStatus !== 'All' && acc.crm_status !== filterStatus) return false;
    if (filterHealth !== 'All' && acc.health_status !== filterHealth) return false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!acc.display_name?.toLowerCase().includes(sq) && !acc.party_id?.toLowerCase().includes(sq)) return false;
    }
    return true;
  });

  if (userProfile?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Account Control...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldAlert size={24} className="text-primary" /> Management Account Control
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Consolidated view of customer execution, risks, and follow-up workload.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
             <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
             <input
               type="text"
               className="input"
               placeholder="Search accounts..."
               style={{ paddingLeft: '2.5rem', width: '100%' }}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={18} className="text-muted" />
            <select className="input" value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ padding: '0.5rem', minWidth: '120px' }}>
              <option value="All">All Owners</option>
              {owners.map(o => <option key={o} value={o}>{o}</option>)}
              <option value="">Unassigned</option>
            </select>
            <select className="input" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="All">All CRM Status</option>
              <option value="Active">Active</option>
              <option value="Dormant">Dormant</option>
              <option value="At Risk">At Risk</option>
            </select>
            <select className="input" value={filterHealth} onChange={e => setFilterHealth(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="All">All Health Status</option>
              <option value="Healthy">Healthy</option>
              <option value="At Risk">At Risk</option>
              <option value="Inactive">Inactive</option>
              <option value="Unknown">Unknown</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <th style={{ padding: '1rem', width: '40px' }}></th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Account Name</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Owner</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase' }}>Health & Risk</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'center' }}>Open Opps</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Payment Workload</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAccounts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No accounts found matching filters.
                </td>
              </tr>
            ) : filteredAccounts.map(acc => {
              const isExpanded = expandedRows.has(acc.party_id);
              const hasRisks = acc.risk_factors && acc.risk_factors.length > 0;
              return (
                <React.Fragment key={acc.party_id}>
                  <tr style={{ borderBottom: isExpanded ? 'none' : '1px solid var(--border)', background: isExpanded ? 'var(--bg-surface-hover)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleRow(acc.party_id)}>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{acc.display_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status: {acc.crm_status}</div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      {acc.owner_name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                       {acc.health_status === 'Healthy' && <span className="badge badge-success"><CheckCircle2 size={12}/> Healthy</span>}
                       {acc.health_status === 'At Risk' && <span className="badge badge-danger"><AlertTriangle size={12}/> At Risk</span>}
                       {acc.health_status === 'Inactive' && <span className="badge badge-dormant">Inactive</span>}
                       {acc.health_status === 'Unknown' && <span className="badge badge-warning">Unknown</span>}
                       
                       {hasRisks && (
                         <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                           {acc.risk_factors.length} Risk Factor(s)
                         </div>
                       )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                      {acc.open_opportunities_count > 0 ? (
                        <span className="badge badge-primary">{acc.open_opportunities_count}</span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>0</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      {acc.outstanding_balance > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                            <DollarSign size={14}/> {Number(acc.outstanding_balance).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                            {acc.next_payment_followup_date ? `Follow-up: ${acc.next_payment_followup_date}` : 'No Payment Follow-up'}
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Cleared</span>
                      )}
                    </td>
                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                      <Link to={`/customers/${acc.party_id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }} onClick={(e) => e.stopPropagation()}>
                        View 360
                      </Link>
                    </td>
                  </tr>
                  
                  {isExpanded && (
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)' }}>
                      <td></td>
                      <td colSpan="6" style={{ padding: '0 1rem 1rem 1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '4px' }}>
                          
                          <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Risk Evidence</h4>
                            {hasRisks ? (
                              <ul style={{ margin: 0, paddingLeft: '1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                {acc.risk_factors.map((rf, idx) => (
                                  <li key={idx} style={{ color: rf.includes('Overdue') || rf.includes('Unresolved') ? 'var(--danger)' : 'inherit' }}>
                                    {rf}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div style={{ color: 'var(--success)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <CheckCircle2 size={16}/> No active risk factors identified.
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Account Details</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                              <div><strong>Relationship:</strong> {acc.relationship_type || 'Customer'}</div>
                              <div><strong>Health Reason:</strong> {acc.health_reason || 'N/A'}</div>
                              <div><strong>Last Payment:</strong> {acc.last_payment_date || 'N/A'}</div>
                              {acc.next_payment_followup_status && (
                                <div><strong>Payment Task Status:</strong> <span className={`badge badge-${acc.next_payment_followup_status === 'Pending' ? 'warning' : 'primary'}`} style={{fontSize: '0.7rem'}}>{acc.next_payment_followup_status}</span></div>
                              )}
                            </div>
                          </div>
                          
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
