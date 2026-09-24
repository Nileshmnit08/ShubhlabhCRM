import React, { useState, useEffect } from 'react';
import { X, PlayCircle, StopCircle, Building2, MapPin, IndianRupee, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';

export default function StaffJourneyDrawer({ user, dateRange, filterMode, onClose }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [unlinkedEvents, setUnlinkedEvents] = useState([]);
  const [summary, setSummary] = useState({
    sessions: 0,
    km: 0,
    visits: 0,
    expenses: 0,
    expenseTotal: 0
  });

  useEffect(() => {
    fetchTimeline();
  }, [user.id, dateRange.start, dateRange.end]);

  const fetchTimeline = async () => {
    setLoading(true);
    try {
      const startStr = dateRange.start.toISOString().split('T')[0] + 'T00:00:00Z';
      const endStr = dateRange.end.toISOString().split('T')[0] + 'T23:59:59Z';

      // 1. Fetch Timeline Events
      const { data: events, error } = await supabase
        .from('vw_field_timeline')
        .select('*')
        .eq('staff_id', user.id)
        .gte('event_time', startStr)
        .lte('event_time', endStr)
        .order('event_time', { ascending: true });
        
      if (error) throw error;

      // 2. Fetch Reconciliation Metrics
      const { data: recSessions } = await supabase.from('vw_field_session_reconciliation')
        .select('*')
        .eq('staff_id', user.id)
        .gte('business_date', dateRange.start.toISOString().split('T')[0])
        .lte('business_date', dateRange.end.toISOString().split('T')[0]);

      const { data: recExpenses } = await supabase.from('vw_field_expense_reconciliation')
        .select('*')
        .eq('staff_id', user.id)
        .gte('expense_date', dateRange.start.toISOString().split('T')[0])
        .lte('expense_date', dateRange.end.toISOString().split('T')[0]);

      const sum = {
        sessions: recSessions?.length || 0,
        km: recSessions?.reduce((acc, s) => acc + (s.verified_distance_meters / 1000 || 0), 0).toFixed(1) || 0,
        visits: recSessions?.reduce((acc, s) => acc + (s.linked_visit_count || 0), 0) || 0,
        expenses: recExpenses?.length || 0,
        expenseTotal: recExpenses?.reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0) || 0
      };
      setSummary(sum);

      // 3. Group by Session
      const groupedSessions = [];
      let currentSession = null;
      const unlinked = [];

      (events || []).forEach(evt => {
        if (evt.event_type === 'SESSION_START') {
          if (currentSession) groupedSessions.push(currentSession);
          currentSession = { id: evt.id, startEvent: evt, endEvent: null, events: [], totalKm: 0 };
        } else if (evt.event_type === 'SESSION_END') {
          if (currentSession) {
            currentSession.endEvent = evt;
            groupedSessions.push(currentSession);
            currentSession = null;
          } else {
            unlinked.push(evt);
          }
        } else {
          if (currentSession) {
            currentSession.events.push(evt);
            if (evt.event_type === 'TRAVEL_SEGMENT' && evt.distance_m) {
              currentSession.totalKm += (evt.distance_m / 1000);
            }
          } else {
            unlinked.push(evt);
          }
        }
      });
      if (currentSession) groupedSessions.push(currentSession);

      setSessions(groupedSessions);
      setUnlinkedEvents(unlinked);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFilterLabel = () => {
    if (filterMode === 'Day') return format(dateRange.start, 'dd MMM yyyy');
    if (filterMode === 'Month') return format(dateRange.start, 'MMM yyyy');
    return `${format(dateRange.start, 'dd MMM')} - ${format(dateRange.end, 'dd MMM yyyy')}`;
  };

  const renderEvent = (evt, idx, arr) => {
    const timeStr = format(new Date(evt.event_time), 'HH:mm');
    
    if (evt.event_type === 'TRAVEL_SEGMENT') {
      const isUnlinked = arr && (!arr.find((e, i) => i > idx && e.event_type === 'VISIT') || !arr.find((e, i) => i < idx && e.event_type === 'VISIT'));
      return (
        <div key={evt.id} style={{ display: 'flex', marginLeft: '16px', padding: '1rem 0', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '-17px', top: '50%', transform: 'translateY(-50%)', width: '2px', height: '100%', background: 'var(--border)' }}></div>
          <div style={{ marginLeft: '2rem', flex: 1, padding: '0.5rem 1rem', background: 'var(--bg-base)', borderRadius: '6px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
              <Truck size={14} /> 
              <span style={{ fontSize: '0.85rem' }}>Travel Segment</span>
            </div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
              {(evt.distance_m / 1000).toFixed(1)} km verified
            </div>
            {isUnlinked && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No linked CRM visit</div>}
          </div>
        </div>
      );
    }

    if (evt.event_type === 'VISIT') {
      // Check next event to see if we have missing travel
      const nextEvt = arr && arr[idx + 1];
      const hasMissingTravel = nextEvt && nextEvt.event_type === 'VISIT';

      return (
        <React.Fragment key={evt.id}>
          <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '-100%', width: '2px', background: 'var(--border)' }}></div>
            <div style={{ width: '40px', textAlign: 'right', paddingTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              {timeStr}
            </div>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '2px solid var(--bg-surface)' }}>
              <Building2 size={16} />
            </div>
            <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>CUSTOMER VISIT</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.description.replace('Customer Visit: ', '')}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <span className="badge badge-success">Completed</span>
              </div>
            </div>
          </div>
          {hasMissingTravel && (
            <div style={{ display: 'flex', marginLeft: '16px', padding: '0.5rem 0', position: 'relative' }}>
               <div style={{ position: 'absolute', left: '-17px', top: '0', width: '2px', height: '100%', background: 'var(--border)' }}></div>
               <div style={{ marginLeft: '2rem', flex: 1, padding: '0.5rem 1rem', background: 'var(--bg-base)', borderRadius: '6px', border: '1px dashed var(--border)' }}>
                 <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Mobility: No verified mobility link</div>
               </div>
            </div>
          )}
        </React.Fragment>
      );
    }

    if (evt.event_type === 'EXPENSE') {
      return (
        <div key={evt.id} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
          <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '-100%', width: '2px', background: 'var(--border)' }}></div>
          <div style={{ width: '40px', textAlign: 'right', paddingTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            {timeStr}
          </div>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#fee2e2', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '2px solid var(--bg-surface)' }}>
            <IndianRupee size={16} />
          </div>
          <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{evt.description}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600, marginTop: '0.25rem' }}>
              ₹{Number(evt.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '700px',
      background: 'var(--bg-surface)', zIndex: 1000, boxShadow: '-4px 0 15px rgba(0,0,0,0.1)',
      display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.3s ease-out'
    }}>
      {/* Header */}
      <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%', background: 'var(--primary)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.25rem'
          }}>
            {user.name?.charAt(0) || 'U'}
          </div>
          <div>
            <h2 style={{margin: 0, fontSize: '1.25rem', color: 'var(--text-primary)'}}>{user.name}</h2>
            <div className="text-secondary" style={{fontSize: '0.85rem'}}>{getFilterLabel()} &bull; Field Activity Detail</div>
          </div>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={24}/></button>
      </div>
      
      {/* Summary */}
      <div style={{padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-base)', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem'}}>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Sessions</div>
          <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)'}}>{summary.sessions}</div>
        </div>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Verified KM</div>
          <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)'}}>{summary.km}</div>
        </div>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Visits</div>
          <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)'}}>{summary.visits}</div>
        </div>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Expenses</div>
          <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)'}}>{summary.expenses}</div>
        </div>
        <div>
          <div style={{fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600}}>Exp Total</div>
          <div style={{fontSize: '1.25rem', fontWeight: 700, color: 'var(--danger)'}}>₹{summary.expenseTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>
        </div>
      </div>

      {/* Timeline */}
      <div style={{flex: 1, overflowY: 'auto', padding: '1.5rem'}}>
        {loading ? (
          <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>Loading journey...</div>
        ) : sessions.length === 0 && unlinkedEvents.length === 0 ? (
          <div style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
            No field activity found for this period.
          </div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: '2rem'}}>
            {sessions.map((session, sIdx) => {
              const sessionDate = format(new Date(session.startEvent.event_time), 'dd MMM yyyy');
              const startTime = format(new Date(session.startEvent.event_time), 'HH:mm');
              const endTime = session.endEvent ? format(new Date(session.endEvent.event_time), 'HH:mm') : 'Active';
              
              return (
                <div key={session.id} className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                  <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                      FIELD SESSION — {sessionDate}
                    </h3>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {startTime} &rarr; {endTime}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--primary)' }}>
                        {session.totalKm.toFixed(1)} km verified
                      </div>
                    </div>
                  </div>
                  
                  {/* Timeline Render */}
                  <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '0.5rem' }}>
                    {/* Start Node */}
                    <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '15px', top: '24px', bottom: '-100%', width: '2px', background: 'var(--border)' }}></div>
                      <div style={{ width: '40px', textAlign: 'right', paddingTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                        {startTime}
                      </div>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '2px solid var(--bg-surface)' }}>
                        <PlayCircle size={16} />
                      </div>
                      <div style={{ flex: 1, paddingBottom: '1.5rem' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Session Started</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Starting location captured</div>
                      </div>
                    </div>
                    
                    {session.events.map((evt, eIdx) => renderEvent(evt, eIdx, session.events))}
                    
                    {/* End Node */}
                    {session.endEvent && (
                      <div style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                        <div style={{ width: '40px', textAlign: 'right', paddingTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                          {endTime}
                        </div>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--text-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, border: '2px solid var(--bg-surface)' }}>
                          <StopCircle size={16} />
                        </div>
                        <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
                          <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>Session Ended</div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Ending location captured</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {unlinkedEvents.length > 0 && (
              <div className="glass-panel" style={{ padding: '1.5rem', background: 'var(--bg-surface)' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
                  UNLINKED EVENTS
                </h3>
                {unlinkedEvents.map((evt, idx) => renderEvent(evt, idx, null))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
