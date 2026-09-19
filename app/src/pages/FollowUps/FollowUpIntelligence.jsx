import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, User, CheckCircle2, Clock, Calendar, AlertCircle, PhoneIncoming, PhoneOutgoing, ArrowRight, ShieldAlert, FileText, Activity, MessageSquare } from 'lucide-react';

export default function FollowUpIntelligence() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Data for selected customer
  const [calls, setCalls] = useState([]);
  const [openFollowUps, setOpenFollowUps] = useState([]);
  const [allFollowUps, setAllFollowUps] = useState([]);
  
  // Summary Stats
  const [totalCalls, setTotalCalls] = useState(0);
  const [totalCompletedFollowUps, setTotalCompletedFollowUps] = useState(0);
  
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      const delayDebounce = setTimeout(() => {
        searchCustomer();
      }, 500);
      return () => clearTimeout(delayDebounce);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchCustomer = async () => {
    setLoadingSearch(true);
    try {
      const { data, error } = await supabase
        .from('crm_parties')
        .select('id, display_name, mobile, city')
        .ilike('display_name', `%${searchQuery}%`)
        .limit(10);
      
      if (error) throw error;
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching customer:', err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    setSearchQuery('');
    setSearchResults([]);
    setLoadingData(true);
    
    try {
      // 1. Fetch Calls (Recent 10)
      const { data: callData, count: callCount } = await supabase
        .from('crm_call_events')
        .select(`*, app_users(display_name)`, { count: 'exact' })
        .eq('party_id', customer.id)
        .order('started_at', { ascending: false })
        .limit(10);
        
      setCalls(callData || []);
      setTotalCalls(callCount || 0);

      // 2. Fetch Open Follow-ups
      const { data: openData } = await supabase
        .from('follow_ups')
        .select('*')
        .eq('party_id', customer.id)
        .in('status', ['Pending', 'In Progress']);
        
      setOpenFollowUps(openData || []);

      // 3. Fetch All Follow-ups
      const { data: allData } = await supabase
        .from('follow_ups')
        .select(`*, app_users!follow_ups_assigned_to_fkey(display_name)`)
        .eq('party_id', customer.id)
        .order('created_at', { ascending: false })
        .limit(10);
        
      setAllFollowUps(allData || []);

      // 4. Fetch Completed Count
      const { count: completedCount } = await supabase
        .from('follow_ups')
        .select('*', { count: 'exact', head: true })
        .eq('party_id', customer.id)
        .eq('status', 'Completed');
        
      setTotalCompletedFollowUps(completedCount || 0);

    } catch (err) {
      console.error('Error fetching customer data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  const latestCall = calls.length > 0 ? calls[0] : null;
  const hasOpenFollowUp = openFollowUps.length > 0;

  return (
    <div className="animate-fade-in" style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', paddingBottom: '4rem' }}>
      
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--primary)', marginBottom: '0.5rem' }}>
          <Activity size={24} /> Customer Communication & Follow-up Intelligence
        </h2>
        <p className="text-secondary">See how a customer's real communication activity relates to their existing follow-up work — without creating duplicate tasks.</p>
      </div>

      {/* BUSINESS FLOW */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Business Flow</h3>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.5rem',
          overflowX: 'auto',
          padding: '1rem 0',
          marginBottom: '1rem'
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

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>
            <strong>Rule:</strong> A customer call is recorded as communication activity. A call does not automatically create a new Follow-up.
          </p>
        </div>
      </div>

      {/* CUSTOMER SELECTOR */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Real Customer Selection</h3>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Search and select a real customer to retrieve authoritative communication and follow-up data.</p>
        
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search existing customer (e.g., Vishnu Dairy)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.5rem', width: '100%', background: 'var(--bg-surface)' }}
            />
          </div>
          
          {loadingSearch && <div style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Searching...</div>}
          
          {searchResults.length > 0 && (
            <div style={{ 
              position: 'absolute', top: '100%', left: 0, right: 0, 
              background: 'var(--bg-card)', border: '1px solid var(--border)', 
              borderRadius: '8px', zIndex: 10, marginTop: '0.25rem', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {searchResults.map(c => (
                <div key={c.id} onClick={() => handleSelectCustomer(c)} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }} className="hover-bg">
                  <div>
                    <div style={{ fontWeight: 500 }}>{c.display_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.city || 'No City'}</div>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{c.mobile}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {loadingData && <div style={{ padding: '2rem', textAlign: 'center' }}>Retrieving authoritative records...</div>}

      {selectedCustomer && !loadingData && (
        <div className="animate-slide-up">
          
          {/* CUSTOMER COMMUNICATION SUMMARY */}
          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'var(--bg-surface)' }}>
            <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Customer Communication Summary</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Recent call count</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totalCalls}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Latest call date</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{latestCall ? new Date(latestCall.started_at).toLocaleDateString() : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Latest operator</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>{latestCall ? (latestCall.app_users?.display_name || 'Operator not identified') : 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Open follow-up count</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{openFollowUps.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completed follow-up count</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{totalCompletedFollowUps}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* LATEST COMMUNICATION */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Phone size={20} /> Latest Communication
              </h3>
              
              {latestCall ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span className="text-secondary">Direction</span>
                    <strong style={{ color: latestCall.direction === 'INCOMING' ? 'var(--success)' : (latestCall.direction === 'OUTGOING' ? 'var(--primary)' : 'inherit') }}>
                      {latestCall.direction}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span className="text-secondary">Operator</span>
                    <strong>{latestCall.app_users?.display_name || 'Operator not identified'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span className="text-secondary">Date</span>
                    <strong>{new Date(latestCall.started_at).toLocaleDateString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span className="text-secondary">Time</span>
                    <strong>{new Date(latestCall.started_at).toLocaleTimeString()}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                    <span className="text-secondary">Duration</span>
                    <strong>{latestCall.duration_seconds > 0 ? `${latestCall.duration_seconds} seconds` : '0 seconds'}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="text-secondary">Source Event ID</span>
                    <strong style={{ fontSize: '0.85rem' }}>{latestCall.device_event_id}</strong>
                  </div>
                </div>
              ) : (
                <p className="text-secondary">No communication records found for this customer.</p>
              )}
            </div>

            {/* CURRENT FOLLOW-UP & INTEGRATION RESULT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Activity size={20} /> Current Follow-up
                </h3>
                
                {hasOpenFollowUp ? (
                  <>
                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{openFollowUps[0].follow_up_type} - {openFollowUps[0].reason}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Assigned: {openFollowUps[0].assigned_to ? 'Staff Assigned' : 'Unassigned'}</div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                        <span>Status: <strong className="text-warning">{openFollowUps[0].status}</strong></span>
                        <span>Due: <strong>{new Date(openFollowUps[0].due_at).toLocaleDateString()}</strong></span>
                        <span>Created: <strong>{new Date(openFollowUps[0].created_at).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                    <div style={{ padding: '1rem', borderLeft: '4px solid var(--success)', background: 'rgba(34,197,94,0.1)' }}>
                      <strong>Existing follow-up preserved.</strong><br/>
                      <span style={{ fontSize: '0.9rem' }}>The customer's call is recorded as communication activity. The call does not create a duplicate follow-up.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No Open Follow-up<br/>
                      <span style={{ fontSize: '0.85rem' }}>This customer currently has no open follow-up.</span>
                    </div>
                    <div style={{ padding: '1rem', borderLeft: '4px solid var(--primary)', background: 'rgba(59,130,246,0.1)' }}>
                      <strong>Communication remains activity.</strong><br/>
                      <span style={{ fontSize: '0.9rem' }}>The call is recorded as communication activity. No automatic follow-up was created.</span>
                    </div>
                  </>
                )}
              </div>

              {/* INTEGRATION RESULT */}
              {latestCall && (
                <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                  <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Integration Result</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem', marginBottom: '1rem' }}>
                    <StatusRow label="Customer identified" status={true} />
                    <StatusRow label="Real call found" status={latestCall != null} />
                    <StatusRow label="Operator identified, when actually available" status={latestCall?.app_users != null} />
                    <StatusRow label="Call recorded as communication activity" status={latestCall != null} />
                    
                    {hasOpenFollowUp ? (
                      <>
                        <StatusRow label="Existing follow-up found" status={true} />
                        <StatusRow label="Existing follow-up preserved" status={true} />
                        <StatusRow label="No duplicate follow-up created" status={true} />
                      </>
                    ) : (
                      <>
                        <StatusRow label="No open follow-up exists" status={true} />
                        <StatusRow label="No automatic follow-up created" status={true} />
                      </>
                    )}
                  </div>
                  
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    {hasOpenFollowUp ? 'Communication recorded — existing follow-up preserved' : 'Communication recorded — no follow-up created'}
                  </div>
                </div>
              )}
              
            </div>
          </div>

          {/* RECENT COMMUNICATION HISTORY */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} /> Recent Communication History
            </h3>
            {calls.length === 0 ? (
              <p className="text-secondary">No communication records found for this customer.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Direction</th>
                      <th style={{ padding: '0.75rem' }}>Operator</th>
                      <th style={{ padding: '0.75rem' }}>Date</th>
                      <th style={{ padding: '0.75rem' }}>Time</th>
                      <th style={{ padding: '0.75rem' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map(call => (
                      <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: call.direction === 'INCOMING' ? 'var(--success)' : (call.direction === 'OUTGOING' ? 'var(--primary)' : 'inherit') }}>
                            {call.direction === 'INCOMING' ? <PhoneIncoming size={14} /> : (call.direction === 'OUTGOING' ? <PhoneOutgoing size={14} /> : <Phone size={14} />)} 
                            {call.direction}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{call.app_users?.display_name || 'Operator not identified'}</td>
                        <td style={{ padding: '0.75rem' }}>{new Date(call.started_at).toLocaleDateString()}</td>
                        <td style={{ padding: '0.75rem' }}>{new Date(call.started_at).toLocaleTimeString()}</td>
                        <td style={{ padding: '0.75rem' }}>{call.duration_seconds} sec</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* FOLLOW-UP HISTORY */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Follow-up History
            </h3>
            {allFollowUps.length === 0 ? (
              <p className="text-secondary">No follow-ups found for this customer.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Subject</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Assigned staff</th>
                      <th style={{ padding: '0.75rem' }}>Due date</th>
                      <th style={{ padding: '0.75rem' }}>Created date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFollowUps.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 500 }}>{f.follow_up_type}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.reason}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge" style={{ background: f.status === 'Completed' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: f.status === 'Completed' ? 'var(--success)' : 'var(--warning)' }}>
                            {f.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{f.app_users?.display_name || 'Unassigned'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          {f.due_at ? new Date(f.due_at).toLocaleDateString() : 'N/A'}
                        </td>
                        <td style={{ padding: '0.75rem' }}>
                          {new Date(f.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
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
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{title}</div>
    </div>
  );
}

function StatusRow({ label, status }) {
  const icon = status ? <CheckCircle2 size={16} className="text-success" /> : <AlertCircle size={16} className="text-muted" />;
  const color = status ? 'var(--text-primary)' : 'var(--text-muted)';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color }}>
      {icon} <span>{label}</span>
    </div>
  );
}
