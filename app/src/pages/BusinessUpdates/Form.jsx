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
    <div className="p-6">
      <div className="d-flex align-items-center mb-6">
        <button className="btn btn-icon me-4" onClick={() => navigate('/customer-updates')}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="h3 mb-0">{id ? 'Edit Update' : 'Create Update'}</h1>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card p-6 mb-6">
            <div className="form-group mb-4">
              <label className="form-label">Title</label>
              <input 
                type="text" 
                className="form-control" 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})} 
                placeholder="Enter update title"
                disabled={formData.status === 'PUBLISHED'}
              />
            </div>
            
            <div className="form-group mb-4">
              <label className="form-label">Type</label>
              <select 
                className="form-select" 
                value={formData.type} 
                onChange={e => setFormData({...formData, type: e.target.value})}
                disabled={formData.status === 'PUBLISHED'}
              >
                {UPDATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
              </select>
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Message</label>
              <textarea 
                className="form-control" 
                rows="6" 
                value={formData.message} 
                onChange={e => setFormData({...formData, message: e.target.value})}
                disabled={formData.status === 'PUBLISHED'}
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label d-block">Audience</label>
              <div className="form-check form-check-inline">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="audience" 
                  id="audAll" 
                  checked={formData.audience_type === 'ALL'}
                  onChange={() => setFormData({...formData, audience_type: 'ALL'})}
                  disabled={formData.status === 'PUBLISHED'}
                />
                <label className="form-check-label" htmlFor="audAll">All Customers</label>
              </div>
              <div className="form-check form-check-inline">
                <input 
                  className="form-check-input" 
                  type="radio" 
                  name="audience" 
                  id="audSelected" 
                  checked={formData.audience_type === 'SELECTED'}
                  onChange={() => setFormData({...formData, audience_type: 'SELECTED'})}
                  disabled={formData.status === 'PUBLISHED'}
                />
                <label className="form-check-label" htmlFor="audSelected">Selected Customers</label>
              </div>
            </div>

            {formData.audience_type === 'SELECTED' && formData.status !== 'PUBLISHED' && (
              <div className="mb-4 p-4 border rounded">
                <div className="form-group mb-3">
                  <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search Customer..." 
                    value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                  />
                </div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {filteredCustomers.map(c => (
                    <div key={c.id} className="form-check py-2 border-bottom">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id={`c_${c.id}`} 
                        checked={selectedCustomers.includes(c.id)}
                        onChange={() => toggleCustomer(c.id)}
                      />
                      <label className="form-check-label w-100" htmlFor={`c_${c.id}`}>
                        {c.display_name} <span className="text-muted text-sm d-block">{c.mobile}</span>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.audience_type === 'SELECTED' && formData.status === 'PUBLISHED' && (
              <div className="mb-4">
                <p className="text-muted">Targeted to {selectedCustomers.length} customers.</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card p-6">
            <h3 className="h5 mb-4">Actions</h3>
            {formData.status === 'DRAFT' ? (
              <div className="d-flex flex-column gap-3">
                <button 
                  className="btn btn-outline-primary d-flex align-items-center justify-content-center gap-2"
                  onClick={() => handleSave(false)}
                  disabled={submitting}
                >
                  <Save size={18} />
                  Save Draft
                </button>
                <button 
                  className="btn btn-primary d-flex align-items-center justify-content-center gap-2"
                  onClick={() => handleSave(true)}
                  disabled={submitting}
                >
                  <Send size={18} />
                  Publish Update
                </button>
              </div>
            ) : (
              <div className="alert alert-success d-flex align-items-center gap-2 mb-0">
                <Send size={18} />
                Published
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
