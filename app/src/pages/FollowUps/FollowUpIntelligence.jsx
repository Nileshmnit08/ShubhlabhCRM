import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, User, CheckCircle2, Clock, Calendar, AlertCircle, PhoneIncoming, PhoneOutgoing, ArrowRight, ShieldAlert, Activity, X, ChevronRight, ChevronDown } from 'lucide-react';

export default function FollowUpIntelligence() {
  // Filters
  const [dateFilter, setDateFilter] = useState('Today');
  const [staffFilter, setStaffFilter] = useState('All');
  const [directionFilter, setDirectionFilter] = useState('All');
  const [followupFilter, setFollowupFilter] = useState('All');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Data
  const [allStaff, setAllStaff] = useState([]);
  const [feedData, setFeedData] = useState([]);
  const [filteredFeed, setFilteredFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Drill-down State
  const [expandedRows, setExpandedRows] = useState({});

  // Load Staff for filter
  useEffect(() => {
    const loadStaff = async () => {
      const { data } = await supabase.from('app_users').select('id, display_name').order('display_name');
      if (data) setAllStaff(data);
    };
    loadStaff();
  }, []);

  // Fetch Feed Data
  useEffect(() => {
    fetchFeed();
  }, [dateFilter, staffFilter]);

  const fetchFeed = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('v_crm_call_events_enriched')
        .select(`*`)
        .order('started_at', { ascending: false })
        .limit(500);

      // Date Boundaries
      const now = new Date();
      if (dateFilter === 'Today') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('started_at', start.toISOString());
      } else if (dateFilter === 'Yesterday') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        query = query.gte('started_at', start.toISOString()).lt('started_at', end.toISOString());
      } else if (dateFilter === 'This Week') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        query = query.gte('started_at', start.toISOString());
      }

      // Staff Filter
      if (staffFilter !== 'All') {
        query = query.eq('staff_id', staffFilter);
      }

      const { data: calls, error } = await query;
      if (error) throw error;

      if (!calls || calls.length === 0) {
        setFeedData([]);
        setFilteredFeed([]);
        setLoading(false);
        return;
      }

      const partyIds = [...new Set(calls.map(c => c.party_id).filter(Boolean))];
      let followUpsData = [];
      if (partyIds.length > 0) {
        const { data: fData } = await supabase
          .from('follow_ups')
          .select(`*, app_users!follow_ups_assigned_to_fkey(display_name)`)
          .in('party_id', partyIds)
          .in('status', ['Pending', 'In Progress']);
        followUpsData = fData || [];
      }

      // Group calls by customer
      const grouped = {};
      calls.forEach(c => {
         const key = c.party_id || `unknown_${c.normalized_phone}`;
         if (!grouped[key]) {
            grouped[key] = {
               id: key,
               party_id: c.party_id,
               party_name: c.party_name,
               display_phone: c.display_phone || c.normalized_phone,
               latest_call: c,
               calls: [],
               count: 0
            };
         }
         grouped[key].calls.push(c);
         grouped[key].count++;
      });

      const merged = Object.values(grouped).map(g => {
        const openF = followUpsData.filter(f => f.party_id === g.party_id);
        return {
          ...g,
          openFollowUps: openF
        };
      });

      // Sort merged by latest call
      merged.sort((a, b) => new Date(b.latest_call.started_at) - new Date(a.latest_call.started_at));

      setFeedData(merged);
    } catch (err) {
      console.error('Error fetching feed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Apply Local Filters
  useEffect(() => {
    let result = [...feedData];

    if (directionFilter !== 'All') {
      result = result.filter(g => g.calls.some(c => c.direction === directionFilter.toUpperCase()));
    }

    if (followupFilter === 'With Open Follow-up') {
      result = result.filter(g => g.openFollowUps && g.openFollowUps.length > 0);
    } else if (followupFilter === 'Without Open Follow-up') {
      result = result.filter(g => !g.openFollowUps || g.openFollowUps.length === 0);
    }

    if (customerSearchQuery.trim() !== '') {
      const q = customerSearchQuery.toLowerCase();
      result = result.filter(g => 
        (g.party_name || '').toLowerCase().includes(q) ||
        (g.display_phone || '').includes(q)
      );
    }

    setFilteredFeed(result);
  }, [feedData, directionFilter, followupFilter, customerSearchQuery]);

  const toggleRow = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Stats
  const uniqueCustomers = filteredFeed.length;
  const totalCalls = filteredFeed.reduce((sum, g) => sum + g.count, 0);
  const uniqueStaff = new Set(filteredFeed.flatMap(g => g.calls.map(c => c.staff_id))).size;
  const withFollowUpCount = filteredFeed.filter(g => g.openFollowUps && g.openFollowUps.length > 0).length;
  const withoutFollowUpCount = uniqueCustomers - withFollowUpCount;

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          <Activity size={24} /> Customer Communication Intelligence
        </h2>
        <p className="text-secondary">Customer-wise communication timelines and actionable follow-up status.</p>
      </div>

      {/* BUSINESS FLOW HEADER */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', overflowX: 'auto' }}>
          <WorkflowNode icon={<Phone size={18} />} title="REAL CALL" color="var(--primary)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<User size={18} />} title="CUSTOMER TIMELINE" color="var(--success)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<ShieldAlert size={18} />} title="CHECK OPEN FOLLOW-UP" color="var(--warning)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<AlertCircle size={18} />} title="NO DUPLICATE CREATED" color="var(--danger)" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* FILTERS & LIST */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {/* STAFF SUMMARY & FILTERS */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="form-control">
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="All Time">All Time (Limit 500)</option>
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Staff</label>
                <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} className="form-control">
                  <option value="All">All Staff</option>
                  {allStaff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 150px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Direction</label>
                <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)} className="form-control">
                  <option value="All">All</option>
                  <option value="Incoming">Incoming</option>
                  <option value="Outgoing">Outgoing</option>
                  <option value="Missed">Missed</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Follow-up Status</label>
                <select value={followupFilter} onChange={e => setFollowupFilter(e.target.value)} className="form-control">
                  <option value="All">All</option>
                  <option value="With Open Follow-up">With Open Follow-up</option>
                  <option value="Without Open Follow-up">Without Open Follow-up</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Customer (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Search size={14} className="text-secondary" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    placeholder="Search by name..." 
                    value={customerSearchQuery}
                    onChange={e => setCustomerSearchQuery(e.target.value)}
                    className="form-control"
                    style={{ paddingLeft: '2rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customers Contacted</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{uniqueCustomers}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Calls</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totalCalls}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Staff Involved</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{uniqueStaff}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>With Open Follow-up</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--warning)' }}>{withFollowUpCount}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Without Open Follow-up</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--primary)' }}>{withoutFollowUpCount}</div>
              </div>
            </div>
          </div>

          {/* CUSTOMER-WISE LIST */}
          <div className="glass-panel" style={{ padding: '0' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UsersIcon size={20} /> Customer Timeline
              </h3>
            </div>
            
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading authoritative communication...</div>
            ) : filteredFeed.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No communication records found for the selected filters.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {filteredFeed.map(group => {
                  const isExpanded = expandedRows[group.id];
                  const hasOpen = group.openFollowUps && group.openFollowUps.length > 0;
                  const calledTodayText = dateFilter === 'Today' ? 'Called Today' : (dateFilter === 'Yesterday' ? 'Called Yesterday' : 'Called');

                  return (
                    <div key={group.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      {/* Customer Row Header */}
                      <div 
                        onClick={() => toggleRow(group.id)}
                        className="hover-bg-surface-hover"
                        style={{ 
                          display: 'flex', alignItems: 'flex-start', padding: '1.25rem 1.5rem', 
                          cursor: 'pointer', background: isExpanded ? 'var(--bg-surface-hover)' : 'transparent',
                          transition: 'background 0.2s ease', gap: '1rem'
                        }}
                      >
                        <div style={{ marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '1.1rem' }}>{group.party_id ? group.party_name : 'Unknown Customer'}</strong>
                            {!group.party_id && <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{group.display_phone}</span>}
                            
                            <span className="badge" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--primary)', border: '1px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Phone size={12} /> {calledTodayText} &middot; {group.count} call{group.count !== 1 && 's'}
                            </span>
                          </div>
                          
                          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            Latest call: <strong style={{ color: 'var(--text-primary)' }}>{new Date(group.latest_call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong> &middot; 
                            <DirectionLabel direction={group.latest_call.direction} /> &middot; 
                            {group.latest_call.duration_seconds > 0 ? `${group.latest_call.duration_seconds} sec` : 'Duration unavailable'} &middot; 
                            {group.latest_call.staff_name || 'Operator not identified'}
                          </div>
                        </div>

                        <div style={{ width: '250px', textAlign: 'right' }}>
                           {hasOpen ? (
                              <div style={{ background: 'rgba(234,179,8,0.1)', padding: '0.5rem', borderRadius: '6px', borderLeft: '3px solid var(--warning)', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600, marginBottom: '0.15rem' }}>Open Follow-up</div>
                                <div style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{group.openFollowUps[0].follow_up_type} - {group.openFollowUps[0].reason}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{group.openFollowUps[0].status} &middot; {group.openFollowUps[0].app_users?.display_name || 'Unassigned'}</div>
                              </div>
                            ) : (
                              <div style={{ padding: '0.5rem', textAlign: 'left' }}>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Activity size={14}/> No Open Follow-up</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Communication recorded — no automatic follow-up created.</div>
                              </div>
                            )}
                        </div>
                      </div>

                      {/* Timeline Expand */}
                      {isExpanded && (
                        <div style={{ padding: '1.5rem 1.5rem 2rem 3.5rem', background: 'var(--bg-body)' }}>
                          <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>Call Timeline</span>
                            {hasOpen && <span style={{ color: 'var(--success)', textTransform: 'none', letterSpacing: 'normal' }}><CheckCircle2 size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> Existing follow-up preserved</span>}
                          </h4>
                          
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500 }}>Time</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500 }}>Direction</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500 }}>Staff</th>
                                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: 500 }}>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.calls.map(call => (
                                <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '0.75rem 0.5rem', whiteSpace: 'nowrap' }}>
                                    <div style={{ fontWeight: 500 }}>{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(call.started_at).toLocaleDateString()}</div>
                                  </td>
                                  <td style={{ padding: '0.75rem 0.5rem' }}><DirectionLabel direction={call.direction} /></td>
                                  <td style={{ padding: '0.75rem 0.5rem' }}>{call.staff_name || 'Operator not identified'}</td>
                                  <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                                    {call.duration_seconds > 0 ? `${call.duration_seconds} sec` : 'Duration unavailable'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function WorkflowNode({ icon, title, color = 'var(--text-primary)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '90px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-surface)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{title}</div>
    </div>
  );
}

function DirectionLabel({ direction }) {
  if (direction === 'INCOMING') return <span style={{ color: 'var(--success)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><PhoneIncoming size={14} /> Incoming</span>;
  if (direction === 'OUTGOING') return <span style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><PhoneOutgoing size={14} /> Outgoing</span>;
  if (direction === 'UNKNOWN') return <span style={{ color: 'var(--warning)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}><Phone size={14} /> Unknown</span>;
  return <span style={{ color: 'var(--text-secondary)' }}>{direction}</span>;
}

function UsersIcon(props) {
  return <User {...props} />; // Placeholder for Users icon from lucide-react, aliased since we only imported User
}
