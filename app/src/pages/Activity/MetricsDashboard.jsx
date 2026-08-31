import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { Users, CheckCircle, Clock, ClipboardList, RefreshCw, BarChart2, AlertCircle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MetricsDashboard() {
  const { userProfile } = useContext(AuthContext);
  const [period, setPeriod] = useState('7D'); // 'TODAY', '7D', '30D'
  const [loading, setLoading] = useState(true);
  
  const [metrics, setMetrics] = useState({
    customersContacted: 0,
    followUpsCompleted: 0,
    productiveFollowUps: 0,
    overdueFollowUps: 0,
    requirementsCreated: 0
  });
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    fetchMetrics();
  }, [period, userProfile]);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startDate = new Date();
      if (period === 'TODAY') {
        startDate.setHours(0,0,0,0);
      } else if (period === '7D') {
        startDate.setDate(now.getDate() - 7);
      } else if (period === '30D') {
        startDate.setDate(now.getDate() - 30);
      }
      
      const startIso = startDate.toISOString();
      const todayIsoDate = new Date().toISOString().split('T')[0];

      // Build base queries based on role
      const viewQuery = supabase.from('v_follow_up_activity_report').select('party_id, is_productive', { count: 'exact' }).gte('interaction_date', startIso);
      const fuOverdueQuery = supabase.from('follow_ups').select('id', { count: 'exact' }).eq('status', 'Pending').lt('due_at', todayIsoDate);
      const reqQuery = supabase.from('requirements').select('id', { count: 'exact' }).gte('created_at', startIso);
      
      const [viewRes, fuOverRes, reqRes] = await Promise.all([
        viewQuery,
        fuOverdueQuery,
        reqQuery
      ]);

      // Calculate distinct customers contacted
      let distinctCustomers = 0;
      let productiveCount = 0;
      
      if (viewRes.data) {
        const uniqueParties = new Set(viewRes.data.map(i => i.party_id).filter(id => id));
        distinctCustomers = uniqueParties.size;
        productiveCount = viewRes.data.filter(i => i.is_productive).length;
      }

      setMetrics({
        customersContacted: distinctCustomers,
        followUpsCompleted: viewRes.count || 0,
        productiveFollowUps: productiveCount,
        overdueFollowUps: fuOverRes.count || 0,
        requirementsCreated: reqRes.count || 0
      });
      setLastUpdated(new Date());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, icon: Icon, color, isWarning, tooltip }) => (
    <div className="glass-panel" title={tooltip} style={{padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', border: isWarning ? `1px solid ${color}` : undefined, cursor: tooltip ? 'help' : 'default'}}>
      <div style={{
        width: '3rem', height: '3rem', borderRadius: '50%', background: `color-mix(in srgb, ${color} 15%, transparent)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color: color
      }}>
        <Icon size={24} />
      </div>
      <div>
        <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
          {title}
        </div>
        <div style={{fontSize: '1.75rem', fontWeight: 700, color: isWarning ? color : 'var(--text-primary)'}}>
          {loading ? '-' : value}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{marginBottom: '3rem'}} className="animate-fade-in">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <h2 style={{margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <BarChart2 size={20} className="text-primary" />
            Operational Metrics
          </h2>
          <Link to="/reports/follow-up-activity" className="text-primary" style={{fontSize: '0.85rem', textDecoration: 'none', fontWeight: 600}}>
            View full report &rarr;
          </Link>
        </div>
        
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          {lastUpdated && (
            <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
              Updated at {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button onClick={fetchMetrics} disabled={loading} style={{background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center'}}>
            <RefreshCw size={16} className={loading ? "spin" : ""} />
          </button>

          <div style={{display: 'flex', gap: '0.25rem', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: 'var(--radius-md)'}}>
            {['TODAY', '7D', '30D'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  background: period === p ? 'var(--primary)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                  border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                {p === 'TODAY' ? 'Today' : p === '7D' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem'}}>
        <MetricCard title="Customers Contacted" tooltip="Distinct customers contacted at least once on the selected date." value={metrics.customersContacted} icon={Users} color="var(--primary)" />
        <MetricCard title="Follow-ups Done" tooltip="Unique logged follow-up/interactions completed on the selected date." value={metrics.followUpsCompleted} icon={CheckCircle} color="var(--success)" />
        <MetricCard title="Productive" tooltip="Interactions with a meaningful customer conversation or business outcome." value={metrics.productiveFollowUps} icon={Zap} color="#f59e0b" />
        <MetricCard title="Reqs Captured" tooltip="New requirements captured" value={metrics.requirementsCreated} icon={ClipboardList} color="#8b5cf6" />
        <MetricCard title="Overdue Follow-ups" tooltip="Pending follow-ups that are past their due date." value={metrics.overdueFollowUps} icon={Clock} color="var(--danger)" isWarning={metrics.overdueFollowUps > 0} />
      </div>

      <div style={{marginTop: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}} className="text-muted">
        <AlertCircle size={14} /> 
        Data coverage limitation: Metrics reflect only interactions explicitly logged via the CRM interface. External calls/messages are not included.
      </div>
    </div>
  );
}
