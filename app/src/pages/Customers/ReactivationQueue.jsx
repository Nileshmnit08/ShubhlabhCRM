import React, { useEffect, useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { RefreshCw, MapPin, Phone, X, Play, Clock, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import { logActivity } from '../../lib/activityLogger';
import WhatsAppAction from '../../components/WhatsAppAction';

export default function ReactivationQueue() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [expandedRow, setExpandedRow] = useState(null);
  const [startForm, setStartForm] = useState({ date: '', reason: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchQueue();
  }, []);

  async function fetchQueue() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch approved dormant candidates
      let candQuery = supabase.from('v_dormant_candidates')
         .select('*')
         .eq('review_state', 'APPROVED_FOR_REACTIVATION')
         .order('days_inactive', { ascending: false, nullsFirst: false });

      if (userProfile?.role !== 'Admin') {
         candQuery = candQuery.eq('assigned_owner_id', userProfile?.id);
      }

      const { data: dData, error: dErr } = await candQuery;
      if (dErr) throw dErr;

      const candidatesList = dData || [];
      const partyIds = candidatesList.map(c => c.party_id);

      // 2. Fetch latest reactivation tasks for these candidates
      let tasksByParty = {};
      if (partyIds.length > 0) {
        const { data: fData, error: fErr } = await supabase.from('follow_ups')
           .select('party_id, status, outcome_category, created_at')
           .eq('follow_up_type', 'Reactivation')
           .in('party_id', partyIds)
           .order('created_at', { ascending: false });
           
        if (fErr) throw fErr;
        
        // Group by party_id, keeping only the latest (first encountered since we ordered desc)
        if (fData) {
           fData.forEach(task => {
              if (!tasksByParty[task.party_id]) {
                 tasksByParty[task.party_id] = task;
              }
           });
        }
      }

      // 3. Client-side join mapping
      const finalData = candidatesList.map(d => {
         const t = tasksByParty[d.party_id] || {};
         let state = 'APPROVED';
         if (t.status === 'Pending') state = 'IN_PROGRESS';
         else if (t.status === 'Completed' || t.status === 'Cancelled') state = 'COMPLETED';

         return {
            ...d,
            latest_task_status: t.status || null,
            latest_task_outcome: t.outcome_category || null,
            reactivation_state: state
         };
      });

      setCandidates(finalData);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to load reactivation queue.');
    } finally {
      setLoading(false);
    }
  }

  const handleStartReactivation = async (partyId, assignedOwnerId) => {
    if (!userProfile) return;
    if (!startForm.date || !startForm.reason) {
      alert("Please fill in both Date and Reason to start reactivation.");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Double check for duplicate open tasks
      const { data: openTasks } = await supabase.from('follow_ups')
        .select('id')
        .eq('party_id', partyId)
        .eq('follow_up_type', 'Reactivation')
        .eq('status', 'Pending');

      if (openTasks && openTasks.length > 0) {
        alert("An open reactivation task already exists for this customer.");
        setExpandedRow(null);
        fetchQueue();
        return;
      }

      // 2. Insert Follow Up
      const toISO = (localStr) => localStr ? new Date(localStr).toISOString() : null;
      
      const payload = {
        party_id: partyId,
        reason: startForm.reason,
        due_at: toISO(startForm.date),
        follow_up_date: toISO(startForm.date), // also set date for aggregation
        follow_up_type: 'Reactivation',
        priority: 'Normal',
        status: 'Pending',
        assigned_to: assignedOwnerId || userProfile.id,
        created_by: userProfile.id
      };

      const { data: followUp, error: insertErr } = await supabase.from('follow_ups').insert(payload).select();
      if (insertErr) throw insertErr;

      // 3. Log Activity
      logActivity({
        module: 'FollowUps',
        actionType: 'CREATED',
        entityType: 'follow_ups',
        entityId: followUp[0].id,
        summary: `Started Reactivation: ${payload.reason}`
      });

      alert("Reactivation task created successfully. It is now in Today's Work.");
      setExpandedRow(null);
      fetchQueue();
    } catch (err) {
      console.error(err);
      alert("Failed to start reactivation.");
    } finally {
      setActionLoading(false);
    }
  };

  const getReactivationBadge = (state) => {
    switch (state) {
      case 'APPROVED': return <span className="badge badge-warning">Ready for Action</span>;
      case 'IN_PROGRESS': return <span className="badge badge-primary">In Progress</span>;
      case 'COMPLETED': return <span className="badge badge-success">Completed</span>;
      default: return <span className="badge badge-neutral">{state}</span>;
    }
  };

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{flexWrap: 'wrap', gap: '1rem', position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}><RefreshCw size={28} className="text-primary"/> Reactivation Queue</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Dormant customers approved for targeted reactivation.</p>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <button className="btn btn-secondary" onClick={fetchQueue}>Refresh</button>
        </div>
      </div>

      <div className="data-table-container" style={{marginTop: '2rem'}}>
        {error ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}><p>{error}</p><button className="btn btn-secondary" onClick={fetchQueue}>Try Again</button></div>
        ) : loading ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>Loading queue...</div>
        ) : candidates.length === 0 ? (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            <CheckCircle2 size={48} style={{margin: '0 auto 1rem', opacity: 0.5}} />
            <h3>No candidates ready for reactivation</h3>
            <p>Approve more dormant candidates from the Dormant List.</p>
          </div>
        ) : (
          <table className="data-table mobile-cards-table">
            <thead>
              <tr>
                <th style={{width: '25%'}}>Customer</th>
                <th style={{width: '20%'}}>Dormancy Detail</th>
                <th style={{width: '20%'}}>Approval Note</th>
                <th style={{width: '20%'}}>Reactivation State</th>
                <th style={{width: '15%'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.party_id}>
                  <td data-label="Customer">
                    <Link to={`/customers/${c.party_id}`} style={{fontWeight: 600, color: 'var(--primary)', textDecoration: 'none', display: 'block', marginBottom: '0.25rem'}}>{c.display_name}</Link>
                    <div className="text-secondary" style={{fontSize: '0.85rem', display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
                       {c.city && <span><MapPin size={12} style={{display: 'inline'}}/> {c.city}</span>}
                       {c.mobile && <span><Phone size={12} style={{display: 'inline'}}/> {c.mobile}</span>}
                    </div>
                    {c.owner_name && (
                       <div className="text-muted" style={{fontSize: '0.75rem', marginTop: '0.25rem'}}>Assigned: {c.owner_name}</div>
                    )}
                  </td>
                  <td data-label="Dormancy Detail">
                    <div>{c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : 'No History'}</div>
                    {c.days_inactive !== null && (
                      <div className="text-warning" style={{fontSize: '0.85rem', marginTop: '0.25rem'}}>{c.days_inactive} days inactive</div>
                    )}
                  </td>
                  <td data-label="Approval Note">
                     <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                       Approved by {c.reviewed_by_name}
                       {c.reviewed_at && <div className="text-muted">{new Date(c.reviewed_at).toLocaleDateString()}</div>}
                     </div>
                  </td>
                  <td data-label="Reactivation State">
                    {getReactivationBadge(c.reactivation_state)}
                  </td>
                  <td data-label="Action">
                    <button className="btn btn-secondary btn-sm" onClick={() => {
                        setStartForm({ date: new Date().toISOString().slice(0,16), reason: 'Reactivation Call' });
                        setExpandedRow(c.party_id);
                    }}>View Action</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ACTION DRAWER */}
      {expandedRow && (
        <div className="slide-over-backdrop" onClick={() => setExpandedRow(null)}>
          <div className="slide-over-drawer" onClick={e => e.stopPropagation()}>
            {(() => {
              const c = candidates.find(x => x.party_id === expandedRow);
              if (!c) return null;
              
              const isApproved = c.reactivation_state === 'APPROVED';
              const isInProgress = c.reactivation_state === 'IN_PROGRESS';
              
              return (
                <>
                  <div className="drawer-header">
                    <h3 style={{margin: 0}}>Reactivation Workflow</h3>
                    <button onClick={() => setExpandedRow(null)} className="btn-icon"><X size={20}/></button>
                  </div>
                  <div className="drawer-body" style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                    
                    <div>
                      <h2 style={{margin: '0 0 0.5rem 0', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                        {c.display_name} 
                        <WhatsAppAction party={{...c, id: c.party_id}} onComplete={fetchQueue} />
                      </h2>
                      <div className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '1rem'}}>{c.city} • {c.mobile}</div>
                      <div className="glass-panel" style={{padding: '1rem', background: 'var(--bg-surface-hover)', fontSize: '0.85rem'}}>
                         <div><strong>Last Sale:</strong> {c.last_sale_date ? new Date(c.last_sale_date).toLocaleDateString() : 'N/A'} ({c.days_inactive} days ago)</div>
                         <div style={{marginTop: '0.5rem', color: 'var(--text-secondary)'}}>{c.candidate_reason}</div>
                      </div>
                    </div>

                    <div className="glass-panel" style={{padding: '1.5rem', border: isApproved ? '1px solid var(--primary)' : '1px solid var(--border)', background: isApproved ? 'var(--primary-light)' : 'var(--bg-base)'}}>
                      <h4 style={{marginBottom: '1rem', color: 'var(--text-primary)'}}>Start Reactivation</h4>
                      
                      {isInProgress ? (
                         <div style={{textAlign: 'center', padding: '1rem'}}>
                           <Clock size={32} className="text-primary" style={{margin: '0 auto 1rem'}} />
                           <h4 style={{marginBottom: '0.5rem'}}>Task In Progress</h4>
                           <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem'}}>
                             An open reactivation task already exists for this customer in Today's Work.
                           </p>
                           <Link to="/follow-ups" className="btn btn-primary" onClick={() => setExpandedRow(null)}>Go to Tasks / Follow-ups</Link>
                         </div>
                      ) : isApproved ? (
                         <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                           <div>
                             <label style={{fontSize: '0.85rem', fontWeight: 600}}>Task Date & Time *</label>
                             <input 
                               type="datetime-local" 
                               className="form-input" 
                               value={startForm.date}
                               onChange={e => setStartForm({...startForm, date: e.target.value})}
                               disabled={actionLoading}
                             />
                           </div>
                           <div>
                             <label style={{fontSize: '0.85rem', fontWeight: 600}}>Initial Action / Reason *</label>
                             <input 
                               type="text" 
                               className="form-input" 
                               value={startForm.reason}
                               onChange={e => setStartForm({...startForm, reason: e.target.value})}
                               disabled={actionLoading}
                             />
                           </div>
                           <button 
                             className="btn btn-primary" 
                             style={{marginTop: '1rem'}}
                             onClick={() => handleStartReactivation(c.party_id, c.assigned_owner_id)}
                             disabled={actionLoading}
                           >
                             <Play size={16} /> {actionLoading ? 'Creating...' : 'Create Reactivation Task'}
                           </button>
                         </div>
                      ) : (
                         <div style={{textAlign: 'center', padding: '1rem'}}>
                           <CheckCircle2 size={32} className="text-success" style={{margin: '0 auto 1rem'}} />
                           <h4 style={{marginBottom: '0.5rem'}}>Reactivation Completed</h4>
                           <p style={{fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                             The latest reactivation task was closed with outcome: {c.latest_task_outcome || 'Unknown'}.
                           </p>
                           <button 
                             className="btn btn-secondary" 
                             style={{marginTop: '1.5rem'}}
                             onClick={() => {
                                setStartForm({ date: new Date().toISOString().slice(0,16), reason: 'Reactivation Follow-up' });
                                // Temp hack to override state and allow starting again
                                c.reactivation_state = 'APPROVED';
                                setStartForm({...startForm}); // trigger re-render
                             }}
                           >
                             Start New Reactivation Cycle
                           </button>
                         </div>
                      )}
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
