import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Users, UserX, AlertTriangle, RefreshCw, ChevronRight, Activity } from 'lucide-react';

export default function CommunicationDashboard() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(null);

  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');

  const [team, setTeam] = useState([]);
  
  // Data States
  const [staffSummaryRows, setStaffSummaryRows] = useState([]);
  const [customerSummaryRows, setCustomerSummaryRows] = useState([]);
  const [unknownSummaryRows, setUnknownSummaryRows] = useState([]);
  const [repeatedSummaryRows, setRepeatedSummaryRows] = useState([]);
  
  const [customerMap, setCustomerMap] = useState({});

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchTeam();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [dateFilter, customStart, customEnd, userProfile]);

  const fetchTeam = async () => {
    const { data } = await supabase.from('app_users').select('id, display_name, email, role').eq('is_active', true);
    if (data) setTeam(data);
  };

  const getDateRange = () => {
    const now = new Date();
    let start = new Date(now);
    let end = new Date(now);
    
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    if (dateFilter === 'yesterday') {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    } else if (dateFilter === 'week') {
      const day = start.getDay() || 7; 
      start.setDate(start.getDate() - day + 1);
    } else if (dateFilter === 'month') {
      start.setDate(1);
    } else if (dateFilter === 'custom') {
      if (customStart) start = new Date(customStart + 'T00:00:00');
      if (customEnd) end = new Date(customEnd + 'T23:59:59');
    }
    
    return { start, end };
  };

  const fetchData = async () => {
    setLoading(true);
    setQueryError(null);
    try {
      const { start, end } = getDateRange();
      
      const startDateStr = start.toISOString().split('T')[0];
      const endDateStr = end.toISOString().split('T')[0];

      // Fetch Time-Series views for the date range
      const [staffRes, repeatedRes, customerRes, unknownRes] = await Promise.all([
        supabase.from('v_staff_communication_summary')
          .select('*')
          .gte('reporting_date', startDateStr)
          .lte('reporting_date', endDateStr),
        supabase.from('v_repeated_communication_summary')
          .select('*')
          .gte('reporting_date', startDateStr)
          .lte('reporting_date', endDateStr),
        // Static velocity tables (all time aggregations)
        supabase.from('v_customer_communication_summary')
          .select('*'),
        supabase.from('v_unknown_communication_summary')
          .select('*')
      ]);

      if (staffRes.error) throw staffRes.error;
      if (repeatedRes.error) throw repeatedRes.error;
      if (customerRes.error) throw customerRes.error;
      if (unknownRes.error) throw unknownRes.error;

      setStaffSummaryRows(staffRes.data || []);
      setRepeatedSummaryRows(repeatedRes.data || []);
      setCustomerSummaryRows(customerRes.data || []);
      setUnknownSummaryRows(unknownRes.data || []);

      // Batch load customer names for the customer table and repeated table
      const partyIds = new Set([
        ...(customerRes.data || []).map(r => r.party_id),
        ...(repeatedRes.data || []).map(r => r.party_id).filter(Boolean)
      ]);

      if (partyIds.size > 0) {
        const { data: partiesData, error: partiesErr } = await supabase
          .from('crm_parties')
          .select('id, display_name')
          .in('id', Array.from(partyIds));
        
        if (!partiesErr && partiesData) {
          const map = {};
          partiesData.forEach(p => { map[p.id] = p.display_name; });
          setCustomerMap(map);
        }
      }

    } catch (err) {
      console.error(err);
      setQueryError(err.message || 'Communication data could not be loaded.');
      // Empty the states on error to prevent fake data
      setStaffSummaryRows([]);
      setRepeatedSummaryRows([]);
      setCustomerSummaryRows([]);
      setUnknownSummaryRows([]);
    } finally {
      setLoading(false);
    }
  };

  if (userProfile?.role !== 'Admin') {
    return (
      <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
        <Activity size={48} className="text-secondary" style={{margin: '0 auto 1rem', opacity: 0.5}} />
        <h2>Admin Access Required</h2>
        <p className="text-secondary">You do not have permission to view the Communication Dashboard.</p>
      </div>
    );
  }

  // --- Filter the Time-Series Data ---
  const filteredStaffRows = staffFilter === 'all' 
    ? staffSummaryRows 
    : staffSummaryRows.filter(r => r.staff_id === staffFilter);
    
  const filteredRepeatedRows = staffFilter === 'all'
    ? repeatedSummaryRows
    : repeatedSummaryRows.filter(r => r.staff_id === staffFilter);

  // Aggregating Top Summary Cards
  const summary = {
    totalCalls: filteredStaffRows.reduce((acc, r) => acc + (r.total_calls || 0), 0),
    incoming: filteredStaffRows.reduce((acc, r) => acc + (r.incoming_calls || 0), 0),
    outgoing: filteredStaffRows.reduce((acc, r) => acc + (r.outgoing_calls || 0), 0),
    missed: filteredStaffRows.reduce((acc, r) => acc + (r.missed_calls || 0), 0),
    talkSeconds: filteredStaffRows.reduce((acc, r) => acc + (r.total_talk_seconds || 0), 0),
    known: filteredStaffRows.reduce((acc, r) => acc + (r.known_customer_calls || 0), 0),
    unknown: filteredStaffRows.reduce((acc, r) => acc + (r.unknown_calls || 0), 0),
    ambiguous: filteredStaffRows.reduce((acc, r) => acc + (r.ambiguous_calls || 0), 0),
    repeatedContacts: filteredStaffRows.reduce((acc, r) => acc + (r.repeated_contacts || 0), 0)
  };

  // Grouping Staff Table (aggregating multiple days into one row per staff)
  const staffAggregates = {};
  filteredStaffRows.forEach(row => {
    if (!staffAggregates[row.staff_id]) {
      staffAggregates[row.staff_id] = {
        staff_id: row.staff_id,
        total_calls: 0,
        incoming: 0,
        outgoing: 0,
        missed: 0,
        talk: 0,
        known: 0,
        unknown: 0,
        ambiguous: 0,
        repeated: 0
      };
    }
    const agg = staffAggregates[row.staff_id];
    agg.total_calls += (row.total_calls || 0);
    agg.incoming += (row.incoming_calls || 0);
    agg.outgoing += (row.outgoing_calls || 0);
    agg.missed += (row.missed_calls || 0);
    agg.talk += (row.total_talk_seconds || 0);
    agg.known += (row.known_customer_calls || 0);
    agg.unknown += (row.unknown_calls || 0);
    agg.ambiguous += (row.ambiguous_calls || 0);
    agg.repeated += (row.repeated_contacts || 0);
  });
  
  const staffTableData = Object.values(staffAggregates).map(agg => {
    const staffInfo = team.find(t => t.id === agg.staff_id);
    return { ...agg, display_name: staffInfo?.display_name || 'Unknown Staff' };
  });

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
    <div className="animate-fade-in" style={{maxWidth: '1440px', margin: '0 auto', paddingBottom: '80px'}}>
      
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <PhoneCall size={28} className="text-primary" />
            Communication
          </h1>
          <p className="text-secondary" style={{marginTop: '0.5rem'}}>Field staff call activity</p>
        </div>
      </div>

      {queryError && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--danger-alpha)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)' }}>
          <strong>Communication data could not be loaded.</strong> {queryError}
          <div style={{marginTop: '0.5rem'}}>
             <button className="btn btn-secondary btn-sm" onClick={fetchData}>Retry</button>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem'}}>Date Range</label>
          <select className="form-control" value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{minWidth: '150px'}}>
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>

        {dateFilter === 'custom' && (
          <>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem'}}>From</label>
              <input type="date" className="form-control" value={customStart} onChange={e => setCustomStart(e.target.value)} />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem'}}>To</label>
              <input type="date" className="form-control" value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
            </div>
          </>
        )}

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem'}}>Staff Member</label>
          <select className="form-control" value={staffFilter} onChange={e => setStaffFilter(e.target.value)} style={{minWidth: '200px'}}>
            <option value="all">All Staff</option>
            {team.map(t => (
              <option key={t.id} value={t.id}>{t.display_name || t.email}</option>
            ))}
          </select>
        </div>
        
        <div style={{marginLeft: 'auto'}}>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneCall size={16} /> Total Calls
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary)'}}>{loading ? '-' : summary.totalCalls}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneIncoming size={16} /> Incoming
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.incoming}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneOutgoing size={16} /> Outgoing
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.outgoing}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneMissed size={16} /> Missed Calls
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.missed}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Clock size={16} /> Talk Time
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : formatDuration(summary.talkSeconds)}</div>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
        <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--success)'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Users size={16} /> Known Customers
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.known}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--warning)'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <UserX size={16} /> Unknown Numbers
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.unknown}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--danger)'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <AlertTriangle size={16} /> Ambiguous Numbers
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.ambiguous}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.5rem', borderLeft: '4px solid var(--info)'}}>
          <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <RefreshCw size={16} /> Repeated Communication
          </div>
          <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.repeatedContacts}</div>
          <div style={{fontSize: '0.85rem'}} className="text-secondary">distinct numbers contacted >1 time today</div>
        </div>
      </div>

      {/* STAFF SUMMARY */}
      <h3 style={{marginBottom: '1rem'}}>Staff Summary</h3>
      <div className="glass-panel" style={{padding: '0', overflowX: 'auto', marginBottom: '2rem'}}>
        {staffTableData.length === 0 && !loading && !queryError && (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No communication recorded for this period.
          </div>
        )}
        {staffTableData.length > 0 && (
          <table style={{width: '100%', minWidth: '900px', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Staff</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Calls</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Incoming</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Outgoing</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Missed</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Talk Time</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Known</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Unknown</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Repeated</th>
              </tr>
            </thead>
            <tbody>
              {staffTableData.map(staff => (
                <tr key={staff.staff_id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '1.25rem', fontWeight: 600}}>{staff.display_name}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>{staff.total_calls}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{staff.incoming}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{staff.outgoing}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{staff.missed}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{formatDuration(staff.talk)}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{staff.known}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{staff.unknown}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center', color: staff.repeated > 0 ? 'var(--info)' : 'inherit', fontWeight: staff.repeated > 0 ? 600 : 'normal'}}>{staff.repeated}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* REPEATED COMMUNICATION */}
      <h3 style={{marginBottom: '1rem'}}>Repeated Communication (In Period)</h3>
      <div className="glass-panel" style={{padding: '0', overflowX: 'auto', marginBottom: '2rem'}}>
        {filteredRepeatedRows.length === 0 && !loading && !queryError && (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No communication matches the selected filters.
          </div>
        )}
        {filteredRepeatedRows.length > 0 && (
          <table style={{width: '100%', minWidth: '900px', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Staff</th>
                <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Customer / Phone</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Date</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Call Count</th>
                <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Talk Time</th>
                <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>First Call</th>
                <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Last Call</th>
              </tr>
            </thead>
            <tbody>
              {filteredRepeatedRows.map((row, idx) => {
                const staffInfo = team.find(t => t.id === row.staff_id);
                return (
                <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '1.25rem'}}>{staffInfo?.display_name || 'Unknown Staff'}</td>
                  <td style={{padding: '1.25rem', fontWeight: 600}}>
                    {row.party_id ? (
                      <Link to={`/customers/${row.party_id}`} style={{color: 'var(--primary)', textDecoration: 'none'}}>
                         {customerMap[row.party_id] || 'Unknown Customer'}
                      </Link>
                    ) : (
                       <span>{row.normalized_phone}</span>
                    )}
                  </td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{row.reporting_date}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center', fontWeight: 700}}>{row.call_count}</td>
                  <td style={{padding: '1.25rem', textAlign: 'center'}}>{formatDuration(row.total_duration_seconds)}</td>
                  <td style={{padding: '1.25rem'}}>{formatDate(row.first_call_at)}</td>
                  <td style={{padding: '1.25rem'}}>{formatDate(row.last_call_at)}</td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      <div style={{display: 'flex', gap: '2rem', flexWrap: 'wrap'}}>
        
        {/* CUSTOMER COMMUNICATION */}
        <div style={{flex: '1 1 500px'}}>
          <h3 style={{marginBottom: '1rem'}}>Known Customers (All Time Velocity)</h3>
          <div className="glass-panel" style={{padding: '0', overflowX: 'auto'}}>
            {customerSummaryRows.length === 0 && !loading && !queryError && (
              <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                No customers contacted.
              </div>
            )}
            {customerSummaryRows.length > 0 && (
              <table style={{width: '100%', minWidth: '700px', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                    <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Customer</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Calls</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Today</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>7 Days</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Staff Count</th>
                    <th style={{padding: '1rem', textAlign: 'right', fontWeight: 600}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSummaryRows.slice(0, 50).map((row) => (
                    <tr key={row.party_id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '1rem', fontWeight: 600}}>{customerMap[row.party_id] || 'Loading...'}</td>
                      <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{row.total_calls}</td>
                      <td style={{padding: '1rem', textAlign: 'center', color: row.calls_today > 0 ? 'var(--primary)' : 'inherit'}}>{row.calls_today}</td>
                      <td style={{padding: '1rem', textAlign: 'center'}}>{row.calls_last_7_days}</td>
                      <td style={{padding: '1rem', textAlign: 'center'}}>{row.distinct_staff_count}</td>
                      <td style={{padding: '1rem', textAlign: 'right'}}>
                        <Link to={`/customers/${row.party_id}`} className="btn btn-outline btn-sm">
                          Profile <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* UNKNOWN COMMUNICATION */}
        <div style={{flex: '1 1 500px'}}>
          <h3 style={{marginBottom: '1rem'}}>Unknown Numbers (All Time Velocity)</h3>
          <div className="glass-panel" style={{padding: '0', overflowX: 'auto'}}>
            {unknownSummaryRows.length === 0 && !loading && !queryError && (
              <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                No unknown numbers contacted.
              </div>
            )}
            {unknownSummaryRows.length > 0 && (
              <table style={{width: '100%', minWidth: '700px', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                    <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Masked Phone</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Calls</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Today</th>
                    <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>7 Days</th>
                    <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>First Seen</th>
                    <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Last Seen</th>
                  </tr>
                </thead>
                <tbody>
                  {unknownSummaryRows.slice(0, 50).map((row, idx) => (
                    <tr key={idx} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '1rem', fontWeight: 600}}>{row.masked_phone}</td>
                      <td style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>{row.total_calls}</td>
                      <td style={{padding: '1rem', textAlign: 'center', color: row.calls_today > 0 ? 'var(--primary)' : 'inherit'}}>{row.calls_today}</td>
                      <td style={{padding: '1rem', textAlign: 'center'}}>{row.calls_last_7_days}</td>
                      <td style={{padding: '1rem'}}>{formatDate(row.first_seen_at)}</td>
                      <td style={{padding: '1rem'}}>{formatDate(row.last_seen_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        
      </div>
      
    </div>
  );
}
