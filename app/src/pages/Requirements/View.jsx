import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Clock, Save, History, Edit2, Calendar, Plus } from 'lucide-react';

const STATUS_OPTIONS = [
  'New', 'Quotation Required', 'Quotation Sent', 'Negotiation', 'Confirmed', 'Lost', 'Closed'
];

export default function RequirementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [req, setReq] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  
  // Status Update State
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');

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
          interactions ( id, channel, note, created_at )
        `)
        .eq('id', id)
        .single();
        
      if (rErr) throw rErr;
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

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleUpdateStatus = async () => {
    if (newStatus === req.status) return;
    setStatusUpdating(true);
    
    try {
      // 1. Update Requirement
      await supabase.from('requirements').update({ status: newStatus }).eq('id', id);
      
      // 2. Log History
      const { data: historyRow } = await supabase.from('requirement_status_history').insert({
        requirement_id: id,
        old_status: req.status,
        new_status: newStatus,
        note: statusNote
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
        priority: 'Normal',
        notes: `Linked to Requirement: ${req.quantity} ${req.unit}`
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
              <span className={`badge ${req.status === 'Confirmed' ? 'badge-success' : req.status === 'Lost' ? 'badge-danger' : 'badge-active'}`}>
                {req.status}
              </span>
            </div>
          </div>
        </div>
        
        <button className="btn btn-primary" onClick={() => setShowFollowUp(!showFollowUp)}>
          <Calendar size={16} /> Schedule Follow-up
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
        
        {/* Requirement Details */}
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <h3 style={{marginBottom: '1.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem'}}>Demand Details</h3>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Product/Feed Type</label>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.product_type}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Quantity</label>
                <div style={{fontWeight: 600, fontSize: '1.1rem'}}>{req.quantity} {req.unit}</div>
              </div>
            </div>
            
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Target Rate</label>
                <div>{req.expected_rate ? `₹${req.expected_rate}` : 'Not specified'}</div>
              </div>
              <div>
                <label className="text-muted" style={{fontSize: '0.85rem'}}>Expected Date</label>
                <div>{req.expected_date ? new Date(req.expected_date).toLocaleDateString() : 'ASAP'}</div>
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

        {/* Update Status Panel */}
        <div className="glass-panel" style={{padding: '1.5rem', background: 'rgba(37, 99, 235, 0.05)', border: '1px solid rgba(37, 99, 235, 0.2)'}}>
          <h3 style={{marginBottom: '1.25rem', color: 'var(--primary)'}}>Update Pipeline Status</h3>
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
                <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Transition Note (Optional)</label>
                <textarea 
                  rows={2} 
                  value={statusNote}
                  onChange={e => setStatusNote(e.target.value)}
                  placeholder="e.g. Sent quotation for ₹2400/bag"
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
            
            {/* Source Interaction */}
            {req.interactions && (
              <div style={{position: 'relative'}}>
                <div style={{position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--success)', border: '2px solid var(--bg-base)'}}></div>
                <div className="text-muted" style={{fontSize: '0.8rem'}}>{new Date(req.interactions.created_at).toLocaleString()}</div>
                <div style={{fontWeight: 600}}>Requirement Captured via {req.interactions.channel}</div>
                <div style={{marginTop: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '0.9rem'}}>
                  {req.interactions.note || 'No interaction notes.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
