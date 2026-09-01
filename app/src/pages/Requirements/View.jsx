import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, Save, History, Edit2, Calendar, Plus } from 'lucide-react';
import CallAction from '../../components/CallAction';
import WhatsAppAction from '../../components/WhatsAppAction';

const STATUS_OPTIONS = [
  'Identified', 'Engaged', 'Qualified', 'Commercial Intent', 'Won', 'Dispatched', 'Lost', 'On Hold'
];

const VALID_TRANSITIONS = {
  'Identified': ['Engaged', 'Lost', 'On Hold'],
  'Engaged': ['Qualified', 'Lost', 'On Hold'],
  'Qualified': ['Commercial Intent', 'Lost', 'On Hold'],
  'Commercial Intent': ['Won', 'Lost', 'On Hold'],
  'Won': ['Dispatched'],
  'Dispatched': [],
  'On Hold': ['Engaged', 'Qualified', 'Lost'],
  'Lost': ['Identified', 'Engaged']
};

const NEXT_ACTION_DESC = {
  'Identified': 'Next Step: Contact customer and discuss requirement.',
  'Engaged': 'Next Step: Verify requirement feasibility and qualify lead.',
  'Qualified': 'Next Step: Negotiate pricing, quantity, and terms.',
  'Commercial Intent': 'Next Step: Close the deal and convert to Won.',
  'Won': 'Next Step: Create dispatch entry for delivery.',
  'Dispatched': 'Requirement successfully fulfilled and dispatched.',
  'On Hold': 'Waiting for unblock.',
  'Lost': 'Deal went to competitor or was abandoned.'
};

import CreateDispatchModal from './CreateDispatchModal';

export default function RequirementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [req, setReq] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Status Update State
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  
  // Dispatch Modal State
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [dispatchSummary, setDispatchSummary] = useState(null);

  // Follow up state
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [fuReason, setFuReason] = useState('');
  const [fuDate, setFuDate] = useState('');

  useEffect(() => {
    fetchData();
  }, [id]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Requirement
      const { data: rData, error: rErr } = await supabase
        .from('requirements')
        .select(`
          *,
          crm_parties ( id, display_name, mobile, whatsapp, city ),
          app_users:assigned_to ( email )
        `)
        .eq('id', id)
        .maybeSingle();
        
      if (rErr) throw rErr;
      
      if (!rData) {
        setReq(null);
        setLoading(false);
        return;
      }

      // Fetch interactions separately to avoid relationship errors breaking the main query
      const { data: iData } = await supabase
        .from('interactions')
        .select('id, channel, note, created_at')
        .eq('related_requirement_id', id)
        .order('created_at', { ascending: false });
        
      rData.interactions = iData || [];

      setReq(rData);
      setNewStatus(rData.status);

      // 2. Fetch History
      const { data: hData, error: hErr } = await supabase
        .from('requirement_status_history')
        .select('*')
        .eq('requirement_id', id)
        .order('created_at', { ascending: false });
        
      if (hErr) throw hErr;
      setHistory(hData || []);

      // 3. Fetch recent Tally evidence
      const { data: tData } = await supabase
        .from('tally_transactions')
        .select('*')
        .in('voucher_type', ['Sales', 'Receipt', 'Sales Order'])
        .eq('crm_party_id', rData.party_id)
        .order('date', { ascending: false })
        .limit(3);
      
      setReq(prev => ({ ...prev, tally_transactions: tData || [] }));

      // 4. Fetch Dispatch Summary
      const { data: dSummary } = await supabase
        .from('v_requirement_dispatch_summary')
        .select('*')
        .eq('requirement_id', id)
        .maybeSingle();
      
      if (dSummary) setDispatchSummary(dSummary);

    } catch (err) {
      console.error(err);
      setFetchError(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async () => {
    if (newStatus === req.status) return;

    // Validate Transition logic
    const allowed = VALID_TRANSITIONS[req.status] || STATUS_OPTIONS; // Fallback if legacy status
    if (!allowed.includes(newStatus) && req.status !== 'New' && !req.status.includes('Quotation')) {
       const proceed = window.confirm(`Warning: Moving from ${req.status} directly to ${newStatus} skips standard pipeline steps. Are you sure you want to force this transition?`);
       if (!proceed) return;
    }

    // Require evidence for major transitions
    if (['Won', 'Lost', 'On Hold', 'Commercial Intent'].includes(newStatus) && !statusNote.trim()) {
      alert(`Evidence/Note is strictly required to transition to ${newStatus}. Please provide details.`);
      return;
    }

    // Intercept 'Dispatched' status
    if (newStatus === 'Dispatched') {
       setShowDispatchModal(true);
       return;
    }

    setStatusUpdating(true);
    
    try {
      const { data: session } = await supabase.auth.getSession();
      
      // 1. Update Requirement
      await supabase.from('requirements').update({ status: newStatus }).eq('id', id);
      
      // 2. Log History
      const { data: historyRow } = await supabase.from('requirement_status_history').insert({
        requirement_id: id,
        old_status: req.status,
        new_status: newStatus,
        note: statusNote,
        changed_by: session?.session?.user?.id || null
      }).select().single();
      
      setReq({ ...req, status: newStatus });
      if (historyRow) setHistory([historyRow, ...history]);
      setStatusNote('');
      
    } catch (err) {
      alert("Failed to update status");
      console.error(err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleScheduleFollowUp = async (e) => {
    e.preventDefault();
    try {
      await supabase.from('follow_ups').insert({
        party_id: req.party_id,
        reason: fuReason || `Follow up on ${req.product_type} requirement`,
        follow_up_date: fuDate,
        due_at: fuDate,
        follow_up_type: req.status === 'Commercial Intent' || req.intent_type?.includes('Order') || req.intent_type?.includes('Quotation') ? 'Commercial' : 'General',
        priority: req.status === 'Commercial Intent' ? 'High' : 'Normal',
        notes: `Linked to Requirement: ${req.quantity} ${req.unit}`,
        status: 'Pending'
      });
      setShowFollowUp(false);
      setFuReason('');
      setFuDate('');
      alert("Follow-up scheduled successfully!");
    } catch (err) {
      alert("Failed to schedule follow-up");
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading requirement...</div>;
  
  if (fetchError) return (
    <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>
      <h3>Error Loading Requirement</h3>
      <p>Requirement found, but some related fields are unavailable or a network error occurred.</p>
      <p style={{fontSize: '0.85rem', opacity: 0.8}}>{fetchError.message || JSON.stringify(fetchError)}</p>
    </div>
  );

  if (!req) return <div style={{padding: '3rem', textAlign: 'center'}}>Not Found</div>;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/requirements" className="btn-icon"><ArrowLeft size={24} /></Link>
          <div>
            <h1 style={{margin: 0}}>{req.crm_parties?.display_name}</h1>
            <div className="text-secondary" style={{marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              Requirement #{req.id.substring(0,8)} 
              <span className={`badge ${req.status === 'Won' ? 'badge-success' : req.status === 'Lost' ? 'badge-danger' : 'badge-active'}`}>
                {req.status}
              </span>
            </div>
          </div>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}}>
          {req.crm_parties && (
             <CallAction party={req.crm_parties} onComplete={fetchData} btnClass="btn cv-btn-subtle" showLabel={true} />
          )}
          {req.crm_parties && (
             <WhatsAppAction party={req.crm_parties} onComplete={fetchData} btnClass="btn cv-btn-subtle" />
          )}
          <Link to={`/requirements/${req.id}/edit`} className="btn btn-secondary">
            <Edit2 size={16} /> Edit Requirement
          </Link>
          <button className="btn btn-primary" onClick={() => setShowFollowUp(!showFollowUp)}>
            <Calendar size={16} /> Schedule Follow-up
          </button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
        
        {/* Requirement Details */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between'}}>
            Demand Details
            <span style={{fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 'normal', background: 'var(--warning-light)', padding: '0.2rem 0.5rem', borderRadius: '12px'}}>
              *User Estimate (Not a Tally Order)*
            </span>
          </h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Product/Feed Type</label>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.product_type}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Estimated Quantity</label>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.quantity} {req.unit}</div>
              </div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Target Rate (Estimate)</label>
                <div>{req.expected_rate ? `₹${req.expected_rate}` : 'Not specified'}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Expected Date</label>
                <div>{req.expected_date ? new Date(req.expected_date).toLocaleDateString() : 'ASAP'}</div>
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Commercial Intent</label>
                <div>{req.intent_type || 'Product Interest'}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Owner</label>
                <div>{req.app_users?.email ? req.app_users.email.split('@')[0] : 'Unassigned'}</div>
              </div>
            </div>

            {req.notes && (
              <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px'}}>
                <label className="text-muted" style={{fontSize: '0.85rem', display: 'block', marginBottom: '0.25rem'}}>Initial Notes</label>
                <p>{req.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Summary Card */}
        {(dispatchSummary || req.status === 'Won' || req.status === 'Dispatched') && (
          <div className="glass-panel" style={{padding: '1.5rem', border: '1px solid var(--border)'}}>
            <h3 style={{marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              Dispatch Summary
              {dispatchSummary && (
                <span className={`badge ${dispatchSummary.dispatch_progress === 'Fully Dispatched' ? 'badge-success' : dispatchSummary.dispatch_progress === 'Partially Dispatched' ? 'badge-warning' : 'badge-active'}`}>
                  {dispatchSummary.dispatch_progress}
                </span>
              )}
            </h3>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem'}}>
                <div>
                  <label className="text-muted" style={{fontSize: '0.85rem'}}>Required</label>
                  <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.quantity} {req.unit}</div>
                </div>
                <div>
                  <label className="text-muted" style={{fontSize: '0.85rem'}}>Dispatched</label>
                  <div style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--success)'}}>
                    {dispatchSummary?.total_dispatched_quantity || 0} {req.unit}
                  </div>
                </div>
                <div>
                  <label className="text-muted" style={{fontSize: '0.85rem'}}>Pending</label>
                  <div style={{fontWeight: 600, fontSize: '1.1rem', color: 'var(--warning)'}}>
                    {dispatchSummary?.pending_quantity || req.quantity} {req.unit}
                  </div>
                </div>
              </div>

              {dispatchSummary?.latest_dispatch_date && (
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem'}}>
                  <div>
                    <label className="text-muted" style={{fontSize: '0.85rem'}}>Latest Dispatch Date</label>
                    <div>{new Date(dispatchSummary.latest_dispatch_date).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <label className="text-muted" style={{fontSize: '0.85rem'}}>Latest Vehicle</label>
                    <div>{dispatchSummary.latest_truck_number || 'N/A'}</div>
                  </div>
                </div>
              )}
              
              <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
                 <button className="btn btn-primary" onClick={() => setShowDispatchModal(true)} style={{flex: 1, justifyContent: 'center'}}>
                   <Plus size={16} /> Add Dispatch
                 </button>
                 <Link to={`/dispatches/list?requirement_id=${req.id}`} className="btn btn-secondary" style={{flex: 1, justifyContent: 'center'}}>
                   View All Dispatches
                 </Link>
              </div>
            </div>
          </div>
        )}

        {/* Update Status Panel */}
        <div className="glass-panel" style={{padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
          <h3 style={{marginBottom: '0.5rem', color: 'var(--primary)'}}>Update Pipeline Status</h3>
          <p className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '1.25rem'}}>
            {NEXT_ACTION_DESC[req.status] || 'Move the requirement through the pipeline.'}
          </p>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Current Phase</label>
              <select 
                value={newStatus} 
                onChange={e => setNewStatus(e.target.value)}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              >
                {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            
            {newStatus !== req.status && (
              <div className="animate-fade-in">
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
                  Transition Note {['Won', 'Lost', 'On Hold', 'Commercial Intent'].includes(newStatus) ? <span className="text-danger">* (Required)</span> : '(Optional)'}
                </label>
                <textarea 
                  rows={2} 
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="e.g. Discussed pricing, moving to commercial intent"
                  style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                />
                <button 
                  className="btn btn-primary" 
                  onClick={handleUpdateStatus} 
                  disabled={statusUpdating}
                  style={{width: '100%', justifyContent: 'center', marginTop: '1rem'}}
                >
                  <Save size={16} /> {statusUpdating ? 'Updating...' : 'Save New Status'}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {showFollowUp && (
        <div className="glass-panel animate-fade-in" style={{padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--warning)'}}>
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--warning)'}}>
            <Calendar size={18} /> Schedule Follow-up for this Requirement
          </h3>
          <form onSubmit={handleScheduleFollowUp} style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
            <div style={{flex: '1 1 200px'}}>
              <label>Reason</label>
              <input type="text" value={fuReason} onChange={e => setFuReason(e.target.value)} placeholder={`e.g. Call to discuss ${req.product_type} rate`} required />
            </div>
            <div>
              <label>Follow-up Date</label>
              <input type="date" value={fuDate} onChange={e => setFuDate(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary">Save Follow-up</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFollowUp(false)}>Cancel</button>
          </form>
        </div>
      )}

      {/* Tally Confirmation Block */}
      {req.tally_transactions && req.tally_transactions.length > 0 && (
        <>
          <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--success)'}}>
            <CheckCircle2 size={18} /> Tally Confirmed Transactions (Recent)
          </h3>
          <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--success)'}}>
             <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
               {req.tally_transactions.map(tx => (
                 <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                    <div>
                      <strong style={{color: 'var(--text-primary)'}}>{tx.voucher_type}</strong> 
                      <span className="text-secondary" style={{marginLeft: '0.5rem'}}>#{tx.voucher_number}</span>
                    </div>
                    <div style={{display: 'flex', gap: '1rem'}}>
                      <span className="text-secondary">{tx.date}</span>
                      <strong style={{color: 'var(--success)'}}>₹{Number(tx.amount).toLocaleString('en-IN')}</strong>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </>
      )}

      {/* History Feed */}
      <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
        <History size={18} /> Timeline & Status History
      </h3>
      <div className="glass-panel" style={{padding: '1.5rem'}}>
        {history.length === 0 && !req.interactions ? (
          <p className="text-muted">No history recorded yet.</p>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem', borderLeft: '2px solid var(--border)', paddingLeft: '1.5rem'}}>
            {history.map(h => (
              <div key={h.id} style={{position: 'relative'}}>
                <div style={{position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-base)'}}></div>
                <div className="text-muted" style={{fontSize: '0.8rem'}}>{new Date(h.created_at).toLocaleString()}</div>
                <div style={{fontWeight: 600}}>
                  Changed from <span className="text-secondary">{h.old_status}</span> to <span className="text-primary">{h.new_status}</span>
                </div>
                {h.note && <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem'}}>{h.note}</div>}
              </div>
            ))}
            
            {/* Source Interactions */}
            {req.interactions && req.interactions.length > 0 && req.interactions.map(interaction => (
              <div key={interaction.id} style={{position: 'relative'}}>
                <div style={{position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--bg-base)'}}></div>
                <div className="text-muted" style={{fontSize: '0.8rem'}}>{new Date(interaction.created_at).toLocaleString()}</div>
                <div style={{fontWeight: 600}}>Requirement Captured via {interaction.channel}</div>
                <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem'}}>
                  {interaction.note || 'No interaction notes.'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {showDispatchModal && (
        <CreateDispatchModal 
          requirement={{ ...req, pending_quantity: dispatchSummary?.pending_quantity }}
          onClose={() => setShowDispatchModal(false)}
          onComplete={() => {
            setShowDispatchModal(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
