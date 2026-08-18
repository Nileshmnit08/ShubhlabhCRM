import React, { useState, useEffect, useContext } from 'react';
import { supabase } from '../../lib/supabase';
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
  
  const [formData, setFormData] = useState({
    party_id: '',
    reason: '',
    notes: '',
    due_at: '',
    priority: 'Normal',
    assigned_to: '',
    reminder_at: '',
    status: 'Pending'
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
          status: fData.status || 'Pending'
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
    setLoading(true);
    try {
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
        alert(t('msg.updateSuccess'));
      } else {
        const { data: session } = await supabase.auth.getSession();
        payload.created_by = session?.session?.user?.id || null;
        
        const { error } = await supabase.from('follow_ups').insert(payload);
        if (error) throw error;
        alert(t('msg.createSuccess'));
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
