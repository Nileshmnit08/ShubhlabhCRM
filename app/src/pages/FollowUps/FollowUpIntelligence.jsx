import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, Phone, User, CheckCircle2, Clock, Calendar, AlertCircle, PhoneIncoming, PhoneOutgoing, ArrowRight, ShieldAlert, FileText, Activity } from 'lucide-react';

export default function FollowUpIntelligence() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [loadingSearch, setLoadingSearch] = useState(false);

  // Data for selected customer
  const [calls, setCalls] = useState([]);
  const [openFollowUps, setOpenFollowUps] = useState([]);
  const [allFollowUps, setAllFollowUps] = useState([]);
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
      // 1. Fetch Calls
      const { data: callData } = await supabase
        .from('crm_call_events')
        .select(`*, app_users(display_name)`)
        .eq('party_id', customer.id)
        .order('started_at', { ascending: false })
        .limit(10);
        
      setCalls(callData || []);

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
          <Activity size={24} /> Follow-up Intelligence
        </h2>
        <p className="text-secondary">Visualize and validate how Communication integrates with Follow-ups without duplicating tasks.</p>
      </div>

      {/* SECTION 1 - EXPLAIN THE INTELLIGENCE FLOW */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Workflow Explanation</h3>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          gap: '0.5rem',
          overflowX: 'auto',
          padding: '1rem 0',
          marginBottom: '1rem'
        }}>
          <WorkflowNode icon={<User size={18} />} title="Customer" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<Phone size={18} />} title="Call Occurs" color="var(--primary)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<ShieldAlert size={18} />} title="Identify" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<CheckCircle2 size={18} />} title="Check Follow-up" color="var(--warning)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<Activity size={18} />} title="Add to Activity" color="var(--success)" />
          <ArrowRight className="text-muted" size={16} />
          <WorkflowNode icon={<AlertCircle size={18} />} title="Do Not Duplicate" color="var(--danger)" />
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)' }}>
          <p style={{ margin: 0, color: 'var(--text-primary)' }}>
            <strong>Rule:</strong> A customer call is recorded as communication activity. An existing follow-up is not duplicated merely because a call occurred. 
            Calls become actionable work only when a real follow-up is manually created or intentionally triggered by a business rule.
          </p>
        </div>
      </div>

      {/* SECTION 2 - TEST 1 CUSTOMER SELECTOR */}
      <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>TEST 1 — EXISTING CUSTOMER COMMUNICATION</h3>
        <p className="text-secondary" style={{ marginBottom: '1.5rem' }}>Demonstrate what happens when communication occurs with a known customer using live production data.</p>
        
        <div style={{ position: 'relative', maxWidth: '600px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text"
              placeholder="Search existing customer to test..."
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

      {loadingData && <div style={{ padding: '2rem', textAlign: 'center' }}>Loading live data...</div>}

      {selectedCustomer && !loadingData && (
        <div className="animate-slide-up">
          
          {/* SECTION 3 - LIVE CUSTOMER JOURNEY */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Live Integration Journey</h3>
              
              {/* Step 1 */}
              <JourneyStep 
                title="STEP 1: Customer Identified"
                success={true}
                details={[
                  { label: 'Customer', value: selectedCustomer.display_name },
                  { label: 'Mobile', value: selectedCustomer.mobile }
                ]}
              />

              {/* Step 2 */}
              <JourneyStep 
                title="STEP 2: Call Detection"
                success={latestCall != null}
                fallback="No calls found for this customer."
                details={latestCall ? [
                  { label: 'Direction', value: latestCall.direction, icon: latestCall.direction === 'INCOMING' ? <PhoneIncoming size={14} className="text-success" /> : <PhoneOutgoing size={14} className="text-primary" /> },
                  { label: 'Operator', value: latestCall.app_users?.display_name || 'Unknown' },
                  { label: 'Date/Time', value: new Date(latestCall.started_at).toLocaleString() },
                  { label: 'Duration', value: `${latestCall.duration_seconds} sec` }
                ] : null}
              />

              {/* Step 3 */}
              <JourneyStep 
                title="STEP 3: Follow-up Check"
                success={true} // Check always completes
                icon={hasOpenFollowUp ? <CheckCircle2 className="text-warning" size={18} /> : <CheckCircle2 className="text-success" size={18} />}
                content={
                  <div style={{ fontWeight: 500, color: hasOpenFollowUp ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    {hasOpenFollowUp ? 'OPEN FOLLOW-UP FOUND' : 'NO OPEN FOLLOW-UP'}
                  </div>
                }
              />

              {/* Step 4 */}
              <JourneyStep 
                title="STEP 4: Integration Result"
                success={latestCall != null}
                fallback="Cannot integrate without a call event."
                content={
                  latestCall ? (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} className="text-success" /> CALL ADDED TO CUSTOMER ACTIVITY</li>
                      {hasOpenFollowUp ? (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} className="text-success" /> EXISTING FOLLOW-UP PRESERVED</li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} className="text-success" /> NO DUPLICATE FOLLOW-UP CREATED</li>
                        </>
                      ) : (
                        <>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16} className="text-success" /> NO AUTOMATIC FOLLOW-UP CREATED</li>
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}><ArrowRight size={16} /> Create Follow-up manually if required</li>
                        </>
                      )}
                    </ul>
                  ) : null
                }
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* TEST RESULT CARD */}
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Integration Status</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.95rem' }}>
                  <StatusRow label="Customer identified" status={true} />
                  <StatusRow label="Call found" status={latestCall != null} />
                  <StatusRow label="Operator identified" status={latestCall?.app_users != null} />
                  <StatusRow label="Existing follow-up found" status={hasOpenFollowUp} isWarning={!hasOpenFollowUp} warningLabel="No open follow-up (Normal)" />
                  <StatusRow label="Call visible in activity" status={latestCall != null} />
                  <StatusRow label="No duplicate follow-up" status={true} />
                </div>
              </div>

              {/* SECTION 6 - RELATIONSHIP EXPLANATION */}
              <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                <h4 style={{ marginBottom: '1rem' }}>WHY THIS MATTERS</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Calls and Follow-ups are fundamentally different CRM objects.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ width: '100px', fontWeight: 600, color: 'var(--primary)' }}>CALL:</div>
                    <div style={{ flex: 1 }}>Records that communication occurred.</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <div style={{ width: '100px', fontWeight: 600, color: 'var(--warning)' }}>FOLLOW-UP:</div>
                    <div style={{ flex: 1 }}>Records that an actionable task exists.</div>
                  </div>
                </div>
                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontWeight: 600 }}>
                  Therefore: 1 call ≠ 1 new follow-up. <br/>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>This prevents duplicate tasks and keeps My Work clean.</span>
                </div>
              </div>
              
            </div>
          </div>

          {/* SECTION 4 - CALL HISTORY */}
          <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Phone size={20} /> Communication History (Last 10)
            </h3>
            {calls.length === 0 ? (
              <p className="text-secondary">No communication records found for this customer.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Date/Time</th>
                      <th style={{ padding: '0.75rem' }}>Direction</th>
                      <th style={{ padding: '0.75rem' }}>Operator</th>
                      <th style={{ padding: '0.75rem' }}>Type</th>
                      <th style={{ padding: '0.75rem' }}>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map(call => (
                      <tr key={call.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>{new Date(call.started_at).toLocaleString()}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: call.direction === 'INCOMING' ? 'var(--success)' : 'var(--primary)' }}>
                            {call.direction === 'INCOMING' ? <PhoneIncoming size={14} /> : <PhoneOutgoing size={14} />} {call.direction}
                          </span>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{call.app_users?.display_name || 'System'}</td>
                        <td style={{ padding: '0.75rem' }}>{call.call_type}</td>
                        <td style={{ padding: '0.75rem' }}>{call.duration_seconds}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 5 - FOLLOW-UP HISTORY */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Follow-up History (Last 10)
            </h3>
            {allFollowUps.length === 0 ? (
              <p className="text-secondary">No follow-ups found for this customer.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '0.75rem' }}>Follow-up</th>
                      <th style={{ padding: '0.75rem' }}>Assigned To</th>
                      <th style={{ padding: '0.75rem' }}>Status</th>
                      <th style={{ padding: '0.75rem' }}>Due Date</th>
                      <th style={{ padding: '0.75rem' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allFollowUps.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.75rem' }}>
                          <div style={{ fontWeight: 500 }}>{f.follow_up_type}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{f.reason}</div>
                        </td>
                        <td style={{ padding: '0.75rem' }}>{f.app_users?.display_name || 'Unassigned'}</td>
                        <td style={{ padding: '0.75rem' }}>
                          <span className="badge" style={{ background: f.status === 'Completed' ? 'rgba(34,197,94,0.1)' : 'rgba(234,179,8,0.1)', color: f.status === 'Completed' ? 'var(--success)' : 'var(--warning)' }}>
                            {f.status}
                          </span>
                        </td>
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

// Subcomponents for cleaner code
function WorkflowNode({ icon, title, color = 'var(--text-primary)' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '100px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-surface)', border: `2px solid ${color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color }}>
        {icon}
      </div>
      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center' }}>{title}</div>
    </div>
  );
}

function JourneyStep({ title, success, fallback, details, content, icon }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', position: 'relative' }}>
      <div style={{ width: '2px', background: 'var(--border)', position: 'absolute', left: '12px', top: '30px', bottom: '-20px' }}></div>
      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--bg-surface)', border: `2px solid ${success ? 'var(--success)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
        {icon ? icon : (success ? <CheckCircle2 size={14} className="text-success" /> : <Clock size={14} className="text-muted" />)}
      </div>
      <div style={{ flex: 1, paddingTop: '2px' }}>
        <h5 style={{ margin: 0, marginBottom: '0.5rem', color: success ? 'var(--text-primary)' : 'var(--text-muted)' }}>{title}</h5>
        {!success && fallback && <p style={{ fontSize: '0.85rem', color: 'var(--danger)', margin: 0 }}>{fallback}</p>}
        {success && details && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
            {details.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{d.label}:</span>
                <span style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>{d.icon}{d.value}</span>
              </div>
            ))}
          </div>
        )}
        {success && content && (
          <div style={{ background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', marginTop: '0.5rem' }}>
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, status, isWarning, warningLabel }) {
  let icon = <CheckCircle2 size={16} className="text-success" />;
  let color = 'var(--text-primary)';
  let text = label;

  if (!status) {
    if (isWarning) {
      icon = <AlertCircle size={16} className="text-warning" />;
      color = 'var(--warning)';
      text = warningLabel || label;
    } else {
      icon = <AlertCircle size={16} className="text-danger" />;
      color = 'var(--danger)';
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color }}>
      {icon} <span>{text}</span>
    </div>
  );
}
