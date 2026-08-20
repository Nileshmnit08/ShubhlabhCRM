import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

export default function RequirementForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const partyId = searchParams.get('party_id');
  
  const [party, setParty] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    product_type: '',
    quantity: '',
    unit: 'Bags',
    expected_rate: '',
    expected_date: '',
    priority: 'Normal',
    notes: ''
  });

  useEffect(() => {
    if (!partyId) {
      alert("Must provide a party_id");
      navigate(-1);
      return;
    }
    fetchInitialData();
  }, [partyId]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      const [partyRes, prodRes] = await Promise.all([
        supabase.from('crm_parties').select('*').eq('id', partyId).single(),
        supabase.from('products').select('*').eq('active', true)
      ]);
      
      if (!partyRes.data) {
        alert("Party not found or inaccessible.");
        navigate(-1);
        return;
      }
      
      setParty(partyRes.data);
      setProducts(prodRes.data || []);
      if (prodRes.data?.length > 0) {
        setFormData(f => ({ ...f, product_type: prodRes.data[0].name }));
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load data.");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (parseFloat(formData.quantity) <= 0) {
      alert("Quantity must be greater than zero.");
      return;
    }
    
    if (formData.expected_rate && parseFloat(formData.expected_rate) < 0) {
      alert("Expected rate cannot be negative.");
      return;
    }
    
    if (!formData.expected_date) {
      alert("Required date is mandatory.");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.from('requirements').insert({
        party_id: partyId,
        product_type: formData.product_type,
        quantity: parseFloat(formData.quantity) || 0,
        unit: formData.unit,
        expected_rate: formData.expected_rate ? parseFloat(formData.expected_rate) : null,
        expected_date: formData.expected_date || null,
        priority: formData.priority,
        notes: formData.notes,
        status: 'New',
        assigned_to: sessionData?.session?.user?.id || null
      }).select();
      
      if (error) throw error;
      navigate(`/requirements/${data[0].id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to create requirement");
    }
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading form...</div>;

  return (
    <div className="animate-fade-in" style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="page-header">
        <h1 style={{margin: 0}}>New Requirement</h1>
        <p className="text-secondary">for {party?.display_name}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem'}}>Product / Feed Type</label>
          <select 
            required
            value={formData.product_type}
            onChange={e => setFormData({...formData, product_type: e.target.value})}
            style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          >
            {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            <option value="Other">Other (Custom)</option>
          </select>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Quantity</label>
            <input 
              type="number" required min="0.01" step="any"
              value={formData.quantity} onChange={e => setFormData({...formData, quantity: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Unit</label>
            <select 
              value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            >
              <option value="Bags">Bags</option>
              <option value="Tons">Tons</option>
              <option value="MT">MT</option>
              <option value="Kg">Kg</option>
            </select>
          </div>
        </div>

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Target Rate (₹) <span className="text-muted text-sm">(Optional)</span></label>
            <input 
              type="number" step="0.01" min="0"
              value={formData.expected_rate} onChange={e => setFormData({...formData, expected_rate: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Expected Date</label>
            <input 
              type="date" required
              value={formData.expected_date} onChange={e => setFormData({...formData, expected_date: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            />
          </div>
        </div>

        <div>
          <label style={{display: 'block', marginBottom: '0.5rem'}}>Priority</label>
          <select 
            value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
            style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          >
            <option value="Low">Low</option>
            <option value="Normal">Normal</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </div>
        
        <div>
          <label style={{display: 'block', marginBottom: '0.5rem'}}>Additional Notes</label>
          <textarea 
            rows="3"
            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
          />
        </div>

        <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
          <button type="submit" className="btn btn-primary" style={{flex: 1, justifyContent: 'center'}}>Create Requirement</button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
