import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { Activity, Users, ShieldAlert, CheckCircle2, TrendingUp, AlertTriangle, Briefcase, RefreshCw, Clock } from 'lucide-react';

export default function ControlRoom() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [healthData, setHealthData] = useState({ healthy: 0, atRisk: 0, inactive: 0, unknown: 0 });
  const [staffData, setStaffData] = useState([]);
  const [pipelineData, setPipelineData] = useState({ identified: 0, engaged: 0, qualified: 0, commercial: 0, closed: 0, stalled: 0, commercialIntents: 0 });
  const [reactivationCount, setReactivationCount] = useState(0);
  const [engagementStats, setEngagementStats] = useState({ channels: {}, attempted: 0, responded: 0, completedTasks: 0, overdueTasks: 0, reactivationOutcomes: 0, retentionOutcomes: 0 });

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchControlRoomData();
    }
  }, [userProfile]);

  async function fetchControlRoomData() {
    setLoading(true);
    try {
      // 1. Health Distribution
      const { data: healthRows } = await supabase.from('v_customer_health').select('health_status');
      const hc = { healthy: 0, atRisk: 0, inactive: 0, unknown: 0 };
      if (healthRows) {
        healthRows.forEach(r => {
          if (r.health_status === 'Healthy') hc.healthy++;
          else if (r.health_status === 'At Risk') hc.atRisk++;
          else if (r.health_status === 'Inactive') hc.inactive++;
          else hc.unknown++;
        });
      }
      setHealthData(hc);

      // 2. Requirements Pipeline
      const { data: reqRows } = await supabase.from('requirements').select('status, intent_type');
      const pc = { identified: 0, engaged: 0, qualified: 0, commercial: 0, closed: 0, stalled: 0, commercialIntents: 0 };
      if (reqRows) {
        reqRows.forEach(r => {
          if (r.status === 'Open') pc.identified++;
          else if (r.status === 'Negotiation') pc.engaged++;
          else if (r.status === 'Quotation Required') pc.qualified++;
          else if (r.status === 'Follow-up') pc.commercial++; // Maps to Commercial Follow-up
          else if (['Stalled', 'Blocked'].includes(r.status)) pc.stalled++;
          else if (['Confirmed', 'Lost', 'Closed'].includes(r.status)) pc.closed++;

          if (r.intent_type && r.intent_type !== 'Product Interest') pc.commercialIntents++;
        });
      }
      setPipelineData(pc);

      // 3. Reactivation Tasks
      const { count: reactCount } = await supabase.from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('follow_up_type', 'Reactivation')
        .eq('status', 'Pending');
      setReactivationCount(reactCount || 0);

      // 4. Staff Activity (Last 7 Days Interactions + Task Load)
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const startIso = lastWeek.toISOString();
      const todayIso = new Date().toISOString().split('T')[0];

      const { data: users } = await supabase.from('app_users').select('id, display_name, role, is_active').order('display_name');
      const { data: interactions } = await supabase.from('interactions').select('created_by, channel, outcome').gte('created_at', startIso);
      const { data: tasks } = await supabase.from('follow_ups').select('assigned_to, status, follow_up_date').gte('created_at', startIso);
      const { data: allPendingTasks } = await supabase.from('follow_ups').select('assigned_to, status, follow_up_date').eq('status', 'Pending');
      const { data: allOpps } = await supabase.from('v_customer_opportunities').select('assigned_owner_id');

      if (users) {
        const staffMetrics = users.map(u => {
          const uInteractions = interactions?.filter(i => i.created_by === u.id).length || 0;
          const uTasks = allPendingTasks?.filter(t => t.assigned_to === u.id) || [];
          const uOpps = allOpps?.filter(o => o.assigned_owner_id === u.id).length || 0;
          const overdue = uTasks.filter(t => t.follow_up_date && t.follow_up_date < todayIso).length;
          const totalPending = uTasks.length;
          return {
            id: u.id,
            name: u.display_name,
            role: u.role,
            active: u.is_active,
            recentInteractions: uInteractions,
            overdueTasks: overdue,
            pendingTasks: totalPending,
            openOpps: uOpps
          };
        });
        setStaffData(staffMetrics);
      }
      
      // 5. Engagement Analytics (Last 7 Days)
      const eStats = { channels: {}, attempted: 0, responded: 0, completedTasks: 0, overdueTasks: 0, reactivationOutcomes: 0, retentionOutcomes: 0 };
      if (interactions) {
        interactions.forEach(i => {
          const ch = i.channel || 'Unknown';
          eStats.channels[ch] = (eStats.channels[ch] || 0) + 1;
          eStats.attempted++;
          if (i.outcome && i.outcome.trim() !== '') {
            eStats.responded++;
            if (ch === 'Reactivation Task') eStats.reactivationOutcomes++;
            if (ch === 'Retention Task') eStats.retentionOutcomes++;
          }
        });
      }
      if (tasks) {
        tasks.forEach(t => {
          if (t.status === 'Completed') eStats.completedTasks++;
        });
      }
      if (allPendingTasks) {
        allPendingTasks.forEach(t => {
          if (t.follow_up_date && t.follow_up_date < todayIso) eStats.overdueTasks++;
        });
      }
      setEngagementStats(eStats);

    } catch (err) {
      console.error(err);
      setError("Failed to load control room data.");
    } finally {
      setLoading(false);
    }
  }

  if (userProfile?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Management View...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* Header Area */}
      <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={24} className="text-primary" /> Management Control Room
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Live operational intelligence across health, pipeline, and staff activity.
          </p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span> Live System View
          </div>
          <div style={{ marginTop: '0.25rem' }}>As of {new Date().toLocaleTimeString()}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Customer Health Overview */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Users size={18} className="text-secondary" /> Base Health Distribution
            </h2>
            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Tally Verified</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--success)', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Healthy</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{healthData.healthy}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--danger)', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>At Risk</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{healthData.atRisk}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--text-muted)', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Inactive</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{healthData.inactive}</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid var(--warning)', borderRadius: '0 4px 4px 0' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Unknown</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{healthData.unknown}</div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
             <Link to="/customers" className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}>Go to Customers &rarr;</Link>
          </div>
        </div>

        {/* Demand Pipeline */}
        <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Briefcase size={18} className="text-secondary" /> Pipeline by Approved State
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Phase 15.2 States</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--bg-surface-hover)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Identified</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pipelineData.identified}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Engaged</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pipelineData.engaged}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--warning-light)', color: 'var(--warning)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Qualified</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pipelineData.qualified}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>Commercial</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pipelineData.commercial}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--success-light)', color: 'var(--success)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Closed</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pipelineData.closed}</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: '4px' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Stalled</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{pipelineData.stalled}</div>
            </div>
          </div>
          <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--border)', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Commercial Intents Captured:</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>{pipelineData.commercialIntents}</span>
          </div>
          <div style={{ marginTop: '1rem', textAlign: 'right' }}>
             <Link to="/requirements" className="text-primary" style={{ fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none' }}>Go to Pipeline &rarr;</Link>
          </div>
        </div>

      </div>
      
      {/* Engagement Analytics */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', marginTop: 0 }}>
          <Activity size={18} className="text-secondary" /> Engagement & Communication (Last 7 Days)
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          
          <Link to="/activity" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Attempts</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{engagementStats.attempted}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Interactions Logged</div>
          </Link>
          
          <Link to="/activity" style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px', textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Response Rate</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--success)' }}>
              {engagementStats.attempted > 0 ? Math.round((engagementStats.responded / engagementStats.attempted) * 100) : 0}%
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>{engagementStats.responded} Outcomes Captured</div>
          </Link>
          
          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Volume by Channel</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: 'auto' }}>
              {Object.entries(engagementStats.channels).map(([ch, count]) => (
                <div key={ch} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{ch}</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{count}</strong>
                </div>
              ))}
              {Object.keys(engagementStats.channels).length === 0 && <span className="text-muted italic" style={{fontSize: '0.85rem'}}>No channel data</span>}
            </div>
          </div>

          <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '4px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Key Campaign Outcomes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Reactivations</span>
                <strong style={{ color: 'var(--primary)' }}>{engagementStats.reactivationOutcomes}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Retentions</span>
                <strong style={{ color: 'var(--warning)' }}>{engagementStats.retentionOutcomes}</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Staff Operational View */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <TrendingUp size={18} className="text-secondary" /> Staff Operations & Task Load
          </h2>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Interactions count reflects last 7 days</div>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Staff Member</th>
                <th style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Open Opps (Tally)</th>
                <th style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Recent Interactions</th>
                <th style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Pending Tasks</th>
                <th style={{ padding: '1rem 0.5rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Overdue Tasks</th>
              </tr>
            </thead>
            <tbody>
              {staffData.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '1rem 0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.name}</span>
                      {!s.active && <span className="badge badge-dormant" style={{ fontSize: '0.65rem' }}>Inactive</span>}
                      {s.role === 'Admin' && <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Admin</span>}
                    </div>
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600, color: 'var(--warning)' }}>
                    {s.openOpps}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>
                    {s.recentInteractions}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600 }}>
                    {s.pendingTasks}
                  </td>
                  <td style={{ padding: '1rem 0.5rem', textAlign: 'right', fontWeight: 600, color: s.overdueTasks > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
                    {s.overdueTasks}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Footer Metrics */}
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '2rem' }}>
         <div className="glass-panel" style={{ padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '3px solid var(--primary)' }}>
            <div style={{ background: 'var(--bg-surface-hover)', padding: '0.5rem', borderRadius: '50%' }}>
              <RefreshCw size={20} className="text-primary" />
            </div>
            <div>
               <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 500 }}>Active Reactivations</div>
               <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{reactivationCount} Tasks Pending</div>
            </div>
         </div>
      </div>

    </div>
  );
}
