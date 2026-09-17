import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AuthContext } from '../AuthContext';
import { PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, Users, UserX, AlertTriangle, RefreshCw, ChevronRight, Activity, Search, X } from 'lucide-react';

export default function CommunicationDashboard() {
  const { userProfile } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(null);

  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'started_at', direction: 'desc' });
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [team, setTeam] = useState([]);
  
  // Data States
  const [calls, setCalls] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [summary, setSummary] = useState({
    totalCalls: 0,
    incoming: 0,
    outgoing: 0,
    missed: 0,
    talkSeconds: 0,
    known: 0,
    unknown: 0,
  });

  // Identify Modal State
  const [identifyModal, setIdentifyModal] = useState({ open: false, call: null, partyName: '', partyId: '' });
  const [customers, setCustomers] = useState([]);
  const [identifying, setIdentifying] = useState(false);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchTeam();
      fetchCustomers();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      setPage(1); // reset to page 1 on filter change
    }
  }, [dateFilter, customStart, customEnd, staffFilter, searchTerm, sortConfig]);

  useEffect(() => {
    if (userProfile?.role === 'Admin') {
      fetchData();
    }
  }, [dateFilter, customStart, customEnd, userProfile, staffFilter, searchTerm, sortConfig, page]);

  const fetchTeam = async () => {
    const { data } = await supabase.from('app_users').select('id, display_name, email, role').eq('is_active', true);
    if (data) setTeam(data);
  };

  const fetchCustomers = async () => {
    const { data } = await supabase.from('crm_parties').select('id, display_name, mobile').order('display_name');
    if (data) setCustomers(data);
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
      const startDateIso = start.toISOString();
      const endDateIso = end.toISOString();

      let query = supabase
        .from('v_crm_call_events_enriched')
        .select('*', { count: 'exact' })
        .gte('started_at', startDateIso)
        .lte('started_at', endDateIso);

      if (staffFilter !== 'all') {
        query = query.eq('staff_id', staffFilter);
      }
      
      if (searchTerm) {
        query = query.or(`party_name.ilike.%${searchTerm}%,staff_name.ilike.%${searchTerm}%,normalized_phone.ilike.%${searchTerm}%`);
      }

      // Fetch summary statistics for the exact filtered dataset
      let summaryQuery = supabase
        .from('v_crm_call_events_enriched')
        .select('direction, call_type, duration_seconds, party_id')
        .gte('started_at', startDateIso)
        .lte('started_at', endDateIso);

      if (staffFilter !== 'all') summaryQuery = summaryQuery.eq('staff_id', staffFilter);
      if (searchTerm) summaryQuery = summaryQuery.or(`party_name.ilike.%${searchTerm}%,staff_name.ilike.%${searchTerm}%,normalized_phone.ilike.%${searchTerm}%`);

      const { data: allData, error: summaryErr } = await summaryQuery;
      if (summaryErr) throw summaryErr;

      let inc = 0, out = 0, mis = 0, talk = 0, kn = 0, unkn = 0;
      allData.forEach(r => {
        if (r.direction === 'INCOMING') inc++;
        if (r.direction === 'OUTGOING') out++;
        if (r.call_type === 'MISSED') mis++;
        talk += (r.duration_seconds || 0);
        if (r.party_id) kn++; else unkn++;
      });

      setSummary({
        totalCalls: allData.length,
        incoming: inc,
        outgoing: out,
        missed: mis,
        talkSeconds: talk,
        known: kn,
        unknown: unkn
      });

      // Pagination and Sorting
      // Handle nulls correctly for sorting
      if (sortConfig.key === 'party_id') {
         query = query.order('party_id', { ascending: sortConfig.direction === 'asc', nullsFirst: sortConfig.direction === 'asc' });
      } else {
         query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'asc' });
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      
      if (error) throw error;
      setCalls(data || []);
      setTotalCount(count || 0);

    } catch (err) {
      console.error(err);
      setQueryError(err.message || 'Communication data could not be loaded.');
      setCalls([]);
    } finally {
      setLoading(false);
    }
  };

  const handleIdentifySubmit = async (e) => {
    e.preventDefault();
    if (!identifyModal.call) return;
    setIdentifying(true);
    try {
      const { data, error } = await supabase.rpc('identify_unknown_number', {
        p_norm_phone: identifyModal.call.normalized_phone,
        p_party_id: identifyModal.partyId || null,
        p_party_name: identifyModal.partyName || null
      });

      if (error) throw error;

      // Close modal and refresh data
      setIdentifyModal({ open: false, call: null, partyName: '', partyId: '' });
      fetchData();
      fetchCustomers(); // Refresh customers in case a new one was created
    } catch (err) {
      console.error(err);
      alert('Failed to identify number: ' + err.message);
    } finally {
      setIdentifying(false);
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
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatTime = (isoStr) => {
     if (!isoStr) return '-';
     const d = new Date(isoStr);
     return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  const { start: displayStart, end: displayEnd } = getDateRange();
  const dateDisplay = `${displayStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} - ${displayEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="animate-fade-in" style={{maxWidth: '1440px', margin: '0 auto', paddingBottom: '80px'}}>
      
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <PhoneCall size={28} className="text-primary" />
            Communication Log
          </h1>
          <p className="text-secondary" style={{marginTop: '0.5rem'}}>Authoritative record of all field staff communications</p>
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
      <div className="glass-panel" style={{padding: '1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'flex-end'}}>
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
        
        <div style={{flex: '1', minWidth: '200px'}}>
          <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.85rem'}}>Search</label>
          <div style={{position: 'relative'}}>
            <Search size={16} className="text-secondary" style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)'}} />
            <input 
              type="text" 
              className="form-control" 
              placeholder="Name or phone..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)}
              style={{paddingLeft: '35px', width: '100%'}}
            />
          </div>
        </div>

        <div>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'spin' : ''} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      {/* ACTIVE FILTER DISPLAY */}
      <div style={{marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap'}}>
         <span className="badge" style={{background: 'var(--primary-alpha)', color: 'var(--primary)', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px'}}>
           {dateFilter === 'today' ? 'TODAY: ' : dateFilter === 'yesterday' ? 'YESTERDAY: ' : 'DATE: '} 
           {dateDisplay} (00:00 - 23:59)
         </span>
         {staffFilter !== 'all' && (
            <span className="badge" style={{background: 'var(--bg-surface-hover)', padding: '0.5rem 1rem', fontSize: '0.9rem', borderRadius: '20px', border: '1px solid var(--border)'}}>
              Staff: {team.find(t => t.id === staffFilter)?.display_name}
            </span>
         )}
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
        <div className="glass-panel" style={{padding: '1.25rem'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneCall size={14} /> Total Calls
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary)'}}>{loading ? '-' : summary.totalCalls}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.25rem'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneIncoming size={14} /> Incoming
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.incoming}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.25rem'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <PhoneOutgoing size={14} /> Outgoing
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.outgoing}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.25rem'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Clock size={14} /> Talk Time
          </div>
          <div style={{fontSize: '1.5rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : formatDuration(summary.talkSeconds)}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.25rem', borderLeft: '3px solid var(--success)'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <Users size={14} /> Known
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.known}</div>
        </div>
        <div className="glass-panel" style={{padding: '1.25rem', borderLeft: '3px solid var(--warning)'}}>
          <div className="text-secondary" style={{fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <UserX size={14} /> Unknown
          </div>
          <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{loading ? '-' : summary.unknown}</div>
        </div>
      </div>

      {/* SORT CONTROLS */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
         <h3 style={{margin: 0}}>Call Records ({totalCount})</h3>
         <div>
           <select 
             className="form-control" 
             style={{width: '200px'}}
             value={`${sortConfig.key}|${sortConfig.direction}`} 
             onChange={e => {
               const [k, d] = e.target.value.split('|');
               setSortConfig({ key: k, direction: d });
             }}
           >
             <option value="started_at|desc">Date — Newest First</option>
             <option value="started_at|asc">Date — Oldest First</option>
             <option value="party_name|asc">Name — A to Z</option>
             <option value="party_name|desc">Name — Z to A</option>
             <option value="party_id|asc">Unknown First</option>
             <option value="party_id|desc">Known First</option>
             <option value="normalized_phone|asc">Mobile Number</option>
             <option value="duration_seconds|desc">Duration — Longest First</option>
           </select>
         </div>
      </div>

      {/* DETAILED CALL TABLE */}
      <div className="glass-panel" style={{padding: '0', overflowX: 'auto', marginBottom: '2rem'}}>
        {calls.length === 0 && !loading && !queryError && (
          <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
            No communication recorded for this period.
          </div>
        )}
        {calls.length > 0 && (
          <table style={{width: '100%', minWidth: '1000px', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Date & Time</th>
                <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Staff</th>
                <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Customer / Person</th>
                <th style={{padding: '1rem', textAlign: 'left', fontWeight: 600}}>Mobile Number</th>
                <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Direction</th>
                <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Duration</th>
                <th style={{padding: '1rem', textAlign: 'center', fontWeight: 600}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {calls.map(call => (
                <tr key={call.id} style={{borderBottom: '1px solid var(--border)'}}>
                  <td style={{padding: '1rem', whiteSpace: 'nowrap'}}>
                     <div style={{fontWeight: 600}}>{formatDate(call.started_at)}</div>
                     <div className="text-secondary" style={{fontSize: '0.85rem'}}>{formatTime(call.started_at)}</div>
                  </td>
                  <td style={{padding: '1rem'}}>{call.staff_name || 'Unknown Staff'}</td>
                  <td style={{padding: '1rem', fontWeight: 600}}>
                    {call.party_id ? (
                      <Link to={`/customers/${call.party_id}`} style={{color: 'var(--primary)', textDecoration: 'none'}}>
                         {call.party_name || 'Unknown Customer'}
                      </Link>
                    ) : (
                       <span style={{color: 'var(--warning)'}}>Unknown</span>
                    )}
                  </td>
                  <td style={{padding: '1rem', fontFamily: 'monospace', fontSize: '1.05rem'}}>{call.display_phone}</td>
                  <td style={{padding: '1rem', textAlign: 'center'}}>
                     {call.direction === 'INCOMING' && <span style={{color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'}}><PhoneIncoming size={14}/> In</span>}
                     {call.direction === 'OUTGOING' && <span style={{color: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem'}}><PhoneOutgoing size={14}/> Out</span>}
                     {call.call_type === 'MISSED' && <span style={{color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', marginTop: '0.25rem'}}><PhoneMissed size={14}/> Missed</span>}
                  </td>
                  <td style={{padding: '1rem', textAlign: 'center'}}>{formatDuration(call.duration_seconds)}</td>
                  <td style={{padding: '1rem', textAlign: 'center'}}>
                    {!call.party_id && (
                       <button className="btn btn-outline btn-sm" onClick={() => setIdentifyModal({ open: true, call, partyName: '', partyId: '' })}>
                          Identify Number
                       </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      {totalPages > 1 && (
         <div style={{display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center', marginBottom: '2rem'}}>
            <button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn btn-secondary" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
         </div>
      )}

      {/* IDENTIFY MODAL */}
      {identifyModal.open && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div className="glass-panel animate-scale-in" style={{width: '90%', maxWidth: '500px', padding: '2rem', position: 'relative'}}>
            <button 
              style={{position: 'absolute', top: '1rem', right: '1rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}
              onClick={() => setIdentifyModal({open: false, call: null})}
            ><X size={20}/></button>
            
            <h2 style={{marginTop: 0}}>Identify Unknown Number</h2>
            <p className="text-secondary">Number: <strong style={{fontFamily: 'monospace', color: 'var(--text-primary)'}}>{identifyModal.call?.display_phone}</strong></p>
            
            <form onSubmit={handleIdentifySubmit} style={{marginTop: '1.5rem'}}>
               <div style={{marginBottom: '1rem'}}>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Link to Existing Customer</label>
                  <select 
                    className="form-control" 
                    value={identifyModal.partyId}
                    onChange={e => setIdentifyModal({...identifyModal, partyId: e.target.value, partyName: ''})}
                    style={{width: '100%'}}
                  >
                     <option value="">-- Create New Customer instead --</option>
                     {customers.map(c => (
                       <option key={c.id} value={c.id}>{c.display_name} {c.mobile ? `(${c.mobile})` : ''}</option>
                     ))}
                  </select>
               </div>

               {!identifyModal.partyId && (
                 <div style={{marginBottom: '1rem'}}>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 600}}>Or Create New Customer Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="E.g. Vishnu Enterprises" 
                      required 
                      value={identifyModal.partyName}
                      onChange={e => setIdentifyModal({...identifyModal, partyName: e.target.value})}
                      style={{width: '100%'}}
                    />
                 </div>
               )}

               <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
                 <button type="button" className="btn btn-secondary" onClick={() => setIdentifyModal({open: false, call: null})}>Cancel</button>
                 <button type="submit" className="btn btn-primary" disabled={identifying}>
                    {identifying ? 'Processing...' : 'Identify & Link'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}
