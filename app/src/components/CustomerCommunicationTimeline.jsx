import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User, AlertCircle, ChevronDown } from 'lucide-react';

export default function CustomerCommunicationTimeline({ partyId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const PAGE_SIZE = 20;

  const fetchEvents = async (page = 0) => {
    try {
      if (page === 0) setLoading(true);
      else setLoadingMore(true);
      
      setError(null);

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Request data from crm_call_events with staff display name joined
      const { data, error: fetchError } = await supabase
        .from('crm_call_events')
        .select(`
          id,
          direction,
          call_type,
          duration_seconds,
          started_at,
          staff_id,
          app_users!staff_id ( display_name )
        `)
        .eq('party_id', partyId)
        .order('started_at', { ascending: false })
        .range(from, to);

      if (fetchError) throw fetchError;

      if (data) {
        if (page === 0) {
          setEvents(data);
        } else {
          setEvents(prev => [...prev, ...data]);
        }
        
        if (data.length < PAGE_SIZE) {
          setHasMore(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch communication events:', err);
      setError(err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (partyId) {
      fetchEvents(0);
    }
  }, [partyId]);

  const handleLoadMore = () => {
    const nextPage = Math.floor(events.length / PAGE_SIZE);
    fetchEvents(nextPage);
  };

  const getIconForEvent = (direction, type) => {
    if (type === 'MISSED' || type === 'REJECTED') return <PhoneMissed size={16} className="text-danger" />;
    if (direction === 'INCOMING') return <PhoneIncoming size={16} className="text-success" />;
    if (direction === 'OUTGOING') return <PhoneOutgoing size={16} className="text-primary" />;
    return <Phone size={16} className="text-muted" />;
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) return null;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="animate-fade-in" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading communication history...</div>
      </div>
    );
  }

  if (error && events.length === 0) {
    return (
      <div className="cv-panel animate-fade-in" style={{ padding: '2rem', borderTop: '4px solid var(--danger)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <AlertCircle size={24} className="text-danger" />
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--danger)' }}>Timeline Error</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              We could not load the communication history for this customer.
            </p>
            <div style={{ backgroundColor: 'rgba(255,0,0,0.05)', padding: '0.75rem', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'monospace' }}>
              {error.message || 'Unknown network error'}
            </div>
            <button className="btn btn-secondary" onClick={() => fetchEvents(0)}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="cv-empty animate-fade-in">
        <Phone size={48} className="empty-state-icon" style={{ opacity: 0.3 }} />
        <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No communication activity recorded.</h3>
        <p className="text-secondary" style={{ maxWidth: '400px', margin: '0 auto 1.5rem' }}>
          When calls are logged with this customer, they will appear here chronologically.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="cv-panel" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {events.map((evt, idx) => {
            const isLast = idx === events.length - 1;
            const staffName = evt.app_users?.display_name || 'Unknown Staff';
            const durationStr = formatDuration(evt.duration_seconds);

            return (
              <div key={evt.id} style={{ display: 'flex', gap: '1.5rem', position: 'relative', paddingBottom: isLast ? 0 : '1.5rem' }}>
                {!isLast && <div style={{ position: 'absolute', left: '16px', top: '32px', bottom: 0, width: '2px', backgroundColor: 'var(--border)' }}></div>}
                
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', backgroundColor: 'var(--bg-surface-hover)', border: `1px solid var(--border)`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1, flexShrink: 0 }}>
                  {getIconForEvent(evt.direction, evt.call_type)}
                </div>
                
                <div style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: 'var(--radius-md)', border: `1px solid var(--border)` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ textTransform: 'capitalize' }}>{evt.direction?.toLowerCase() || 'Unknown'}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>&bull;</span>
                      <span style={{ textTransform: 'capitalize' }}>{evt.call_type?.toLowerCase() || 'Unknown'}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {new Date(evt.started_at).toLocaleString()}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <User size={14} style={{ opacity: 0.6 }} /> {staffName}
                    </div>
                    {durationStr && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.85rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-surface)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>
                        <Clock size={12} style={{ opacity: 0.6 }} /> {durationStr}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {error && events.length > 0 && (
           <div style={{ marginTop: '1.5rem', color: 'var(--danger)', fontSize: '0.85rem', textAlign: 'center' }}>
             Failed to load more events. Please try again.
           </div>
        )}

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <button 
              className="btn btn-secondary" 
              onClick={handleLoadMore} 
              disabled={loadingMore}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loadingMore ? 'Loading...' : <>Load more <ChevronDown size={16} /></>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
