import React, { useEffect, useState, useContext, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Users, AlertTriangle, Building2, MapPin, Phone, X, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../../AuthContext';

export default function DormantList() {
  const { userProfile } = useContext(AuthContext);
  const [candidates, setCandidates] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    review_state: 'PENDING', // PENDING, NOT_DORMANT, REVIEW_LATER, APPROVED_FOR_REACTIVATION, ALL
    owner_id: 'ALL'
  });

  // Slide-over drawer state
  const [expandedRow, setExpandedRow] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchTeamMembers();
    fetchDormantCandidates();
  }, []);

  useEffect(() => {
    fetchDormantCandidates();
  }, [filters]);

  async function fetchTeamMembers() {
    try {
      const { data } = await supabase.from('app_users').select('id, display_name').eq('is_active', true);
      if (data) setTeamMembers(data);
    } catch (err) {
      console.error('Error fetching team members:', err);
    }
  }

  async function fetchDormantCandidates() {
    setLoading(true);
    try {
      let query = supabase.from('v_dormant_candidates').select('*');

      if (filters.review_state !== 'ALL') {
        query = query.eq('review_state', filters.review_state);
      }

      if (filters.owner_id === 'UNASSIGNED') {
        query = query.is('assigned_owner_id', null);
      } else if (filters.owner_id !== 'ALL') {
        query = query.eq('assigned_owner_id', filters.owner_id);
      }

      // RLS safety check if needed, but the view should handle it or standard policies apply
      if (userProfile?.role !== 'Admin') {
         query = query.eq('assigned_owner_id', userProfile?.id);
      }

      query = query.order('days_inactive', { ascending: false, nullsFirst: false });
        
      const { data, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;
      
      setCandidates(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load dormant candidates.');
    } finally {
      setLoading(false);
    }
  }

  const handleReviewAction = async (party_id, outcome) => {
    if (!userProfile) return;
    setReviewLoading(true);
    try {
      const { error: insertErr } = await supabase.from('interactions').insert([{
        party_id,
        user_id: userProfile.id,
        channel: 'System',
        interaction_type: 'Dormant Review',
        outcome: outcome,
        note: reviewNote.trim() || null
      }]);
      
      if (insertErr) throw insertErr;
      
      setExpandedRow(null);
      setReviewNote('');
      fetchDormantCandidates();
    } catch (err) {
      console.error('Review failed', err);
      alert('Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  const getReviewBadge = (state) => {
    switch (state) {
      case 'PENDING': return <span className="badge badge-warning">Pending Review</span>;
      case 'NOT_DORMANT': return <span className="badge badge-success">Not Dormant</span>;
      case 'REVIEW_LATER': return <span className="badge badge-neutral">Review Later</span>;
      case 'APPROVED_FOR_REACTIVATION': return <span className="badge badge-primary">Reactivation Approved</span>;
      default: return <span className="badge badge-neutral">{state}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><AlertTriangle size={28} className="text-warning"/> Dormant Candidates</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Review and triage customers identified as dormant.</p>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <button className="btn btn-secondary" onClick={fetchDormantCandidates}>Refresh</button>
        </div>
      </div>

      <div className="glass-panel" style={{margin: '1.5rem 0', display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1.25rem', backgroundColor: 'var(--bg-surface)'}}>
        <div style={{flex: '1 1 200px'}}>
          <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>Review State</label>
          <select style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={filters.review_state} onChange={e => setFilters(p => ({...p, review_state: e.target.value}))}>
            <option value="PENDING">Pending Review (Action Required)</option>
            <option value="NOT_DORMANT">Not Dormant</option>
            <option value="REVIEW_LATER">Review Later</option>
            <option value="APPROVED_FOR_REACTIVATION">Approved for Reactivation</option>
            <option value="ALL">All States</option>
          </select>
        </div>
        
        {userProfile?.role === 'Admin' && (
          <div style={{flex: '1 1 200px'}}>
            <label style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block', fontWeight: 500}}>Assigned Staff</label>
            <select style={{width: '100%', height: '38px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', padding: '0 0.75rem', fontSize: '0.85rem', color: 'var(--text-primary)'}} value={filters.owner_id} onChange={e => setFilters(p => ({...p, owner_id: e.target.value}))}>
              <option value="ALL">All Staff</option>
              <option value="UNASSIGNED">Unassigned</option>
              {teamMembers.map(t => <option key={t.id} value={t.id}>{t.display_name}</option>)}
            </select>
          </div>
        )}
      </div>

      <div className="data-table-container" style={{marginTop: '1rem'}}>
        {error ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}><p>{error}</p><button className="btn btn-secondary" onClick={fetchDormantCandidates}>Try Again</button></div>
        ) : loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Scanning transaction history...</div>
        ) : candidates.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <Building2 size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <h3>No candidates found in this view</h3>
            <p>Try adjusting your filters.</p>
          </div>
        ) : (
          <table className="data-table mobile-cards-table">
            <thead>
              <tr>
                <th style={{width: '25%'}}>Customer</th>
                <th style={{width: '20%'}}>Last Sale Date</th>
                <th style={{width: '15%'}}>Days Inactive</th>
                <th style={{width: '20%'}}>Candidate Reason</th>
                <th style={{width: '20%'}}>Review State</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.party_id}>
                  <td data-label="Customer">
                    <button 
                      onClick={() => setExpandedRow(c.party_id)}
                      style={{background: 'none', border: 'none', fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginBottom: '0.25rem', cursor: 'pointer', padding: 0, textAlign: 'left'}}
                    >
                      {c.display_name}
                    </button>
                    <div className="text-secondary" style={{fontSize: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
                       {c.city && <span><MapPin size={12} style={{display: 'inline'}}/> {c.city}</span>}
                       {c.mobile && <span><Phone size={12} style={{display: 'inline'}}/> {c.mobile}</span>}
                    </div>
                    {c.owner_name && (
                       <div className="text-muted" style={{fontSize: '0.75rem', marginTop: '0.25rem'}}>Assigned: {c.owner_name}</div>
                    )}
                  </td>
                  <td data-label="Last Sale Date">
                    {c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : <span className="text-muted">None</span>}
                  </td>
                  <td data-label="Days Inactive">
                    {c.days_inactive !== null ? (
                      <strong style={{color: 'var(--warning)'}}>{c.days_inactive} days</strong>
                    ) : <span className="text-muted">N/A</span>}
                    {c.qualifying_tx_count > 0 && <div className="text-muted" style={{fontSize: '0.75rem', marginTop: '0.25rem'}}>{c.qualifying_tx_count} lifetime sales</div>}
                  </td>
                  <td data-label="Candidate Reason">
                    <span style={{whiteSpace: 'normal', lineHeight: 1.4, textAlign: 'left', display: 'inline-block', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>{c.candidate_reason}</span>
                  </td>
                  <td data-label="Review State">
                    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem'}}>
                      {getReviewBadge(c.review_state)}
                      {c.reviewed_at && (
                        <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                          by {c.reviewed_by_name} on {new Date(c.reviewed_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QUICK VIEW & REVIEW DRAWER */}
      {expandedRow && (
        <div className="slide-over-backdrop" onClick={() => setExpandedRow(null)}>
          <div className="slide-over-drawer" onClick={e => e.stopPropagation()}>
            {(() => {
              const c = candidates.find(x => x.party_id === expandedRow);
              if (!c) return null;
              return (
                <>
                  <div className="drawer-header">
                    <h3 style={{margin: 0}}>Dormant Candidate</h3>
                    <button onClick={() => setExpandedRow(null)} className="btn-icon"><X size={20}/></button>
                  </div>
                  <div className="drawer-body" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    
                    <div>
                      <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--primary)'}}>{c.display_name}</h2>
                      <div className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '1rem'}}>{c.city} • {c.mobile}</div>
                      <Link to={`/customers/${c.party_id}`} target="_blank" className="btn btn-secondary" style={{fontSize: '0.85rem'}}>Open Full Customer Profile ↗</Link>
                    </div>

                    <div className="glass-panel" style={{padding: '1.5rem', background: 'var(--bg-surface-hover)', border: '1px solid var(--border)'}}>
                      <h4 style={{marginBottom: '1rem'}}>Tally Evidence</h4>
                      <table style={{width: '100%', fontSize: '0.85rem', textAlign: 'left'}}>
                        <tbody>
                          <tr><th style={{padding: '0.25rem 0', color: 'var(--text-secondary)'}}>Last Sale Date</th><td style={{fontWeight: 600}}>{c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : 'N/A'}</td></tr>
                          <tr><th style={{padding: '0.25rem 0', color: 'var(--text-secondary)'}}>Days Inactive</th><td style={{fontWeight: 600, color: 'var(--warning)'}}>{c.days_inactive !== null ? `${c.days_inactive} days` : 'N/A'}</td></tr>
                          <tr><th style={{padding: '0.25rem 0', color: 'var(--text-secondary)'}}>Lifetime Sales</th><td style={{fontWeight: 600}}>{c.qualifying_tx_count}</td></tr>
                          <tr><th style={{padding: '0.25rem 0', color: 'var(--text-secondary)', verticalAlign: 'top'}}>Rule Trigger</th><td style={{color: 'var(--danger)'}}>{c.candidate_reason}</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="glass-panel" style={{padding: '1.5rem', border: '1px solid var(--primary)', background: 'var(--primary-light)'}}>
                      <h4 style={{marginBottom: '1rem', color: 'var(--text-primary)'}}>Human Review Decision</h4>
                      
                      {c.review_state !== 'PENDING' && (
                        <div style={{marginBottom: '1.5rem', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)'}}>
                          <div style={{marginBottom: '0.5rem'}}><strong>Current State:</strong> {getReviewBadge(c.review_state)}</div>
                          <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>Reviewed by {c.reviewed_by_name} on {new Date(c.reviewed_at).toLocaleString()}</div>
                        </div>
                      )}

                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
                        <label style={{fontSize: '0.85rem', fontWeight: 600}}>Add Note (Optional)</label>
                        <textarea 
                           className="form-input" 
                           rows={3} 
                           placeholder="Why did you make this decision?"
                           value={reviewNote}
                           onChange={e => setReviewNote(e.target.value)}
                           disabled={reviewLoading}
                        />
                      </div>
                      
                      <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem'}}>
                        <button 
                           className="btn btn-primary" 
                           onClick={() => handleReviewAction(c.party_id, 'APPROVED_FOR_REACTIVATION')}
                           disabled={reviewLoading}
                        >
                           {reviewLoading ? 'Saving...' : 'Approve for Reactivation Path'}
                        </button>
                        <button 
                           className="btn btn-secondary" 
                           onClick={() => handleReviewAction(c.party_id, 'REVIEW_LATER')}
                           disabled={reviewLoading}
                        >
                           {reviewLoading ? 'Saving...' : 'Review Later'}
                        </button>
                        <button 
                           className="btn" 
                           style={{background: 'transparent', border: '1px solid var(--success)', color: 'var(--success)'}}
                           onClick={() => handleReviewAction(c.party_id, 'NOT_DORMANT')}
                           disabled={reviewLoading}
                        >
                           {reviewLoading ? 'Saving...' : 'Mark as Not Dormant'}
                        </button>
                      </div>
                      <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center'}}>
                         This action preserves the customer's CRM status and logs your decision in the activity timeline.
                      </p>
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
