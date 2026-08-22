import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { ShieldAlert, Search, Filter, AlertTriangle, Building2, Map, Users, ChevronDown, ChevronRight, DollarSign, Activity, FileText, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

export default function DealerControlTower() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealers, setDealers] = useState([]);

  // Filters
  const [filterTerritory, setFilterTerritory] = useState('All');
  const [filterHealth, setFilterHealth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [territories, setTerritories] = useState([]);

  // Expanded territory state
  const [expandedTerritories, setExpandedTerritories] = useState(new Set());

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData(retries = 2, delay = 1000) {
    if (retries === 2) setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('v_management_dealer_control')
        .select('*')
        .order('display_name');
      
      if (fetchErr) throw fetchErr;

      setDealers(data || []);

      // Extract unique territories for filter
      const uniqueTerritories = new Set();
      data?.forEach(r => {
        if (r.territory_name) uniqueTerritories.add(r.territory_name);
      });
      setTerritories(Array.from(uniqueTerritories).sort());

      // Auto-expand all territories by default for better visibility
      setExpandedTerritories(new Set(Array.from(uniqueTerritories).concat(['Unassigned'])));
      
      setLoading(false);
    } catch (err) {
      if (retries > 0) {
        console.warn(`DealerControl request failed, retrying in ${delay}ms... (${retries} retries left)`);
        setTimeout(() => fetchData(retries - 1, delay * 2), delay);
        return;
      }

      console.error("Dealer Control Tower Fetch Error:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        hint: err?.hint,
        raw: err
      });
      
      setError("Dealer service unavailable – try again in 30s.");
      setLoading(false);
    }
  }

  const toggleTerritory = (tName) => {
    setExpandedTerritories(prev => {
      const next = new Set(prev);
      if (next.has(tName)) next.delete(tName);
      else next.add(tName);
      return next;
    });
  };

  const filteredDealers = useMemo(() => dealers.filter(d => {
    if (filterTerritory !== 'All' && (d.territory_name || 'Unassigned') !== filterTerritory) return false;
    if (filterHealth !== 'All' && d.health_status !== filterHealth) return false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!d.display_name?.toLowerCase().includes(sq) && !d.party_id?.toLowerCase().includes(sq)) return false;
    }
    return true;
  }), [dealers, filterTerritory, filterHealth, searchQuery]);

  const groupedByTerritory = useMemo(() => {
    const groups = {};
    filteredDealers.forEach(d => {
      const t = d.territory_name || 'Unassigned';
      if (!groups[t]) groups[t] = { name: t, manager: d.territory_manager_name, dealers: [] };
      groups[t].dealers.push(d);
    });
    return Object.values(groups).sort((a, b) => a.name === 'Unassigned' ? 1 : b.name === 'Unassigned' ? -1 : a.name.localeCompare(b.name));
  }, [filteredDealers]);

  if (userProfile?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Dealer Control Tower...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={24} className="text-primary" /> Dealer Control Tower
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Compact channel-execution view for management. Tracks coverage, engagement, opportunities, and workload by territory.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
             <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
             <input
               type="text"
               className="input"
               placeholder="Search dealers..."
               style={{ paddingLeft: '2.5rem', width: '100%' }}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={18} className="text-muted" />
            <select className="input" value={filterTerritory} onChange={e => setFilterTerritory(e.target.value)} style={{ padding: '0.5rem', minWidth: '150px' }}>
              <option value="All">All Territories</option>
              {territories.map(t => <option key={t} value={t}>{t}</option>)}
              <option value="Unassigned">Unassigned</option>
            </select>
            <select className="input" value={filterHealth} onChange={e => setFilterHealth(e.target.value)} style={{ padding: '0.5rem' }}>
              <option value="All">All Health Status</option>
              <option value="Healthy">Healthy</option>
              <option value="At Risk">At Risk</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {groupedByTerritory.length === 0 ? (
          <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No dealers found matching your filters.
          </div>
        ) : (
          groupedByTerritory.map(group => {
            const isExpanded = expandedTerritories.has(group.name);
            return (
              <div key={group.name} className="glass-panel" style={{ overflow: 'hidden' }}>
                <div 
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    background: 'var(--bg-surface)', 
                    borderBottom: isExpanded ? '1px solid var(--border)' : 'none',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={() => toggleTerritory(group.name)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {isExpanded ? <ChevronDown size={20} className="text-muted" /> : <ChevronRight size={20} className="text-muted" />}
                    <Map size={20} className="text-primary" />
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                      {group.name}
                    </h2>
                    <span className="badge badge-secondary" style={{ marginLeft: '0.5rem' }}>{group.dealers.length} Dealers</span>
                  </div>
                  {group.name !== 'Unassigned' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      <Users size={16} /> Manager: <strong>{group.manager || 'Unassigned'}</strong>
                    </div>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                          <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Dealer</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Owner</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Active Opps/Reqs</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Overdue Actions</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Last Engagement</th>
                          <th style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Schemes</th>
                          <th style={{ padding: '0.75rem 1.5rem', fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'right' }}>Payment Workload</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.dealers.map(dealer => (
                          <tr key={dealer.party_id} style={{ borderBottom: '1px solid var(--border)' }}>
                            <td style={{ padding: '1rem 1.5rem' }}>
                              <Link to={`/customers/${dealer.party_id}`} className="text-primary" style={{ fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                {dealer.display_name}
                              </Link>
                              <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                {dealer.health_status === 'Healthy' && <span className="text-success" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}><CheckCircle2 size={12}/> Healthy</span>}
                                {dealer.health_status === 'At Risk' && <span className="text-danger" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}><AlertTriangle size={12}/> At Risk</span>}
                                {dealer.health_status === 'Inactive' && <span className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>Inactive</span>}
                                {dealer.health_status === 'Unknown' && <span className="text-warning" style={{ display: 'flex', alignItems: 'center', gap: '0.1rem' }}>Unknown</span>}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                              {dealer.owner_name || <span className="text-danger italic">Orphaned</span>}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                {dealer.active_opportunities_count > 0 ? (
                                  <Link to={`/opportunities?search=${encodeURIComponent(dealer.display_name)}`} title="Open Opportunities" className="badge badge-primary">{dealer.active_opportunities_count} Opps</Link>
                                ) : (
                                  <span className="text-muted" style={{fontSize: '0.8rem'}}>0 Opps</span>
                                )}
                                {dealer.active_requirements_count > 0 ? (
                                  <Link to={`/requirements?search=${encodeURIComponent(dealer.display_name)}`} title="Open Requirements" className="badge badge-success">{dealer.active_requirements_count} Reqs</Link>
                                ) : (
                                  <span className="text-muted" style={{fontSize: '0.8rem'}}>0 Reqs</span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {dealer.overdue_actions_count > 0 ? (
                                <Link to={`/follow-ups?search=${encodeURIComponent(dealer.display_name)}`} className="badge badge-danger">
                                  <AlertTriangle size={12} style={{marginRight: '2px'}}/> {dealer.overdue_actions_count} Overdue
                                </Link>
                              ) : (
                                <span className="text-muted" style={{fontSize: '0.8rem'}}><CheckCircle2 size={14}/> Clear</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                              {dealer.last_engagement_date ? (
                                <span>
                                  {formatDistanceToNow(parseISO(dealer.last_engagement_date), { addSuffix: true })}
                                </span>
                              ) : (
                                <span className="text-warning"><AlertTriangle size={12} style={{display: 'inline', verticalAlign: 'middle', marginRight: '2px'}}/> None Logged</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {dealer.active_schemes_count > 0 ? (
                                <span className="badge badge-primary">{dealer.active_schemes_count} Active</span>
                              ) : (
                                <span className="text-muted" style={{fontSize: '0.8rem'}}>-</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                              {dealer.tally_outstanding_balance > 0 ? (
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                                    <DollarSign size={14}/> {Number(dealer.tally_outstanding_balance).toLocaleString()}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                    {dealer.pending_payment_tasks > 0 ? (
                                      <Link to="/payments" className="text-primary">{dealer.pending_payment_tasks} Pending Task(s)</Link>
                                    ) : (
                                      <span className="text-danger">No Payment Task</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>Cleared</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
