import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, Send, CheckCircle2 } from 'lucide-react';

const UPDATE_TYPES = [
  'PRICE_UPDATE', 'RAW_MATERIAL_UPDATE', 'SCHEME', 'REWARD',
  'OFFER', 'PRODUCT_UPDATE', 'ANNOUNCEMENT', 'SUPPLY_UPDATE', 'IMPORTANT_NOTICE', 'OTHER'
];

export default function BusinessUpdateForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'PRICE_UPDATE',
    message: '',
    audience_type: 'ALL',
    status: 'DRAFT',
    published_at: null,
    is_visible_in_app: true,
    is_active: true
  });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchCustomers();
    if (id) {
      fetchUpdate();
    }
  }, [id]);

  const fetchCustomers = async () => {
    try {
      const { data } = await supabase.from('crm_parties').select('id, display_name, legal_or_core_name, mobile');
      setCustomers(data || []);
    } catch (e) {
      console.error('Error fetching customers:', e);
    }
  };

  const fetchUpdate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('business_updates').select('*').eq('id', id).single();
      if (error) throw error;
      setFormData({
        title: data.title || '',
        type: data.type || 'PRICE_UPDATE',
        message: data.message || '',
        audience_type: data.audience_type || 'ALL',
        status: data.status || 'DRAFT',
        published_at: data.published_at || null,
        is_visible_in_app: data.is_visible_in_app !== false,
        is_active: data.is_active !== false
      });

      if (data.audience_type === 'SELECTED') {
        const { data: recData, error: recErr } = await supabase
          .from('business_update_recipients')
          .select('customer_id')
          .eq('update_id', id);
        if (!recErr && recData) {
          setSelectedCustomers(recData.map(r => r.customer_id).filter(Boolean));
        }
      }
    } catch (err) {
      console.error('Error fetching update:', err);
      setStatusMessage({ type: 'error', text: 'Failed to load update: ' + (err.message || err) });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publishAction = false) => {
    if (!formData.title?.trim() || !formData.message?.trim()) {
      alert('Title and Message are required.');
      return;
    }
    if (formData.audience_type === 'SELECTED' && selectedCustomers.length === 0) {
      alert('Please select at least one customer.');
      return;
    }

    if (publishAction && formData.status !== 'PUBLISHED') {
      const targetDesc = formData.audience_type === 'ALL' ? 'All Customers' : `${selectedCustomers.length} selected customers`;
      if (!window.confirm(`Publish this update to ${targetDesc}?`)) {
        return;
      }
    }

    setSubmitting(true);
    setStatusMessage(null);
    try {
      let nextStatus = formData.status;
      let nextPublishedAt = formData.published_at;

      if (publishAction) {
        nextStatus = 'PUBLISHED';
        nextPublishedAt = nextPublishedAt || new Date().toISOString();
      } else if (!id) {
        nextStatus = 'DRAFT';
      }

      const payload = {
        title: formData.title.trim(),
        type: formData.type,
        message: formData.message.trim(),
        audience_type: formData.audience_type,
        status: nextStatus,
        published_at: nextPublishedAt,
        is_visible_in_app: formData.is_visible_in_app,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      let currentId = id;

      if (id) {
        let { error: updateErr } = await supabase.from('business_updates').update(payload).eq('id', id);
        
        // Graceful fallback if database migration 263 columns are not yet created in Supabase
        if (updateErr && (updateErr.code === '42703' || updateErr.message?.includes('is_visible_in_app') || updateErr.message?.includes('is_active'))) {
          console.warn('Migration columns missing on Supabase, saving standard columns');
          const strippedPayload = { ...payload };
          delete strippedPayload.is_visible_in_app;
          delete strippedPayload.is_active;
          const retryRes = await supabase.from('business_updates').update(strippedPayload).eq('id', id);
          if (retryRes.error) throw retryRes.error;
        } else if (updateErr) {
          throw updateErr;
        }
      } else {
        let { data, error: insertErr } = await supabase.from('business_updates').insert([payload]).select().single();
        
        if (insertErr && (insertErr.code === '42703' || insertErr.message?.includes('is_visible_in_app') || insertErr.message?.includes('is_active'))) {
          console.warn('Migration columns missing on Supabase, inserting standard columns');
          const strippedPayload = { ...payload };
          delete strippedPayload.is_visible_in_app;
          delete strippedPayload.is_active;
          const retryRes = await supabase.from('business_updates').insert([strippedPayload]).select().single();
          if (retryRes.error) throw retryRes.error;
          data = retryRes.data;
        } else if (insertErr) {
          throw insertErr;
        }
        currentId = data.id;
      }

      // Preserve recipient history: merge additions and removals without wiping existing read_at records
      if (payload.audience_type === 'SELECTED') {
        const { data: existingRecs } = await supabase
          .from('business_update_recipients')
          .select('id, customer_id')
          .eq('update_id', currentId);

        const existingMap = new Map((existingRecs || []).map(r => [r.customer_id, r.id]));
        const newCustomerSet = new Set(selectedCustomers);

        // Remove only customers no longer selected
        const toDeleteIds = (existingRecs || [])
          .filter(r => !newCustomerSet.has(r.customer_id))
          .map(r => r.id);

        if (toDeleteIds.length > 0) {
          await supabase.from('business_update_recipients').delete().in('id', toDeleteIds);
        }

        // Add only newly selected customers
        const toInsertPayload = selectedCustomers
          .filter(cid => !existingMap.has(cid))
          .map(cid => ({
            update_id: currentId,
            customer_id: cid
          }));

        if (toInsertPayload.length > 0) {
          await supabase.from('business_update_recipients').insert(toInsertPayload);
        }
      }

      navigate(`/customer-updates/${currentId}`);
    } catch (e) {
      console.error('Failed to save update:', e);
      setStatusMessage({ type: 'error', text: 'Failed to save update: ' + (e.message || e) });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleCustomer = (cid) => {
    if (selectedCustomers.includes(cid)) {
      setSelectedCustomers(prev => prev.filter(id => id !== cid));
    } else {
      setSelectedCustomers(prev => [...prev, cid]);
    }
  };

  const filteredCustomers = customers.filter(c => 
    (c.display_name || '').toLowerCase().includes(customerSearch.toLowerCase()) || 
    (c.mobile || '').includes(customerSearch)
  );

  if (loading) return <div className="p-6">Loading update...</div>;

  const isEditing = Boolean(id);
  const isPublished = formData.status === 'PUBLISHED';

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <button className="btn btn-icon" onClick={() => navigate(isEditing ? `/customer-updates/${id}` : '/customer-updates')} style={{border: 'none', background: 'none', color: 'var(--text-secondary)'}}>
              <ArrowLeft size={24} />
            </button>
            {isEditing ? 'Edit Customer Update' : 'Create Customer Update'}
          </h1>
        </div>
        <div style={{display: 'flex', gap: '0.75rem', alignItems: 'center'}}>
          <button className="btn btn-secondary" onClick={() => navigate(isEditing ? `/customer-updates/${id}` : '/customer-updates')} disabled={submitting}>
            Cancel
          </button>

          {/* Action buttons based on current record status */}
          {isEditing && isPublished ? (
            <>
              <div className="badge badge-success" style={{display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem'}}>
                <CheckCircle2 size={16} /> Published
              </div>
              <button 
                className="btn btn-primary"
                onClick={() => handleSave(false)}
                disabled={submitting}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <Save size={18} /> {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : isEditing && !isPublished ? (
            <>
              <button 
                className="btn btn-outline-primary"
                onClick={() => handleSave(false)}
                disabled={submitting}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <Save size={18} /> {submitting ? 'Saving...' : 'Save Draft'}
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleSave(true)}
                disabled={submitting}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <Send size={18} /> {submitting ? 'Publishing...' : 'Publish'}
              </button>
            </>
          ) : (
            <>
              <button 
                className="btn btn-outline-primary"
                onClick={() => handleSave(false)}
                disabled={submitting}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <Save size={18} /> Save Draft
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => handleSave(true)}
                disabled={submitting}
                style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}
              >
                <Send size={18} /> Publish
              </button>
            </>
          )}
        </div>
      </div>

      {statusMessage && (
        <div style={{maxWidth: '800px', margin: '1rem auto 0', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: statusMessage.type === 'error' ? 'var(--danger-bg, #fee2e2)' : 'var(--success-bg, #dcfce7)', color: statusMessage.type === 'error' ? 'var(--danger, #b91c1c)' : 'var(--success, #15803d)', border: '1px solid currentColor'}}>
          {statusMessage.text}
        </div>
      )}

      <div style={{maxWidth: '800px', margin: '1.5rem auto'}}>
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            
            {/* Title */}
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Title *</label>
              <input 
                type="text" 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem'}}
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Enter update title"
              />
            </div>
            
            {/* Communication Type */}
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Communication Type</label>
              <select 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem'}}
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                {UPDATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            {/* Message Body */}
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Message *</label>
              <textarea 
                rows="6" 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical'}}
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})}
                placeholder="Enter communication content for customers..."
              />
            </div>

            {/* App Visibility Control */}
            <div style={{padding: '1rem', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0}}>
                <input 
                  type="checkbox" 
                  checked={formData.is_visible_in_app} 
                  onChange={e => setFormData({...formData, is_visible_in_app: e.target.checked})}
                  style={{width: '18px', height: '18px'}}
                />
                <span style={{fontWeight: 600, color: 'var(--text-primary)'}}>Show in Customer Order App</span>
              </label>
              <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '2rem', display: 'block', marginTop: '0.25rem'}}>
                When enabled, customers can view this update in the mobile Order App (subject to publication status and targeted audience).
              </span>
            </div>

            {/* Audience Selection */}
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Audience</label>
              <div style={{display: 'flex', gap: '2rem'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input 
                    type="radio" 
                    name="audience" 
                    checked={formData.audience_type === 'ALL'}
                    onChange={() => setFormData({...formData, audience_type: 'ALL'})}
                  />
                  <span>All Customers</span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer'}}>
                  <input 
                    type="radio" 
                    name="audience" 
                    checked={formData.audience_type === 'SELECTED'}
                    onChange={() => setFormData({...formData, audience_type: 'SELECTED'})}
                  />
                  <span>Selected Customers</span>
                </label>
              </div>
            </div>

            {/* Selected Customers Picker */}
            {formData.audience_type === 'SELECTED' && (
              <div style={{marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)'}}>
                <div style={{marginBottom: '1rem'}}>
                  <input 
                    type="text" 
                    placeholder="Search Customer by name or mobile..." 
                    style={{width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)'}}
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {filteredCustomers.map(c => (
                    <label key={c.id} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', margin: 0}}>
                      <input 
                        type="checkbox" 
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                      />
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{fontWeight: 500}}>{c.display_name || c.legal_or_core_name || 'Customer'}</span>
                        <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{c.mobile || 'No mobile'}</span>
                      </div>
                    </label>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-muted)'}}>No customers match search.</div>
                  )}
                </div>
                <div style={{marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                  <strong>{selectedCustomers.length}</strong> customer(s) selected
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
