import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { Map, Users, Target, Search, ArrowRight, ShieldAlert, CheckCircle2, TrendingUp, Filter } from 'lucide-react';

export default function TerritoryDemandPlanning() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [territories, setTerritories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTerritoryDemand();
  }, [userProfile]);

  async function fetchTerritoryDemand() {
    setLoading(true);
    try {
      let query = supabase.from('v_territory_demand_planning').select('*');
      
      // RLS ensures they only see what they should, but we can explicitly sort
      const { data, error: fetchErr } = await query;
      
      if (fetchErr) throw fetchErr;
      
      // Sort by total demand signals descending
      const sortedData = (data || []).sort((a, b) => b.total_demand_signals - a.total_demand_signals);
      setTerritories(sortedData);

    } catch (err) {
      console.error(err);
      setError("Failed to load territory demand data.");
    } finally {
      setLoading(false);
    }
  }

  const filteredTerritories = useMemo(() => territories.filter(t => {
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!t.territory_name?.toLowerCase().includes(sq) && !t.manager_name?.toLowerCase().includes(sq)) return false;
    }
    return true;
  }), [territories, searchQuery]);

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Aggregating Territory Demand...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Map size={24} className="text-primary" /> Territory Demand Planning
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Macro visibility into active pipeline, coverage gaps, and signal concentration by region.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 250px', position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
            <input
            type="text"
            className="input"
            placeholder="Search by territory or manager..."
            style={{ paddingLeft: '2.5rem', width: '100%' }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
           <Filter size={14} /> Showing {filteredTerritories.length} territories
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {filteredTerritories.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No territories match your criteria.
          </div>
        ) : filteredTerritories.map((t) => {
           const hasDemand = t.total_demand_signals > 0;
           return (
             <div key={t.territory_id} className="cv-panel" style={{ display: 'flex', flexDirection: 'column' }}>
               {/* Header */}
               <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.01)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                     <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{t.territory_name}</h3>
                     <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>{t.manager_name || 'Unassigned'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14} /> {t.total_customers} Customers</span>
                     <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><ShieldAlert size={14} /> {t.total_dealers} Dealers</span>
                  </div>
               </div>

               {/* Metrics */}
               <div style={{ padding: '1.5rem', flex: 1 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                     {/* Observed Demand */}
                     <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: '3px solid var(--success)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Observed Demand</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {t.observed_demand_count} <CheckCircle2 size={16} className="text-success" />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Tally + Purchase Patterns</div>
                     </div>
                     {/* Estimated Demand */}
                     <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', borderLeft: '3px solid var(--primary)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Estimated Demand</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           {t.estimated_demand_count} <TrendingUp size={16} className="text-primary" />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Requirements + Intent</div>
                     </div>
                  </div>

                  <div style={{ marginBottom: '1.5rem' }}>
                     <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', fontWeight: 500 }}>Active Product Categories</div>
                     {t.active_products && t.active_products.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                           {t.active_products.slice(0,5).map((prod, idx) => (
                              <span key={idx} className="badge badge-active" style={{ fontSize: '0.75rem' }}>{prod}</span>
                           ))}
                           {t.active_products.length > 5 && (
                              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>+{t.active_products.length - 5} more</span>
                           )}
                        </div>
                     ) : (
                        <div className="text-muted italic" style={{ fontSize: '0.85rem' }}>No active product signals found.</div>
                     )}
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', background: t.pending_actions > 0 ? 'rgba(var(--danger-rgb), 0.05)' : 'rgba(var(--success-rgb), 0.05)', borderRadius: 'var(--radius-sm)' }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <Target size={16} className={t.pending_actions > 0 ? 'text-danger' : 'text-success'} /> 
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{t.pending_actions} Open Actions</span>
                     </div>
                  </div>
               </div>

               {/* Footer */}
               <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                     {t.total_demand_signals} total pipeline signals
                  </div>
                  {/* We can use the existing /demand route, and if it supported territory filtering we could pass it. For now, navigate to DemandSignals */}
                  <Link to="/demand" className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                     View Signals <ArrowRight size={14} />
                  </Link>
               </div>
             </div>
           )
        })}
      </div>
    </div>
  );
}
