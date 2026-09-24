import React, { useState, useEffect } from 'react';
import { X, PlayCircle, StopCircle, Building2, MapPin, IndianRupee, Truck, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format } from 'date-fns';
import VisitDetailModal from '../Activity/VisitDetailModal';

export default function StaffJourneyDrawer({ user, dateRange, filterMode, onClose }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [unlinkedEvents, setUnlinkedEvents] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [summary, setSummary] = useState({
    sessions: 0,
    km: 0,
    visits: 0,
    expenses: 0,
    expenseTotal: 0
  });

  const LocationLink = ({ lat, lng, acc }) => {
    if (!lat || !lng) {
      return <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Location unavailable</div>;
    }
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    return (
      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <MapPin size={12} />
        <a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
          {lat}, {lng}
        </a>
        {acc && <span style={{ color: 'var(--text-muted)' }}>(±{Math.round(acc)}m)</span>}
      </div>
    );
  };

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

      // 3. Fetch Additional Location Data
      const sessionIds = (events || []).filter(e => e.event_type === 'SESSION_START' || e.event_type === 'SESSION_END').map(e => e.id);
      const visitIds = (events || []).filter(e => e.event_type === 'VISIT').map(e => e.id);

      const sessionMap = {};
      if (sessionIds.length > 0) {
        const { data: sData } = await supabase.from('staff_tracking_sessions')
          .select('id, started_latitude, started_longitude, started_accuracy, ended_latitude, ended_longitude, ended_accuracy')
          .in('id', sessionIds);
        sData?.forEach(s => sessionMap[s.id] = s);
      }

      const visitMap = {};
      if (visitIds.length > 0) {
        const { data: vData } = await supabase.from('crm_visits')
          .select('id, latitude, longitude, notes, outcomes, started_at, ended_at, party_id, start_latitude, start_longitude, start_location_accuracy, ended_latitude, ended_longitude, ended_location_accuracy')
          .in('id', visitIds);
        vData?.forEach(v => visitMap[v.id] = v);
      }

      const { data: reqData } = await supabase.from('requirements')
         .select('id, party_id, created_at').eq('assigned_to', user.id).gte('created_at', startStr).lte('created_at', endStr);
      const { data: fuData } = await supabase.from('follow_ups')
         .select('id, party_id, created_at').eq('assigned_to', user.id).gte('created_at', startStr).lte('created_at', endStr);

      // Inject locations and activities
      (events || []).forEach(evt => {
        if (evt.event_type === 'SESSION_START') {
           evt.location = { lat: sessionMap[evt.id]?.started_latitude, lng: sessionMap[evt.id]?.started_longitude, acc: sessionMap[evt.id]?.started_accuracy };
        } else if (evt.event_type === 'SESSION_END') {
           evt.location = { lat: sessionMap[evt.id]?.ended_latitude, lng: sessionMap[evt.id]?.ended_longitude, acc: sessionMap[evt.id]?.ended_accuracy };
        } else if (evt.event_type === 'VISIT') {
           const v = visitMap[evt.id];
           if (v) {
             // Fallback to legacy latitude if start_latitude is not yet populated
             evt.location = { lat: v.start_latitude || v.latitude, lng: v.start_longitude || v.longitude, acc: v.start_location_accuracy };
             evt.end_location = { lat: v.ended_latitude, lng: v.ended_longitude, acc: v.ended_location_accuracy };
             evt.notes = v.notes;
             evt.outcomes = v.outcomes;
             
             // Calculate 2-hour buffer as done in VisitDetailModal
             const vStart = new Date(v.started_at).getTime() - 7200000;
             const vEnd = new Date(v.ended_at || v.started_at).getTime() + 7200000;
             evt.reqCount = (reqData || []).filter(r => r.party_id === v.party_id && new Date(r.created_at).getTime() >= vStart && new Date(r.created_at).getTime() <= vEnd).length;
             evt.fuCount = (fuData || []).filter(r => r.party_id === v.party_id && new Date(r.created_at).getTime() >= vStart && new Date(r.created_at).getTime() <= vEnd).length;
           }
        }
      });

      // 4. Group by Session
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
              
              <div style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Location:</span>
                <LocationLink lat={evt.location?.lat} lng={evt.location?.lng} acc={evt.location?.acc} />
              </div>
              
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                <span className="badge badge-success">Completed</span>
              </div>
              
              {evt.notes && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem', padding: '0.5rem', background: 'var(--bg-base)', borderRadius: '6px' }}>
                  <span style={{fontWeight: 600}}>Discussion:</span> {evt.notes}
                </div>
              )}
              {evt.outcomes && Object.keys(evt.outcomes).some(k => evt.outcomes[k]) && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  <span style={{fontWeight: 600}}>Outcome:</span> {
                    Object.entries(evt.outcomes)
                      .filter(([_, v]) => v)
                      .map(([k, _]) => {
                        const labels = {
                          metCustomer: 'Met Customer', demandAdded: 'Demand Added', paymentTalk: 'Payment Talk', priceList: 'Price List Given', mandiIntel: 'Mandi Intel', ownerUnavailable: 'Owner Unavailable'
                        };
                        return labels[k] || k;
                      }).join(', ')
                  }
                </div>
              )}
              {(evt.reqCount > 0 || evt.fuCount > 0) && (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', gap: '1rem' }}>
                  {evt.reqCount > 0 && <span><span style={{fontWeight: 600}}>Requirements:</span> {evt.reqCount}</span>}
                  {evt.fuCount > 0 && <span><span style={{fontWeight: 600}}>Follow-ups:</span> {evt.fuCount}</span>}
                </div>
              )}
              <button 
                className="btn btn-sm" 
                style={{ 
                  marginTop: '0.75rem', 
                  fontSize: '0.75rem', 
                  padding: '0.4rem 0.85rem', 
                  borderRadius: '15px',
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedVisitId(evt.id)}
              >
                View Completed Visit Detail
                <ChevronRight size={14} />
              </button>

              {evt.end_location?.lat && (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>End Location:</span>
                  <LocationLink lat={evt.end_location.lat} lng={evt.end_location.lng} acc={evt.end_location.acc} />
                </div>
              )}
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
                        <LocationLink lat={session.startEvent.location?.lat} lng={session.startEvent.location?.lng} acc={session.startEvent.location?.acc} />
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
                          <LocationLink lat={session.endEvent.location?.lat} lng={session.endEvent.location?.lng} acc={session.endEvent.location?.acc} />
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

      {selectedVisitId && (
        <VisitDetailModal 
          visitId={selectedVisitId} 
          onClose={() => setSelectedVisitId(null)} 
        />
      )}
    </div>
  );
}
