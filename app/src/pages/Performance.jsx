import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { 
  BarChart, CheckCircle2, Target, Calendar, ClipboardList, TrendingUp, AlertCircle, Rocket
} from 'lucide-react';

export default function Performance() {
  const { userProfile } = useContext(AuthContext);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [metrics, setMetrics] = useState({
    workload: {
      opportunities: 0,
      requirements: 0,
      overdueTasks: 0,
      upcomingTasks: 0
    },
    outcomes: {
      interactionsCompleted: 0,
      commercialIntentCount: 0,
      recentOutcomes: []
    }
  });

  useEffect(() => {
    fetchPerformanceData();
  }, [userProfile]);

  async function fetchPerformanceData() {
    if (!userProfile) return;
    setLoading(true);
    try {
      const ownerId = userProfile.id;
      const todayStr = new Date().toISOString().split('T')[0];

      // 1. Assigned Opportunities (from v_customer_opportunities)
      const { data: opps } = await supabase.from('v_customer_opportunities').select('party_id').eq('assigned_owner_id', ownerId);
      const oppCount = opps ? opps.length : 0;

      // 2. Open Requirements
      // To get requirements, we join with crm_parties to filter by owner
      const { data: reqs } = await supabase.from('requirements')
        .select(`id, status, intent_type, crm_parties!inner(assigned_owner_id)`)
        .eq('crm_parties.assigned_owner_id', ownerId)
        .not('status', 'in', '("Closed", "Lost", "Confirmed")');
      
      const reqCount = reqs ? reqs.length : 0;
      
      // Commercial Intent count (where intent_type exists and is not Product Interest)
      let commIntentCount = 0;
      if (reqs) {
          reqs.forEach(r => {
             if (r.intent_type && r.intent_type !== 'Product Interest') {
                 commIntentCount++;
             }
          });
      }

      // 3. Tasks (Follow-ups)
      const { data: tasks } = await supabase.from('follow_ups')
        .select('id, status, follow_up_date')
        .eq('assigned_to', ownerId);
        
      let overdue = 0;
      let upcoming = 0;
      let completed = 0; // if we want to count total completed historically
      
      if (tasks) {
          tasks.forEach(t => {
             if (t.status === 'Pending') {
                 if (t.follow_up_date < todayStr) overdue++;
                 else upcoming++;
             } else if (t.status === 'Completed') {
                 completed++;
             }
          });
      }

      // 4. Recent Outcomes (Interactions)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: interactions } = await supabase.from('interactions')
        .select('id, channel, interaction_type, outcome, created_at, crm_parties(id, display_name)')
        .eq('user_id', ownerId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      const interactionsCompleted = interactions ? interactions.length : 0;
      const recentOutcomes = interactions ? interactions.slice(0, 10) : [];

      setMetrics({
        workload: {
          opportunities: oppCount,
          requirements: reqCount,
          overdueTasks: overdue,
          upcomingTasks: upcoming
        },
        outcomes: {
          interactionsCompleted,
          commercialIntentCount: commIntentCount,
          recentOutcomes
        }
      });
      
    } catch (err) {
      console.error(err);
      setError("Failed to load performance metrics.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading performance data...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  const KpiCard = ({ title, value, icon: Icon, colorClass, link, subtitle }) => (
    <Link to={link || '#'} style={{ display: 'flex', flexDirection: 'column', padding: '1.25rem', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', minWidth: '160px', flex: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }} className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{title}</span>
        <Icon size={16} className={`text-${colorClass}`} />
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</div>
      {subtitle && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{subtitle}</div>}
    </Link>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>My Performance</h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>Track your execution workload and captured outcomes.</p>
        </div>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Current Workload</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <KpiCard title="Overdue Tasks" value={metrics.workload.overdueTasks} icon={AlertCircle} colorClass="danger" link="/follow-ups" subtitle="Requires immediate action" />
        <KpiCard title="Upcoming Tasks" value={metrics.workload.upcomingTasks} icon={Calendar} colorClass="primary" link="/follow-ups" subtitle="Pending follow-ups" />
        <KpiCard title="Open Opportunities" value={metrics.workload.opportunities} icon={Rocket} colorClass="warning" link="/opportunities" subtitle="Unengaged deals" />
        <KpiCard title="Open Requirements" value={metrics.workload.requirements} icon={ClipboardList} colorClass="success" link="/requirements" subtitle="Pipeline volume" />
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>30-Day Outcomes</h2>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <KpiCard title="Interactions Completed" value={metrics.outcomes.interactionsCompleted} icon={CheckCircle2} colorClass="success" link="/activity" subtitle="Calls, meetings, WhatsApp" />
        <KpiCard title="Commercial Intents" value={metrics.outcomes.commercialIntentCount} icon={Target} colorClass="primary" link="/requirements" subtitle="Active negotiation/quotes" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
            <TrendingUp size={18} className="text-primary" /> Recent Captured Outcomes
          </h2>
          {metrics.outcomes.recentOutcomes.length === 0 ? (
            <div className="text-secondary" style={{ fontSize: '0.85rem' }}>No recent outcomes captured. Complete follow-ups to build your record.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {metrics.outcomes.recentOutcomes.map(act => (
                <div key={act.id} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500, display: 'flex', justifyContent: 'space-between' }}>
                      <Link to={`/customers/${act.crm_parties?.id}`} style={{color: 'inherit', textDecoration: 'none'}}>{act.crm_parties?.display_name || 'System'}</Link>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <span className="badge badge-neutral" style={{marginRight: '0.5rem'}}>{act.channel}</span> 
                      {act.interaction_type || 'Interaction'}
                    </div>
                    {act.outcome && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--success)', marginTop: '0.5rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={14} /> Outcome: {act.outcome}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div style={{textAlign: 'center', marginTop: '0.5rem'}}>
                 <Link to="/activity" className="text-primary" style={{fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none'}}>View All Activity &rarr;</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
