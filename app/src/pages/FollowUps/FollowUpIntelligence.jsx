import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, User, CheckCircle2, Clock, Calendar, AlertCircle, PhoneIncoming, PhoneOutgoing, ArrowRight, ShieldAlert, FileText, Activity, Filter, X, ChevronRight } from 'lucide-react';

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
  const [selectedCall, setSelectedCall] = useState(null);
  const [customerHistory, setCustomerHistory] = useState([]);

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
        .from('crm_call_events')
        .select(`
          *,
          app_users!crm_call_events_staff_id_fkey(display_name),
          crm_parties(display_name, mobile, city)
        `)
        .order('started_at', { ascending: false })
        .limit(300);

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

      // Fetch Open Follow-ups for these customers
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

      // Merge
      const merged = calls.map(c => {
        const openF = followUpsData.filter(f => f.party_id === c.party_id);
        return {
          ...c,
          openFollowUps: openF
        };
      });

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
      result = result.filter(c => c.direction === directionFilter.toUpperCase());
    }

    if (followupFilter === 'With Open Follow-up') {
      result = result.filter(c => c.openFollowUps && c.openFollowUps.length > 0);
    } else if (followupFilter === 'Without Open Follow-up') {
      result = result.filter(c => !c.openFollowUps || c.openFollowUps.length === 0);
    }

    if (customerSearchQuery.trim() !== '') {
      const q = customerSearchQuery.toLowerCase();
      result = result.filter(c => 
        (c.crm_parties?.display_name || '').toLowerCase().includes(q) ||
        (c.crm_parties?.mobile || '').includes(q)
      );
    }

    setFilteredFeed(result);
  }, [feedData, directionFilter, followupFilter, customerSearchQuery]);

  // Drill Down
  const handleRowClick = async (call) => {
    setSelectedCall(call);
    if (call.party_id) {
      // Fetch full history for this customer
      const { data: history } = await supabase
        .from('follow_ups')
        .select(`*, app_users!follow_ups_assigned_to_fkey(display_name)`)
        .eq('party_id', call.party_id)
        .order('created_at', { ascending: false });
      setCustomerHistory(history || []);
    } else {
      setCustomerHistory([]);
    }
  };

  // Stats
  const totalCalls = filteredFeed.length;
  const uniqueCustomers = new Set(filteredFeed.map(c => c.party_id).filter(Boolean)).size;
  const uniqueStaff = new Set(filteredFeed.map(c => c.staff_id)).size;
  const withFollowUpCount = filteredFeed.filter(c => c.openFollowUps && c.openFollowUps.length > 0).length;
  const withoutFollowUpCount = totalCalls - withFollowUpCount;

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1400px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          <Activity size={24} /> Follow-up Intelligence Feed
        </h2>
        <p className="text-secondary">Automatically monitor communication activity and its relationship to actionable follow-up tasks.</p>
      </div>

      {/* BUSINESS FLOW HEADER */}
      <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.5rem',
          overflowX: 'auto'
        }}>
          <WorkflowNode icon={<User size={18} />} title="CUSTOMER" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<Phone size={18} />} title="REAL CALL" color="var(--primary)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<CheckCircle2 size={18} />} title="CALL RECORDED" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<Activity size={18} />} title="CUSTOMER ACTIVITY" color="var(--success)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<ShieldAlert size={18} />} title="CHECK OPEN FOLLOW-UP" color="var(--warning)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<AlertCircle size={18} />} title="NO DUPLICATE CREATED" color="var(--danger)" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* LEFT COLUMN: Filters & Feed */}
        <div style={{ flex: 1, minWidth: 0 }}>
          
          {/* STAFF SUMMARY & FILTERS */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
            
            {/* Filters Row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Date</label>
                <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="This Week">This Week</option>
                  <option value="All Time">All Time (Limit 300)</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Staff</label>
                <select value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="All">All Staff</option>
                  {allStaff.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Direction</label>
                <select value={directionFilter} onChange={e => setDirectionFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="All">All</option>
                  <option value="Incoming">Incoming</option>
                  <option value="Outgoing">Outgoing</option>
                  <option value="Missed">Missed</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Follow-up Status</label>
                <select value={followupFilter} onChange={e => setFollowupFilter(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
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
                    style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 2rem', borderRadius: '4px', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
            </div>

            {/* Summary Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Calls</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totalCalls}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Customers Contacted</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{uniqueCustomers}</div>
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

          {/* FEED LIST */}
          <div className="glass-panel" style={{ padding: '0' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock size={20} /> Latest Activity Feed
              </h3>
            </div>
            
            {loading ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading authoritative communication...</div>
            ) : filteredFeed.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>No communication records found for the selected filters.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                      <th style={{ padding: '0.75rem 1.5rem' }}>Time</th>
                      <th style={{ padding: '0.75rem' }}>Customer</th>
                      <th style={{ padding: '0.75rem' }}>Staff</th>
                      <th style={{ padding: '0.75rem' }}>Direction</th>
                      <th style={{ padding: '0.75rem' }}>Duration</th>
                      <th style={{ padding: '0.75rem' }}>Follow-up Status</th>
                      <th style={{ padding: '0.75rem' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeed.map(call => {
                      const hasOpen = call.openFollowUps && call.openFollowUps.length > 0;
                      return (
                        <tr 
                          key={call.id} 
                          onClick={() => handleRowClick(call)}
                          style={{ 
                            borderBottom: '1px solid var(--border)', 
                            cursor: 'pointer',
                            background: selectedCall?.id === call.id ? 'var(--bg-surface)' : 'transparent'
                          }} 
                          className="hover-bg"
                        >
                          <td style={{ padding: '1rem 1.5rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 500 }}>{new Date(call.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{new Date(call.started_at).toLocaleDateString()}</div>
                          </td>
                          <td style={{ padding: '1rem' }}>
                            {call.crm_parties ? (
                              <div style={{ fontWeight: 600 }}>{call.crm_parties.display_name}</div>
                            ) : (
                              <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Unknown Customer</div>
                            )}
                          </td>
                          <td style={{ padding: '1rem' }}>{call.app_users?.display_name || 'Operator not identified'}</td>
                          <td style={{ padding: '1rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: call.direction === 'INCOMING' ? 'var(--success)' : (call.direction === 'OUTGOING' ? 'var(--primary)' : 'inherit') }}>
                              {call.direction === 'INCOMING' ? <PhoneIncoming size={14} /> : (call.direction === 'OUTGOING' ? <PhoneOutgoing size={14} /> : <Phone size={14} />)} 
                              {call.direction}
                            </span>
                          </td>
                          <td style={{ padding: '1rem' }}>{call.duration_seconds > 0 ? `${call.duration_seconds}s` : '-'}</td>
                          <td style={{ padding: '1rem' }}>
                            {hasOpen ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning)', fontWeight: 500 }}>
                                <CheckCircle2 size={14} /> Existing preserved
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)' }}>
                                <Activity size={14} /> No open follow-up
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                            <ChevronRight size={18} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Drill Down Panel */}
        {selectedCall && (
          <div className="glass-panel animate-slide-left" style={{ width: '400px', flexShrink: 0, padding: 0, position: 'sticky', top: '1rem', maxHeight: 'calc(100vh - 2rem)', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Customer Context</h3>
              <button onClick={() => setSelectedCall(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem' }}>
              
              {/* Customer */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Customer</h4>
                {selectedCall.crm_parties ? (
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{selectedCall.crm_parties.display_name}</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14}/> {selectedCall.crm_parties.mobile || 'No Mobile'}</div>
                  </div>
                ) : (
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', color: 'var(--text-secondary)' }}>
                    Unknown Customer
                  </div>
                )}
              </div>

              {/* Communication Details */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Communication Event</h4>
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Direction</span>
                    <strong style={{ color: selectedCall.direction === 'INCOMING' ? 'var(--success)' : (selectedCall.direction === 'OUTGOING' ? 'var(--primary)' : 'inherit') }}>{selectedCall.direction}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Staff</span>
                    <strong>{selectedCall.app_users?.display_name || 'Operator not identified'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Date/Time</span>
                    <strong>{new Date(selectedCall.started_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Duration</span>
                    <strong>{selectedCall.duration_seconds} sec</strong>
                  </div>
                </div>
              </div>

              {/* Follow-up State */}
              <div style={{ marginBottom: '2rem' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Current Follow-up</h4>
                
                {selectedCall.openFollowUps && selectedCall.openFollowUps.length > 0 ? (
                  <>
                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{selectedCall.openFollowUps[0].follow_up_type} - {selectedCall.openFollowUps[0].reason}</div>
                      <div style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                        <span>Status: <span style={{ color: 'var(--warning)', fontWeight: 600 }}>{selectedCall.openFollowUps[0].status}</span></span>
                      </div>
                      <div style={{ fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>Assigned: {selectedCall.openFollowUps[0].app_users?.display_name || 'Unassigned'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '0.75rem', borderLeft: '3px solid var(--success)', background: 'rgba(34,197,94,0.1)', fontSize: '0.85rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Communication recorded — existing follow-up preserved.</strong>
                      The customer's call is recorded as communication activity. The call does not create a duplicate follow-up.
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', marginBottom: '0.75rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No Open Follow-up
                    </div>
                    <div style={{ padding: '0.75rem', borderLeft: '3px solid var(--primary)', background: 'rgba(59,130,246,0.1)', fontSize: '0.85rem' }}>
                      <strong style={{ display: 'block', marginBottom: '0.25rem' }}>Communication recorded — no automatic follow-up created.</strong>
                      The call is recorded as communication activity. No automatic follow-up was created.
                    </div>
                  </>
                )}
              </div>

              {/* Follow-up History */}
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Follow-up History</h4>
                {customerHistory.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {customerHistory.slice(0, 5).map(f => (
                      <div key={f.id} style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <div style={{ fontWeight: 500 }}>{f.follow_up_type}</div>
                        <div style={{ color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                          <span>{f.status}</span>
                          <span>{new Date(f.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                    {customerHistory.length > 5 && (
                      <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        +{customerHistory.length - 5} more records
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No history available.</div>
                )}
              </div>

            </div>
          </div>
        )}
        
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
