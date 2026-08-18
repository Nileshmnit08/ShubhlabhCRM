import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, AlertCircle, Clock, CheckCircle2, Phone, ChevronRight, BarChart3, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import WhatsAppAction from '../components/WhatsAppAction';

export default function Today() {
  const [followUps, setFollowUps] = useState({
    overdue: [],
    today: [],
    highPriority: []
  });
  
  const [biStats, setBiStats] = useState({
    openRequirements: 0,
    pendingQuotations: 0,
    expectedBusiness: 0,
    contactedToday: 0,
    atRiskCustomers: [],
    demandByProduct: {}
  });

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchTodayWork();
  }, []);

  async function fetchTodayWork() {
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

      // Fetch Follow-ups directly using JS timezone date
      const { data: overdueData } = await supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, whatsapp, communication_preference )`)
        .eq('status', 'Pending')
        .lt('follow_up_date', todayStr);

      const { data: todayData } = await supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, whatsapp, communication_preference )`)
        .eq('status', 'Pending')
        .eq('follow_up_date', todayStr);

      const { data: futureHighPriority } = await supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, whatsapp, communication_preference )`)
        .eq('status', 'Pending')
        .eq('priority', 'High')
        .gt('follow_up_date', todayStr);

      // Sort Overdue by age (asc) then priority
      const pWeight = { 'High': 3, 'Normal': 2, 'Low': 1 };
      const sortFn = (a, b) => {
        if (a.follow_up_date !== b.follow_up_date) return a.follow_up_date.localeCompare(b.follow_up_date);
        return pWeight[b.priority || 'Normal'] - pWeight[a.priority || 'Normal'];
      };

      const categorized = { 
        overdue: (overdueData || []).sort(sortFn), 
        today: (todayData || []).sort(sortFn), 
        highPriority: (futureHighPriority || []).sort(sortFn) 
      };

      const partyIds = new Set();
      [...categorized.overdue, ...categorized.today, ...categorized.highPriority].forEach(fu => {
        if (fu.crm_parties?.id) partyIds.add(fu.crm_parties.id);
      });

      // Fetch Context for these parties
      const pIdsArray = Array.from(partyIds);
      if (pIdsArray.length > 0) {
        const { data: iData } = await supabase.from('interactions').select('party_id, created_at, outcome').in('party_id', pIdsArray).order('created_at', { ascending: false });
        const { data: rData } = await supabase.from('requirements').select('party_id, created_at, product_type, quantity, status').in('party_id', pIdsArray).order('created_at', { ascending: false });

        const contextMap = {};
        pIdsArray.forEach(id => {
          const latestInt = iData?.find(i => i.party_id === id);
          const latestReq = rData?.find(r => r.party_id === id);
          contextMap[id] = {
            lastContact: latestInt ? new Date(latestInt.created_at).toLocaleDateString() : 'Never',
            lastOutcome: latestInt?.outcome || 'None',
            lastReq: latestReq ? `${latestReq.quantity} ${latestReq.product_type} (${latestReq.status})` : 'None'
          };
        });

        // Inject context
        [categorized.overdue, categorized.today, categorized.highPriority].forEach(list => {
          list.forEach(fu => {
            if (fu.crm_parties?.id) {
              fu.context = contextMap[fu.crm_parties.id];
            }
          });
        });
      }

      setFollowUps(categorized);

      // 2. Fetch BI Stats using Sprint 6 Views
      const { data: reqDemandData } = await supabase.from('v_requirement_demand').select('*');
      const { data: openReqsData } = await supabase.from('v_open_requirements').select('*');
      const { data: attentionData } = await supabase.from('v_customer_attention').select('*');
      
      let openReqs = openReqsData?.length || 0;
      let pendingQuotes = 0, expectedBiz = 0;
      let demand = {};

      if (openReqsData) {
        openReqsData.forEach(r => {
          if (r.status === 'Quotation Required') pendingQuotes++;
          if (['Negotiation', 'Quotation Sent'].includes(r.status) && r.expected_rate && r.quantity) {
            expectedBiz += (r.expected_rate * r.quantity);
          }
        });
      }

      if (reqDemandData) {
        reqDemandData.forEach(d => {
          if (!demand[d.product_type]) demand[d.product_type] = { qty: 0, unit: d.unit };
          demand[d.product_type].qty += d.total_quantity;
        });
      }

      // 3. Interactions Today
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const { data: intData } = await supabase.from('interactions').select('party_id').gte('created_at', now.toISOString());
      const contactedToday = new Set(intData?.map(i => i.party_id)).size;

      setBiStats({
        openRequirements: openReqs,
        pendingQuotations: pendingQuotes,
        expectedBusiness: expectedBiz,
        contactedToday,
        atRiskCustomers: attentionData || [],
        demandByProduct: demand
      });

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const updateStatus = async (item, newStatus) => {
    if (isProcessing) return;
    
    // Auth Check
    const { data: session } = await supabase.auth.getSession();
    const userId = session?.session?.user?.id;
    if (newStatus === 'Completed') {
      if (item.assigned_to && item.assigned_to !== userId) {
        if (!window.confirm("This follow-up is assigned to another user. Are you sure you want to complete it?")) return;
      }
    }

    setIsProcessing(true);
    try {
      const updates = { 
        status: newStatus
      };
      
      if (newStatus === 'Completed') {
        updates.completed_at = new Date().toISOString();
        updates.completed_by = userId || null;
      }
      
      if (newStatus === 'Postponed') {
        const newDate = window.prompt("Enter new follow-up date (YYYY-MM-DD):", item.follow_up_date);
        if (!newDate) {
          setIsProcessing(false);
          return;
        }
        if (new Date(newDate) < new Date(new Date().setHours(0,0,0,0))) {
          alert("Cannot postpone to a past date.");
          setIsProcessing(false);
          return;
        }
        
        const note = window.prompt("Provide a reason for postponing:");
        if (!note) {
          alert("Postponement reason is required.");
          setIsProcessing(false);
          return;
        }

        updates.follow_up_date = newDate;
        updates.postpone_note = note;
        updates.original_follow_up_date = item.original_follow_up_date || item.follow_up_date;
        updates.status = 'Pending'; // Remains pending, just moves date
        
        const { data: currentFu } = await supabase.from('follow_ups').select('postpone_count').eq('id', item.id).single();
        updates.postpone_count = (currentFu?.postpone_count || 0) + 1;
      }
      
      await supabase.from('follow_ups').update(updates).eq('id', item.id);
      
      if (newStatus === 'Completed') {
        setFollowUps(prev => ({
          overdue: prev.overdue.filter(f => f.id !== item.id),
          today: prev.today.filter(f => f.id !== item.id),
          highPriority: prev.highPriority.filter(f => f.id !== item.id),
        }));
      } else {
        // Re-fetch to sort properly
        fetchTodayWork();
      }
    } catch (err) {
      alert('Failed to update status');
    } finally {
      setIsProcessing(false);
    }
  };

  const addNote = async (item) => {
    if (isProcessing) return;
    const note = window.prompt("Add a quick note:");
    if (!note) return;
    
    setIsProcessing(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      await supabase.from('interactions').insert({
        party_id: item.party_id,
        user_id: session?.session?.user?.id || null,
        channel: 'Note',
        note: `Quick Note (Today's Work): ${note}`
      });
      alert('Note added successfully.');
    } catch (err) {
      alert('Failed to add note');
    } finally {
      setIsProcessing(false);
    }
  };

  const FollowUpCard = ({ item, isOverdue }) => (
    <div className="glass-panel" style={{padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: isOverdue ? '4px solid var(--danger)' : item.priority === 'High' ? '4px solid var(--warning)' : '4px solid var(--primary)'}}>
      <div>
        <Link to={`/customers/${item.crm_parties?.id}`} style={{fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
          {item.crm_parties?.display_name} <ChevronRight size={16} className="text-secondary" />
        </Link>
        <div className="text-secondary" style={{fontSize: '0.9rem', marginTop: '0.25rem'}}>{item.reason}</div>
        <div style={{display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--danger)' : 'inherit'}}>
            <Calendar size={14} /> Due: {new Date(item.follow_up_date).toLocaleDateString()}
          </span>
          {item.priority === 'High' && (
            <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 600}}>
              <AlertCircle size={14} /> HIGH PRIORITY
            </span>
          )}
        </div>
        {item.assigned_to && (
          <div className="text-muted" style={{fontSize: '0.8rem', marginTop: '0.25rem'}}>Assigned User ID: {item.assigned_to}</div>
        )}
        {item.context && (
          <div style={{marginTop: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className="text-muted">Last Contact:</span>
              <span className="text-secondary">{item.context.lastContact} ({item.context.lastOutcome})</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span className="text-muted">Last Req:</span>
              <span className="text-secondary">{item.context.lastReq}</span>
            </div>
          </div>
        )}
      </div>
      <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
        {item.crm_parties?.mobile && item.crm_parties?.communication_preference !== 'Do Not Contact' && (
          <a href={`tel:${item.crm_parties.mobile}`} className="btn btn-secondary" style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem'}}>
            <Phone size={14} className="text-primary" /> Call
          </a>
        )}
        {item.crm_parties?.whatsapp && item.crm_parties?.communication_preference !== 'Do Not Contact' && (
          <WhatsAppAction party={item.crm_parties} followUpId={item.id} onComplete={fetchTodayWork} btnClass="btn btn-secondary" />
        )}
        <button className="btn btn-secondary" onClick={() => addNote(item)} disabled={isProcessing} style={{padding: '0.4rem 0.75rem', fontSize: '0.85rem'}}>
          Add Note
        </button>
        <div style={{marginLeft: 'auto', display: 'flex', gap: '0.5rem'}}>
          <button className="btn btn-secondary" onClick={() => updateStatus(item, 'Postponed')} disabled={isProcessing} style={{padding: '0.4rem 0.75rem', fontSize: '0.8rem'}}>
            <Clock size={14} /> Postpone
          </button>
          <button className="btn btn-primary" onClick={() => updateStatus(item, 'Completed')} disabled={isProcessing} style={{padding: '0.4rem 0.75rem', fontSize: '0.8rem'}}>
            <CheckCircle2 size={14} /> Complete
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Intelligence & Workload...</div>;

  const hasWork = followUps.overdue.length > 0 || followUps.highPriority.length > 0 || followUps.today.length > 0;

  return (
    <div className="animate-fade-in">
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1>Operations Command Center</h1>
          <p className="text-secondary" style={{marginTop: '0.25rem'}}>Your daily business intelligence and active workload.</p>
        </div>
      </div>
      
      {/* Business Intelligence Row */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '3rem'}}>
        
        {/* Pipeline Panel */}
        <div className="glass-panel" style={{padding: '1.5rem', borderTop: '3px solid var(--primary)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600}}>
            <BarChart3 size={16} /> Active Pipeline
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
            <span className="text-secondary">Open Requirements</span>
            <strong style={{fontSize: '1.1rem'}}>{biStats.openRequirements}</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
            <span className="text-secondary">Pending Quotations</span>
            <strong style={{color: biStats.pendingQuotations > 0 ? 'var(--warning)' : 'inherit'}}>{biStats.pendingQuotations}</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)'}}>
            <span className="text-secondary">Expected Business</span>
            <strong style={{color: 'var(--success)'}}>₹{biStats.expectedBusiness.toLocaleString()}</strong>
          </div>
        </div>

        {/* Demand Overview */}
        <div className="glass-panel" style={{padding: '1.5rem', borderTop: '3px solid var(--success)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600}}>
            <TrendingUp size={16} /> Market Demand
          </div>
          {Object.keys(biStats.demandByProduct).length === 0 ? (
            <p className="text-secondary text-sm">No active demand.</p>
          ) : (
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
              {Object.entries(biStats.demandByProduct).map(([product, details]) => (
                <div key={product} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem'}}>
                  <span>{product}</span>
                  <strong>{details.qty} {details.unit}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hustle & At-Risk Panel */}
        <div className="glass-panel" style={{padding: '1.5rem', borderTop: '3px solid var(--danger)'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', marginBottom: '1rem', textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: 600}}>
            <Users size={16} /> Activity & At-Risk
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <span className="text-secondary">Contacted Today</span>
            <strong>{biStats.contactedToday} Customers</strong>
          </div>
          
          <div style={{borderTop: '1px solid var(--border)', paddingTop: '1rem'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--danger)', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: 600}}>
              <AlertTriangle size={14} /> Needs Attention
            </div>
            {biStats.atRiskCustomers.length === 0 ? (
              <div className="text-secondary" style={{fontSize: '0.85rem'}}>All active customers contacted recently!</div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '150px', overflowY: 'auto'}}>
                {biStats.atRiskCustomers.map(p => (
                  <Link key={p.party_id} to={`/customers/${p.party_id}`} style={{display: 'flex', flexDirection: 'column', padding: '0.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', textDecoration: 'none', color: 'inherit'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight: 600, fontSize: '0.9rem'}}>{p.display_name}</span>
                      <ChevronRight size={14} className="text-muted" />
                    </div>
                    <div style={{fontSize: '0.75rem', color: p.attention_reason === 'Dormant Candidate' ? 'var(--text-muted)' : 'var(--warning)', marginTop: '0.25rem', display: 'flex', gap: '0.5rem'}}>
                       <span>{p.attention_reason}</span>
                       {p.attention_reason === 'Follow-up Risk' && <span>({p.max_postpones} Postpones)</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
      
      {/* Task List Section */}
      <h2 style={{borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '1.5rem'}}>Action Items</h2>

      {!hasWork ? (
        <div className="glass-panel" style={{padding: '4rem', textAlign: 'center', marginTop: '2rem'}}>
          <CheckCircle2 size={48} className="text-success" style={{margin: '0 auto 1rem', opacity: 0.8}} />
          <h2 style={{marginBottom: '0.5rem'}}>You're all caught up!</h2>
          <p className="text-secondary">There are no pending actions scheduled for today.</p>
        </div>
      ) : (
        <div style={{display: 'flex', flexDirection: 'column', gap: '2.5rem'}}>
          {followUps.overdue.length > 0 && (
            <section>
              <h3 style={{color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <AlertCircle size={18} /> Overdue Actions ({followUps.overdue.length})
              </h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem'}}>
                {followUps.overdue.map(fu => <FollowUpCard key={fu.id} item={fu} isOverdue={true} />)}
              </div>
            </section>
          )}

          {followUps.highPriority.length > 0 && (
            <section>
              <h3 style={{color: 'var(--warning)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <AlertCircle size={18} /> High Priority ({followUps.highPriority.length})
              </h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem'}}>
                {followUps.highPriority.map(fu => <FollowUpCard key={fu.id} item={fu} isOverdue={false} />)}
              </div>
            </section>
          )}

          {followUps.today.length > 0 && (
            <section>
              <h3 style={{marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Calendar size={18} className="text-primary" /> Today's Scheduled Tasks ({followUps.today.length})
              </h3>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1rem'}}>
                {followUps.today.map(fu => <FollowUpCard key={fu.id} item={fu} isOverdue={false} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
