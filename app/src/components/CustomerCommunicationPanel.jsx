import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Phone, Clock, Hash, AlertCircle, PhoneIncoming, PhoneOutgoing, PhoneMissed, Users } from 'lucide-react';

export default function CustomerCommunicationPanel({ partyId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCommunicationSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      // Query the specific communication summary for this customer UUID
      const { data: commData, error: commError } = await supabase
        .from('v_customer_communication_summary')
        .select('*')
        .eq('party_id', partyId)
        .single();

      if (commError) {
        // PGRST116 means zero rows found, which is a legitimate empty state
        if (commError.code === 'PGRST116') {
          setData(null);
        } else {
          throw commError;
        }
      } else {
        setData(commData);
      }
    } catch (err) {
      console.error('Failed to fetch customer communication summary:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (partyId) {
      fetchCommunicationSummary();
    }
  }, [partyId]);

  if (loading) {
    return (
      <div className="cv-panel" style={{ padding: '2rem', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <div style={{ color: 'var(--text-muted)' }}>Loading communication activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--danger)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <AlertCircle size={24} className="text-danger" />
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: 'var(--danger)' }}>Communication Data Error</h3>
            <p style={{ margin: '0 0 1rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              We could not load the communication summary for this customer.
            </p>
            <div style={{ backgroundColor: 'rgba(255,0,0,0.05)', padding: '0.75rem', borderRadius: '4px', color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '1rem', fontFamily: 'monospace' }}>
              {error.message || 'Unknown network error'}
            </div>
            <button className="btn btn-secondary" onClick={fetchCommunicationSummary}>Retry</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cv-panel" style={{ padding: '2rem', borderTop: '4px solid var(--primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
          <Phone size={18} className="text-primary" /> Communication Intelligence
        </h3>
      </div>

      {!data || data.total_calls === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)' }}>
          <Phone size={32} className="text-muted" style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>No communication activity recorded.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                <Hash size={14} /> Total Calls
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{data.total_calls}</div>
            </div>
            
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                <Clock size={14} /> Talk Time
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {Math.round(data.total_talk_seconds / 60)} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>min</span>
              </div>
            </div>

            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                <Users size={14} /> Distinct Staff
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {data.distinct_staff_count}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                 <PhoneIncoming size={12} className="text-success" /> Incoming
               </div>
               <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.incoming_calls}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                 <PhoneOutgoing size={12} className="text-primary" /> Outgoing
               </div>
               <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.outgoing_calls}</div>
             </div>
             <div>
               <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.25rem' }}>
                 <PhoneMissed size={12} className="text-danger" /> Missed
               </div>
               <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{data.missed_calls}</div>
             </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: '1rem', fontSize: '0.85rem' }}>
            <div>
              <span className="text-muted">First:</span> <span style={{ fontWeight: 500 }}>{data.first_call_at ? new Date(data.first_call_at).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted">Last:</span> <span style={{ fontWeight: 500 }}>{data.last_call_at ? new Date(data.last_call_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
