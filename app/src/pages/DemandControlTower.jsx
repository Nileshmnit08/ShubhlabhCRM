import React, { useEffect, useState, useContext } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, ArrowRight, Target, ShieldAlert, Zap, Compass, RefreshCw, Activity, CheckCircle2, TrendingUp } from 'lucide-react';
import SectionErrorBoundary from '../components/SectionErrorBoundary';

export default function DemandControlTower() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [kpis, setKpis] = useState(null);
  const [territoryDemand, setTerritoryDemand] = useState([]);
  const [highPriorityActions, setHighPriorityActions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, [userProfile]);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      // 1. Fetch KPIs
      const { data: kpiData, error: kpiErr } = await supabase.from('v_management_demand_tower').select('*').limit(1).single();
      if (kpiErr && kpiErr.code !== 'PGRST116') throw kpiErr; // PGRST116 = no rows returned
      
      setKpis(kpiData || {
        total_open_demand_signals: 0,
        total_observed_demand: 0,
        total_estimated_demand: 0,
        unresolved_high_priority_actions: 0,
        oldest_high_priority_action_date: null,
        repeat_replenishment_workload: 0,
        demand_to_opportunity_conversions: 0,
        total_active_opportunities: 0,
        last_refreshed: new Date().toISOString()
      });

      // 2. Fetch Territory breakdown
      const { data: terrData } = await supabase.from('v_territory_demand_planning').select('*').order('total_demand_signals', { ascending: false });
      setTerritoryDemand(Array.isArray(terrData) ? terrData : []);

      // 3. Fetch High-Priority Action List
      const { data: actionsData } = await supabase.from('follow_ups')
         .select('*, party:party_id(display_name)')
         .eq('status', 'Pending')
         .eq('priority', 'High')
         .order('follow_up_date', { ascending: true })
         .limit(5);
      
      setHighPriorityActions(Array.isArray(actionsData) ? actionsData : []);

    } catch (err) {
      console.error(err);
      setError("Failed to load control tower data. Ensure SQL migration 81 is applied.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Control Tower...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <SectionErrorBoundary sectionName="Demand Control Tower">
      <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
        <div className="page-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <LayoutDashboard size={24} className="text-primary" /> Management Demand Control Tower
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
            Executive oversight of demand execution, pipeline conversion, and commercial follow-through.
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
             <RefreshCw size={12} /> Last Refreshed
           </div>
           <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
             {kpis?.last_refreshed ? new Date(kpis.last_refreshed).toLocaleString() : 'Just now'}
           </div>
        </div>
      </div>

      {/* KPI ROW 1: Demand Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
         <div className="cv-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--primary)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Activity size={16} /> Total Open Demand
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{kpis?.total_open_demand_signals || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Aggregated active signals</div>
         </div>

         <div className="cv-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--success)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <CheckCircle2 size={16} className="text-success" /> Observed Demand
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{kpis?.total_observed_demand || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Tally + Purchase Patterns</div>
         </div>

         <div className="cv-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--warning)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <TrendingUp size={16} className="text-warning" /> Estimated Demand
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{kpis?.total_estimated_demand || 0}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Requirements + Intent</div>
         </div>

         <div className="cv-panel" style={{ padding: '1.5rem', borderBottom: '4px solid var(--secondary)' }}>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               <Target size={16} className="text-secondary" /> Opportunity Conversion
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>
               {kpis?.total_active_opportunities > 0 ? 
                  Math.round((kpis?.demand_to_opportunity_conversions / kpis?.total_active_opportunities) * 100) : 0}%
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Linked Signals / Active Opps</div>
         </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
         {/* Territory Matrix */}
         <div className="cv-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
               <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} className="text-primary" /> Demand by Territory
               </h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
               <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                     <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Territory</th>
                     <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Signals</th>
                     <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Active Products (Top)</th>
                     <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                  </tr>
               </thead>
               <tbody>
                  {territoryDemand.length === 0 ? (
                     <tr><td colSpan="4" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No territory demand logged.</td></tr>
                  ) : territoryDemand.map((t) => (
                     <tr key={t.territory_id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '1rem' }}>
                           <div style={{ fontWeight: 500 }}>{t.territory_name}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{t.manager_name || 'Unassigned'}</div>
                        </td>
                        <td style={{ padding: '1rem', fontWeight: 600 }}>{t.total_demand_signals}</td>
                        <td style={{ padding: '1rem' }}>
                           {Array.isArray(t.active_products) && t.active_products.length > 0 ? (
                              <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                                 {t.active_products.slice(0, 2).map((p, i) => (
                                    <span key={i} className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>{p}</span>
                                 ))}
                                 {t.active_products.length > 2 && <span className="badge" style={{ fontSize: '0.7rem' }}>+{t.active_products.length - 2}</span>}
                              </div>
                           ) : <span className="text-muted" style={{ fontSize: '0.8rem' }}>None</span>}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right' }}>
                           <span className={`badge ${t.pending_actions > 0 ? 'badge-danger' : 'badge-success'}`}>{t.pending_actions}</span>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>

         {/* Right Sidebar */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            
            <div className="cv-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--danger)' }}>
               <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertCircle size={18} className="text-danger" /> Action Bottlenecks
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Unresolved High Priority</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--danger)' }}>{kpis?.unresolved_high_priority_actions || 0}</div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Oldest High Priority Action</div>
                     <div style={{ fontSize: '1rem', fontWeight: 500 }}>
                        {kpis?.oldest_high_priority_action_date 
                           ? new Date(kpis.oldest_high_priority_action_date).toLocaleDateString() 
                           : 'No pending actions'}
                     </div>
                  </div>
                  <div>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Replenishment Workload</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>{kpis?.repeat_replenishment_workload || 0}</div>
                     <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Repeat buyers & Dealer restocking</div>
                  </div>
               </div>
            </div>

            <div className="cv-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
               <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border)' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                     <Zap size={16} className="text-warning" /> Critical Actions
                  </h3>
               </div>
               <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                  {highPriorityActions.length === 0 ? (
                     <div className="text-muted italic" style={{ fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>
                        All caught up on high priority actions!
                     </div>
                  ) : highPriorityActions.map(act => (
                     <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <div>
                           <Link to={`/customers/${act.party_id}`} style={{ fontWeight: 500, color: 'var(--primary)', textDecoration: 'none' }}>
                              {act.party?.display_name || 'Unknown Party'}
                           </Link>
                           <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{act.reason}</div>
                           <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem' }}>
                              Due: {new Date(act.follow_up_date).toLocaleDateString()}
                           </div>
                        </div>
                     </div>
                  ))}
               </div>
               <div style={{ padding: '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <Link to="/follow-ups" className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                     View All Queue <ArrowRight size={14} />
                  </Link>
               </div>
            </div>
          </div>
        </div>
      </div>
    </SectionErrorBoundary>
  );
}
