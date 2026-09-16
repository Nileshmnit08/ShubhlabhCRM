import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { AuthContext } from '../../AuthContext';
import { LanguageContext } from '../../LanguageContext';
import { Clock, Users, Calendar, Activity, CheckCircle, ChevronRight, User, Search, MapPin, ClipboardList, Briefcase, FileText } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function FieldActivityDashboard() {
  const { userProfile } = useContext(AuthContext);
  const { t } = useContext(LanguageContext);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState(null);
  const [activities, setActivities] = useState([]);
  const [team, setTeam] = useState([]);
  
  const [dateFilter, setDateFilter] = useState('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [staffFilter, setStaffFilter] = useState('all');
  
  const [selectedStaffDetail, setSelectedStaffDetail] = useState(null);

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
    try {
      setQueryError(null);
      const { start, end } = getDateRange();
      
      const { data, error } = await supabase
        .from('v_field_staff_activity_timeline')
        .select('*')
        .gte('activity_time', start.toISOString())
        .lte('activity_time', end.toISOString())
        .order('activity_time', { ascending: false });

      if (error) {
        console.error("Query failed: ", error);
        setQueryError(error.message || 'Database query failed');
        setActivities([]);
      } else {
        setActivities(data || []);
      }
    } catch (err) {
      console.error(err);
      setQueryError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (userProfile?.role !== 'Admin') {
    return (
      <div className="glass-panel" style={{padding: '3rem', textAlign: 'center'}}>
        <Activity size={48} className="text-secondary" style={{margin: '0 auto 1rem', opacity: 0.5}} />
        <h2>Admin Access Required</h2>
        <p className="text-secondary">You do not have permission to view the Field Activity module.</p>
      </div>
    );
  }

  // Derived metrics
  const filteredActivities = staffFilter === 'all' 
    ? activities 
    : activities.filter(a => a.staff_id === staffFilter);

  const totalVisits = filteredActivities.filter(a => a.activity_type === 'Visit').length;
  const totalReqs = filteredActivities.filter(a => a.activity_type === 'Requirement').length;
  const totalFollowUps = filteredActivities.filter(a => a.activity_type === 'Follow-up').length;
  const totalInteractions = filteredActivities.filter(a => a.activity_type === 'Interaction').length;
  const activeStaffIds = new Set(activities.map(a => a.staff_id));

  // Staff-wise Grouping
  const staffSummary = team.map(member => {
    const memberActs = activities.filter(a => a.staff_id === member.id);
    const lastAct = memberActs[0]; // ordered desc
    return {
      ...member,
      visits: memberActs.filter(a => a.activity_type === 'Visit').length,
      requirements: memberActs.filter(a => a.activity_type === 'Requirement').length,
      followups: memberActs.filter(a => a.activity_type === 'Follow-up').length,
      interactions: memberActs.filter(a => a.activity_type === 'Interaction').length,
      total: memberActs.length,
      lastActivityTime: lastAct ? new Date(lastAct.activity_time) : null
    };
  }).filter(m => m.total > 0 || staffFilter === m.id);

  const renderTimelineIcon = (type) => {
    switch(type) {
      case 'Visit': return <MapPin size={16} className="text-primary" />;
      case 'Requirement': return <ClipboardList size={16} className="text-warning" />;
      case 'Follow-up': return <CheckCircle size={16} className="text-success" />;
      default: return <FileText size={16} className="text-secondary" />;
    }
  };

  const handleEntityClick = (activity) => {
    if (activity.party_id) {
      navigate(`/customers/${activity.party_id}`);
    }
  };

  return (
    <div className="animate-fade-in" style={{maxWidth: '1200px', margin: '0 auto', paddingBottom: '80px'}}>
      
      <div className="page-header" style={{marginBottom: '2rem'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
            <Activity size={28} className="text-primary" />
            Field Activity
          </h1>
          <p className="text-secondary" style={{marginTop: '0.5rem'}}>Factual activity logs and timeline across field staff.</p>
        </div>
      </div>

      {queryError && (
        <div className="alert alert-danger" style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--danger-alpha)', color: 'var(--danger)', borderRadius: '8px', border: '1px solid var(--danger)' }}>
          <strong>Error loading activity data:</strong> {queryError}
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
          <select className="form-control" value={staffFilter} onChange={e => {
            setStaffFilter(e.target.value);
            if (e.target.value !== 'all') {
              const staff = team.find(t => t.id === e.target.value);
              setSelectedStaffDetail(staff);
            } else {
              setSelectedStaffDetail(null);
            }
          }} style={{minWidth: '200px'}}>
            <option value="all">All Staff</option>
            {team.map(t => (
              <option key={t.id} value={t.id}>{t.display_name || t.email}</option>
            ))}
          </select>
        </div>
        
        <div style={{marginLeft: 'auto'}}>
          <button className="btn btn-secondary" onClick={fetchData} disabled={loading}>
            <Clock size={16} /> {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {!selectedStaffDetail ? (
        <>
          {/* TEAM SUMMARY */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'}}>
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Staff Active</div>
              <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0', color: 'var(--primary)'}}>{activeStaffIds.size}</div>
            </div>
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Total Visits</div>
              <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalVisits}</div>
            </div>
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Requirements</div>
              <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalReqs}</div>
            </div>
            <div className="glass-panel" style={{padding: '1.5rem'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Follow-ups Done</div>
              <div style={{fontSize: '2rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalFollowUps}</div>
            </div>
          </div>

          {/* STAFF-WISE LIST */}
          <h3 style={{marginBottom: '1rem'}}>Staff-wise Summary</h3>
          <div className="glass-panel" style={{padding: '0', overflow: 'hidden'}}>
            {staffSummary.length === 0 && !loading && (
              <div style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                No activity recorded for this period.
              </div>
            )}
            {staffSummary.length > 0 && (
              <table style={{width: '100%', borderCollapse: 'collapse'}}>
                <thead>
                  <tr style={{borderBottom: '1px solid var(--border)', background: 'var(--bg-surface-hover)'}}>
                    <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Staff Member</th>
                    <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Visits</th>
                    <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Requirements</th>
                    <th style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>Follow-ups</th>
                    <th style={{padding: '1.25rem', textAlign: 'left', fontWeight: 600}}>Last Activity</th>
                    <th style={{padding: '1.25rem', textAlign: 'right', fontWeight: 600}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {staffSummary.map(staff => (
                    <tr key={staff.id} style={{borderBottom: '1px solid var(--border)'}}>
                      <td style={{padding: '1.25rem'}}>
                        <div style={{fontWeight: 600}}>{staff.display_name || 'Unknown'}</div>
                        <div className="text-secondary" style={{fontSize: '0.85rem'}}>{staff.role}</div>
                      </td>
                      <td style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>{staff.visits}</td>
                      <td style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>{staff.requirements}</td>
                      <td style={{padding: '1.25rem', textAlign: 'center', fontWeight: 600}}>{staff.followups}</td>
                      <td style={{padding: '1.25rem', whiteSpace: 'nowrap'}}>
                        {staff.lastActivityTime ? (
                          <>
                            <div style={{fontWeight: 500}}>{staff.lastActivityTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            <div className="text-secondary" style={{fontSize: '0.85rem'}}>{staff.lastActivityTime.toLocaleDateString()}</div>
                          </>
                        ) : (
                          <span className="text-secondary">-</span>
                        )}
                      </td>
                      <td style={{padding: '1.25rem', textAlign: 'right'}}>
                        <button 
                          className="btn btn-outline" 
                          onClick={() => {
                            setStaffFilter(staff.id);
                            setSelectedStaffDetail(staff);
                          }}
                        >
                          View Activity <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      ) : (
        <>
          {/* STAFF DETAIL & TIMELINE */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h2 style={{margin: 0}}>{selectedStaffDetail.display_name}'s Timeline</h2>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                setStaffFilter('all');
                setSelectedStaffDetail(null);
              }}
            >
              Back to Summary
            </button>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem'}}>
            <div className="glass-panel" style={{padding: '1.5rem', textAlign: 'center'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Visits</div>
              <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalVisits}</div>
            </div>
            <div className="glass-panel" style={{padding: '1.5rem', textAlign: 'center'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Requirements</div>
              <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalReqs}</div>
            </div>
            <div className="glass-panel" style={{padding: '1.5rem', textAlign: 'center'}}>
              <div className="text-secondary" style={{fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase'}}>Follow-ups</div>
              <div style={{fontSize: '1.75rem', fontWeight: 700, margin: '0.5rem 0'}}>{totalFollowUps}</div>
            </div>
          </div>

          <div className="glass-panel" style={{padding: '2rem'}}>
            <h3 style={{marginBottom: '2rem'}}>Activity Timeline</h3>
            
            {filteredActivities.length === 0 && !loading && (
              <div style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>
                Activity data unavailable or no activity recorded for this period.
              </div>
            )}
            
            <div style={{position: 'relative', paddingLeft: '2rem'}}>
              {/* Timeline line */}
              {filteredActivities.length > 0 && (
                <div style={{position: 'absolute', top: '10px', bottom: '10px', left: '11px', width: '2px', background: 'var(--border)'}}></div>
              )}
              
              {filteredActivities.map((act, index) => {
                const date = new Date(act.activity_time);
                return (
                  <div key={`${act.source_id}-${index}`} style={{position: 'relative', marginBottom: '2rem'}}>
                    {/* Node */}
                    <div style={{
                      position: 'absolute', left: '-2rem', top: '2px', width: '24px', height: '24px', 
                      borderRadius: '50%', background: 'var(--bg-base)', border: '2px solid var(--border)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
                    }}>
                      {renderTimelineIcon(act.activity_type)}
                    </div>
                    
                    {/* Content */}
                    <div 
                      style={{background: 'var(--bg-surface-hover)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border)', cursor: act.party_id ? 'pointer' : 'default'}}
                      onClick={() => handleEntityClick(act)}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem'}}>
                        <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                          <span className={`badge ${act.activity_type === 'Visit' ? 'badge-primary' : act.activity_type === 'Requirement' ? 'badge-warning' : act.activity_type === 'Follow-up' ? 'badge-success' : 'badge-info'}`}>
                            {act.activity_type}
                          </span>
                          <span style={{fontWeight: 600, fontSize: '0.95rem'}}>{date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          <span className="text-secondary" style={{fontSize: '0.85rem'}}>{date.toLocaleDateString()}</span>
                        </div>
                      </div>
                      
                      <div style={{fontWeight: 600, marginBottom: '0.25rem', fontSize: '1.05rem'}}>
                        {act.party_name || 'Unknown Customer'}
                      </div>
                      <div style={{fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.25rem'}}>
                        {act.title}
                      </div>
                      {act.description && (
                        <div className="text-secondary" style={{fontSize: '0.95rem', whiteSpace: 'pre-wrap'}}>
                          {act.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
      
    </div>
  );
}
