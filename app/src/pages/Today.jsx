import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { 
  Calendar, AlertCircle, Clock, Phone, ChevronRight, 
  BarChart3, AlertTriangle, Users, Plus, FileText, 
  CheckCircle2, Activity, UserPlus, FileEdit, ClipboardList, Target
} from 'lucide-react';

export default function Today() {
  const { userProfile } = useContext(AuthContext);
  
  const [data, setData] = useState({
    followUps: { overdue: [], today: [], highPriority: [] },
    kpis: { overdue: 0, today: 0, pendingQuotes: 0, newCustomersToday: 0, dormant: 0 },
    risks: { noContact: [], pendingQuote: [], stalledReq: [], dormant: [] },
    recentActivity: [],
    pipeline: { openReqs: 0 },
    unassigned: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile]);

  async function fetchDashboardData() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const today = new Date();
      const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      
      const now = new Date();
      now.setHours(0,0,0,0);
      const isoToday = now.toISOString();

      const isAdmin = userProfile?.role === 'Admin';
      const ownerId = userProfile?.id;

      // 1. Follow-ups
      let fuQuery = supabase.from('follow_ups')
        .select(`*, crm_parties ( id, display_name, mobile, whatsapp, assigned_owner_id )`)
        .eq('status', 'Pending');
      
      const { data: allPendingFu } = await fuQuery;
      
      // Filter valid follow-ups (RLS ensures we only get accessible parties, but we defensively check)
      let validFu = (allPendingFu || []).filter(f => f.crm_parties !== null);
      
      // If operator, they only see followups where they are the owner OR they are assigned the followup
      if (!isAdmin) {
         validFu = validFu.filter(f => f.assigned_to === ownerId || f.crm_parties.assigned_owner_id === ownerId);
      }
      
      const overdueFu = validFu.filter(f => f.follow_up_date < todayStr);
      const todayFu = validFu.filter(f => f.follow_up_date === todayStr);
      const highPriFu = validFu.filter(f => f.follow_up_date > todayStr && f.priority === 'High');

      const pWeight = { 'High': 3, 'Normal': 2, 'Low': 1 };
      const sortFn = (a, b) => {
        if (a.follow_up_date !== b.follow_up_date) return a.follow_up_date.localeCompare(b.follow_up_date);
        return pWeight[b.priority || 'Normal'] - pWeight[a.priority || 'Normal'];
      };

      overdueFu.sort(sortFn);
      todayFu.sort(sortFn);
      highPriFu.sort(sortFn);

      // 2. Open Requirements
      const { data: openReqsData } = await supabase.from('v_open_requirements').select('*');
      let pendingQuotes = 0;
      let stalledReqs = [];
      if (openReqsData) {
         openReqsData.forEach(r => {
           if (r.status === 'Quotation Required') pendingQuotes++;
           if (r.status === 'Stalled' || r.status === 'Blocked') stalledReqs.push(r);
         });
      }

      // 3. New Customers Today
      let custQuery = supabase.from('crm_parties').select('*', { count: 'exact', head: true }).gte('created_at', isoToday);
      if (!isAdmin) custQuery = custQuery.eq('assigned_owner_id', ownerId);
      const { count: newCustCount } = await custQuery;

      // 4. At Risk (from v_customer_attention)
      const { data: attentionData } = await supabase.from('v_customer_attention').select('*');
      const risks = {
         noContact: [],
         pendingQuote: openReqsData?.filter(r => r.status === 'Quotation Required') || [],
         stalledReq: stalledReqs,
         dormant: []
      };

      if (attentionData) {
         attentionData.forEach(a => {
            if (a.attention_reason === 'Dormant Candidate') risks.dormant.push(a);
            else if (a.attention_reason === 'Follow-up Risk') risks.noContact.push(a);
         });
      }

      // 5. Recent Activity (using interactions for timeline, since it has concrete notes)
      let activityQuery = supabase.from('interactions')
        .select(`*, crm_parties(display_name)`)
        .order('created_at', { ascending: false })
        .limit(6);
      
      const { data: activityData } = await activityQuery;

      // 6. Lower Section Data (Unassigned)
      let unassignedCount = 0;
      if (isAdmin) {
         const { count: unCount } = await supabase.from('crm_parties').select('*', { count: 'exact', head: true }).is('assigned_owner_id', null);
         unassignedCount = unCount || 0;
      }

      setData({
        followUps: {
          overdue: overdueFu,
          today: todayFu,
          highPriority: highPriFu
        },
        kpis: {
          overdue: overdueFu.length,
          today: todayFu.length,
          pendingQuotes,
          newCustomersToday: newCustCount || 0,
          dormant: risks.dormant.length
        },
        risks,
        recentActivity: activityData || [],
        pipeline: {
          openReqs: openReqsData?.length || 0
        },
        unassigned: unassignedCount
      });

    } catch(err) {
      console.error(err);
      setError("Unable to load operations data.");
    } finally {
      setLoading(false);
    }
  }

  // Helper Components
  const KpiCard = ({ title, value, icon: Icon, colorClass, link }) => (
    <Link to={link || '#'} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', minWidth: '160px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
        <Icon size={16} className={`text-${colorClass}`} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
    </Link>
  );

  const TaskRow = ({ item, isOverdue }) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', borderRadius: '4px', marginBottom: '0.5rem' }}>
      <div style={{ flex: '1 1 0', minWidth: 0, paddingRight: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
          <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {item.crm_parties?.display_name || 'Unknown Party'}
          </strong>
          {isOverdue && <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: 'none', padding: '0.1rem 0.4rem', fontSize: '0.7rem', borderRadius: '12px', fontWeight: 600 }}>Overdue</span>}
          {!isOverdue && item.priority === 'High' && <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', border: 'none', padding: '0.1rem 0.4rem', fontSize: '0.7rem', borderRadius: '12px', fontWeight: 600 }}>High Priority</span>}
          {!isOverdue && item.priority !== 'High' && <span style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none', padding: '0.1rem 0.4rem', fontSize: '0.7rem', borderRadius: '12px', fontWeight: 600 }}>Due Today</span>}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          {item.reason}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {item.crm_parties?.mobile && (
           <a href={`tel:${item.crm_parties.mobile}`} className="btn btn-secondary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-surface)' }}>
             <Phone size={14} /> Call
           </a>
        )}
        <Link to={`/customers/${item.crm_parties?.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}>
          Update
        </Link>
      </div>
    </div>
  );

  const RiskGroup = ({ title, count, link, icon: Icon }) => (
    <Link to={link || '#'} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border)', textDecoration: 'none', color: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
          <Icon size={16} className="text-secondary" />
        </div>
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{title}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: count > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{count}</span>
        <ChevronRight size={16} className="text-muted" />
      </div>
    </Link>
  );

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Workspace...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  const priorityTasks = [...data.followUps.overdue, ...data.followUps.today].slice(0, 7);
  const totalActionable = data.followUps.overdue.length + data.followUps.today.length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* 1. Top Header Area */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Today's Work</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            {totalActionable > 0 
              ? `${totalActionable} tasks need action, ${data.kpis.overdue} are overdue.` 
              : `You are all caught up for today.`}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.1rem' }}>
            Good afternoon, {userProfile?.display_name || 'User'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: 'none' }}>{userProfile?.role || 'Operator'}</span>
            <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {/* 2. KPI Summary Row */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <KpiCard title="Overdue Actions" value={data.kpis.overdue} icon={AlertCircle} colorClass="danger" link="/follow-ups" />
        <KpiCard title="Due Today" value={data.kpis.today} icon={Calendar} colorClass="warning" link="/follow-ups" />
        <KpiCard title="Pending Quotes" value={data.kpis.pendingQuotes} icon={FileText} colorClass="primary" link="/requirements" />
        <KpiCard title="New Customers" value={data.kpis.newCustomersToday} icon={Users} colorClass="success" link="/customers" />
        <KpiCard title="Dormant Accounts" value={data.kpis.dormant} icon={Clock} colorClass="muted" link="/customers" />
      </div>

      {/* 3. Main Work Area & 4. Right Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', marginBottom: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Priority Queue */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Target size={18} className="text-primary" /> Priority Queue
            </h2>
            <Link to="/follow-ups" className="text-primary" style={{ fontSize: '0.85rem', textDecoration: 'none', fontWeight: 500 }}>View All ({totalActionable})</Link>
          </div>
          
          {priorityTasks.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)' }}>
              <CheckCircle2 size={32} className="text-success" style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
              <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Inbox Zero</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No immediate actions pending in your queue.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {priorityTasks.map(fu => <TaskRow key={fu.id} item={fu} isOverdue={fu.follow_up_date < new Date().toISOString().split('T')[0]} />)}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Actions Panel */}
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
             <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 0 }}>Quick Actions</h2>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
               <Link to="/customers/new" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                 <UserPlus size={16} /> Add Customer
               </Link>
               <Link to="/customers" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                 <ClipboardList size={16} /> Log Follow-up
               </Link>
               <Link to="/requirements" className="btn btn-secondary" style={{ justifyContent: 'flex-start', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
                 <FileEdit size={16} /> Create Quotation
               </Link>
             </div>
          </div>

          {/* Risk and Exception Section */}
          <div className="glass-panel" style={{ padding: '0', background: 'var(--bg-surface)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.25rem 0.5rem 1.25rem' }}>
              <h2 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: 0 }}>At Risk</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <RiskGroup title="No contact in 7+ days" count={data.risks.noContact.length} icon={Phone} link="/customers" />
              <RiskGroup title="Quotation pending" count={data.risks.pendingQuote.length} icon={FileText} link="/requirements" />
              <RiskGroup title="Requirement stalled" count={data.risks.stalledReq.length} icon={AlertTriangle} link="/requirements" />
              <RiskGroup title="Dormant customers" count={data.risks.dormant.length} icon={Clock} link="/customers" />
            </div>
          </div>

        </div>
      </div>

      {/* 5. Recent Changes & 6. Lower Support */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* Recent Activity Timeline */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
            <Activity size={18} className="text-secondary" /> Recent Activity
          </h2>
          {data.recentActivity.length === 0 ? (
            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>No recent activity found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {data.recentActivity.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: '2px', background: 'var(--border)', margin: '4px 0 4px 6px', position: 'relative' }}>
                     <div style={{ position: 'absolute', top: 0, left: '-4px', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }}></div>
                  </div>
                  <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {act.crm_parties?.display_name || 'System'}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Logged a {act.interaction_type || 'interaction'} ({act.outcome || 'No outcome'})
                    </div>
                    {act.notes && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontStyle: 'italic', background: 'var(--bg-base)', padding: '0.4rem', borderRadius: '4px' }}>
                        "{act.notes}"
                      </div>
                    )}
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(act.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lower Supporting Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', marginTop: 0 }}>
              <BarChart3 size={18} className="text-secondary" /> Pipeline Summary
            </h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Open Requirements</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>{data.pipeline.openReqs}</div>
              </div>
              <Link to="/requirements" className="btn btn-secondary" style={{ fontSize: '0.8rem' }}>View Pipeline</Link>
            </div>
          </div>

          {userProfile?.role === 'Admin' && data.unassigned > 0 && (
            <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--danger-light)', border: '1px solid var(--danger)' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', marginTop: 0 }}>
                <AlertTriangle size={18} /> Admin Alerts
              </h2>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--danger)' }}>{data.unassigned} Customers are unassigned</span>
                <Link to="/customers" className="btn btn-secondary" style={{ fontSize: '0.8rem', background: 'white', color: 'var(--danger)', border: '1px solid var(--danger)' }}>Assign Now</Link>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
