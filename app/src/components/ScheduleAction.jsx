import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, X } from 'lucide-react';

export default function ScheduleAction({ party, opportunityType, evidence, sourceId, onComplete, btnClass = "btn btn-secondary", showLabel = true }) {
  const [isOpen, setIsOpen] = useState(false);
  const [fuDate, setFuDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setFuDate('');
  };

  const handleOpen = () => {
    resetState();
    setIsOpen(true);
  };

  const saveFeedback = async () => {
    if (!fuDate) {
      alert("Please select a follow-up date.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create a Commercial Follow-up
      const { error } = await supabase.from('follow_ups').insert({
        party_id: party.id,
        reason: `${opportunityType}: ${evidence}`,
        notes: sourceId ? `Source ID: ${sourceId}` : null,
        follow_up_date: fuDate,
        due_at: fuDate,
        priority: 'Normal',
        follow_up_type: 'Commercial'
      });
      
      if (error) throw error;

      setIsOpen(false);
      if (onComplete) onComplete();
    } catch (err) {
      console.error(err);
      alert('Failed to schedule action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        className={btnClass} 
        onClick={handleOpen} 
        title="Schedule Follow-up Action" 
        style={{display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem'}}
      >
        <Calendar size={16} />
        {showLabel && <span style={{ display: 'none', '@media(min-width: 640px)': { display: 'inline' }}}>Schedule</span>}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{width: '90%', maxWidth: '400px', padding: '2rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 style={{margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <Calendar style={{color: 'var(--primary)'}} /> 
                Schedule Action
              </h2>
              <button onClick={() => setIsOpen(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
              
              <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>
                This will add a Commercial Follow-up to your Today queue for the selected date.
              </div>
              
              <div style={{padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--primary)'}}>
                <div style={{fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem'}}>Reason</div>
                <div style={{fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 500}}>{opportunityType}</div>
                <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem'}}>{evidence}</div>
              </div>

              <div>
                <label style={{display: 'block', marginBottom: '0.5rem'}}>Follow-up Date</label>
                <input type="date" value={fuDate} onChange={e=>setFuDate(e.target.value)} style={{width: '100%', padding: '0.75rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}} />
              </div>

              <button 
                className="btn btn-primary" 
                onClick={saveFeedback} 
                disabled={isSubmitting}
                style={{width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem'}}
              >
                {isSubmitting ? 'Scheduling...' : 'Confirm Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
