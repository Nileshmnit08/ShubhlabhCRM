import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/activityLogger';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { LanguageContext } from '../../LanguageContext';

export default function FollowUpForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useContext(LanguageContext);
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(!!id);
  const [customers, setCustomers] = useState([]);
  const [manualNextDate, setManualNextDate] = useState('');
  
  const getNextActionConfig = (outcome, followUpType) => {
    if (followUpType === 'Lead' || followUpType === 'Reactivation') {
       switch (outcome) {
         case 'Interested': return { days: 'manual', reason: `${followUpType} Follow-up (Interested)`, type: followUpType, priority: 'High' };
         case 'Call later': return { days: 'manual', reason: `${followUpType} Follow-up (Call Later)`, type: followUpType, priority: 'Normal' };
         case 'No response': return { days: 1, reason: `${followUpType} Follow-up (No Response)`, type: followUpType, priority: 'Normal' };
         case 'Contacted': return { days: 'manual', reason: `${followUpType} Follow-up`, type: followUpType, priority: 'Normal' };
         default: return null;
       }
    } else {
       switch (outcome) {
         case 'Sending payment today': return { days: 1, reason: 'Verify Payment Received', type: 'Payment', priority: 'Normal' };
         case 'Payment within 2 days': return { days: 2, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment within 3 to 5 days': return { days: 4, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment next week': return { days: 7, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Payment next month': return { days: 30, reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Part payment today': return { days: 'manual', reason: 'Follow-up on Remaining Balance', type: 'Payment', priority: 'Normal' };
         case 'Not picking phone': return { days: 1, reason: 'Payment Follow-up (No Answer)', type: 'Payment', priority: 'Normal' };
         case 'Phone not reachable': return { days: 1, reason: 'Payment Follow-up (Unreachable)', type: 'Payment', priority: 'Normal' };
         case 'Call later': return { days: 'manual', reason: 'Payment Follow-up (Call Later)', type: 'Payment', priority: 'Normal' };
         case 'Cash problem': return { days: 'manual', reason: 'Payment Follow-up (Cash Problem)', type: 'Payment', priority: 'Normal' };
         case 'Market down': return { days: 'manual', reason: 'Payment Follow-up (Market Down)', type: 'Payment', priority: 'Normal' };
         case 'Payment stuck in market': return { days: 'manual', reason: 'Payment Follow-up (Payment Stuck)', type: 'Payment', priority: 'Normal' };
         case 'Follow-up later': return { days: 'manual', reason: 'Payment Follow-up', type: 'Payment', priority: 'Normal' };
         case 'Customer asking for statement': return { days: 0, reason: 'Provide Account Statement', type: 'General', priority: 'Normal' };
         case 'Customer asking for ledger': return { days: 0, reason: 'Provide Account Ledger', type: 'General', priority: 'Normal' };
         case 'Wants to talk to senior staff': return { days: 0, reason: 'ESCALATION: Talk to Senior', type: 'General', priority: 'High' };
         case 'Wants to talk to owner': return { days: 0, reason: 'ESCALATION: Talk to Owner', type: 'General', priority: 'High' };
         default: return null;
       }
    }
  };
  
  const [formData, setFormData] = useState({
    party_id: '',
    reason: '',
    notes: '',
    due_at: '',
    priority: 'Normal',
    assigned_to: '',
    reminder_at: '',
    status: 'Pending',
    follow_up_type: 'General',
    outcome_category: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, [id]);

  const fetchInitialData = async () => {
    try {
      // Fetch customers for dropdown
      const { data: cData } = await supabase.from('crm_parties').select('id, display_name').order('display_name');
      setCustomers(cData || []);

      if (id) {
        const { data: fData, error } = await supabase.from('follow_ups').select('*').eq('id', id).single();
        if (error) throw error;
        
        // Format dates for local datetime-local input
        const formatForInput = (isoString) => {
          if (!isoString) return '';
          const d = new Date(isoString);
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        };

        setFormData({
          party_id: fData.party_id || '',
          reason: fData.reason || '',
          notes: fData.notes || '',
          due_at: formatForInput(fData.due_at) || formatForInput(fData.follow_up_date),
          priority: fData.priority || 'Normal',
          assigned_to: fData.assigned_to || '',
          reminder_at: formatForInput(fData.reminder_at),
          status: fData.status || 'Pending',
          follow_up_type: fData.follow_up_type || 'General',
          outcome_category: fData.outcome_category || ''
        });
      } else {
        // Auto-assign to current user if new
        const { data: session } = await supabase.auth.getSession();
        setFormData(prev => ({ ...prev, assigned_to: session?.session?.user?.id || '' }));
      }
    } catch (err) {
      console.error(err);
      alert(t('msg.error'));
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if ((formData.follow_up_type === 'Payment' || formData.follow_up_type === 'Lead' || formData.follow_up_type === 'Reactivation') && formData.status === 'Completed' && !formData.outcome_category) {
       alert("Please select an Outcome before completing the task.");
       return;
    }
    
    const config = getNextActionConfig(formData.outcome_category, formData.follow_up_type);
    if (id && formData.status === 'Completed' && config?.days === 'manual' && !manualNextDate) {
       alert("Next follow-up date is required for this outcome.");
       return;
    }
    
    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      // Convert datetime-local strings back to ISO for DB
      const toISO = (localStr) => localStr ? new Date(localStr).toISOString() : null;
      
      const payload = {
        ...formData,
        due_at: toISO(formData.due_at),
        reminder_at: toISO(formData.reminder_at)
      };

      if (id) {
        const { error } = await supabase.from('follow_ups').update(payload).eq('id', id);
        if (error) throw error;
        
        logActivity({
          module: 'FollowUps',
          actionType: 'UPDATED',
          entityType: 'follow_ups',
          entityId: id,
          summary: `Updated follow-up: ${payload.reason}`
        });

        alert(t('msg.updateSuccess'));
      } else {
        payload.created_by = session?.session?.user?.id || null;
        
        const { data, error } = await supabase.from('follow_ups').insert(payload).select();
        if (error) {
           if (error.code === '23505' && error.message.includes('idx_unique_pending_followup')) {
               alert(`A pending ${payload.follow_up_type} follow-up already exists for this customer.`);
               setLoading(false);
               return;
           }
           throw error;
        }

        logActivity({
          module: 'FollowUps',
          actionType: 'CREATED',
          entityType: 'follow_ups',
          entityId: data[0].id,
          summary: `Created follow-up: ${payload.reason}`
        });

        alert(t('msg.createSuccess'));
      }
      
      // NEXT ACTION AUTOMATION
      if (id && formData.status === 'Completed' && config) {
        let nextDateISO = null;
        if (config.days === 'manual') {
          nextDateISO = new Date(manualNextDate).toISOString();
        } else {
          const nextDate = new Date();
          nextDate.setDate(nextDate.getDate() + config.days);
          const yyyy = nextDate.getFullYear();
          const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nextDate.getDate()).padStart(2, '0');
          nextDateISO = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
        }
        
        const nextTaskPayload = {
           party_id: formData.party_id,
           reason: config.reason,
           follow_up_date: nextDateISO,
           due_at: nextDateISO,
           priority: config.priority,
           follow_up_type: config.type,
           status: 'Pending',
           assigned_to: formData.assigned_to,
           created_by: session?.session?.user?.id || null
        };
        
        // Duplicate Prevention
        const { data: existingPending } = await supabase.from('follow_ups')
          .select('id')
          .eq('party_id', formData.party_id)
          .eq('status', 'Pending')
          .eq('follow_up_type', config.type)
          .neq('id', id);
          
        if (existingPending && existingPending.length > 0) {
          const existingId = existingPending[0].id;
          await supabase.from('follow_ups').update({
             reason: config.reason,
             follow_up_date: nextDateISO,
             due_at: nextDateISO,
             priority: config.priority
          }).eq('id', existingId);
          
          logActivity({
            module: 'FollowUps', actionType: 'UPDATED', entityType: 'follow_ups', entityId: existingId,
            summary: `Automated duplicate prevention: Updated next action to ${config.reason}`
          });
        } else {
          const { data: nextData } = await supabase.from('follow_ups').insert(nextTaskPayload).select();
          if (nextData && nextData.length > 0) {
            logActivity({
              module: 'FollowUps', actionType: 'CREATED', entityType: 'follow_ups', entityId: nextData[0].id,
              summary: `Automated next action created: ${config.reason}`
            });
          }
        }
      }
      
      // ACTIVITY INTEGRATION (Micro-Sprint 9.6 / 10.4 / 10.8)
      if (id && formData.status === 'Completed' && (formData.follow_up_type === 'Payment' || formData.follow_up_type === 'Lead' || formData.follow_up_type === 'Reactivation')) {
        let interactionNote = formData.notes ? `Task Notes: ${formData.notes}` : '';
        if (config && config.reason) {
          interactionNote += (interactionNote ? '\n' : '') + `Next Action: ${config.reason}`;
        }
        
        let nextDateISO = null;
        if (config) {
          if (config.days === 'manual' && manualNextDate) {
            nextDateISO = new Date(manualNextDate).toISOString();
          } else if (config.days !== 'manual') {
            const nextDate = new Date();
            nextDate.setDate(nextDate.getDate() + config.days);
            const yyyy = nextDate.getFullYear();
            const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
            const dd = String(nextDate.getDate()).padStart(2, '0');
            nextDateISO = new Date(`${yyyy}-${mm}-${dd}`).toISOString();
          }
        }

        const interactionPayload = {
          party_id: formData.party_id,
          user_id: session?.session?.user?.id || null,
          channel: formData.follow_up_type === 'Lead' ? 'Lead Task' : (formData.follow_up_type === 'Reactivation' ? 'Reactivation Task' : 'Payment Task'),
          interaction_type: formData.follow_up_type === 'Lead' ? 'Lead Follow-up Completed' : (formData.follow_up_type === 'Reactivation' ? 'Reactivation Follow-up Completed' : 'Payment Follow-up Completed'),
          outcome: formData.outcome_category,
          note: interactionNote,
          next_action: config ? config.reason : null,
          next_action_date: nextDateISO,
          related_follow_up_id: id
        };
        
        const { data: existingInteraction } = await supabase.from('interactions')
          .select('id')
          .eq('related_follow_up_id', id);
          
        if (existingInteraction && existingInteraction.length > 0) {
           await supabase.from('interactions').update(interactionPayload).eq('id', existingInteraction[0].id);
        } else {
           await supabase.from('interactions').insert(interactionPayload);
        }
      }
      
      navigate('/follow-ups');
    } catch (err) {
      console.error(err);
      alert(t('msg.error'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="animate-fade-in" style={{maxWidth: '800px', margin: '0 auto'}}>
      <div className="page-header" style={{alignItems: 'flex-start'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/follow-ups" className="btn-icon"><ArrowLeft size={24} /></Link>
          <h1 style={{margin: 0}}>{id ? t('btn.edit') : t('btn.newFollowUp')}</h1>
        </div>
      </div>

      <div className="glass-panel" style={{padding: '2rem'}}>
        <h2 style={{marginBottom: '1.5rem'}}>{t('form.title')}</h2>
        
        <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem'}}>
            <div>
              <label>{t('form.customer')} *</label>
              <select 
                required 
                value={formData.party_id} 
                onChange={e => setFormData({...formData, party_id: e.target.value})}
                disabled={!!id} // Usually don't change customer of existing follow-up
              >
                <option value="">-- Select Customer --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label>{t('form.reason')} *</label>
              <input 
                required 
                type="text" 
                value={formData.reason} 
                onChange={e => setFormData({...formData, reason: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label>{t('form.notes')}</label>
            <textarea 
              rows="3"
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
            ></textarea>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
            <div>
              <label>{t('form.dueAt')} *</label>
              <input 
                required 
                type="datetime-local" 
                value={formData.due_at} 
                onChange={e => setFormData({...formData, due_at: e.target.value})}
              />
            </div>
            <div>
              <label>{t('form.reminderAt')}</label>
              <input 
                type="datetime-local" 
                value={formData.reminder_at} 
                onChange={e => setFormData({...formData, reminder_at: e.target.value})}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'}}>
            <div>
              <label>{t('form.priority')}</label>
              <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                <option value="Normal">{t('priority.Normal')}</option>
                <option value="High">{t('priority.High')}</option>
                <option value="Low">{t('priority.Low')}</option>
              </select>
            </div>
            
            {id && (
              <div>
                <label>{t('form.status')}</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                  <option value="Pending">{t('status.Pending')}</option>
                  <option value="Completed">{t('status.Completed')}</option>
                  <option value="Postponed">{t('status.Postponed')}</option>
                  <option value="Cancelled">{t('status.Cancelled')}</option>
                </select>
              </div>
            )}
            
            {formData.follow_up_type === 'Payment' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Payment Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <optgroup label="Payment commitment">
                      <option value="Sending payment today">Sending payment today</option>
                      <option value="Payment within 2 days">Payment within 2 days</option>
                      <option value="Payment within 3 to 5 days">Payment within 3 to 5 days</option>
                      <option value="Payment next week">Payment next week</option>
                      <option value="Payment next month">Payment next month</option>
                      <option value="Part payment today">Part payment today</option>
                    </optgroup>
                    <optgroup label="Customer unavailable">
                      <option value="Not picking phone">Not picking phone</option>
                      <option value="Phone not reachable">Phone not reachable</option>
                      <option value="Call later">Call later</option>
                    </optgroup>
                    <optgroup label="Customer issue">
                      <option value="Cash problem">Cash problem</option>
                      <option value="Market down">Market down</option>
                      <option value="Payment stuck in market">Payment stuck in market</option>
                    </optgroup>
                    <optgroup label="Statement/account request">
                      <option value="Customer asking for statement">Customer asking for statement</option>
                      <option value="Customer asking for ledger">Customer asking for ledger</option>
                    </optgroup>
                    <optgroup label="Escalation needed">
                      <option value="Wants to talk to senior staff">Wants to talk to senior staff</option>
                      <option value="Wants to talk to owner">Wants to talk to owner</option>
                    </optgroup>
                    <optgroup label="Follow-up later">
                      <option value="Follow-up later">Follow-up later</option>
                    </optgroup>
                  </select>
                </div>
                
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Lead' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Lead Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Contacted">Contacted</option>
                    <option value="No response">No response</option>
                    <option value="Interested">Interested</option>
                    <option value="Call later">Call later</option>
                    <option value="Not interested">Not interested</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
            
            {formData.follow_up_type === 'Reactivation' && formData.status === 'Completed' && (
              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label>Reactivation Outcome (Required) *</label>
                  <select 
                    required 
                    value={formData.outcome_category} 
                    onChange={e => setFormData({...formData, outcome_category: e.target.value})}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                  >
                    <option value="">-- Select Outcome --</option>
                    <option value="Contacted">Contacted</option>
                    <option value="No response">No response</option>
                    <option value="Interested">Interested</option>
                    <option value="Call later">Call later</option>
                    <option value="Not interested">Not interested</option>
                  </select>
                </div>
                {getNextActionConfig(formData.outcome_category, formData.follow_up_type)?.days === 'manual' && (
                  <div style={{marginTop: '1rem'}}>
                    <label>Next Follow-up Date (Required) *</label>
                    <input 
                      required 
                      type="datetime-local" 
                      value={manualNextDate} 
                      onChange={e => setManualNextDate(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-surface)' }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem'}}>
            <Link to="/follow-ups" className="btn btn-secondary">
              <X size={18} /> {t('btn.cancel')}
            </Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} /> {loading ? '...' : t('btn.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
