import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link, Navigate } from 'react-router-dom';
import { 
  Building2, Search, Filter, AlertTriangle, Users, 
  Map as MapIcon, ChevronDown, ChevronRight, Activity, 
  CheckCircle2, Plus, Upload, XCircle, MoreVertical, Phone, AlertCircle
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import AddDealerDrawer from '../components/AddDealerDrawer';
import ImportDealersModal from '../components/ImportDealersModal';

export default function DealerControlTower() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dealers, setDealers] = useState([]);

  // Modals
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Filters
  const [filterHealth, setFilterHealth] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTerritory, setFilterTerritory] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterOwner, setFilterOwner] = useState('All');
  
  // Data Options
  const [territories, setTerritories] = useState([]);
  const [owners, setOwners] = useState([]);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [userProfile]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('v_management_dealer_control')
        .select('*');
      
      if (fetchErr) {
        if (fetchErr.code === '42P01') {
          // View doesn't exist yet, gracefully handle
          console.warn("View v_management_dealer_control is missing.");
          setDealers([]);
        } else {
          throw fetchErr;
        }
      } else {
        setDealers(data || []);
        
        // Extract unique territories and owners for filter dropdowns
        const tSet = new Set();
        const oSet = new Set();
        data?.forEach(d => {
          if (d.territory_name) tSet.add(d.territory_name);
          if (d.owner_name) oSet.add(d.owner_name);
        });
        setTerritories(Array.from(tSet).sort());
        setOwners(Array.from(oSet).sort());
      }
      
      setLoading(false);
    } catch (err) {
      console.error("Dealer Control Tower Fetch Error:", err);
      setError("Dealer service unavailable. Please check your connection or database schema.");
      setLoading(false);
    }
  }

  // --- Filtering Logic ---
  const filteredDealers = useMemo(() => {
    return dealers.filter(d => {
      if (filterHealth !== 'All' && d.health_category !== filterHealth) return false;
      if (filterTerritory !== 'All' && (d.territory_name || 'Unassigned') !== filterTerritory) return false;
      if (filterStatus !== 'All' && d.crm_status !== filterStatus) return false;
      if (filterOwner !== 'All' && (d.owner_name || 'Unassigned') !== filterOwner) return false;
      
      if (searchQuery) {
        const sq = searchQuery.toLowerCase();
        const searchStr = `${d.display_name} ${d.mobile} ${d.owner_name} ${d.city} ${d.party_id}`.toLowerCase();
        if (!searchStr.includes(sq)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Default sorting: 
      // 1. Dealers requiring action (Needs Attention)
      // 2. At-risk dealers
      // 3. Inactive dealers
      // 4. Recently active
      const rank = { 'Needs Attention': 1, 'At Risk': 2, 'Inactive': 3, 'Healthy': 4 };
      const rankA = rank[a.health_category] || 5;
      const rankB = rank[b.health_category] || 5;
      if (rankA !== rankB) return rankA - rankB;
      return (a.days_since_last_activity || 0) - (b.days_since_last_activity || 0);
    });
  }, [dealers, filterHealth, filterTerritory, filterStatus, filterOwner, searchQuery]);

  // --- KPIs ---
  const kpi = {
    total: dealers.length,
    healthy: dealers.filter(d => d.health_category === 'Healthy').length,
    atRisk: dealers.filter(d => d.health_category === 'At Risk').length,
    inactive: dealers.filter(d => d.health_category === 'Inactive').length,
    unassigned: dealers.filter(d => !d.territory_name).length,
    needsAttention: dealers.filter(d => d.health_category === 'Needs Attention').length,
  };

  // --- Territory Coverage Data ---
  const territoryStats = useMemo(() => {
    const map = {};
    dealers.forEach(d => {
      const t = d.territory_name || 'Unassigned';
      if (!map[t]) {
        map[t] = { name: t, total: 0, healthy: 0, atRisk: 0, inactive: 0, needsAttention: 0, opps: 0, overdue: 0 };
      }
      map[t].total++;
      if (d.health_category === 'Healthy') map[t].healthy++;
      if (d.health_category === 'At Risk') map[t].atRisk++;
      if (d.health_category === 'Inactive') map[t].inactive++;
      if (d.health_category === 'Needs Attention') map[t].needsAttention++;
      map[t].opps += (d.active_opportunities_count || 0);
      map[t].overdue += (d.overdue_actions_count || 0);
    });
    return Object.values(map).sort((a, b) => a.name === 'Unassigned' ? 1 : b.name === 'Unassigned' ? -1 : a.name.localeCompare(b.name));
  }, [dealers]);

  const hasActiveFilters = filterHealth !== 'All' || filterTerritory !== 'All' || filterStatus !== 'All' || filterOwner !== 'All' || searchQuery !== '';
  const clearFilters = () => {
    setFilterHealth('All');
    setFilterTerritory('All');
    setFilterStatus('All');
    setFilterOwner('All');
    setSearchQuery('');
  };

  const getHealthBadge = (health, reason) => {
    let color = 'var(--text-muted)';
    let bg = 'rgba(0,0,0,0.05)';
    if (health === 'Healthy') { color = 'var(--success)'; bg = 'rgba(46, 204, 113, 0.1)'; }
    if (health === 'At Risk') { color = 'var(--warning)'; bg = 'rgba(241, 196, 15, 0.1)'; }
    if (health === 'Inactive') { color = 'var(--danger)'; bg = 'rgba(231, 76, 60, 0.1)'; }
    if (health === 'Needs Attention') { color = 'var(--primary)'; bg = 'rgba(52, 152, 219, 0.1)'; }

    return (
      <span style={{ 
        padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
        backgroundColor: bg, color: color, display: 'inline-block', cursor: 'help'
      }} title={reason || health}>
        {health || 'Unknown'}
      </span>
    );
  };

  if (userProfile?.role !== 'Admin') {
    return <Navigate to="/" replace />;
  }

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Dealer Control Tower...</div>;

  // Global Empty State (Zero dealers entirely)
  if (!loading && dealers.length === 0 && !error) {
    return (
      <div className="animate-fade-in" style={{ padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Building2 size={64} className="text-muted" style={{ opacity: 0.5, marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem' }}>No dealers added yet</h2>
        <p className="text-secondary" style={{ maxWidth: '500px', marginBottom: '2rem' }}>
          Add your first dealer or import an existing dealer list to start monitoring coverage and dealer health.
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => setShowAddDrawer(true)}>
            <Plus size={18} style={{ marginRight: '0.5rem' }} /> Add First Dealer
          </button>
          <button className="btn btn-secondary" onClick={() => setShowImportModal(true)}>
            <Upload size={18} style={{ marginRight: '0.5rem' }} /> Import Dealer List
          </button>
        </div>
        {showAddDrawer && <AddDealerDrawer onClose={() => setShowAddDrawer(false)} onSave={fetchData} />}
        {showImportModal && <ImportDealersModal onClose={() => setShowImportModal(false)} onSave={fetchData} />}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      {/* 1. HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 600, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Building2 size={24} className="text-primary" /> Dealer Control Tower
          </h1>
          <p className="text-secondary" style={{ fontSize: '0.95rem', maxWidth: '600px' }}>
            Monitor dealer health, territory coverage, sales activity, and follow-up priorities.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn cv-btn-subtle" onClick={() => setShowImportModal(true)}>
            <Upload size={16} /> Import Dealers
          </button>
          <button className="btn btn-primary" onClick={() => setShowAddDrawer(true)}>
            <Plus size={16} /> Add Dealer
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(231,76,60,0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '1rem', borderLeft: '4px solid var(--danger)' }}>
          <AlertTriangle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {/* Data Quality Banner */}
      {kpi.needsAttention > 0 && (
        <div style={{ padding: '1rem', background: 'rgba(52,152,219,0.1)', color: 'var(--primary)', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <AlertCircle size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
            <strong>{kpi.needsAttention} dealer profiles need attention.</strong> Complete their details to improve territory coverage and health reporting.
          </div>
          <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setFilterHealth('Needs Attention')}>
            Review Data Issues
          </button>
        </div>
      )}

      {/* 2. KPI CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total Dealers', val: kpi.total, filter: 'All', color: 'var(--text-primary)' },
          { label: 'Healthy', val: kpi.healthy, filter: 'Healthy', color: 'var(--success)' },
          { label: 'At Risk', val: kpi.atRisk, filter: 'At Risk', color: 'var(--warning)' },
          { label: 'Inactive', val: kpi.inactive, filter: 'Inactive', color: 'var(--danger)' },
          { label: 'Requires Action', val: kpi.needsAttention, filter: 'Needs Attention', color: 'var(--primary)' },
        ].map(k => (
          <div 
            key={k.label} 
            className="cv-panel" 
            style={{ 
              padding: '1.25rem', cursor: 'pointer', 
              borderLeft: filterHealth === k.filter ? `4px solid ${k.color}` : '4px solid transparent',
              background: filterHealth === k.filter ? 'var(--bg-hover)' : 'var(--bg-surface)'
            }} 
            onClick={() => setFilterHealth(k.filter)}
          >
            <div className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>{k.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: k.color }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* 3. FILTER AND SEARCH BAR */}
      <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 250px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search name, mobile, city, code..." 
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

        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-base)' }}>
          <option value="All">All Owners</option>
          <option value="Unassigned">Unassigned Owner</option>
          {owners.map(o => <option key={o} value={o}>{o}</option>)}
        </select>

        {hasActiveFilters && (
          <button className="btn cv-btn-subtle" onClick={clearFilters} style={{ color: 'var(--danger)' }}>
            <XCircle size={16} /> Clear Filters
          </button>
        )}
      </div>

      <div style={{ marginBottom: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Showing {filteredDealers.length} of {dealers.length} dealers
      </div>

      {/* 4. MAIN DEALER TABLE */}
      {filteredDealers.length === 0 ? (
        <div className="cv-panel" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <Filter size={48} className="text-muted" style={{ opacity: 0.5, marginBottom: '1rem' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No dealers match these filters</h3>
          <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Try changing your search or clearing active filters.</p>
          <button className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
        </div>
      ) : (
        <div className="cv-panel" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Dealer</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Contact</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Health</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last Activity</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Open Opps / Tasks</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Owner / Territory</th>
                <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDealers.map(d => (
                <tr key={d.party_id} style={{ borderBottom: '1px solid var(--border)', transition: 'background-color 0.2s' }}>
                  <td style={{ padding: '1rem' }}>
                    <Link to={`/customers/${d.party_id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {d.display_name}
                    </Link>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {d.city || 'No City'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>{d.mobile || <span className="text-danger">No Mobile</span>}</div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {getHealthBadge(d.health_category, d.health_reason_text)}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem' }}>
                      {d.last_engagement_date ? (
                        <span title={new Date(d.last_engagement_date).toLocaleString()}>
                          {formatDistanceToNow(new Date(d.last_engagement_date), { addSuffix: true })}
                        </span>
                      ) : 'Never'}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                      <span title="Open Opportunities" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: d.active_opportunities_count > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                        <Activity size={14} /> {d.active_opportunities_count}
                      </span>
                      <span title="Overdue Actions" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: d.overdue_actions_count > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        <AlertTriangle size={14} /> {d.overdue_actions_count}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{d.owner_name || <span className="text-warning">Unassigned</span>}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.territory_name || 'No Territory'}</div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'center' }}>
                      <Link to={`/customers/${d.party_id}`} className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="View Dealer"><ChevronRight size={16} /></Link>
                      <button className="btn cv-btn-subtle" style={{ padding: '0.25rem 0.5rem' }} title="Quick Actions"><MoreVertical size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. TERRITORY COVERAGE */}
      {dealers.length > 0 && (
        <div style={{ marginTop: '3rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MapIcon size={20} className="text-primary" /> Territory Coverage
          </h2>
          <div className="cv-panel" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Territory</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Dealers</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Health Mix (H / R / I)</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Data Issues</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Open Opps</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Overdue Tasks</th>
                  <th style={{ padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Coverage Status</th>
                </tr>
              </thead>
              <tbody>
                {territoryStats.map(t => {
                  let coverageStatus = 'Adequate';
                  let coverageColor = 'var(--success)';
                  if (t.name === 'Unassigned') {
                    coverageStatus = 'Data Incomplete';
                    coverageColor = 'var(--text-muted)';
                  } else if (t.total === 0) {
                    coverageStatus = 'No Dealer Coverage';
                    coverageColor = 'var(--danger)';
                  } else if (t.total < 3) {
                    coverageStatus = 'Low Coverage';
                    coverageColor = 'var(--warning)';
                  }

                  return (
                    <tr key={t.name} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => { setFilterTerritory(t.name); window.scrollTo(0,0); }}>
                      <td style={{ padding: '1rem', fontWeight: 600 }}>{t.name}</td>
                      <td style={{ padding: '1rem' }}>{t.total}</td>
                      <td style={{ padding: '1rem' }}>
                        <span className="text-success">{t.healthy}</span> / <span className="text-warning">{t.atRisk}</span> / <span className="text-danger">{t.inactive}</span>
                      </td>
                      <td style={{ padding: '1rem', color: t.needsAttention > 0 ? 'var(--primary)' : 'inherit' }}>
                        {t.needsAttention}
                      </td>
                      <td style={{ padding: '1rem' }}>{t.opps}</td>
                      <td style={{ padding: '1rem', color: t.overdue > 0 ? 'var(--danger)' : 'inherit' }}>{t.overdue}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          backgroundColor: `${coverageColor}20`, color: coverageColor 
                        }}>
                          {coverageStatus}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddDrawer && <AddDealerDrawer onClose={() => setShowAddDrawer(false)} onSave={fetchData} />}
      {showImportModal && <ImportDealersModal onClose={() => setShowImportModal(false)} onSave={fetchData} />}
    </div>
  );
}
