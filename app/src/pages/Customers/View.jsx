import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, MapPin, Phone, MessageCircle, Trash2, ShieldAlert, Calendar, Plus, CheckCircle2, Target, Info, DollarSign } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import WhatsAppAction from '../../components/WhatsAppAction';
import { logActivity } from '../../lib/activityLogger';

export default function CustomerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); 
  const { userProfile } = React.useContext(AuthContext);
  
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
      const { data: cData, error: cErr } = await supabase.from('v_customer_master').select('*').eq('id', id).single();
      if (cErr) throw cErr;
      
      let ownerWhatsapp = null;
      if (cData.assigned_owner_id) {
        const { data: oData } = await supabase.from('app_users').select('whatsapp').eq('id', cData.assigned_owner_id).single();
        if (oData) {
          ownerWhatsapp = oData.whatsapp;
        }
      }
      
      setCustomer({ ...cData, owner_whatsapp: ownerWhatsapp });

      const { data: fData, error: fErr } = await supabase.from('follow_ups').select('*').eq('party_id', id).order('follow_up_date', { ascending: true });
      if (fErr) throw fErr;
      setFollowUps(fData || []);

      const { data: iData, error: iErr } = await supabase.from('interactions').select('*').eq('party_id', id).order('created_at', { ascending: false });
      if (iErr) throw iErr;
      setInteractions(iData || []);
      
      const { data: reqData } = await supabase.from('requirements').select('*').eq('party_id', id).order('created_at', { ascending: false });
      setRequirements(reqData || []);

      const { data: tData } = await supabase.from('tally_transactions').select('*').eq('crm_party_id', id).order('voucher_date', { ascending: false });
      setTallyTxns(tData || []);
    } catch (error) {
      console.error('Error fetching customer context:', error);
    } finally {
      setLoading(false);
    }
  }
  
  const handleDelete = async () => {
    if (window.confirm('Are you absolutely sure you want to delete this customer? This action cannot be undone.')) {
      try {
        await supabase.from('crm_parties').delete().eq('id', id);
        navigate('/customers');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleManualAssignmentWhatsApp = () => {
    if (!customer.owner_whatsapp) {
      alert("Assigned owner WhatsApp number not available.");
      return;
    }
    
    const message = `Hello ${customer.owner_name},
A customer has been assigned to your name.

Customer: ${customer.display_name}
Mobile: ${customer.mobile || "Not provided"}
WhatsApp: ${customer.whatsapp || "Not provided"}

Please contact this customer and update Contact Information in CRM.`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${customer.owner_whatsapp.replace(/[^0-9]/g, '')}?text=${encoded}`;
    
    logActivity({
      module: 'Customers',
      actionType: 'COMMUNICATION',
      entityType: 'crm_parties',
      entityId: customer.id,
      summary: `Manual assignment WhatsApp initiated to owner ${customer.owner_name}`
    });
    
    window.open(url, '_blank');
  };

  const handleCreateFollowUp = async (e) => {
    e.preventDefault();
    if (!newFollowUp.reason.trim()) { alert("Follow-up reason is required."); return; }
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const selectedDate = new Date(newFollowUp.follow_up_date);
    if (selectedDate < today) { alert("Cannot schedule a follow-up in the past."); return; }

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
      const { data, error } = await supabase.from('interactions').insert({ party_id: id, ...newInteraction }).select();
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
        if (new Date(newDate) < new Date(new Date().setHours(0,0,0,0))) { alert("Cannot postpone to a past date."); return; }
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
        fetchCustomerContext();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-secondary">
      <style>{`
        .loading-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
      <div className="loading-pulse">Loading profile...</div>
    </div>
  );
  if (!customer) return <div className="p-8 text-center text-muted">Customer not found.</div>;

  const nextAction = followUps.find(f => f.status === 'Pending');
  const lastContact = interactions[0];
  const openReqsCount = requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).length;
  const isActive = customer.crm_status === 'Active';

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      <style>{`
        .cv-panel {
          background-color: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.2), 0 1px 2px -1px rgba(0, 0, 0, 0.1);
        }
        .cv-btn-subtle {
          background-color: transparent;
          border: 1px solid var(--border);
          color: var(--text-primary);
          transition: all 0.2s ease;
        }
        .cv-btn-subtle:hover {
          border-color: rgba(255,255,255,0.2);
          background-color: rgba(255,255,255,0.05);
        }
        .cv-tabs {
          display: flex;
          gap: 2rem;
          border-bottom: 1px solid var(--border);
          margin-bottom: 2rem;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .cv-tabs::-webkit-scrollbar { display: none; }
        .cv-tab {
          padding: 0.75rem 0.25rem;
          color: var(--text-secondary);
          font-weight: 500;
          font-size: 0.95rem;
          border-bottom: 2px solid transparent;
          white-space: nowrap;
          transition: all 0.2s ease;
          cursor: pointer;
        }
        .cv-tab:hover { color: var(--text-primary); }
        .cv-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
        .cv-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem 2rem;
          text-align: center;
          background-color: rgba(30, 41, 59, 0.3);
          border: 1px dashed var(--border);
          border-radius: var(--radius-md);
        }
        .cv-kpi {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }
        .cv-kpi::before {
          content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 2px;
        }
        .cv-kpi.kpi-blue::before { background-color: var(--primary); }
        .cv-kpi.kpi-green::before { background-color: var(--success); }
        .cv-kpi.kpi-orange::before { background-color: var(--warning); }
        
        .cv-delete-btn { color: var(--text-secondary); transition: all 0.2s ease; }
        .cv-delete-btn:hover { color: var(--danger); }
      `}</style>

      {/* Header Area */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
          <Link to="/customers" className="cv-btn-subtle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', marginTop: '0.25rem' }}>
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0 0 0.5rem 0', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
              {customer.display_name}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: isActive ? 'var(--success)' : 'var(--warning)', boxShadow: `0 0 8px ${isActive ? 'var(--success)' : 'var(--warning)'}` }}></span>
                <span style={{ fontWeight: 500, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{customer.crm_status}</span>
              </div>
              {customer.city && (
                <>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin size={14} />
                    <span>{customer.city}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {customer.mobile && (
            <a href={`tel:${customer.mobile}`} className="btn cv-btn-subtle">
              <Phone size={16} /> <span style={{ display: 'none', '@media(min-width: 640px)': { display: 'inline' }}}>Call</span>
            </a>
          )}
          {customer.whatsapp && (
            <WhatsAppAction party={customer} onComplete={fetchCustomerContext} btnClass="btn cv-btn-subtle" />
          )}
          <button className="btn cv-btn-subtle" onClick={() => setShowFollowUpForm(true)}>
            <Calendar size={16} /> Follow-up
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/requirements/new?party_id=${id}`)}>
            <Plus size={16} /> New Requirement
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        
        {/* Next Action */}
        <div className="cv-panel cv-kpi kpi-blue">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Next Action</span>
            <Calendar size={18} style={{ opacity: 0.5 }} />
          </div>
          {nextAction ? (
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {nextAction.reason}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(nextAction.follow_up_date).toLocaleDateString()}</strong></span>
                <span>Owner: {nextAction.assigned_to ? 'Assigned' : 'Unassigned'}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No pending action</div>
              <button onClick={() => setShowFollowUpForm(true)} style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.5rem' }}>+ Schedule one</button>
            </div>
          )}
        </div>

        {/* Last Contact */}
        <div className="cv-panel cv-kpi kpi-green">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last Contact</span>
            <MessageCircle size={18} style={{ opacity: 0.5 }} />
          </div>
          {lastContact ? (
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', lineHeight: 1.3 }}>
                {new Date(lastContact.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span>Channel: <strong style={{ color: 'var(--text-primary)' }}>{lastContact.channel}</strong></span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Outcome: {lastContact.outcome || 'None'}</span>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No contact history</div>
              <button onClick={() => setShowInteractionForm(true)} style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.5rem' }}>+ Log interaction</button>
            </div>
          )}
        </div>

        {/* Pipeline */}
        <div className="cv-panel cv-kpi kpi-orange">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demand Pipeline</span>
            <Target size={18} style={{ opacity: 0.5 }} />
          </div>
          {openReqsCount > 0 ? (
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                {openReqsCount}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                Active requirements
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 'auto', paddingBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>No open requirements</div>
              <button onClick={() => navigate(`/requirements/new?party_id=${id}`)} style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 500, marginTop: '0.5rem' }}>+ Add requirement</button>
            </div>
          )}
        </div>
      </div>

      {/* Forms (Rendered Inline as premium panels when active) */}
      {showFollowUpForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Schedule Follow-up</h3>
          <form onSubmit={handleCreateFollowUp} style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 300px' }}>
              <label>Action to take</label>
              <input required type="text" value={newFollowUp.reason} onChange={e => setNewFollowUp({...newFollowUp, reason: e.target.value})} placeholder="e.g. Call to discuss pricing" />
            </div>
            <div>
              <label>Due Date</label>
              <input required type="date" value={newFollowUp.follow_up_date} onChange={e => setNewFollowUp({...newFollowUp, follow_up_date: e.target.value})} />
            </div>
            <div>
              <label>Priority</label>
              <select value={newFollowUp.priority} onChange={e => setNewFollowUp({...newFollowUp, priority: e.target.value})}>
                <option>Normal</option>
                <option>High</option>
                <option>Low</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setShowFollowUpForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Schedule</button>
            </div>
          </form>
        </div>
      )}

      {showInteractionForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--success)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Log Interaction</h3>
          <form onSubmit={handleLogInteraction} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem' }}>
              <div>
                <label>Channel</label>
                <select value={newInteraction.channel} onChange={e => setNewInteraction({...newInteraction, channel: e.target.value})}>
                  <option>Call</option><option>WhatsApp</option><option>Meeting</option><option>Email</option><option>Note</option>
                </select>
              </div>
              <div>
                <label>Outcome summary</label>
                <input type="text" value={newInteraction.outcome} onChange={e => setNewInteraction({...newInteraction, outcome: e.target.value})} placeholder="e.g. Confirmed next week delivery" />
              </div>
            </div>
            <div>
              <label>Detailed Note (Optional)</label>
              <textarea rows="3" value={newInteraction.note} onChange={e => setNewInteraction({...newInteraction, note: e.target.value})} placeholder="Any additional context..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setShowInteractionForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Log</button>
            </div>
          </form>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div className="cv-tabs">
        <button className={`cv-tab ${activeTab==='details'?'active':''}`} onClick={() => setActiveTab('details')}>Profile Overview</button>
        {userProfile?.role === 'Admin' && (
          <button className={`cv-tab ${activeTab==='financials'?'active':''}`} onClick={() => setActiveTab('financials')}>Financial Intel</button>
        )}
        <button className={`cv-tab ${activeTab==='requirements'?'active':''}`} onClick={() => setActiveTab('requirements')}>
          Requirements <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{requirements.length}</span>
        </button>
        <button className={`cv-tab ${activeTab==='followups'?'active':''}`} onClick={() => setActiveTab('followups')}>
          Follow-ups <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{followUps.length}</span>
        </button>
        <button className={`cv-tab ${activeTab==='activity'?'active':''}`} onClick={() => setActiveTab('activity')}>
          Activity <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{interactions.length}</span>
        </button>
      </div>

      {/* Tab Content Areas */}
      
      {/* 1. PROFILE DETAILS */}
      {activeTab === 'details' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          <div className="cv-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Info size={18} className="text-muted" /> Contact Information
              </h3>
              <Link to={`/customers/${customer.id}/edit`} className="btn cv-btn-subtle" style={{ padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}>
                <Edit2 size={14} /> Edit
              </Link>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Mobile Number</div>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.mobile || <span className="text-muted italic">Not provided</span>}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Assigned Owner</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className="badge badge-neutral" style={{fontSize: '0.85rem', padding: '0.25rem 0.5rem', fontWeight: 500}}>{customer.owner_name || 'Unassigned'}</span>
                  {customer.assigned_owner_id && (
                    <button 
                      onClick={handleManualAssignmentWhatsApp}
                      className="btn" 
                      style={{ 
                        padding: '0.25rem 0.75rem', 
                        fontSize: '0.75rem', 
                        background: customer.owner_whatsapp ? 'var(--success)' : 'var(--bg-surface-hover)', 
                        color: customer.owner_whatsapp ? 'white' : 'var(--text-muted)',
                        cursor: customer.owner_whatsapp ? 'pointer' : 'not-allowed',
                        display: 'flex', alignItems: 'center', gap: '0.25rem'
                      }}
                      title={customer.owner_whatsapp ? "Send WhatsApp to Owner" : "Owner WhatsApp not available"}
                    >
                      <MessageCircle size={14} /> 
                      Send Assignment WhatsApp
                    </button>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>WhatsApp Number</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.whatsapp || <span className="text-muted italic">Not provided</span>}</span>
                  {customer.whatsapp && <WhatsAppAction party={customer} onComplete={fetchCustomerContext} btnClass="badge badge-active" />}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Preferred Method</div>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.communication_preference}</div>
              </div>
            </div>
          </div>

          <div className="cv-panel" style={{ padding: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} className="text-muted" /> Internal Notes
            </h3>
            {customer.notes ? (
              <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{customer.notes}</p>
            ) : (
              <div className="text-muted italic" style={{ fontSize: '0.95rem' }}>No internal notes saved for this customer.</div>
            )}
          </div>
          
          <div style={{ gridColumn: '1 / -1', marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleDelete} className="cv-delete-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
              <Trash2 size={16} /> Delete Customer Record
            </button>
          </div>
        </div>
      )}

      {/* 2. FINANCIAL INTEL */}
      {activeTab === 'financials' && userProfile?.role === 'Admin' && (
        <div className="animate-fade-in">
          {tallyTxns.length === 0 ? (
            <div className="cv-empty">
              <DollarSign size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Financial Data</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>We haven't imported any Tally transactions for this ledger yet. Import their ledger to unlock financial intelligence.</p>
              <Link to="/data/import" className="btn btn-primary">Go to Import Tool</Link>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                   <ShieldAlert size={18} className="text-warning" />
                   <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Tally Intelligence</h3>
                 </div>
                 <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                   Data as of: {new Date(Math.max(...tallyTxns.map(t => new Date(t.created_at)))).toLocaleDateString()}
                 </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="cv-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Invoice Date</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {(() => {
                      const sales = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') && Number(t.amount) > 0);
                      return sales.length > 0 ? new Date(sales[0].voucher_date).toLocaleDateString() : 'N/A';
                    })()}
                  </div>
                </div>
                <div className="cv-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Total Sales (Imported)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {(() => {
                      const salesTxns = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') || t.voucher_type.toLowerCase().includes('credit note'));
                      if (salesTxns.length === 0) return 'N/A';
                      const totalSales = salesTxns.reduce((sum, t) => {
                        const amt = Number(t.amount);
                        if (t.voucher_type.toLowerCase().includes('credit note')) return sum - amt;
                        return sum + amt;
                      }, 0);
                      return `₹${totalSales.toLocaleString()}`;
                    })()}
                  </div>
                </div>
                <div className="cv-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Last Debit Amount</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                    {(() => {
                      const debits = tallyTxns.filter(t => !t.is_credit && Number(t.amount) > 0);
                      return debits.length > 0 ? `₹${Number(debits[0].amount).toLocaleString()}` : 'N/A';
                    })()}
                  </div>
                </div>
                <div className="cv-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Ledger Balance (Net)</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: (() => {
                       const debits = tallyTxns.filter(t => !t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const credits = tallyTxns.filter(t => t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const net = debits - credits;
                       if(net > 0) return 'var(--warning)';
                       if(net < 0) return 'var(--success)';
                       return 'var(--text-primary)';
                  })() }}>
                    {(() => {
                       if (tallyTxns.length === 0) return 'N/A';
                       const debits = tallyTxns.filter(t => !t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const credits = tallyTxns.filter(t => t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                       const net = debits - credits;
                       return `${net > 0 ? 'Dr. ₹' : net < 0 ? 'Cr. ₹' : '₹'}${Math.abs(net).toLocaleString()}`;
                    })()}
                  </div>
                </div>
              </div>

              <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Ledger Entries</h3>
              <div className="cv-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Voucher</th>
                      <th style={{ padding: '1rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tallyTxns.map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom: idx === tallyTxns.length-1 ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{new Date(t.voucher_date).toLocaleDateString()}</td>
                        <td style={{ padding: '1rem 1.5rem' }}>
                          <span style={{ fontWeight: 500 }}>{t.voucher_type}</span>
                          {t.voucher_no && t.voucher_no !== 'NA' && <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.9rem' }}>#{t.voucher_no}</span>}
                        </td>
                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 500, color: t.is_credit ? 'var(--success)' : 'var(--text-primary)' }}>
                          {t.is_credit ? 'Cr. ' : 'Dr. '}₹{Number(t.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* 3. REQUIREMENTS */}
      {activeTab === 'requirements' && (
        <div className="animate-fade-in">
          {requirements.length === 0 ? (
            <div className="cv-empty">
              <Target size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Active Requirements</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>Track what this customer wants to buy. Add a new requirement to build their demand pipeline.</p>
              <button onClick={() => navigate(`/requirements/new?party_id=${id}`)} className="btn btn-primary">Add First Requirement</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {requirements.map(req => (
                <Link key={req.id} to={`/requirements/${req.id}`} className="cv-panel" style={{ padding: '1.5rem', textDecoration: 'none', color: 'inherit', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s ease' }} onMouseOver={e => {e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)'}} onMouseOut={e => {e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.375rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{req.product_type}</span>
                      <span className={`badge ${req.status === 'Confirmed' ? 'badge-success' : req.status === 'Lost' ? 'badge-danger' : 'badge-active'}`} style={{ fontSize: '0.7rem' }}>{req.status}</span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                      Volume: <strong style={{ color: 'var(--text-primary)' }}>{req.quantity} {req.unit}</strong> 
                      {req.expected_rate && <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span>}
                      {req.expected_rate && <span>Target Rate: <strong style={{ color: 'var(--text-primary)' }}>₹{req.expected_rate}</strong></span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <ArrowLeft size={20} className="text-muted" style={{ transform: 'rotate(135deg)', opacity: 0.5 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. FOLLOW UPS */}
      {activeTab === 'followups' && (
        <div className="animate-fade-in">
          {followUps.length === 0 ? (
            <div className="cv-empty">
              <Calendar size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Follow-ups Scheduled</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>Never drop the ball. Schedule tasks and reminders for this customer to stay on top of the deal.</p>
              <button onClick={() => setShowFollowUpForm(true)} className="btn btn-primary">Schedule Task</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {followUps.map(f => (
                <div key={f.id} className="cv-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: f.status !== 'Pending' ? 0.6 : 1, borderLeft: f.status === 'Pending' ? '4px solid var(--primary)' : '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', textDecoration: f.status !== 'Pending' ? 'line-through' : 'none', marginBottom: '0.375rem' }}>{f.reason}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <span>Due: <strong style={{ color: 'var(--text-primary)' }}>{new Date(f.follow_up_date).toLocaleDateString()}</strong></span>
                      <span style={{ opacity: 0.5 }}>|</span>
                      <span>Priority: <strong style={{ color: 'var(--text-primary)' }}>{f.priority}</strong></span>
                      {f.status !== 'Pending' && (
                        <>
                          <span style={{ opacity: 0.5 }}>|</span>
                          <span className={`badge ${f.status === 'Completed' ? 'badge-active' : 'badge-dormant'}`}>{f.status}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {f.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button className="btn cv-btn-subtle" onClick={() => updateFollowUpStatus(f, 'Postponed')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Postpone</button>
                      <button className="btn btn-primary" onClick={() => updateFollowUpStatus(f, 'Completed')} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}><CheckCircle2 size={16}/> Complete</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. ACTIVITY */}
      {activeTab === 'activity' && (
        <div className="animate-fade-in">
          {interactions.length === 0 ? (
            <div className="cv-empty">
              <MessageCircle size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Activity History</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>Keep track of every conversation, meeting, and email to maintain context.</p>
              <button onClick={() => setShowInteractionForm(true)} className="btn btn-primary">Log First Interaction</button>
            </div>
          ) : (
            <div className="cv-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {interactions.map((i, idx) => (
                  <div key={i.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: idx === interactions.length-1 ? 0 : '2rem' }}>
                    {idx !== interactions.length-1 && <div style={{ position: 'absolute', left: '6px', top: '24px', bottom: 0, width: '2px', backgroundColor: 'var(--border)' }}></div>}
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: '2px solid var(--primary)', marginTop: '4px', zIndex: 1, flexShrink: 0 }}></div>
                    <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{i.channel}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(i.created_at).toLocaleString()}</div>
                      </div>
                      {i.outcome && <div style={{ fontWeight: 500, marginBottom: i.note ? '0.75rem' : 0 }}>{i.outcome}</div>}
                      {i.note && <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>{i.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
