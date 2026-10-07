import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Save, Send } from 'lucide-react';

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
    status: 'DRAFT'
  });
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

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
      console.error(e);
    }
  };

  const fetchUpdate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('business_updates').select('*').eq('id', id).single();
      if (error) throw error;
      setFormData({
        title: data.title,
        type: data.type,
        message: data.message,
        audience_type: data.audience_type,
        status: data.status
      });

      if (data.audience_type === 'SELECTED') {
        const { data: recData } = await supabase.from('business_update_recipients').select('customer_id').eq('update_id', id);
        setSelectedCustomers(recData.map(r => r.customer_id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish = false) => {
    if (!formData.title || !formData.message) {
      alert('Title and Message are required.');
      return;
    }
    if (formData.audience_type === 'SELECTED' && selectedCustomers.length === 0) {
      alert('Please select at least one customer.');
      return;
    }

    if (publish) {
      if (!window.confirm(`Publish this update to ${formData.audience_type === 'ALL' ? 'All Customers' : `${selectedCustomers.length} selected customers`}?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        published_at: publish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      };

      let currentId = id;

      if (id) {
        await supabase.from('business_updates').update(payload).eq('id', id);
        if (payload.audience_type === 'SELECTED') {
          // recreate recipients
          await supabase.from('business_update_recipients').delete().eq('update_id', id);
        }
      } else {
        const { data, error } = await supabase.from('business_updates').insert([payload]).select().single();
        if (error) throw error;
        currentId = data.id;
      }

      if (payload.audience_type === 'SELECTED') {
        const recPayload = selectedCustomers.map(cid => ({
          update_id: currentId,
          customer_id: cid
        }));
        if (recPayload.length > 0) {
          await supabase.from('business_update_recipients').insert(recPayload);
        }
      }

      navigate('/customer-updates');
    } catch (e) {
      console.error(e);
      alert('Failed to save update.');
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

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="animate-fade-in" style={{paddingBottom: '4rem'}}>
      <div className="page-header" style={{position: 'sticky', top: 0, zIndex: 50, background: 'var(--bg-base)', padding: '1rem 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <div>
          <h1 style={{margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <button className="btn btn-icon" onClick={() => navigate('/customer-updates')} style={{border: 'none', background: 'none', color: 'var(--text-secondary)'}}>
              <ArrowLeft size={24} />
            </button>
            {id ? 'Edit Update' : 'Create Customer Update'}
          </h1>
        </div>
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          {formData.status === 'DRAFT' ? (
            <>
              <button className="btn btn-secondary" onClick={() => navigate('/customer-updates')} disabled={submitting}>
                Cancel
              </button>
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
          ) : (
            <>
              <button className="btn btn-secondary" onClick={() => navigate('/customer-updates')} disabled={submitting}>
                Back
              </button>
              <div className="badge badge-success" style={{display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem'}}>
                <Send size={16} /> Published
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{maxWidth: '800px', margin: '2rem auto'}}>
        <div className="glass-panel" style={{padding: '2rem'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Title</label>
              <input 
                type="text" 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem'}}
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Enter update title"
                disabled={formData.status === 'PUBLISHED'}
              />
            </div>
            
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Communication Type</label>
              <select 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem'}}
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                disabled={formData.status === 'PUBLISHED'}
              >
                {UPDATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Message</label>
              <textarea 
                rows="6" 
                style={{width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', fontSize: '1rem', resize: 'vertical'}}
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})}
                disabled={formData.status === 'PUBLISHED'}
              />
            </div>

            <div>
              <label style={{display: 'block', marginBottom: '0.5rem', fontWeight: 500, color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Audience</label>
              <div style={{display: 'flex', gap: '2rem'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: formData.status === 'PUBLISHED' ? 'not-allowed' : 'pointer'}}>
                  <input 
                    type="radio" 
                    name="audience" 
                    checked={formData.audience_type === 'ALL'}
                    onChange={() => setFormData({...formData, audience_type: 'ALL'})}
                    disabled={formData.status === 'PUBLISHED'}
                  />
                  <span>All Customers</span>
                </label>
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: formData.status === 'PUBLISHED' ? 'not-allowed' : 'pointer'}}>
                  <input 
                    type="radio" 
                    name="audience" 
                    checked={formData.audience_type === 'SELECTED'}
                    onChange={() => setFormData({...formData, audience_type: 'SELECTED'})}
                    disabled={formData.status === 'PUBLISHED'}
                  />
                  <span>Selected Customers</span>
                </label>
              </div>
            </div>

            {formData.audience_type === 'SELECTED' && formData.status !== 'PUBLISHED' && (
              <div style={{marginTop: '0.5rem', padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-base)'}}>
                <div style={{marginBottom: '1rem'}}>
                  <input 
                    type="text" 
                    placeholder="Search Customer..." 
                    style={{width: '100%', padding: '0.6rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)'}}
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                  {filteredCustomers.map(c => (
                    <label key={c.id} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', cursor: 'pointer', margin: 0}}>
                      <input 
                        type="checkbox" 
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                      />
                      <div style={{display: 'flex', flexDirection: 'column'}}>
                        <span style={{fontWeight: 500}}>{c.display_name}</span>
                        <span style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{c.mobile}</span>
                      </div>
                    </label>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-muted)'}}>No customers match search.</div>
                  )}
                </div>
                <div style={{marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)'}}>
                  {selectedCustomers.length} customer(s) selected
                </div>
              </div>
            )}

            {formData.audience_type === 'SELECTED' && formData.status === 'PUBLISHED' && (
              <div style={{padding: '1rem', backgroundColor: 'var(--bg-base)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)'}}>
                <p style={{margin: 0, color: 'var(--text-secondary)'}}>Targeted to <strong>{selectedCustomers.length}</strong> customers.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
