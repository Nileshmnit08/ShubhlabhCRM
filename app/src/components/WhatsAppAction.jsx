import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { MessageCircle, Send, X, Calendar, Edit3 } from 'lucide-react';

const TEMPLATES = [
  { label: 'General Check-in', text: 'Hello, just checking in to see how everything is going with your recent feed supply.' },
  { label: 'Payment Reminder', text: 'Hello, this is a gentle reminder regarding the outstanding payment. Please let us know when it can be cleared.' },
  { label: 'Requirement Check', text: 'Hello, do you have any upcoming feed requirements for this week?' },
  { label: 'Custom', text: '' }
];

const OUTCOMES = [
  'Contacted', 'Message Sent / Initiated', 'Response Received', 'Interested', 'No Response',
  'Requirement', 'Order', 'Call Later', 'Competitor', 'Other'
];

export default function WhatsAppAction({ party, followUpId, onComplete, btnClass = "btn btn-secondary" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState('compose'); // compose -> feedback
  
  // Compose State
  const [message, setMessage] = useState(TEMPLATES[0].text);
  const [products, setProducts] = useState([]);
  
  // Feedback State
  const [selectedOutcome, setSelectedOutcome] = useState('');
  const [note, setNote] = useState('');
  
  // Branching States
  const [reqProduct, setReqProduct] = useState('');
  const [reqQty, setReqQty] = useState('');
  const [reqUnit, setReqUnit] = useState('Bags');
  const [reqRate, setReqRate] = useState('');
  const [reqPriority, setReqPriority] = useState('Normal');
  const [reqDate, setReqDate] = useState('');
  
  const [fuDate, setFuDate] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setStep('compose');
    setMessage(TEMPLATES[0].text);
    setSelectedOutcome('');
    setNote('');
    setReqProduct('');
    setReqQty('');
    setReqUnit('Bags');
    setReqRate('');
    setReqPriority('Normal');
    setReqDate('');
    setFuDate('');
  };

  const handleOpen = async () => {
    resetState();
    setIsOpen(true);
    try {
      const { data } = await supabase.from('products').select('*').eq('active', true);
      if (data && data.length > 0) {
        setProducts(data);
        setReqProduct(data[0].name);
      }
    } catch (err) {}
  };

  let rawPhone = party?.whatsapp || party?.mobile || '';
  let phoneStr = rawPhone.replace(/[^0-9]/g, '');
  if (phoneStr.length > 10 && phoneStr.startsWith('91')) {
    phoneStr = phoneStr.substring(2);
  }
  const isValidNumber = phoneStr.length === 10;

  // If customer explicitly requested Do Not Contact or No WhatsApp, hide the action entirely
  if (party?.communication_preference === 'Do Not Contact' || party?.communication_preference === 'No WhatsApp') {
    return null;
  }

  const handleSend = () => {
    let finalPhone = '91' + phoneStr;
    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(message)}`;
    
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      alert("Popup blocked! Please allow popups for this site to open WhatsApp, or manually open WhatsApp Web.");
    }
    
    setStep('feedback');
  };

  const saveFeedback = async () => {
    if (selectedOutcome === 'Other' && !note.trim()) {
      alert("Please provide a note when 'Other' is selected.");
      return;
    }
    
    if (selectedOutcome === 'Requirement') {
      if (!reqProduct || !reqQty || !reqRate || !reqDate) {
        alert("Please fill in all requirement fields (Product, Quantity, Rate, Expected Date).");
        return;
      }
      if (parseFloat(reqQty) <= 0) {
        alert("Quantity must be greater than zero.");
        return;
      }
      if (parseFloat(reqRate) < 0) {
        alert("Target rate cannot be negative.");
        return;
      }
    }

    if (selectedOutcome === 'Call Later' && !fuDate) {
      alert("Please specify a follow-up date for 'Call Later'.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: session } = await supabase.auth.getSession();

      // 1. Log Interaction
      const { data: intRow, error: intErr } = await supabase.from('interactions').insert({
        party_id: party.id,
        user_id: session?.session?.user?.id || null,
        channel: 'WhatsApp',
        outcome: selectedOutcome,
        note: note
      }).select().single();
      
      if (intErr) throw intErr;

      // 2. Branching Logic
      if (selectedOutcome === 'Requirement') {
        await supabase.from('requirements').insert({
          party_id: party.id,
          product_type: reqProduct || 'Unknown',
          quantity: reqQty ? parseInt(reqQty) : 0,
          unit: reqUnit || 'Bags',
          expected_rate: reqRate ? parseFloat(reqRate) : null,
          priority: reqPriority || 'Normal',
          expected_date: reqDate || null,
          source_interaction_id: intRow?.id,
          assigned_to: session?.session?.user?.id || null
        });
      } else if (selectedOutcome === 'Call Later' && fuDate) {
        const { data: existingPending } = await supabase.from('follow_ups')
          .select('id')
          .eq('party_id', party.id)
          .eq('status', 'Pending')
          .eq('follow_up_type', 'General');
          
        if (existingPending && existingPending.length > 0) {
           await supabase.from('follow_ups').update({
             reason: `Follow-up from WhatsApp: ${note || 'Call Later'}`,
             follow_up_date: fuDate,
             due_at: fuDate,
             priority: 'Normal'
           }).eq('id', existingPending[0].id);
        } else {
           await supabase.from('follow_ups').insert({
             party_id: party.id,
             reason: `Follow-up from WhatsApp: ${note || 'Call Later'}`,
             follow_up_date: fuDate,
             due_at: fuDate,
             priority: 'Normal',
             follow_up_type: 'General'
           });
        }
      }

      // 3. Mark originating follow-up as completed if passed
      if (followUpId) {
        await supabase.from('follow_ups').update({ 
          status: 'Completed', 
          completed_at: new Date().toISOString() 
        }).eq('id', followUpId);
      }

      setIsOpen(false);
      if (onComplete) onComplete();

    } catch (err) {
      console.error(err);
      alert('Failed to save feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button className={btnClass} onClick={handleOpen} disabled={!isValidNumber} title={isValidNumber ? "WhatsApp Action" : "Invalid WhatsApp Number"} style={{display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', fontSize: '0.85rem', opacity: isValidNumber ? 1 : 0.5}}>
        <MessageCircle size={16} style={{color: isValidNumber ? '#25D366' : 'inherit'}} /> WhatsApp
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', zIndex: 1000, 
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel animate-fade-in" style={{width: '90%', maxWidth: '500px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
              <h2 style={{margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                <MessageCircle style={{color: '#25D366'}} /> 
                {step === 'compose' ? 'Send Message' : 'Interaction Outcome'}
              </h2>
              <button onClick={() => setIsOpen(false)} style={{background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>

            {step === 'compose' ? (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                  {TEMPLATES.map(t => (
                    <button 
                      key={t.label} 
                      className={`badge ${message === t.text ? 'badge-active' : ''}`}
                      style={{cursor: 'pointer', border: '1px solid var(--border)', background: message === t.text ? 'var(--primary)' : 'transparent', color: message === t.text ? '#fff' : 'var(--text-primary)'}}
                      onClick={() => setMessage(t.text)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                
                <textarea 
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={4}
                  style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                  placeholder="Type your message here..."
                />
                
                <button className="btn btn-primary" onClick={handleSend} style={{width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '0.5rem'}}>
                  <Send size={18} /> Open WhatsApp & Record Feedback
                </button>
              </div>
            ) : (
              <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                <div>
                  <label style={{display: 'block', marginBottom: '0.75rem', color: 'var(--text-muted)'}}>What was the result of this message?</label>
                  <div style={{display: 'flex', gap: '0.5rem', flexWrap: 'wrap'}}>
                    {OUTCOMES.map(out => (
                      <button 
                        key={out}
                        onClick={() => setSelectedOutcome(out)}
                        style={{
                          padding: '0.5rem 1rem', borderRadius: '20px', fontSize: '0.9rem', cursor: 'pointer',
                          background: selectedOutcome === out ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${selectedOutcome === out ? 'var(--primary)' : 'var(--border)'}`,
                          color: selectedOutcome === out ? '#fff' : 'var(--text-primary)'
                        }}
                      >
                        {out}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedOutcome === 'Requirement' && (
                  <div style={{padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--success)'}}>
                    <h4 style={{marginBottom: '1rem', color: 'var(--success)'}}>Capture Requirement</h4>
                    <div style={{display: 'grid', gap: '1rem'}}>
                      <div>
                        <label>Feed/Product Type</label>
                        <select value={reqProduct} onChange={e=>setReqProduct(e.target.value)} style={{width: '100%', padding: '0.65rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}>
                          {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          <option value="Other">Other (Custom)</option>
                        </select>
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label>Quantity</label><input type="number" min="0.01" step="any" required value={reqQty} onChange={e=>setReqQty(e.target.value)} /></div>
                        <div>
                          <label>Unit</label>
                          <select value={reqUnit} onChange={e=>setReqUnit(e.target.value)} style={{width: '100%', padding: '0.65rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}>
                            <option value="Bags">Bags</option>
                            <option value="Tons">Tons</option>
                            <option value="MT">MT</option>
                            <option value="Kg">Kg</option>
                          </select>
                        </div>
                      </div>
                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                        <div><label>Expected Rate (₹)</label><input type="number" step="0.01" min="0" required value={reqRate} onChange={e=>setReqRate(e.target.value)} placeholder="e.g. 2400" /></div>
                        <div><label>Required Date</label><input type="date" required value={reqDate} onChange={e=>setReqDate(e.target.value)} /></div>
                      </div>
                      <div>
                        <label>Priority</label>
                        <select value={reqPriority} onChange={e=>setReqPriority(e.target.value)} style={{width: '100%', padding: '0.65rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}>
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {selectedOutcome === 'Call Later' && (
                  <div style={{padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--warning)'}}>
                    <h4 style={{marginBottom: '1rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.5rem'}}><Calendar size={16}/> Schedule Follow-up</h4>
                    <div><label>Follow-up Date</label><input type="date" value={fuDate} onChange={e=>setFuDate(e.target.value)} /></div>
                  </div>
                )}

                {selectedOutcome && (
                  <div className="animate-fade-in">
                    <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)'}}><Edit3 size={14}/> Additional Notes</label>
                    <textarea 
                      value={note} onChange={e => setNote(e.target.value)} rows={2} 
                      placeholder="Add any extra details here..."
                      style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                    />
                    
                    <button 
                      className="btn btn-primary" 
                      onClick={saveFeedback} 
                      disabled={isSubmitting}
                      style={{width: '100%', justifyContent: 'center', padding: '0.75rem', marginTop: '1rem'}}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Feedback'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
