import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, AlertCircle, Clock, CheckCircle2, Phone, ChevronRight, BarChart3, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Link } from 'react-router-dom';
export default function Today() {
  const [followUps, setFollowUps] = useState({
    overdue: [],
    today: [],
    highPriority: []
  });
  
  const [biStats, setBiStats] = useState({
    openRequirements: 0,
    pendingQuotations: 0,
    contactedToday: 0,
    atRiskCustomers: [],
    demandByProduct: {}
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      let pendingQuotes = 0;
      let demand = {};

      if (openReqsData) {
        openReqsData.forEach(r => {
          if (r.status === 'Quotation Required') pendingQuotes++;
        });
      }

      if (reqDemandData) {
        reqDemandData.forEach(d => {
          const cat = d.category || 'Uncategorized';
          if (!demand[cat]) demand[cat] = {};
          if (!demand[cat][d.product_type]) demand[cat][d.product_type] = { qty: 0, unit: d.unit };
          demand[cat][d.product_type].qty += d.total_quantity;
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
        contactedToday,
        atRiskCustomers: attentionData || [],
        demandByProduct: demand
      });

    } catch (err) {
      console.error(err);
      setError("Unable to load data. The server might be unreachable or returning an error.");
    } finally {
      setLoading(false);
    }
  }

  const FollowUpCard = ({ item, isOverdue }) => {
    const customerId = item.crm_parties?.id;
    const borderLeftColor = isOverdue ? 'var(--danger)' : item.priority === 'High' ? 'var(--warning)' : 'var(--primary)';
    
    // Fallback to div if party_id is completely missing
    const CardWrapper = customerId ? Link : 'div';
    const to = customerId ? `/customers/${customerId}` : undefined;

    return (
      <CardWrapper 
        to={to} 
        className="action-card" 
        style={{ borderLeft: `4px solid ${borderLeftColor}` }}
      >
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
          <div style={{fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
            {item.crm_parties?.display_name || 'Unknown Customer'}
          </div>
          {customerId && <ChevronRight size={18} className="text-secondary" />}
        </div>
        
        <div className="text-secondary" style={{fontSize: '0.9rem'}}>{item.reason}</div>
        
        <div style={{display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>
          <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: isOverdue ? 'var(--danger)' : 'inherit'}}>
            <Calendar size={14} /> Due: {new Date(item.follow_up_date).toLocaleDateString()}
          </span>
          {item.priority === 'High' && (
            <span style={{display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--warning)', fontWeight: 600}}>
              <AlertCircle size={14} /> HIGH
            </span>
          )}
        </div>
        
        {item.assigned_to && (
          <div className="text-muted" style={{fontSize: '0.8rem'}}>Assigned User ID: {item.assigned_to}</div>
        )}
        
        {item.context && (
          <div style={{marginTop: 'auto', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
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
      </CardWrapper>
    );
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Intelligence & Workload...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

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
            <span className="text-secondary">Open Requirements <span style={{fontSize: '0.7rem', display: 'block', color: 'var(--text-muted)'}}>(Excludes Confirmed, Lost, Closed)</span></span>
            <strong style={{fontSize: '1.1rem'}}>{biStats.openRequirements}</strong>
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
            <span className="text-secondary">Pending Quotations</span>
            <strong style={{color: biStats.pendingQuotations > 0 ? 'var(--warning)' : 'inherit'}}>{biStats.pendingQuotations}</strong>
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
            <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
              {Object.entries(biStats.demandByProduct).map(([cat, products]) => (
                <div key={cat}>
                  <strong style={{fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase'}}>{cat}</strong>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem'}}>
                    {Object.entries(products).map(([product, details]) => (
                      <div key={product} style={{display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem'}}>
                        <span>{product}</span>
                        <strong>{details.qty} {details.unit}</strong>
                      </div>
                    ))}
                  </div>
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
                    <div style={{fontSize: '0.75rem', color: p.attention_reason === 'Dormant Candidate' ? 'var(--text-muted)' : 'var(--warning)', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
                       <div style={{display: 'flex', gap: '0.5rem', fontWeight: 600}}>
                         <span>{p.attention_reason}</span>
                         {p.attention_reason === 'Follow-up Risk' && <span>({p.max_postpones} Postpones)</span>}
                       </div>
                       <span style={{color: 'var(--text-muted)', fontStyle: 'italic'}}>{p.attention_rule_desc}</span>
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
