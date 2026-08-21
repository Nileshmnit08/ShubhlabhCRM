import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Edit2, MapPin, Phone, MessageCircle, Trash2, ShieldAlert, Calendar, Plus, CheckCircle2, Target, Info, DollarSign, Activity } from 'lucide-react';
import { AuthContext } from '../../AuthContext';
import AlertsPanel from '../../components/AlertsPanel';
import WhatsAppAction from '../../components/WhatsAppAction';
import CallAction from '../../components/CallAction';
import { logActivity } from '../../lib/activityLogger';
import ConvertLeadModal from '../../components/ConvertLeadModal';

export default function CustomerView({ isLeadMode = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); 
  const { userProfile } = React.useContext(AuthContext);
  
  const [followUps, setFollowUps] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [linkedSignals, setLinkedSignals] = useState([]);
  const [tallyTxns, setTallyTxns] = useState([]);
  const [sequences, setSequences] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [reactivationOpp, setReactivationOpp] = useState(null);
  const [retentionOpp, setRetentionOpp] = useState(null);
  const [issues, setIssues] = useState([]);
  const [accountReviews, setAccountReviews] = useState([]);
  
  // Forms
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  
  const [showLinkSignalModal, setShowLinkSignalModal] = useState(false);
  const [activeReqIdForLink, setActiveReqIdForLink] = useState(null);
  const [availableSignals, setAvailableSignals] = useState([]);

  const [newFollowUp, setNewFollowUp] = useState({ reason: '', follow_up_date: '', priority: 'Normal', notes: '', sequence_id: '', follow_up_type: isLeadMode ? 'Lead' : 'General' });

  const [showInteractionForm, setShowInteractionForm] = useState(false);
  const [newInteraction, setNewInteraction] = useState({ channel: 'Call', outcome: '', note: '' });

  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [newContact, setNewContact] = useState({ name: '', role: 'Purchase Contact', mobile: '', whatsapp: '', email: '', preferred_channel: 'Call', do_not_contact: false });

  const [showCommercialForm, setShowCommercialForm] = useState(false);
  const [newCommercial, setNewCommercial] = useState({ customer_type: '', product_interests: '', business_context: '' });

  const [showIssueForm, setShowIssueForm] = useState(false);
  const [editingIssue, setEditingIssue] = useState(null);
  const [newIssue, setNewIssue] = useState({ category: 'General Service', priority: 'Normal', description: '', status: 'Open' });

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({ notes: '', next_actions: '', next_review_date: '' });
  const [dealerProfile, setDealerProfile] = useState(null);
  
  // Schemes
  const [activeSchemes, setActiveSchemes] = useState([]);
  const [participations, setParticipations] = useState([]);

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

      if (cData.relationship_type === 'Dealer') {
        const { data: dData } = await supabase.from('crm_dealer_profiles').select('*').eq('party_id', id).single();
        if (dData) setDealerProfile(dData);

        // Fetch schemes
        const { data: schData } = await supabase.from('dealer_schemes').select('*').eq('status', 'Active');
        setActiveSchemes(schData || []);

        const { data: partData } = await supabase.from('dealer_scheme_participations').select('*, dealer_schemes(*)').eq('party_id', id);
        setParticipations(partData || []);

        // Default to execution tab for dealers
        setActiveTab(prev => prev === 'details' ? 'execution' : prev);
      }
      
      const { data: fData, error: fErr } = await supabase.from('follow_ups').select('*').eq('party_id', id).order('follow_up_date', { ascending: true });
      if (fErr) throw fErr;
      setFollowUps(fData || []);

      const { data: tData, error: tErr } = await supabase.from('v_customer_timeline').select('*').eq('party_id', id).order('event_date', { ascending: false });
      if (tErr) throw tErr;
      setTimelineEvents(tData || []);
      
      const { data: reqData } = await supabase.from('requirements').select('*').eq('party_id', id).order('created_at', { ascending: false });
      setRequirements(reqData || []);

      if (reqData && reqData.length > 0) {
         const { data: rsData } = await supabase.from('v_requirement_linked_signals')
            .select('*')
            .in('requirement_id', reqData.map(r => r.id));
         setLinkedSignals(rsData || []);
      }

      const { data: tallyData } = await supabase.from('tally_transactions').select('*').eq('crm_party_id', id).order('voucher_date', { ascending: false });
      setTallyTxns(tallyData || []);

      const { data: ctData } = await supabase.from('crm_contacts').select('*').eq('party_id', id).order('created_at', { ascending: true });
      setContacts(ctData || []);

      const { data: oppsData } = await supabase.from('v_customer_opportunities')
        .select('*')
        .eq('party_id', id)
        .in('opportunity_type', ['Reactivation', 'Purchase Gap', 'Onboarding Gap']);
      
      if (oppsData) {
        setReactivationOpp(oppsData.find(o => o.opportunity_type === 'Reactivation') || null);
        setRetentionOpp(oppsData.find(o => o.opportunity_type === 'Purchase Gap' || o.opportunity_type === 'Onboarding Gap') || null);
      }

      const { data: issueData } = await supabase.from('crm_issues').select('*').eq('party_id', id).order('created_at', { ascending: false });
      setIssues(issueData || []);

      const { data: revData } = await supabase.from('crm_account_reviews').select('*').eq('party_id', id).order('review_date', { ascending: false });
      setAccountReviews(revData || []);

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

  const handleEnrollScheme = async (schemeId) => {
    try {
      await supabase.from('dealer_scheme_participations').insert({
        scheme_id: schemeId,
        party_id: id,
        status: 'Enrolled',
        notes: 'Enrolled via CRM'
      });
      fetchCustomerContext();
    } catch(err) {
      console.error(err);
    }
  };

  const handleUpdateParticipation = async (partId, newStatus) => {
    try {
      await supabase.from('dealer_scheme_participations').update({ status: newStatus }).eq('id', partId);
      fetchCustomerContext();
    } catch(err) {
      console.error(err);
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
      
      let payload = {
        party_id: id,
        original_follow_up_date: newFollowUp.follow_up_date,
        created_by: session?.session?.user?.id || null,
        assigned_to: session?.session?.user?.id || null,
        follow_up_type: newFollowUp.follow_up_type || (isLeadMode ? 'Lead' : 'General'),
        reason: newFollowUp.reason,
        follow_up_date: newFollowUp.follow_up_date,
        priority: newFollowUp.priority,
        notes: newFollowUp.notes
      };

      if (newFollowUp.sequence_id) {
         payload.sequence_id = newFollowUp.sequence_id;
         payload.sequence_step_number = 1;
         
         const { data: existingPending } = await supabase.from('follow_ups')
            .select('id')
            .eq('party_id', id)
            .eq('status', 'Pending')
            .eq('sequence_id', newFollowUp.sequence_id);
            
         if (existingPending && existingPending.length > 0) {
            alert("Customer is already enrolled in this sequence.");
            return;
         }
      }

      const { data, error } = await supabase.from('follow_ups').insert(payload).select();
      if (error) throw error;
      setFollowUps([...followUps, data[0]].sort((a,b) => new Date(a.follow_up_date) - new Date(b.follow_up_date)));
      setShowFollowUpForm(false);
      setNewFollowUp({ reason: '', follow_up_date: '', priority: 'Normal', notes: '', sequence_id: '', follow_up_type: isLeadMode ? 'Lead' : 'General' });
    } catch (err) {
      alert("Failed to schedule follow-up");
    }
  };

  const handleLogInteraction = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('interactions').insert({ party_id: id, ...newInteraction }).select();
      if (error) throw error;
      fetchCustomerContext();
      setShowInteractionForm(false);
      setNewInteraction({ channel: 'Call', outcome: '', note: '' });
    } catch (err) {
      alert("Failed to log interaction");
    }
  };

  const handleSaveContact = async (e) => {
    e.preventDefault();
    try {
      if (editingContact) {
        const { error } = await supabase.from('crm_contacts').update(newContact).eq('id', editingContact.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crm_contacts').insert({ party_id: id, ...newContact });
        if (error) throw error;
      }
      setShowContactForm(false);
      setEditingContact(null);
      setNewContact({ name: '', role: 'Purchase Contact', mobile: '', whatsapp: '', email: '', preferred_channel: 'Call', do_not_contact: false });
      fetchCustomerContext();
    } catch (err) {
      console.error(err);
      alert("Failed to save contact.");
    }
  };

  const handleEditContact = (c) => {
     setEditingContact(c);
     setNewContact({ name: c.name, role: c.role, mobile: c.mobile, whatsapp: c.whatsapp, email: c.email || '', preferred_channel: c.preferred_channel || 'Call', do_not_contact: c.do_not_contact || false });
     setShowContactForm(true);
  };

  const handleEditCommercial = () => {
    setNewCommercial({
      customer_type: customer.customer_type || '',
      product_interests: customer.product_interests || '',
      business_context: customer.business_context || ''
    });
    setShowCommercialForm(true);
  };

  const handleSaveCommercial = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('crm_parties').update(newCommercial).eq('id', id);
      if (error) throw error;
      setShowCommercialForm(false);
      fetchCustomerContext();
    } catch (err) {
      console.error(err);
      alert("Failed to save commercial profile.");
    }
  };

  const handleEditIssue = (issue) => {
     setEditingIssue(issue);
     setNewIssue({ category: issue.category, priority: issue.priority, description: issue.description, status: issue.status, resolution_notes: issue.resolution_notes || '' });
     setShowIssueForm(true);
  };

  const handleSaveIssue = async (e) => {
     e.preventDefault();
     try {
        let payload = {
           category: newIssue.category,
           priority: newIssue.priority,
           description: newIssue.description,
           status: newIssue.status,
           resolution_notes: newIssue.resolution_notes
        };

        if (editingIssue) {
           const { error } = await supabase.from('crm_issues').update(payload).eq('id', editingIssue.id);
           if (error) throw error;
        } else {
           payload.party_id = id;
           payload.assigned_owner_id = customer.assigned_owner_id || userProfile?.id;
           payload.created_by = userProfile?.id;
           const { error } = await supabase.from('crm_issues').insert(payload);
           if (error) throw error;
        }
        setShowIssueForm(false);
        setEditingIssue(null);
        setNewIssue({ category: 'General Service', priority: 'Normal', description: '', status: 'Open' });
        fetchCustomerContext();
     } catch (err) {
        console.error(err);
        alert("Failed to save issue.");
     }
  };

  const handleSaveReview = async (e) => {
    e.preventDefault();
    if (!newReview.notes) { alert('Notes are required.'); return; }
    try {
      const payload = {
        party_id: id,
        reviewed_by_id: userProfile?.id,
        notes: newReview.notes,
        next_actions: newReview.next_actions,
        next_review_date: newReview.next_review_date || null
      };
      const { error } = await supabase.from('crm_account_reviews').insert(payload);
      if (error) throw error;
      
      setShowReviewForm(false);
      setNewReview({ notes: '', next_actions: '', next_review_date: '' });
      fetchCustomerContext();
    } catch (err) {
      console.error(err);
      alert("Failed to save account review.");
    }
  };

  const updateFollowUpStatus = async (f, status) => {
    try {
      if (status === 'Completed' && (f.follow_up_type === 'Payment' || f.follow_up_type === 'Lead' || f.sequence_id)) {
        alert(`This task requires a structured outcome or is part of a sequence. You will be redirected to the task form.`);
        navigate(`/follow-ups/${f.id}/edit`);
        return;
      }

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

  const openLinkSignalModal = async (reqId) => {
     setActiveReqIdForLink(reqId);
     const { data } = await supabase.from('v_demand_signals').select('*').eq('party_id', id).order('signal_date', { ascending: false });
     setAvailableSignals(data || []);
     setShowLinkSignalModal(true);
  };

  const handleLinkSignal = async (sourceId, signalType) => {
     try {
       const { error } = await supabase.from('requirement_signals').insert({
         requirement_id: activeReqIdForLink,
         signal_source_id: sourceId,
         signal_type: signalType,
         created_by: userProfile?.id
       });
       if (error) {
         if (error.code === '23505') alert('This signal is already linked to this requirement.');
         else throw error;
       } else {
         fetchCustomerContext();
         setShowLinkSignalModal(false);
       }
     } catch(err) {
       console.error(err);
       alert("Failed to link signal");
     }
  };

  const handleUnlinkSignal = async (linkId) => {
     if (!window.confirm("Unlink this signal?")) return;
     try {
       await supabase.from('requirement_signals').delete().eq('id', linkId);
       fetchCustomerContext();
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
  const lastContact = timelineEvents.find(e => e.event_type === 'Interaction');
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
          <Link to={isLeadMode ? "/leads" : "/customers"} className="cv-btn-subtle" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', marginTop: '0.25rem' }}>
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
              
              {customer.relationship_type === 'Dealer' && dealerProfile && (
                <>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="badge badge-neutral" style={{padding: '0.1rem 0.4rem', fontSize: '0.75rem', background: '#3b82f6', color: '#fff', border: 'none'}}>
                      {dealerProfile.dealer_classification}
                    </span>
                  </div>
                </>
              )}
              {customer.territory_name && (
                <>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <MapPin size={14} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{customer.territory_name}</span>
                  </div>
                </>
              )}
              {customer.health_status && customer.crm_status !== 'Lead' && (
                <>
                  <span style={{ opacity: 0.3 }}>|</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }} title={customer.health_reason}>
                    <span className={`badge ${customer.health_status === 'Healthy' ? 'badge-success' : customer.health_status === 'At Risk' ? 'badge-danger' : 'badge-neutral'}`} style={{padding: '0.1rem 0.4rem', fontSize: '0.75rem'}}>
                      Health: {customer.health_status}
                    </span>
                    <span style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.8 }}>({customer.health_reason})</span>
                  </div>
                </>
              )}
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
            <CallAction party={customer} onComplete={fetchCustomerContext} btnClass="btn cv-btn-subtle" showLabel={true} />
          )}
          {!isLeadMode && customer.whatsapp && (
            <WhatsAppAction party={customer} onComplete={fetchCustomerContext} btnClass="btn cv-btn-subtle" />
          )}
          {!isLeadMode && (
            <>
              <button className="btn btn-primary" onClick={() => navigate(`/requirements/new?party_id=${id}`)}>
                <Plus size={16} /> New Requirement
              </button>
            </>
          )}
          {isLeadMode && customer.crm_status === 'Lead' && (
             <button className="btn btn-primary" onClick={() => setShowConvertModal(true)}>
               Convert to Customer
             </button>
          )}
          <button className="btn cv-btn-subtle" onClick={() => { setNewFollowUp({...newFollowUp, follow_up_type: isLeadMode ? 'Lead' : 'General', reason: ''}); setShowFollowUpForm(true); }}>
            <Calendar size={16} /> Follow-up
          </button>
        </div>
      </div>
      
      <AlertsPanel entityId={id} />

      {/* Reactivation Banner */}
      {reactivationOpp && (
        <div className="cv-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--primary)', backgroundColor: 'var(--primary-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--primary)' }}>Reactivation Opportunity</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{reactivationOpp.evidence}</p>
            </div>
            <button className="btn btn-primary" onClick={() => {
              setNewFollowUp({...newFollowUp, follow_up_type: 'Reactivation', reason: 'Reactivation Outreach'});
              setShowFollowUpForm(true);
            }}>
              Start Reactivation Workflow
            </button>
          </div>
        </div>
      )}

      {/* Retention Banner */}
      {retentionOpp && (
        <div className="cv-panel animate-fade-in" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--warning)', backgroundColor: 'var(--warning-light)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--warning)' }}>Retention & Repeat-Buy: {retentionOpp.opportunity_type}</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{retentionOpp.evidence}</p>
            </div>
            <button className="btn btn-secondary" style={{ backgroundColor: 'white', color: 'var(--warning)', borderColor: 'var(--warning)' }} onClick={() => {
              setNewFollowUp({...newFollowUp, follow_up_type: 'Retention', reason: 'Repeat-Buy / Restock Check'});
              setShowFollowUpForm(true);
            }}>
              Start Retention Workflow
            </button>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {!isLeadMode && (
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
      )}

      {showConvertModal && (
         <ConvertLeadModal 
           lead={customer} 
           onClose={() => setShowConvertModal(false)}
           onComplete={() => {
             setShowConvertModal(false);
             fetchCustomerContext();
             // Optionally navigate to the updated active customer route if needed,
             // but since it's the same ID, fetching again works perfectly.
             navigate(`/customers/${customer.id}`);
           }}
         />
      )}

      {showLinkSignalModal && (
         <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="modal-content cv-panel" style={{ width: '600px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
               <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Link Demand Signal</h3>
                  <button onClick={() => setShowLinkSignalModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>X</button>
               </div>
               <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {availableSignals.length === 0 ? (
                     <div className="text-muted italic">No demand signals found for this customer.</div>
                  ) : (
                     availableSignals.map(sig => {
                        const isLinked = linkedSignals.some(ls => ls.signal_source_id === sig.source_id && ls.requirement_id === activeReqIdForLink);
                        return (
                           <div key={sig.source_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-surface)' }}>
                              <div>
                                 <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{sig.signal_type}</div>
                                 <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{sig.description}</div>
                                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{new Date(sig.signal_date).toLocaleDateString()}</div>
                              </div>
                              {isLinked ? (
                                 <span className="badge badge-success">Linked</span>
                              ) : (
                                 <button className="btn btn-secondary" onClick={() => handleLinkSignal(sig.source_id, sig.signal_type)}>Link</button>
                              )}
                           </div>
                        );
                     })
                  )}
               </div>
            </div>
         </div>
      )}

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
            {customer.relationship_type === 'Dealer' && (
              <div>
                <label>Type</label>
                <select value={newFollowUp.follow_up_type} onChange={e => setNewFollowUp({...newFollowUp, follow_up_type: e.target.value})}>
                  <option value="General">General</option>
                  <option value="Dealer Visit">Dealer Visit</option>
                  <option value="Dealer Contact">Dealer Contact</option>
                </select>
              </div>
            )}
            <div>
              <label>Enroll in Sequence (Optional)</label>
              <select value={newFollowUp.sequence_id} onChange={e => {
                 const seqId = e.target.value;
                 setNewFollowUp({...newFollowUp, sequence_id: seqId, reason: seqId ? 'Sequence Step 1' : ''});
              }}>
                <option value="">-- No Sequence --</option>
                {sequences.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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

      {showContactForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
          <form onSubmit={handleSaveContact} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Name</label>
                <input required type="text" value={newContact.name} onChange={e => setNewContact({...newContact, name: e.target.value})} />
              </div>
              <div>
                <label>Role</label>
                <select value={newContact.role} onChange={e => setNewContact({...newContact, role: e.target.value})}>
                  <option>Owner</option>
                  <option>Purchase Contact</option>
                  <option>Accounts Contact</option>
                  <option>Decision Maker</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Mobile</label>
                <input type="text" value={newContact.mobile} onChange={e => setNewContact({...newContact, mobile: e.target.value})} />
              </div>
              <div>
                <label>WhatsApp</label>
                <input type="text" value={newContact.whatsapp} onChange={e => setNewContact({...newContact, whatsapp: e.target.value})} />
              </div>
              <div>
                <label>Email</label>
                <input type="email" value={newContact.email} onChange={e => setNewContact({...newContact, email: e.target.value})} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Preferred Channel</label>
                <select value={newContact.preferred_channel} onChange={e => setNewContact({...newContact, preferred_channel: e.target.value})}>
                  <option>Call</option>
                  <option>WhatsApp</option>
                  <option>Email</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginTop: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', margin: 0 }}>
                  <input type="checkbox" checked={newContact.do_not_contact} onChange={e => setNewContact({...newContact, do_not_contact: e.target.checked})} />
                  <span style={{ fontWeight: 600, color: 'var(--danger)' }}>Do Not Contact (DNC)</span>
                </label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => { setShowContactForm(false); setEditingContact(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Contact</button>
            </div>
          </form>
        </div>
      )}

      {showCommercialForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--warning)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Edit Commercial Profile</h3>
          <form onSubmit={handleSaveCommercial} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Customer Type</label>
                <select value={newCommercial.customer_type} onChange={e => setNewCommercial({...newCommercial, customer_type: e.target.value})}>
                  <option value="">Select Type...</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Retailer">Retailer</option>
                  <option value="Direct Consumer">Direct Consumer</option>
                  <option value="Manufacturer">Manufacturer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label>Product Interests</label>
                <input type="text" value={newCommercial.product_interests} onChange={e => setNewCommercial({...newCommercial, product_interests: e.target.value})} placeholder="e.g. Premium Feed, Bulk Seeds" />
              </div>
            </div>
            <div>
              <label>Business Context / Scale</label>
              <textarea rows="3" value={newCommercial.business_context} onChange={e => setNewCommercial({...newCommercial, business_context: e.target.value})} placeholder="Describe scale of operations, market presence, capacity..."></textarea>
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setShowCommercialForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Profile</button>
            </div>
          </form>
        </div>
      )}

      {showIssueForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--danger)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>{editingIssue ? 'Edit Service Issue' : 'Log Service Issue'}</h3>
          <form onSubmit={handleSaveIssue} style={{ display: 'grid', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label>Category</label>
                <select value={newIssue.category} onChange={e => setNewIssue({...newIssue, category: e.target.value})}>
                  <option>General Service</option>
                  <option>Delivery</option>
                  <option>Product Quality</option>
                  <option>Billing</option>
                </select>
              </div>
              <div>
                <label>Priority</label>
                <select value={newIssue.priority} onChange={e => setNewIssue({...newIssue, priority: e.target.value})}>
                  <option>Low</option>
                  <option>Normal</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={newIssue.status} onChange={e => setNewIssue({...newIssue, status: e.target.value})}>
                  <option>Open</option>
                  <option>In Progress</option>
                  <option>Waiting</option>
                  <option>Resolved</option>
                  <option>Closed</option>
                </select>
              </div>
            </div>
            <div>
              <label>Description</label>
              <textarea required rows="3" value={newIssue.description} onChange={e => setNewIssue({...newIssue, description: e.target.value})} placeholder="Describe the customer's issue..."></textarea>
            </div>
            {editingIssue && (
               <div>
                 <label>Resolution Notes</label>
                 <textarea rows="3" value={newIssue.resolution_notes} onChange={e => setNewIssue({...newIssue, resolution_notes: e.target.value})} placeholder="How was this resolved?"></textarea>
               </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => { setShowIssueForm(false); setEditingIssue(null); }}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Issue</button>
            </div>
          </form>
        </div>
      )}

      {showReviewForm && (
        <div className="cv-panel animate-fade-in" style={{ padding: '2rem', marginBottom: '2rem', borderLeft: '4px solid var(--primary)' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Account Review & Planning</h3>
          <form onSubmit={handleSaveReview} style={{ display: 'grid', gap: '1.5rem' }}>
            <div>
              <label>Current Situation / Notes</label>
              <textarea required rows="3" value={newReview.notes} onChange={e => setNewReview({...newReview, notes: e.target.value})} placeholder="Summarize the current state of the account..."></textarea>
            </div>
            <div>
              <label>Next Actions / Priorities</label>
              <textarea rows="3" value={newReview.next_actions} onChange={e => setNewReview({...newReview, next_actions: e.target.value})} placeholder="What needs to happen next?"></textarea>
            </div>
            <div>
              <label>Schedule Next Review</label>
              <input type="date" value={newReview.next_review_date} onChange={e => setNewReview({...newReview, next_review_date: e.target.value})} style={{ maxWidth: '200px' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn cv-btn-subtle" onClick={() => setShowReviewForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary">Save Review</button>
            </div>
          </form>
        </div>
      )}

      {/* Segmented Tab Navigation */}
      <div className="cv-tabs">
        <button className={`cv-tab ${activeTab==='details'?'active':''}`} onClick={() => setActiveTab('details')}>Account 360</button>
        {!isLeadMode && userProfile?.role === 'Admin' && (
          <button className={`cv-tab ${activeTab==='financials'?'active':''}`} onClick={() => setActiveTab('financials')}>Financial Intel</button>
        )}
        {!isLeadMode && (
          <button className={`cv-tab ${activeTab==='requirements'?'active':''}`} onClick={() => setActiveTab('requirements')}>
            Requirements <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{requirements.length}</span>
          </button>
        )}
        <button className={`cv-tab ${activeTab==='followups'?'active':''}`} onClick={() => setActiveTab('followups')}>
          Follow-ups <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{followUps.length}</span>
        </button>
        {!isLeadMode && (
          <button className={`cv-tab ${activeTab==='issues'?'active':''}`} onClick={() => setActiveTab('issues')}>
            Service Issues <span style={{ marginLeft: '0.25rem', opacity: 0.6, color: issues.some(i => i.status !== 'Resolved' && i.status !== 'Closed') ? 'var(--danger)' : 'inherit' }}>{issues.length}</span>
          </button>
        )}
        {!isLeadMode && (
          <button className={`cv-tab ${activeTab==='activity'?'active':''}`} onClick={() => setActiveTab('activity')}>
            Timeline <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{timelineEvents.length}</span>
          </button>
        )}
        {customer?.relationship_type === 'Dealer' && (
          <button className={`cv-tab ${activeTab==='execution'?'active':''}`} onClick={() => setActiveTab('execution')}>
            Execution Dashboard
          </button>
        )}
        {customer?.relationship_type === 'Dealer' && (
          <button className={`cv-tab ${activeTab==='schemes'?'active':''}`} onClick={() => setActiveTab('schemes')}>
            Schemes <span style={{ marginLeft: '0.25rem', opacity: 0.6 }}>{participations.length}</span>
          </button>
        )}
      </div>

      {/* Tab Content Areas */}
      
      {/* 1.5 EXECUTION DASHBOARD (DEALERS ONLY) */}
      {activeTab === 'execution' && customer?.relationship_type === 'Dealer' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Active Intents / Opportunities */}
          <div className="cv-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Target size={18} className="text-primary" /> Active Intent & Opportunities
            </h3>
            {requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).length === 0 ? (
               <div className="text-muted italic">No active commercial intent.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).map(req => (
                   <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                     <div>
                       <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{req.product_name}</strong>
                       <span className="text-muted text-sm">{req.intent_type || 'General Demand'} - {req.quantity} {req.unit}</span>
                     </div>
                     <button className="btn btn-secondary" onClick={() => setActiveTab('requirements')}>View Details</button>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* Pending Action Items */}
          <div className="cv-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--warning)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Calendar size={18} className="text-warning" /> Pending Actions
            </h3>
            {followUps.filter(f => f.status === 'Pending').length === 0 ? (
               <div className="text-muted italic">No pending tasks or visits.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {followUps.filter(f => f.status === 'Pending').map(f => (
                   <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                     <div>
                       <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{f.follow_up_type}</strong>
                       <span className="text-muted text-sm">{f.reason} (Due: {new Date(f.follow_up_date).toLocaleDateString()})</span>
                     </div>
                     <button className="btn btn-secondary" onClick={() => setActiveTab('followups')}>Manage</button>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* Validated Purchase Indicators */}
          <div className="cv-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--success)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <DollarSign size={18} className="text-success" /> Validated Purchases
            </h3>
            {tallyTxns.filter(t => t.voucher_type === 'Sales' && !t.is_credit).length === 0 ? (
               <div className="text-muted italic">No recent Tally sales vouchers found.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {tallyTxns.filter(t => t.voucher_type === 'Sales' && !t.is_credit).slice(0, 3).map(t => (
                   <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                     <div>
                       <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Sales Voucher: {t.voucher_number}</strong>
                       <span className="text-muted text-sm">{new Date(t.voucher_date).toLocaleDateString()} - ₹{t.amount}</span>
                     </div>
                     <button className="btn btn-secondary" onClick={() => setActiveTab('financials')}>View Ledger</button>
                   </div>
                 ))}
               </div>
            )}
          </div>

          {/* Unresolved Service Issues */}
          <div className="cv-panel" style={{ padding: '1.5rem', borderTop: '4px solid var(--danger)' }}>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <ShieldAlert size={18} className="text-danger" /> Open Issues
            </h3>
            {issues.filter(i => !['Resolved', 'Closed'].includes(i.status)).length === 0 ? (
               <div className="text-muted italic">No open service issues.</div>
            ) : (
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {issues.filter(i => !['Resolved', 'Closed'].includes(i.status)).map(i => (
                   <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                     <div>
                       <strong style={{ display: 'block', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{i.category}</strong>
                       <span className="text-muted text-sm">{i.status} - {i.priority} Priority</span>
                     </div>
                     <button className="btn btn-secondary" onClick={() => setActiveTab('issues')}>Resolve</button>
                   </div>
                 ))}
               </div>
            )}
          </div>

        </div>
      )}

      {/* 1. ACCOUNT 360 */}
      {activeTab === 'details' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
          
          {/* Relationship Health */}
          <div className="cv-panel" style={{ gridColumn: '1 / -1', borderLeft: customer.health_status === 'Healthy' ? '4px solid var(--success)' : customer.health_status === 'At Risk' ? '4px solid var(--danger)' : '4px solid var(--text-muted)' }}>
             <div style={{ padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Activity size={18} className={customer.health_status === 'Healthy' ? 'text-success' : customer.health_status === 'At Risk' ? 'text-danger' : 'text-muted'} />
                    Relationship Health: <span className={customer.health_status === 'Healthy' ? 'text-success' : customer.health_status === 'At Risk' ? 'text-danger' : 'text-muted'}>{customer.health_status || 'Unknown'}</span>
                  </h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{customer.health_reason}</div>
                  <div style={{ marginTop: '1rem' }}>
                    <button onClick={() => setShowReviewForm(true)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>Conduct Account Review</button>
                  </div>
                </div>
                {customer.risk_factors && customer.risk_factors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 300px' }}>
                    <strong style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Explicit Risk Factors</strong>
                    {customer.risk_factors.map((rf, i) => (
                       <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-primary)', padding: '0.5rem 0.75rem', backgroundColor: 'rgba(255,0,0,0.05)', borderRadius: 'var(--radius-sm)' }}>
                         <AlertTriangle size={14} className="text-danger" /> {rf}
                       </div>
                    ))}
                  </div>
                )}
             </div>
          </div>
          
          {accountReviews.length > 0 && (
            <div className="cv-panel" style={{ gridColumn: '1 / -1', padding: '1.5rem 2rem', backgroundColor: 'rgba(0,102,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                 <div>
                   <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                     <FileText size={16} className="text-primary" /> Latest Account Review
                   </h3>
                   <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                     Conducted on: {new Date(accountReviews[0].review_date).toLocaleDateString()}
                   </div>
                 </div>
                 {accountReviews[0].next_review_date && (
                   <div style={{ textAlign: 'right' }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Next Review Scheduled</div>
                     <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(accountReviews[0].next_review_date).toLocaleDateString()}</div>
                   </div>
                 )}
              </div>
              <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Situation</strong>
                  <p style={{ marginTop: '0.25rem', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{accountReviews[0].notes}</p>
                </div>
                {accountReviews[0].next_actions && (
                  <div>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Priorities / Next Actions</strong>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap', margin: 0 }}>{accountReviews[0].next_actions}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="cv-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Info size={18} className="text-muted" /> Contacts & Relationships
              </h3>
              <button onClick={() => { setEditingContact(null); setNewContact({ name: '', role: 'Purchase Contact', mobile: '', whatsapp: '', email: '', preferred_channel: 'Call', do_not_contact: false }); setShowContactForm(true); }} className="btn cv-btn-subtle" style={{ padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}>
                <Plus size={14} /> Add Contact
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {contacts.length === 0 ? (
                <div className="text-muted italic" style={{ fontSize: '0.9rem' }}>No contacts saved yet.</div>
              ) : (
                contacts.map(c => (
                  <div key={c.id} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {c.name}
                          {c.do_not_contact && <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>DNC</span>}
                          {!c.is_active && <span className="badge badge-dormant" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{c.role}</div>
                      </div>
                      <button onClick={() => handleEditContact(c)} className="cv-btn-subtle" style={{ border: 'none', background: 'none', padding: '0.25rem' }}>
                        <Edit2 size={14} className="text-muted" />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.9rem' }}>
                      {c.mobile && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">Mobile:</span> 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <span>{c.mobile}</span>
                           {!c.do_not_contact && c.is_active && <CallAction party={{mobile: c.mobile}} onComplete={fetchCustomerContext} btnClass="badge badge-neutral" />}
                        </div>
                      </div>}
                      {c.whatsapp && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span className="text-muted">WhatsApp:</span> 
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span>{c.whatsapp}</span>
                          {!c.do_not_contact && c.is_active && <WhatsAppAction party={{whatsapp: c.whatsapp, display_name: c.name}} onComplete={fetchCustomerContext} btnClass="badge badge-active" />}
                        </div>
                      </div>}
                      {c.email && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Email:</span> <span>{c.email}</span></div>}
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Prefers:</span> <span>{c.preferred_channel}</span></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Owner Section */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px dashed var(--border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Assigned CRM Owner</div>
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
                    <MessageCircle size={14} /> Send WhatsApp
                  </button>
                )}
                </div>
              </div>
              
              {customer.territory_name && (
                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Territory Coverage ({customer.territory_name})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="badge badge-neutral" style={{fontSize: '0.85rem', padding: '0.25rem 0.5rem', fontWeight: 500}}>{customer.territory_manager_name || 'Unassigned'}</span>
                  </div>
                </div>
              )}
            </div>
            
            {isLeadMode && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Lead Source</div>
                <div style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.lead_source || <span className="text-muted italic">Unknown</span>}</div>
              </div>
            )}
          </div>

          {!isLeadMode && (
            <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Target size={18} className="text-warning" /> Commercial Profile
                </h3>
                <button onClick={handleEditCommercial} className="btn cv-btn-subtle" style={{ padding: '0.375rem 0.75rem', fontSize: '0.85rem' }}>
                  <Edit2 size={14} /> Edit
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                 <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Customer Type</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.customer_type || <span className="text-muted italic">Not specified</span>}</div>
                 </div>
                 <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Product Interests</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500 }}>{customer.product_interests || <span className="text-muted italic">Not specified</span>}</div>
                 </div>
                 <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Business Context</div>
                    {customer.business_context ? (
                      <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>{customer.business_context}</p>
                    ) : (
                      <div className="text-muted italic" style={{ fontSize: '0.95rem' }}>Not specified</div>
                    )}
                 </div>
              </div>
            </div>
          )}

          {!isLeadMode && userProfile?.role === 'Admin' && tallyTxns.length > 0 && (
            <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <DollarSign size={18} className="text-success" /> Tally Relationship
                </h3>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Synced</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                 <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Ledger Balance (Net)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                      {(() => {
                         const debits = tallyTxns.filter(t => !t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                         const credits = tallyTxns.filter(t => t.is_credit).reduce((sum, t) => sum + Number(t.amount), 0);
                         const net = debits - credits;
                         return `${net > 0 ? 'Dr. ₹' : net < 0 ? 'Cr. ₹' : '₹'}${Math.abs(net).toLocaleString()}`;
                      })()}
                    </div>
                 </div>
                 <div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Last Invoice Date</div>
                    <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {(() => {
                        const sales = tallyTxns.filter(t => t.voucher_type.toLowerCase().includes('sale') && Number(t.amount) > 0);
                        return sales.length > 0 ? new Date(sales[0].voucher_date).toLocaleDateString() : 'N/A';
                      })()}
                    </div>
                 </div>
                 <button onClick={() => setActiveTab('financials')} className="btn cv-btn-subtle" style={{ marginTop: 'auto' }}>View Full Ledger &rarr;</button>
              </div>
            </div>
          )}

          {!isLeadMode && (
            <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--warning)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <Target size={18} className="text-warning" /> Active Pipeline
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).slice(0,3).map(req => (
                  <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 500 }}>{req.product_type}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{req.quantity} {req.unit}</div>
                    </div>
                    <span className="badge badge-active" style={{ fontSize: '0.7rem', height: 'fit-content' }}>{req.status}</span>
                  </div>
                ))}
                {requirements.filter(r => !['Closed', 'Lost', 'Confirmed'].includes(r.status)).length === 0 && (
                   <span className="text-muted italic" style={{ fontSize: '0.9rem' }}>No active requirements.</span>
                )}
                <button onClick={() => setActiveTab('requirements')} className="btn cv-btn-subtle" style={{ marginTop: '0.5rem' }}>View All ({requirements.length}) &rarr;</button>
              </div>
            </div>
          )}

          <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                <Calendar size={18} className="text-primary" /> Pending Tasks
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {followUps.filter(f => f.status === 'Pending').slice(0,3).map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{f.reason}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>Due: {new Date(f.follow_up_date).toLocaleDateString()}</div>
                  </div>
                </div>
              ))}
              {followUps.filter(f => f.status === 'Pending').length === 0 && (
                 <span className="text-muted italic" style={{ fontSize: '0.9rem' }}>No pending tasks.</span>
              )}
              <button onClick={() => setActiveTab('followups')} className="btn cv-btn-subtle" style={{ marginTop: '0.5rem' }}>Manage Tasks ({followUps.length}) &rarr;</button>
            </div>
          </div>

          {!isLeadMode && (
            <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--success)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                  <MessageCircle size={18} className="text-success" /> Recent Timeline
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {timelineEvents.slice(0,3).map((i, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                        {i.is_tally && <DollarSign size={12} className="text-success" style={{ marginRight: '0.25rem' }} />}
                        {i.title} <span style={{ color: 'var(--text-secondary)', fontWeight: 400, marginLeft: '0.25rem' }}>- {new Date(i.event_date).toLocaleDateString()}</span>
                      </div>
                      {i.description && <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.description}</div>}
                    </div>
                    <span className={`badge ${i.is_tally ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', height: 'fit-content' }}>{i.event_type}</span>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                   <span className="text-muted italic" style={{ fontSize: '0.9rem' }}>No recent events.</span>
                )}
                <button onClick={() => setActiveTab('activity')} className="btn cv-btn-subtle" style={{ marginTop: '0.5rem' }}>View Timeline ({timelineEvents.length}) &rarr;</button>
              </div>
            </div>
          )}

          <div className="cv-panel" style={{ padding: '2rem', gridColumn: '1 / -1' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={18} className="text-muted" /> Internal Notes
            </h3>
            {customer.notes ? (
              <p style={{ color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0 }}>{customer.notes}</p>
            ) : (
              <div className="text-muted italic" style={{ fontSize: '0.95rem' }}>No internal notes saved for this customer.</div>
            )}
          </div>
          
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={handleDelete} className="cv-delete-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', fontSize: '0.9rem', cursor: 'pointer' }}>
              <Trash2 size={16} /> {isLeadMode ? 'Delete Lead' : 'Delete Customer Record'}
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

      {/* 3. REQUIREMENTS / PRODUCTS & DEMAND */}
      {activeTab === 'requirements' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Dealer Product Profile */}
          {customer.relationship_type === 'Dealer' && (
            <div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Dealer Product Profile
              </h3>
              <div className="cv-panel" style={{ padding: '1.5rem', backgroundColor: 'rgba(var(--primary-rgb), 0.02)', borderColor: 'rgba(var(--primary-rgb), 0.1)' }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Primary Product Categories / Interests</div>
                {customer.product_interests ? (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {customer.product_interests.split(',').map((interest, idx) => (
                      <span key={idx} className="badge badge-active" style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem' }}>
                        {interest.trim()}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted italic" style={{ fontSize: '0.9rem' }}>No specific product interests recorded. Update in edit profile.</div>
                )}
              </div>
            </div>
          )}

          {/* Stated Demand (Requirements) */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Stated Demand <span className="badge" style={{ marginLeft: '0.5rem', backgroundColor: 'var(--bg-elevated)' }}>CRM Intent</span></span>
              <button onClick={() => navigate(`/requirements/new?party_id=${id}`)} className="btn btn-primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.85rem' }}>
                + Add Requirement
              </button>
            </h3>
            
            {requirements.length === 0 ? (
              <div className="cv-empty" style={{ padding: '2rem' }}>
                <Target size={40} className="empty-state-icon" style={{ opacity: 0.5 }} />
                <h4 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No Active Requirements</h4>
                <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto', fontSize: '0.9rem' }}>Track what this customer explicitly wants to buy.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {requirements.map(req => {
                  const reqSignals = linkedSignals.filter(ls => ls.requirement_id === req.id);
                  return (
                  <div key={req.id} className="cv-panel" style={{ padding: '1.25rem', background: 'var(--bg-surface)', transition: 'all 0.2s ease', borderColor: 'var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.375rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>{req.product_type}</span>
                          <span className={`badge ${req.status === 'Confirmed' ? 'badge-success' : req.status === 'Lost' ? 'badge-danger' : 'badge-active'}`} style={{ fontSize: '0.7rem' }}>{req.status}</span>
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          Volume: <strong style={{ color: 'var(--text-primary)' }}>{req.quantity} {req.unit || 'units'}</strong> 
                          {req.expected_rate && <span style={{ margin: '0 0.5rem', opacity: 0.5 }}>|</span>}
                          {req.expected_rate && <span>Target Rate: <strong style={{ color: 'var(--text-primary)' }}>₹{req.expected_rate}</strong></span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openLinkSignalModal(req.id)} className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}>+ Link Signal</button>
                        <Link to={`/requirements/${req.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', textDecoration: 'none' }}>View &rarr;</Link>
                      </div>
                    </div>
                    {reqSignals.length > 0 && (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border)' }}>
                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>Linked Demand Signals</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                           {reqSignals.map(rs => (
                             <div key={rs.link_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                               <div>
                                  <span className="badge badge-neutral" style={{ fontSize: '0.7rem', marginRight: '0.5rem' }}>{rs.signal_type}</span>
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>{rs.description}</span>
                               </div>
                               <button onClick={() => handleUnlinkSignal(rs.link_id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '0.25rem' }} title="Unlink Signal">
                                 <Trash2 size={12} />
                               </button>
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                )})}
              </div>
            )}
          </div>

          {/* Realized Sales from Tally */}
          <div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
              <span>Realized Sales <span className="badge badge-success" style={{ marginLeft: '0.5rem' }}>Tally Verified</span></span>
            </h3>
            
            {tallyTxns.filter(t => t.voucher_type === 'Sales' && !t.is_credit).length === 0 ? (
              <div className="cv-empty" style={{ padding: '2rem' }}>
                <Activity size={40} className="empty-state-icon" style={{ opacity: 0.5 }} />
                <p className="text-secondary" style={{ margin: 0, fontSize: '0.9rem' }}>No recent sales transactions found in Tally for this account.</p>
              </div>
            ) : (
              <div className="cv-panel" style={{ overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                      <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date</th>
                      <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Voucher</th>
                      <th style={{ padding: '0.75rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tallyTxns.filter(t => t.voucher_type === 'Sales' && !t.is_credit).slice(0, 5).map((t, idx, arr) => (
                      <tr key={t.id} style={{ borderBottom: idx === arr.length-1 ? 'none' : '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem 1.25rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{new Date(t.voucher_date).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem 1.25rem', fontSize: '0.9rem' }}>
                          <span style={{ fontWeight: 500 }}>{t.voucher_type}</span>
                          {t.voucher_no && t.voucher_no !== 'NA' && <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85rem' }}>#{t.voucher_no}</span>}
                        </td>
                        <td style={{ padding: '0.75rem 1.25rem', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                          ₹{Number(t.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* 3.5 SCHEMES (DEALERS ONLY) */}
      {activeTab === 'schemes' && customer?.relationship_type === 'Dealer' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="cv-panel">
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Enrolled Schemes</h3>
            </div>
            <div style={{ padding: '1.5rem 2rem' }}>
              {participations.length === 0 ? (
                <div className="text-muted italic">No schemes enrolled yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {participations.map(p => (
                    <div key={p.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1.05rem' }}>{p.dealer_schemes?.name}</strong>
                        <span className="text-muted text-sm">Status: <strong style={{ color: p.status === 'Verified' ? 'var(--success)' : 'inherit' }}>{p.status}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {p.status === 'Enrolled' && <button className="btn btn-secondary" onClick={() => handleUpdateParticipation(p.id, 'Target Achieved')}>Mark Achieved</button>}
                        {p.status === 'Target Achieved' && <button className="btn btn-secondary" onClick={() => handleUpdateParticipation(p.id, 'Claimed')}>Mark Claimed</button>}
                        {p.status === 'Claimed' && <button className="btn btn-primary" onClick={() => handleUpdateParticipation(p.id, 'Verified')}>Verify (CRM)</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="cv-panel">
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>Available Schemes</h3>
            </div>
            <div style={{ padding: '1.5rem 2rem' }}>
              {activeSchemes.filter(s => !participations.some(p => p.scheme_id === s.id)).length === 0 ? (
                <div className="text-muted italic">No available schemes to enroll.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeSchemes.filter(s => !participations.some(p => p.scheme_id === s.id)).map(s => (
                    <div key={s.id} style={{ padding: '1rem', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-surface)' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem', fontSize: '1.05rem', color: 'var(--primary)' }}>{s.name}</strong>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{s.description}</p>
                      <div className="text-muted text-sm" style={{ marginBottom: '1rem' }}>Eligibility: {s.eligibility_criteria}</div>
                      <button className="btn btn-primary" onClick={() => handleEnrollScheme(s.id)}>Enroll Dealer</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', textDecoration: f.status !== 'Pending' ? 'line-through' : 'none', marginBottom: '0.375rem' }}>
                      {f.sequence_id && <span style={{marginRight: '0.5rem', color: 'var(--primary)'}}>[Seq]</span>}
                      {f.reason}
                    </div>
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

      {/* 4b. ISSUES */}
      {activeTab === 'issues' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
             <button onClick={() => setShowIssueForm(true)} className="btn btn-primary">Log New Issue</button>
          </div>
          {issues.length === 0 ? (
            <div className="cv-empty">
              <ShieldAlert size={48} className="empty-state-icon text-success" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Service Issues</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>This customer has a clean record. No active complaints or service gaps.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {issues.map(issue => (
                <div key={issue.id} className="cv-panel" style={{ padding: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderLeft: (issue.status === 'Resolved' || issue.status === 'Closed') ? '4px solid var(--success)' : '4px solid var(--danger)' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {issue.category} 
                      <span className={`badge ${issue.priority === 'Critical' ? 'badge-danger' : 'badge-neutral'}`}>{issue.priority}</span>
                      <span className={`badge ${['Resolved', 'Closed'].includes(issue.status) ? 'badge-success' : 'badge-active'}`}>{issue.status}</span>
                    </div>
                    <div style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.5rem', whiteSpace: 'pre-wrap' }}>
                      {issue.description}
                    </div>
                    {issue.resolution_notes && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem', padding: '0.75rem', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius-sm)' }}>
                        <strong>Resolution:</strong> {issue.resolution_notes}
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
                      Logged: {new Date(issue.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <button className="btn cv-btn-subtle" onClick={() => handleEditIssue(issue)} style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                      <Edit2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. TIMELINE */}
      {activeTab === 'activity' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <button onClick={() => setShowInteractionForm(true)} className="btn btn-primary">Log Interaction</button>
          </div>
          {timelineEvents.length === 0 ? (
            <div className="cv-empty">
              <MessageCircle size={48} className="empty-state-icon" style={{ opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No Timeline History</h3>
              <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>Keep track of every conversation, meeting, transaction, and email to maintain context.</p>
            </div>
          ) : (
            <div className="cv-panel" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {timelineEvents.map((i, idx) => (
                  <div key={`${i.source_id}-${i.event_type}`} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: idx === timelineEvents.length-1 ? 0 : '2rem' }}>
                    {idx !== timelineEvents.length-1 && <div style={{ position: 'absolute', left: '6px', top: '24px', bottom: 0, width: '2px', backgroundColor: 'var(--border)' }}></div>}
                    <div style={{ width: '14px', height: '14px', borderRadius: '50%', backgroundColor: 'var(--bg-surface)', border: `2px solid ${i.is_tally ? 'var(--success)' : 'var(--primary)'}`, marginTop: '4px', zIndex: 1, flexShrink: 0 }}></div>
                    <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid ${i.is_tally ? 'rgba(0, 255, 0, 0.1)' : 'var(--border)'}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '1.05rem', color: i.is_tally ? 'var(--success)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {i.is_tally && <DollarSign size={14} />} {i.title}
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{new Date(i.event_date).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                         {i.description && <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{i.description}</div>}
                         <span className={`badge ${i.is_tally ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>{i.event_type}</span>
                      </div>
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
