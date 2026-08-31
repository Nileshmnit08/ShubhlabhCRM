import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { 
  Building2, TrendingUp, Users, Target, Clock, Gift,
  MessageSquare, MoreVertical, Search, Filter, XCircle, AlertCircle
} from 'lucide-react';
import TargetClosingAlerts from '../components/TargetClosingAlerts';

export default function DealerGrowthHub() {
  const { userProfile } = useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data State
  const [dealers, setDealers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [activeSchemesCount, setActiveSchemesCount] = useState(0);
  const [eligibleRewards, setEligibleRewards] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTerritory, setFilterTerritory] = useState('All');
  
  // Dropdowns
  const [territories, setTerritories] = useState([]);

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch Dealers from v_dealer_growth_hub
      const { data: dData, error: dErr } = await supabase
        .from('v_dealer_growth_hub')
        .select('*');
      
      if (dErr && dErr.code !== '42P01') throw dErr;
      const validDealers = dData || [];
      setDealers(validDealers);

      // Extract unique territories
      const tSet = new Set();
      validDealers.forEach(d => { if (d.territory_name) tSet.add(d.territory_name); });
      setTerritories(Array.from(tSet).sort());

      // Fetch Active Schemes Count
      const { count: sCount, error: sErr } = await supabase
        .from('dealer_schemes')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');
      
      if (!sErr) setActiveSchemesCount(sCount || 0);

      // Fetch Rewards
      const { data: rData, error: rErr } = await supabase
        .from('dealer_reward_eligibility')
        .select('id, status');
      
      if (!rErr) setEligibleRewards(rData || []);

      // 2. Fetch mock alerts (In production, this would be a JOIN from dealer_target_alerts, dealer_targets, crm_parties)
      // Since this is MVP, we dynamically simulate alerts from the target data if available, 
      // or fetch from dealer_target_alerts. We will simulate fetching from dealer_target_alerts + targets.
      const { data: aData, error: aErr } = await supabase
        .from('dealer_target_alerts')
        .select(`
          id, alert_type, priority,
          dealer_targets ( target_period, target_end_date, target_value, achievement_value ),
          crm_parties ( id, display_name, mobile, city, territory_name )
        `)
        .eq('status', 'Active');

      if (aErr && aErr.code !== '42P01') throw aErr;
      
      // Transform raw alert data into usable flat objects, or generate demo data if empty
      let mappedAlerts = [];
      if (aData && aData.length > 0) {
        mappedAlerts = aData.map(a => {
          const tEnd = new Date(a.dealer_targets?.target_end_date || new Date());
          const daysLeft = Math.max(0, Math.ceil((tEnd - new Date()) / (1000 * 3600 * 24)));
          return {
            alert_id: a.id,
            customer_id: a.crm_parties?.id,
            alert_type: a.alert_type,
            priority: a.priority,
            display_name: a.crm_parties?.display_name,
            mobile: a.crm_parties?.mobile,
            territory_name: a.crm_parties?.territory_name,
            target_period: a.dealer_targets?.target_period,
            target_value: a.dealer_targets?.target_value,
            achievement_value: a.dealer_targets?.achievement_value,
            target_end_date: a.dealer_targets?.target_end_date,
            days_left: daysLeft,
            scheme_name: 'Monsoon Bonanza', // simulated
            next_reward: '500 Points' // simulated
          };
        });
      } else {
        // Generate realistic demo alerts if table is empty for preview
        mappedAlerts = [
          {
            alert_id: '1', customer_id: 'abc', alert_type: 'Near Target', priority: 'Critical',
            display_name: 'Super Traders', mobile: '9876543210', territory_name: 'Mumbai North',
            target_period: 'Q3 2026', target_value: 500000, achievement_value: 485000,
            target_end_date: new Date(new Date().getTime() + 86400000 * 2).toISOString(), days_left: 2,
            scheme_name: 'Q3 Volume Bonus', next_reward: '2% Cash Back'
          },
          {
            alert_id: '2', customer_id: 'def', alert_type: 'One Slab Away', priority: 'High',
            display_name: 'Aggarwal Stores', mobile: '9123456789', territory_name: 'Delhi South',
            target_period: 'Aug 2026', target_value: 200000, achievement_value: 150000,
            target_end_date: new Date(new Date().getTime() + 86400000 * 5).toISOString(), days_left: 5,
            scheme_name: 'August Starter', next_reward: 'Silver Plaque & 500 Pts'
          },
          {
            alert_id: '3', customer_id: 'ghi', alert_type: 'No Recent Activity', priority: 'High',
            display_name: 'National Agencies', mobile: '9988776655', territory_name: 'Pune Central',
            target_period: 'Q3 2026', target_value: 1000000, achievement_value: 200000,
            target_end_date: new Date(new Date().getTime() + 86400000 * 4).toISOString(), days_left: 4,
            scheme_name: 'Q3 Mega Target', next_reward: 'Gold Coin'
          },
          {
            alert_id: '4', customer_id: 'jkl', alert_type: 'Target Achieved', priority: 'Achieved',
            display_name: 'Premier Distributors', mobile: '9012345678', territory_name: 'Ahmedabad',
            target_period: 'Aug 2026', target_value: 300000, achievement_value: 310000,
            target_end_date: new Date(new Date().getTime() + 86400000 * 10).toISOString(), days_left: 10,
            scheme_name: 'August Starter', next_reward: 'Silver Plaque & 500 Pts'
          }
        ];
      }

      // Sort alerts
      const rank = { 'Critical': 1, 'High': 2, 'Medium': 3, 'Achieved': 4 };
      mappedAlerts.sort((a, b) => (rank[a.priority] || 5) - (rank[b.priority] || 5));
      setAlerts(mappedAlerts);

      setLoading(false);
    } catch (err) {
      console.error(err);
      setError("Dealer service unavailable. Ensure backend views and tables are generated.");
      setLoading(false);
    }
  }

  // --- Filtering Logic for Main Dealer Table ---
  const filteredDealers = useMemo(() => {
    return dealers.filter(d => {
      if (filterTerritory !== 'All' && (d.territory_name || 'Unassigned') !== filterTerritory) return false;
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const searchStr = `${d.display_name} ${d.mobile} ${d.owner_name} ${d.city}`.toLowerCase();
        if (!searchStr.includes(sq)) return false;
      }
      return true;
    });
  }, [dealers, filterTerritory, searchQuery]);

  // --- KPIs ---
  const kpi = {
    total: dealers.length,
    activeSchemes: activeSchemesCount,
    eligibleRewards: eligibleRewards.filter(r => r.status === 'Eligible' || r.status === 'Approved' || r.status === 'Pending Approval').length,
    pendingApproval: eligibleRewards.filter(r => r.status === 'Pending Approval').length,
    pendingFulfillment: eligibleRewards.filter(r => r.status === 'Approved').length,
    nearTarget: alerts.filter(a => a.alert_type === 'Near Target' || a.alert_type === 'One Slab Away').length,
    closingSoon: alerts.filter(a => a.days_left <= 7).length,
    atRisk: alerts.filter(a => a.alert_type === 'Target At Risk' || a.alert_type === 'No Recent Activity').length
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Dealer Growth Hub...</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} className="text-primary" /> Dealer Growth Hub
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', maxWidth: '650px' }}>
            Manage dealer targets, schemes, rewards, performance, and direct dealer updates.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary"><Target size={16} /> Assign Targets</button>
          <button className="btn btn-secondary"><Gift size={16} /> Create Scheme</button>
          <button className="btn btn-primary"><MessageSquare size={16} /> Send Dealer Update</button>
          <button className="btn cv-btn-subtle" title="More Actions"><MoreVertical size={16} /></button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <AlertCircle size={18} /> {error}
        </div>
      )}

      {/* 2. KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-primary)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14}/> Active Dealers</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.total}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Gift size={14}/> Active Schemes</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{kpi.activeSchemes}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--primary)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Target size={14}/> Eligible for Rewards</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{kpi.eligibleRewards}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Rewards Pending Approval</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{kpi.pendingApproval}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--warning)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Rewards Pending Fulfillment</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{kpi.pendingFulfillment}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14}/> Near Next Slab</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{kpi.nearTarget}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Schemes Closing Soon</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.closingSoon}</div>
        </div>
        <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
          <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertCircle size={14}/> At Risk of Missing Target</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.atRisk}</div>
        </div>
      </div>

      {/* 3. TARGET CLOSING ALERTS */}
      <TargetClosingAlerts alerts={alerts} onActionComplete={fetchData} />

      {/* 4. MAIN DEALER TABLE */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Building2 size={20} className="text-primary" /> Dealer Database
      </h2>
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search dealer, mobile, city..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.5rem' }}
          />
        </div>
        
        <select value={filterTerritory} onChange={e => setFilterTerritory(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <option value="All">All Territories</option>
          <option value="Unassigned">Unassigned Territory</option>
          {territories.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        
        {(filterTerritory !== 'All' || searchQuery !== '') && (
          <button className="btn cv-btn-subtle" onClick={() => { setFilterTerritory('All'); setSearchQuery(''); }} style={{ color: 'var(--danger)' }}>
            <XCircle size={16} /> Clear
          </button>
        )}
      </div>

      {dealers.length === 0 ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Users size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No eligible dealer customers found</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Dealers are managed directly from the Customers module.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link to="/customers" className="btn btn-secondary">Open Customers</Link>
            <button className="btn btn-primary">Mark Customer as Dealer</button>
          </div>
        </div>
      ) : (
        <div className="cv-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dealer Name</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Territory</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Active Targets</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Enrolled Schemes</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Reward Points</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers.map(d => (
                <tr key={d.customer_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/customers/${d.customer_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {d.display_name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {d.city || 'No City'} • {d.mobile}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{d.territory_name || <span className="text-warning">Unassigned</span>}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner: {d.owner_name || 'N/A'}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span className={`badge ${d.active_targets_count > 0 ? 'badge-primary' : 'badge-secondary'}`}>{d.active_targets_count || 0}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span className={`badge ${d.active_schemes_count > 0 ? 'badge-success' : 'badge-secondary'}`}>{d.active_schemes_count || 0}</span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 600, color: d.current_reward_points > 0 ? 'var(--warning)' : 'inherit' }}>
                      {Number(d.current_reward_points || 0).toLocaleString('en-IN')}
                    </div>
                    {d.pending_claims_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>{d.pending_claims_count} Claim(s) Pending</div>
                    )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Dealer 360"><Building2 size={16} /></button>
                      <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Send Message"><MessageSquare size={16} /></button>
                      <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="More Options"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
