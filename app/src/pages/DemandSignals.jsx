import React, { useEffect, useState, useContext, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { Link } from 'react-router-dom';
import { Search, Filter, Activity, CheckCircle2, AlertTriangle, TrendingUp, DollarSign, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import ScheduleAction from '../components/ScheduleAction';

export default function DemandSignals() {
  const { userProfile } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signals, setSignals] = useState([]);
  const [activeSources, setActiveSources] = useState(new Set());

  // Filters
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSignals();
  }, [userProfile]);

  async function fetchSignals() {
    setLoading(true);
    try {
      // Admin sees all, Operator sees only their assigned accounts
      let query = supabase.from('v_demand_signals').select('*').order('signal_date', { ascending: false });
      
      if (userProfile?.role !== 'Admin') {
         query = query.eq('assigned_owner_id', userProfile?.id);
      }

      const { data, error: fetchErr } = await query;
      
      if (fetchErr) throw fetchErr;
      setSignals(data || []);

      // Fetch active follow-ups to deduplicate
      const { data: fuData, error: fuErr } = await supabase.from('follow_ups')
         .select('notes')
         .eq('status', 'Pending')
         .like('notes', 'Source ID: %');
      
      if (!fuErr && fuData) {
         const sources = new Set(fuData.map(f => f.notes.replace('Source ID: ', '')));
         setActiveSources(sources);
      }

    } catch (err) {
      console.error(err);
      setError("Failed to load demand signals.");
    } finally {
      setLoading(false);
    }
  }

  const filteredSignals = useMemo(() => signals.filter(s => {
    if (filterType !== 'All' && s.signal_type !== filterType) return false;
    if (searchQuery) {
      const sq = searchQuery.toLowerCase();
      if (!s.party_name?.toLowerCase().includes(sq) && !s.description?.toLowerCase().includes(sq)) return false;
    }
    return true;
  }), [signals, filterType, searchQuery]);

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading Demand Signals...</div>;
  if (error) return <div style={{padding: '3rem', textAlign: 'center', color: 'var(--danger)'}}>{error}</div>;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={24} className="text-primary" /> Demand Signal Hub
        </h1>
        <p className="text-secondary" style={{ fontSize: '0.95rem' }}>
          Unified real-time feed of market demand capturing requirements, intents, and transactional behavior.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px', position: 'relative' }}>
             <Search size={18} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
             <input
               type="text"
               className="input"
               placeholder="Search by customer or details..."
               style={{ paddingLeft: '2.5rem', width: '100%' }}
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Filter size={18} className="text-muted" />
            <select className="input" value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.5rem', minWidth: '200px' }}>
              <option value="All">All Signal Types</option>
              <option value="Stated Requirement">Stated Requirement</option>
              <option value="Commercial Intent">Commercial Intent</option>
              <option value="Repeat Purchase Evidence">Repeat Purchase Evidence</option>
              <option value="Tally Transaction">Tally Transaction</option>
            </select>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Signal Type</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Description</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Product Ref</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSignals.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No demand signals found matching criteria.
                </td>
              </tr>
            ) : filteredSignals.map((s, idx) => {
              // Icon mapping based on signal type
              let Icon = Calendar;
              let badgeClass = 'badge-secondary';
              if (s.signal_type === 'Stated Requirement') { Icon = CheckCircle2; badgeClass = 'badge-success'; }
              else if (s.signal_type === 'Commercial Intent') { Icon = TrendingUp; badgeClass = 'badge-primary'; }
              else if (s.signal_type === 'Repeat Purchase Evidence') { Icon = Activity; badgeClass = 'badge-warning'; }
              else if (s.signal_type === 'Tally Transaction') { Icon = DollarSign; badgeClass = 'badge-success'; }

              const isScheduled = activeSources.has(s.source_id);

              return (
                <tr key={`${s.source_id}-${idx}`} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s', ':hover': { background: 'var(--bg-surface-hover)' } }}>
                  <td style={{ padding: '1rem' }}>
                    <div className={`badge ${badgeClass}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Icon size={12} /> {s.signal_type}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    {format(parseISO(s.signal_date), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td style={{ padding: '1rem', fontWeight: 500 }}>
                    <Link to={`/customers/${s.party_id}`} className="text-primary" style={{ textDecoration: 'none' }}>
                      {s.party_name}
                    </Link>
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {s.description}
                  </td>
                  <td style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    {s.product_reference || <span className="italic">N/A</span>}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                     {s.signal_status === 'Closed' || s.signal_status === 'Validated' ? (
                       <span className="text-success" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}><CheckCircle2 size={14}/> {s.signal_status}</span>
                     ) : s.signal_status === 'Action Needed' ? (
                       <span className="text-danger" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}><AlertTriangle size={14}/> {s.signal_status}</span>
                     ) : (
                       <span className="text-primary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>{s.signal_status}</span>
                     )}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                     {!isScheduled && s.signal_status !== 'Closed' && s.signal_status !== 'Validated' ? (
                        <ScheduleAction 
                          party={{ id: s.party_id, display_name: s.party_name }} 
                          opportunityType={s.signal_type} 
                          evidence={s.description} 
                          sourceId={s.source_id}
                          onComplete={fetchSignals} 
                          btnClass="btn btn-primary"
                          showLabel={false}
                        />
                     ) : isScheduled ? (
                        <span className="badge badge-success" style={{ fontSize: '0.75rem' }}><CheckCircle2 size={12}/> Scheduled</span>
                     ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
