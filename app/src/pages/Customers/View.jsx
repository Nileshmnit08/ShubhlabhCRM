import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, MapPin, Phone, MessageCircle, Trash2, ShieldAlert, Calendar, Plus, CheckCircle2 } from 'lucide-react';
import WhatsAppAction from '../../components/WhatsAppAction';

export default function CustomerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // details, followups, activity, requirements
  
  const [followUps, setFollowUps] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [tallyTxns, setTallyTxns] = useState([]);
  
  // Forms
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [newFollowUp, setNewFollowUp] = useState({ reason: '', follow_up_date: '', priority: 'Normal', notes: '' });

  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ channel: 'Call', outcome: '', note: '' });

  useEffect(() => {
    fetchCustomerContext();
  }, [id]);

  async function fetchCustomerContext() {
    setLoading(true);
    try {
      // 1. Fetch Customer
      const { data: cData, error: cErr } = await supabase.from('crm_parties').select('*').eq('id', id).single();
      if (cErr) throw cErr;
      setCustomer(cData);

      // 2. Fetch Follow-ups
      const { data: fData, error: fErr } = await supabase.from('follow_ups').select('*').eq('party_id', id).order('follow_up_date', { ascending: true });
      if (fErr) throw fErr;
      setFollowUps(fData || []);

      // 3. Fetch Interactions
      const { data: iData, error: iErr } = await supabase.from('interactions').select('*').eq('party_id', id).order('created_at', { ascending: false });
      if (iErr) throw iErr;
      setInteractions(iData || []);
      
      // 4. Fetch Requirements
      const { data: reqData } = await supabase.from('requirements').select('*').eq('party_id', id).order('created_at', { ascending: false });
      setRequirements(reqData || []);

      // 5. Fetch Tally Transactions
      const { data: tData } = await supabase.from('tally_transactions').select('*').eq('crm_party_id', id).order('voucher_date', { ascending: false });
      setTallyTxns(tData || []);

    } catch (error) {
      console.error('Error fetching customer context:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        await supabase.from('crm_parties').delete().eq('id', id);
        navigate('/customers');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    if (!newFollowUp.reason.trim()) {
      alert("Follow-up reason is required.");
      return;
    }
    
    // Prevent past dates
    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(newFollowUp.follow_up_date);
    if (selectedDate < today) {
      alert("Cannot schedule a follow-up in the past.");
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.from('follow_ups').insert({
        party_id: id,
        original_follow_up_date: newFollowUp.follow_up_date,
        created_by: session?.session?.user?.id || null,
        assigned_to: session?.session?.user?.id || null,
        ...newFollowUp
      }).select();
      if (error) throw error;
      setFollowUps([...followUps, data[0]].sort((a,b) => new Date(a.follow_up_date) - new Date(b.follow_up_date)));
      setShowFollowUpForm(false);
      setNewFollowUp({ reason: '', follow_up_date: '', priority: 'Normal', notes: '' });
    } catch (err) {
      alert("Failed to schedule follow-up");
    }
  };

  const handleLogInteraction = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('interactions').insert({
        party_id: id,
        ...newInteraction
      }).select();
      if (error) throw error;
      setInteractions([data[0], ...interactions]);
      setShowInteractionForm(false);
      setNewInteraction({ channel: 'Call', outcome: '', note: '' });
    } catch (err) {
      alert("Failed to log interaction");
    }
  };

  const updateFollowUpStatus = async (f, status) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (status === 'Completed' && f.assigned_to && f.assigned_to !== userId) {
        if (!window.confirm("This is assigned to someone else. Complete anyway?")) return;
      }

      const updates = { status };
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = userId || null;
      } else if (status === 'Postponed') {
        const newDate = window.prompt("Enter new follow-up date (YYYY-MM-DD):", f.follow_up_date);
        if (!newDate) return;
        
        if (new Date(newDate) < new Date(new Date().setHours(0,0,0,0))) {
          alert("Cannot postpone to a past date.");
          return;
        }

        const note = window.prompt("Provide a reason for postponing:");
        if (!note) { alert("Postponement reason is required."); return; }
        
        updates.follow_up_date = newDate;
        updates.postpone_note = note;
        updates.original_follow_up_date = f.original_follow_up_date || f.follow_up_date;
        updates.status = 'Pending';
      }

      await supabase.from('follow_ups').update(updates).eq('id', f.id);
      
      if (status === 'Completed') {
        setFollowUps(followUps.map(item => item.id === f.id ? { ...item, status } : item));
      } else {
        // Refresh context to sort correctly
        fetchCustomerContext();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading context...</div>;
  if (!customer) return <div>Not Found</div>;

  const nextAction = followUps.find(f => f.status === 'Pending');
  const lastContact = interactions[0];
  const lastRequirement = requirements[0];

  return (
    <div className="animate-fade-in">
      {/* Header Context Bar */}
      <div className="page-header" style={{alignItems: 'flex-start', marginBottom: '1.5rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/customers" className="btn-icon"><ArrowLeft size={24} /></Link>
          <div>
            <h1 style={{margin: 0}}>{customer.display_name}</h1>
            <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.9rem'}}>
              <span className="text-secondary">{customer.city || 'No Location'}</span>
              <span className={`badge ${customer.crm_status === 'Active' ? 'badge-active' : 'badge-dormant'}`}>
                {customer.crm_status}
              </span>
            </div>
          </div>
        </div>
        
        <div style={{display: 'flex', gap: '0.75rem'}}>
          {customer.mobile && (
            <a href={`tel:${customer.mobile}`} className="btn btn-secondary">
              <Phone size={16} /> Call
            </a>
          )}
          {customer.whatsapp && (
            <WhatsAppAction party={customer} onComplete={fetchCustomerContext} btnClass="btn btn-secondary" />
          )}
          <button className="btn btn-secondary" onClick={() => navigate(`/requirements/new?party_id=${id}`)}>
            <Plus size={16} /> New Req
          </button>
          <button className="btn btn-primary" onClick={() => setShowFollowUpForm(true)}>
            <Calendar size={16} /> Follow-up
          </button>
        </div>
      </div>

      {/* Intelligence Row */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
        <div className="glass-panel" style={{padding: '1.25rem', borderLeft: '4px solid var(--primary)'}}>
          <div className="text-muted" style={{fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600}}>Next Action</div>
          {nextAction ? (
            <div style={{marginTop: '0.5rem'}}>
              <div style={{fontWeight: 600, fontSize: '0.95rem'}}>{nextAction.reason}</div>
              <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '0.25rem'}}>
                Due: {new Date(nextAction.follow_up_date).toLocaleDateString()}
              </div>
              <div className="text-muted" style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>
                Assigned: {nextAction.assigned_to || 'Unassigned'}
              </div>
            </div>
          ) : (
            <div className="text-secondary" style={{marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.85rem'}}>No pending action.</div>
          )}
        </div>
        
        <div className="glass-panel" style={{padding: '1.25rem', borderLeft: '4px solid var(--success)'}}>
          <div className="text-muted" style={{fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600}}>Last Contact</div>
          {lastContact ? (
            <div style={{marginTop: '0.5rem'}}>
              <div style={{fontWeight: 600, fontSize: '0.95rem'}}>{new Date(lastContact.created_at).toLocaleDateString()} via {lastContact.channel}</div>
              <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '0.25rem'}}>
                Outcome: {lastContact.outcome || 'None'}
              </div>
            </div>
          ) : (
            <div className="text-secondary" style={{marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.85rem'}}>No contact logged.</div>
          )}
        </div>

        <div className="glass-panel" style={{padding: '1.25rem', borderLeft: '4px solid var(--warning)'}}>
          <div className="text-muted" style={{fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 600}}>Demand Pipeline</div>
          {lastRequirement ? (
            <div style={{marginTop: '0.5rem'}}>
              <div style={{fontWeight: 600, fontSize: '0.95rem'}}>
                {requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).length} Open Reqs
              </div>
              <div className="text-secondary" style={{fontSize: '0.85rem', marginTop: '0.25rem'}}>
                Last: {lastRequirement.quantity} {lastRequirement.unit} {lastRequirement.product_type}
              </div>
            </div>
          ) : (
            <div className="text-secondary" style={{marginTop: '0.5rem', fontStyle: 'italic', fontSize: '0.85rem'}}>No requirements logged.</div>
          )}
        </div>
      </div>

      {/* Forms (Modals conceptually, placed inline for simplicity) */}
      {showFollowUpForm && (
        <div className="glass-panel animate-fade-in" style={{padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--primary)'}}>
          <h3 style={{marginBottom: '1rem'}}>Schedule Follow-up</h3>
          <form onSubmit={handleCreateFollowUp} style={{display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
            <div style={{flex: '1 1 200px'}}><label>Reason</label><input required type="text" value={newFollowUp.reason} onChange={e => setNewFollowUp({...newFollowUp, reason: e.target.value})} placeholder="e.g. Check requirement status" /></div>
            <div><label>Date</label><input required type="date" value={newFollowUp.follow_up_date} onChange={e => setNewFollowUp({...newFollowUp, follow_up_date: e.target.value})} /></div>
            <div><label>Priority</label><select value={newFollowUp.priority} onChange={e => setNewFollowUp({...newFollowUp, priority: e.target.value})}><option>Normal</option><option>High</option><option>Low</option></select></div>
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFollowUpForm(false)}>Cancel</button>
          </form>
        </div>
      )}

      {showInteractionForm && (
        <div className="glass-panel animate-fade-in" style={{padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--success)'}}>
          <h3 style={{marginBottom: '1rem'}}>Log Interaction</h3>
          <form onSubmit={handleLogInteraction} style={{display: 'grid', gap: '1rem'}}>
            <div style={{display: 'flex', gap: '1rem'}}>
              <div><label>Channel</label><select value={newInteraction.channel} onChange={e => setNewInteraction({...newInteraction, channel: e.target.value})}><option>Call</option><option>WhatsApp</option><option>Meeting</option><option>Note</option></select></div>
              <div style={{flex: 1}}><label>Outcome</label><input type="text" value={newInteraction.outcome} onChange={e => setNewInteraction({...newInteraction, outcome: e.target.value})} placeholder="e.g. Reached voicemail, Confirmed order" /></div>
            </div>
            <div><label>Detailed Note</label><textarea rows="2" value={newInteraction.note} onChange={e => setNewInteraction({...newInteraction, note: e.target.value})}></textarea></div>
            <div style={{display: 'flex', gap: '1rem', justifyContent: 'flex-end'}}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowInteractionForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Log Activity</button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs */}
      <div style={{display: 'flex', gap: '2rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem', overflowX: 'auto'}}>
        <button className={`nav-item ${activeTab==='details'?'active':''}`} style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} onClick={() => setActiveTab('details')}>Profile Details</button>
        <button className={`nav-item ${activeTab==='financials'?'active':''}`} style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} onClick={() => setActiveTab('financials')}>Financial Intel</button>
        <button className={`nav-item ${activeTab==='requirements'?'active':''}`} style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} onClick={() => setActiveTab('requirements')}>Requirements ({requirements.length})</button>
        <button className={`nav-item ${activeTab==='followups'?'active':''}`} style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} onClick={() => setActiveTab('followups')}>Follow-ups ({followUps.length})</button>
        <button className={`nav-item ${activeTab==='activity'?'active':''}`} style={{borderRadius: 0, padding: '0.75rem 1rem', whiteSpace: 'nowrap'}} onClick={() => setActiveTab('activity')}>Activity ({interactions.length})</button>
      </div>

      {/* Tab Content: Details */}
      {activeTab === 'details' && (
        <div className="animate-fade-in" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Phone size={18}/> Contact</h3>
            <p className="text-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem'}}>
              Mobile: <span style={{color:'var(--text-primary)'}}>{customer.mobile||'-'}</span>
            </p>
            <div className="text-secondary" style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              WhatsApp: <span style={{color:'var(--text-primary)'}}>{customer.whatsapp||'-'}</span>
              {customer.whatsapp && <WhatsAppAction party={customer} onComplete={fetchCustomerContext} btnClass="badge" />}
            </div>
            <p className="text-secondary" style={{marginTop:'1rem'}}>Prefers: {customer.communication_preference}</p>
          </div>
          <div className="glass-panel" style={{padding: '1.5rem'}}>
            <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><ShieldAlert size={18}/> Notes</h3>
            <p>{customer.notes || 'No notes.'}</p>
          </div>
          <div style={{gridColumn: '1 / -1', display: 'flex', gap: '1rem'}}>
             <Link to={`/customers/${customer.id}/edit`} className="btn btn-secondary"><Edit2 size={16}/> Edit Profile</Link>
             <button className="btn btn-secondary" onClick={handleDelete} style={{color: 'var(--danger)', borderColor: 'var(--danger)'}}><Trash2 size={16}/> Delete</button>
          </div>
        </div>
      )}

      {/* Tab Content: Financial Intel */}
      {activeTab === 'financials' && (
        <div className="animate-fade-in">
          {tallyTxns.length === 0 ? (
            <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
              <p className="text-secondary">No Tally transactions imported for this customer yet.</p>
              <Link to="/data/import" className="btn btn-secondary" style={{marginTop: '1rem', display: 'inline-block'}}>Import Vouchers</Link>
            </div>
          ) : (
            <>
              <div style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                 <ShieldAlert size={16} className="text-warning" />
                 <span className="text-secondary" style={{fontSize: '0.85rem', textTransform: 'uppercase', fontWeight: 600}}>Tally-Derived Financial Snapshot</span>
                 <span className="text-muted" style={{fontSize: '0.75rem', marginLeft: 'auto'}}>Last Sync: {new Date(Math.max(...tallyTxns.map(t => new Date(t.created_at)))).toLocaleDateString()}</span>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
                <div className="glass-panel" style={{padding: '1.25rem', borderTop: '3px solid var(--primary)'}}>
                  <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Last Purchase</div>
                  <strong style={{fontSize: '1.1rem'}}>
                    {(() => {
                      const sales = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') && Number(t.amount) > 0);
                      return sales.length > 0 ? new Date(sales[0].voucher_date).toLocaleDateString() : 'N/A';
                    })()}
                  </strong>
                </div>
                <div className="glass-panel" style={{padding: '1.25rem', borderTop: '3px solid var(--success)'}}>
                  <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Total Sales Value</div>
                  <strong style={{fontSize: '1.1rem'}}>
                    {(() => {
                      const salesTxns = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') || t.voucher_type.toLowerCase().includes('credit note'));
                      if (salesTxns.length === 0) return 'N/A';
                      const totalSales = salesTxns.reduce((sum, t) => {
                        const amt = Number(t.amount);
                        // Sales are usually debits (is_credit = false) in a customer ledger, Credit Notes are credits
                        if (t.voucher_type.toLowerCase().includes('credit note')) return sum - amt;
                        return sum + amt;
                      }, 0);
                      return `₹${totalSales.toLocaleString()}`;
                    })()}
                  </strong>
                </div>
                <div className="glass-panel" style={{padding: '1.25rem', borderTop: '3px solid var(--warning)'}}>
                  <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Purchase Frequency</div>
                  <strong style={{fontSize: '1.1rem'}}>
                    {(() => {
                      const sales = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') && Number(t.amount) > 0);
                      return sales.length > 0 ? `${sales.length} Vouchers` : 'N/A';
                    })()}
                  </strong>
                </div>
                <div className="glass-panel" style={{padding: '1.25rem', borderTop: '3px solid var(--danger)'}}>
                  <div className="text-secondary" style={{fontSize: '0.85rem', marginBottom: '0.25rem'}}>Imported Outstanding</div>
                  <strong style={{fontSize: '1.1rem'}}>
                    {(() => {
                       if (tallyTxns.length === 0) return 'N/A';
                       // Double-entry accounting for customer ledger: Debits increase balance owed to us, Credits decrease it
                       const debits = tallyTxns.filter(t => !t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const credits = tallyTxns.filter(t => t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const net = debits - credits;
                       return `${net > 0 ? '+' : ''}₹${net.toLocaleString()}`;
                    })()}
                  </strong>
                </div>
              </div>

              <h3 style={{marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem'}}>Transaction History</h3>
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                {tallyTxns.map(t => (
                  <div key={t.id} className="glass-panel" style={{padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <div>
                      <div style={{fontWeight: 600}}>{t.voucher_type} <span className="text-muted" style={{fontWeight: 'normal', fontSize: '0.85rem'}}>#{t.voucher_no}</span></div>
                      <div className="text-secondary" style={{fontSize: '0.85rem'}}>{new Date(t.voucher_date).toLocaleDateString()}</div>
                    </div>
                    <div style={{fontWeight: 600, color: t.is_credit ? 'var(--success)' : 'var(--danger)'}}>
                      {t.is_credit ? '+' : '-'} ₹{Number(t.amount).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Tab Content: Requirements */}
      {activeTab === 'requirements' && (
        <div className="animate-fade-in" style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
          {requirements.length === 0 ? (
            <p className="text-secondary">No requirements logged.</p>
          ) : (
            requirements.map(req => (
              <Link key={req.id} to={`/requirements/${req.id}`} className="glass-panel" style={{padding: '1.25rem', textDecoration: 'none', color: 'inherit'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                  <div style={{fontWeight: 600}}>{req.product_type}</div>
                  <span className={`badge ${req.status === 'Confirmed' ? 'badge-success' : req.status === 'Lost' ? 'badge-danger' : 'badge-active'}`}>{req.status}</span>
                </div>
                <div className="text-secondary" style={{fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                  {req.quantity} {req.unit} {req.expected_rate ? `| Target: ₹${req.expected_rate}` : ''}
                </div>
                {req.expected_date && <div className="text-muted" style={{fontSize: '0.85rem'}}>Expected: {new Date(req.expected_date).toLocaleDateString()}</div>}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Follow-ups */}
      {activeTab === 'followups' && (
        <div className="animate-fade-in">
          {followUps.length === 0 ? <p className="text-muted">No follow-ups scheduled.</p> : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {followUps.map(f => (
                <div key={f.id} className="glass-panel" style={{padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: f.status !== 'Pending' ? 0.6 : 1}}>
                  <div>
                    <div style={{fontWeight: 600, fontSize: '1.05rem', textDecoration: f.status !== 'Pending' ? 'line-through' : 'none'}}>{f.reason}</div>
                    <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>
                      Date: {new Date(f.follow_up_date).toLocaleDateString()} | Priority: {f.priority} | Status: <strong>{f.status}</strong>
                    </div>
                  </div>
                  {f.status === 'Pending' && (
                    <div style={{display: 'flex', gap: '0.5rem'}}>
                      <button className="btn btn-secondary" onClick={() => updateFollowUpStatus(f, 'Postponed')}>Postpone</button>
                      <button className="btn btn-primary" onClick={() => updateFollowUpStatus(f, 'Completed')}><CheckCircle2 size={16}/> Complete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Activity */}
      {activeTab === 'activity' && (
        <div className="animate-fade-in">
          {interactions.length === 0 ? <p className="text-muted">No activity logged.</p> : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid var(--border)', paddingLeft: '1.5rem'}}>
              {interactions.map(i => (
                <div key={i.id} style={{position: 'relative'}}>
                  <div style={{position: 'absolute', left: '-1.85rem', top: '0.25rem', width: '12px', height: '12px', borderRadius: '50%', background: 'var(--primary)', border: '2px solid var(--bg-base)'}}></div>
                  <div className="text-muted" style={{fontSize: '0.8rem'}}>{new Date(i.created_at).toLocaleString()}</div>
                  <div style={{fontWeight: 600}}>{i.channel}</div>
                  {i.outcome && <div>Outcome: {i.outcome}</div>}
                  {i.note && <div className="text-secondary" style={{marginTop: '0.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px'}}>{i.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
