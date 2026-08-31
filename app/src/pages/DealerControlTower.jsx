import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { 
  Building2, TrendingUp, Users, Target, Clock, Gift,
  MessageSquare, MoreVertical, Search, Filter, XCircle, AlertCircle, RefreshCw, ChevronDown, ChevronUp, CheckCircle, AlertTriangle
} from 'lucide-react';

export default function DealerGrowthHub() {
  const { userProfile } = useContext(AuthContext);
  const isAdmin = userProfile?.role === 'Admin';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Data State
  const [performanceRecords, setPerformanceRecords] = useState([]);
  const [slabs, setSlabs] = useState([]);
  const [eligibleRewards, setEligibleRewards] = useState([]);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterScheme, setFilterScheme] = useState('All');
  const [filterTerritory, setFilterTerritory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterPace, setFilterPace] = useState('All');

  const [expandedSchemes, setExpandedSchemes] = useState({});

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Performance Records from RPC
      const { data: pData, error: pErr } = await supabase.rpc('get_customer_scheme_performance');
      if (pErr) throw pErr;
      
      const records = pData || [];
      setPerformanceRecords(records);

      // Initialize expanded schemes state
      const schemeIds = [...new Set(records.map(r => r.scheme_id))];
      const initialExpanded = {};
      schemeIds.forEach(id => { initialExpanded[id] = true; });
      setExpandedSchemes(initialExpanded);

      // 2. Fetch Slabs for Summary
      const { data: sData, error: sErr } = await supabase
        .from('dealer_scheme_slabs')
        .select('*');
      if (!sErr) setSlabs(sData || []);

      // 3. Fetch Rewards for KPIs
      const { data: rData, error: rErr } = await supabase
        .from('dealer_reward_eligibility')
        .select('id, status');
      if (!rErr) setEligibleRewards(rData || []);

      setLoading(false);
    } catch (err) {
      console.error("=== Dealer Growth Hub Error Diagnostic ===");
      console.error("Query/RPC: get_customer_scheme_performance");
      console.error("Error Code:", err?.code);
      console.error("Error Message:", err?.message);
      console.error("Error Details:", err?.details);
      console.error("Error Hint:", err?.hint);
      console.error("Authenticated Role:", userProfile?.role);
      console.error("Full Error Object:", err);
      
      // We explicitly provide the technical error to the UI for immediate debugging
      setError(
        `Unable to load scheme performance data. \n` +
        `RPC Error Code: ${err?.code || 'Unknown'}\n` +
        `Message: ${err?.message || 'Check console for details.'}\n` + 
        `Details: ${err?.details || ''}`
      );
      setLoading(false);
    }
  }

  const toggleScheme = (schemeId) => {
    setExpandedSchemes(prev => ({ ...prev, [schemeId]: !prev[schemeId] }));
  };

  // --- Filtering Logic ---
  const filteredRecords = useMemo(() => {
    return performanceRecords.filter(r => {
      if (filterScheme !== 'All' && r.scheme_id !== filterScheme) return false;
      if (filterTerritory !== 'All' && (r.territory_name || 'Unassigned') !== filterTerritory) return false;
      if (filterStatus !== 'All' && r.status !== filterStatus) return false;
      // Pace filters could map to status or be separate. We'll map Pace to Status for simplicity here if they match
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const searchStr = `${r.customer_name} ${r.mobile} ${r.city} ${r.owner_name}`.toLowerCase();
        if (!searchStr.includes(sq)) return false;
      }
      return true;
    });
  }, [performanceRecords, filterScheme, filterTerritory, filterStatus, searchQuery]);

  // --- Group By Scheme ---
  const groupedByScheme = useMemo(() => {
    const groups = {};
    filteredRecords.forEach(r => {
      if (!groups[r.scheme_id]) {
        groups[r.scheme_id] = {
          scheme_id: r.scheme_id,
          scheme_name: r.scheme_name,
          start_date: r.start_date,
          end_date: r.end_date,
          days_remaining: r.days_remaining,
          records: []
        };
      }
      groups[r.scheme_id].records.push(r);
    });
    return Object.values(groups);
  }, [filteredRecords]);

  // --- KPIs ---
  const uniqueCustomers = new Set(performanceRecords.map(r => r.customer_id)).size;
  const activeSchemesCount = new Set(performanceRecords.map(r => r.scheme_id)).size;
  const kpi = {
    activeCustomers: uniqueCustomers,
    activeSchemes: activeSchemesCount,
    eligibleRewards: performanceRecords.filter(r => r.status === 'eligible').length, // Unique records that are eligible
    pendingApproval: eligibleRewards.filter(r => r.status === 'Pending Approval').length,
    pendingFulfillment: eligibleRewards.filter(r => r.status === 'Approved').length,
    nearTarget: performanceRecords.filter(r => r.status === 'near_next_slab').length,
    nearMonthly: performanceRecords.filter(r => r.status === 'near_monthly_target').length,
    atRisk: performanceRecords.filter(r => r.status === 'at_risk').length,
    closingSoon: performanceRecords.filter(r => r.days_remaining <= 7 && r.days_remaining > 0).length,
    noActivity: performanceRecords.filter(r => r.status === 'no_activity').length
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'eligible': return <span className="badge badge-success"><Gift size={12} style={{marginRight: '4px'}}/> Eligible</span>;
      case 'near_next_slab': return <span className="badge badge-warning"><TrendingUp size={12} style={{marginRight: '4px'}}/> Near Next Slab</span>;
      case 'near_monthly_target': return <span className="badge badge-warning"><Target size={12} style={{marginRight: '4px'}}/> Near Target</span>;
      case 'in_progress': return <span className="badge badge-primary"><Clock size={12} style={{marginRight: '4px'}}/> In Progress</span>;
      case 'at_risk': return <span className="badge badge-danger"><AlertTriangle size={12} style={{marginRight: '4px'}}/> At Risk</span>;
      case 'ended': return <span className="badge badge-secondary"><CheckCircle size={12} style={{marginRight: '4px'}}/> Ended</span>;
      case 'no_baseline': return <span className="badge badge-secondary">No Baseline</span>;
      case 'no_activity': return <span className="badge badge-secondary">No Activity</span>;
      default: return <span className="badge badge-secondary">{status}</span>;
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={24} className="text-primary" /> Customer Scheme & Growth Hub
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', maxWidth: '650px' }}>
            Track scheme eligibility, bag slabs, purchase pace, rewards, and customer follow-up opportunities automatically.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={16} /> Sync Data</button>
          <Link to="/settings/dealer-schemes" className="btn btn-primary"><Gift size={16} /> Manage Schemes</Link>
        </div>
      </div>

      {error ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <AlertCircle size={48} className="text-danger" style={{ opacity: 0.8, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{error}</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>There was an issue fetching the customer scheme data from the database.</p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={fetchData}><RefreshCw size={16} /> Retry</button>
          </div>
        </div>
      ) : loading ? (
        <div style={{padding: '3rem', textAlign: 'center'}}>Loading Scheme Performance Data...</div>
      ) : (
        <>
          {/* 2. KPI CARDS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--text-primary)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Users size={14}/> Active Customers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.activeCustomers}</div>
            </div>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Gift size={14}/> Active Schemes</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{kpi.activeSchemes}</div>
            </div>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Target size={14}/> Eligible for Rewards</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{kpi.eligibleRewards}</div>
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
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--info)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><TrendingUp size={14}/> Near Monthly Target</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--info)' }}>{kpi.nearMonthly}</div>
            </div>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><AlertTriangle size={14}/> At Risk of Missing Target</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.atRisk}</div>
            </div>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--danger)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Clock size={14}/> Schemes Closing Soon</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{kpi.closingSoon}</div>
            </div>
            <div className="cv-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--border)' }}>
              <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><XCircle size={14}/> No Activity Customers</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{kpi.noActivity}</div>
            </div>
          </div>

          {/* 3. FILTERS */}
          <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1 1 250px' }}>
              <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Search customer name, mobile, city..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '2.5rem' }}
              />
            </div>
            
            <select value={filterScheme} onChange={e => setFilterScheme(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              <option value="All">All Schemes</option>
              {[...new Set(performanceRecords.map(r => r.scheme_name))].map(s => <option key={s} value={performanceRecords.find(r => r.scheme_name === s).scheme_id}>{s}</option>)}
            </select>

            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
              <option value="All">All Statuses</option>
              <option value="eligible">Eligible</option>
              <option value="near_next_slab">Near Next Slab</option>
              <option value="near_monthly_target">Near Monthly Target</option>
              <option value="in_progress">In Progress</option>
              <option value="at_risk">At Risk</option>
              <option value="no_activity">No Activity</option>
            </select>
            
            {(filterScheme !== 'All' || filterStatus !== 'All' || searchQuery !== '') && (
              <button className="btn cv-btn-subtle" onClick={() => { setFilterScheme('All'); setFilterStatus('All'); setSearchQuery(''); }} style={{ color: 'var(--danger)' }}>
                <XCircle size={16} /> Clear Filters
              </button>
            )}
          </div>

          {/* 4. MAIN DATA PRESENTATION (GROUPED BY SCHEME) */}
          {groupedByScheme.length === 0 ? (
            <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              {performanceRecords.length === 0 ? (
                <>
                  <Gift size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No active schemes are currently available</h3>
                  <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Create a scheme to start tracking customer progress.</p>
                  <Link to="/settings/dealer-schemes" className="btn btn-primary">Create Scheme</Link>
                </>
              ) : (
                <>
                  <Filter size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No customers match the selected filters</h3>
                  <button className="btn btn-secondary" onClick={() => { setFilterScheme('All'); setFilterStatus('All'); setSearchQuery(''); }}>Clear Filters</button>
                </>
              )}
            </div>
          ) : (
            groupedByScheme.map(group => {
              const isExpanded = expandedSchemes[group.scheme_id];
              const schemeSlabs = slabs.filter(s => s.scheme_id === group.scheme_id).sort((a,b) => a.min_bags - b.min_bags);
              
              return (
                <div key={group.scheme_id} className="cv-panel" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
                  {/* Scheme Header */}
                  <div 
                    style={{ 
                      padding: '1.5rem', 
                      background: 'var(--bg-surface)', 
                      borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onClick={() => toggleScheme(group.scheme_id)}
                  >
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {group.scheme_name}
                        {group.days_remaining > 0 ? (
                          <span className="badge badge-primary">{group.days_remaining} Days Left</span>
                        ) : (
                          <span className="badge badge-secondary">Ended</span>
                        )}
                      </h3>
                      <div className="text-secondary" style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                        Period: {new Date(group.start_date).toLocaleDateString()} - {new Date(group.end_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{group.records.length}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Participants</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--success)' }}>
                          {group.records.filter(r => r.status === 'eligible').length}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Eligible</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--info)' }}>
                          {group.records.filter(r => r.status === 'near_next_slab').length}
                        </div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>Near Slab</div>
                      </div>
                      <div className="text-muted">
                        {isExpanded ? <ChevronUp /> : <ChevronDown />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div style={{ padding: '0', overflowX: 'auto' }}>
                      {/* Slabs Summary (Optional) */}
                      {schemeSlabs.length > 0 && (
                        <div style={{ padding: '1rem 1.5rem', background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', gap: '1rem', overflowX: 'auto' }}>
                          <span className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Slabs:</span>
                          {schemeSlabs.map(slab => (
                            <span key={slab.id} className="badge" style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                              {slab.slab_name} ({slab.min_bags} bags) - {slab.reward_description}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Customer Table */}
                      {group.records.length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No eligible customer purchases recorded yet.
                        </div>
                      ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1200px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customer</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>Net Bags</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Slab Progress</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reward Earned</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pace (Monthly)</th>
                              <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.records.map(r => (
                              <tr key={r.customer_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                                <td style={{ padding: '1rem' }}>
                                  <Link to={`/customers/${r.customer_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                                    {r.customer_name}
                                  </Link>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {r.city || 'No City'} • {r.mobile}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  {getStatusBadge(r.status)}
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'right' }}>
                                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{Number(r.current_net_bags || 0).toLocaleString()}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                                    {r.achieved_slab_name ? `Achieved: ${r.achieved_slab_name}` : 'No Slab Achieved'}
                                  </div>
                                  {r.next_slab_name && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                      Next: {r.next_slab_name} ({Number(r.bags_needed).toLocaleString()} more)
                                    </div>
                                  )}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem', color: r.reward_earned ? 'var(--success)' : 'inherit' }}>
                                    {r.reward_earned || '-'}
                                  </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                  <div style={{ fontSize: '0.85rem' }}>
                                    Pace: <span style={{fontWeight: 600, color: r.pace_percentage >= 100 ? 'var(--success)' : r.pace_percentage >= 80 ? 'var(--warning)' : r.pace_percentage > 0 ? 'var(--danger)' : 'inherit'}}>{r.pace_percentage}%</span>
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Avg: {Number(r.historical_monthly_bags).toLocaleString()}/mo
                                  </div>
                                </td>
                                <td style={{ padding: '1rem', textAlign: 'center' }}>
                                  <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                                    {r.status === 'eligible' && (
                                      <button className="btn btn-sm btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>Start Approval</button>
                                    )}
                                    <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Send Follow-up"><MessageSquare size={16} /></button>
                                    <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="More Options"><MoreVertical size={16} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
