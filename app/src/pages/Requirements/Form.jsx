import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { notifyAdminsOnOrderCreated } from '../../lib/orderNotification';

export default function RequirementForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const partyId = searchParams.get('party_id');
  const isEditMode = Boolean(id);
  
  const [party, setParty] = useState(null);
  const [allParties, setAllParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    party_id: partyId || '',
    product_type: '',
    quantity: '',
    unit: 'Bags',
    expected_rate: '',
    expected_date: '',
    priority: 'Normal',
    notes: ''
  });

  const [items, setItems] = useState([{
    id: null,
    product_name: '',
    quantity: '',
    unit: 'Bags'
  }]);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, id]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      if (isEditMode) {
        const { data: req, error: reqErr } = await supabase.from('requirements').select('*, crm_parties(*), requirement_items(*)').eq('id', id).single();
        if (reqErr || !req) throw new Error("Requirement not found");
        
        const { data: prodData } = await supabase.from('products').select('*').eq('active', true);
        
        setParty(req.crm_parties);
        setProducts(prodData || []);
        
        // Map line items from requirement_items if available, fallback to header
        if (req.requirement_items && req.requirement_items.length > 0) {
          // Sort to preserve ordering (assuming id or created_at sorting is fine)
          const sortedItems = [...req.requirement_items].sort((a, b) => a.id.localeCompare(b.id));
          setItems(sortedItems.map(item => ({
            id: item.id,
            product_name: item.product_name || '',
            category: item.category || '',
            quantity: item.quantity || '',
            unit: item.unit || 'Bags'
          })));
        } else {
          setItems([{
            id: null,
            product_name: req.product_type || '',
            quantity: req.quantity || '',
            unit: req.unit || 'Bags'
          }]);
        }

        setFormData({
          party_id: req.party_id || '',
          expected_rate: req.expected_rate || '',
          expected_date: req.expected_date || '',
          priority: req.priority || 'Normal',
          intent_type: req.intent_type || 'Product Interest',
          notes: req.notes || ''
        });
      } else {
        const [partyRes, prodRes, allPartiesRes] = await Promise.all([
          partyId ? supabase.from('crm_parties').select('*').eq('id', partyId).single() : Promise.resolve({ data: null }),
          supabase.from('products').select('*').eq('active', true),
          !partyId ? supabase.from('crm_parties').select('id, display_name').order('display_name') : Promise.resolve({ data: null })
        ]);
        
        if (partyId && !partyRes.data) {
          alert("Party not found or inaccessible.");
          navigate(-1);
          return;
        }
        
        if (partyId) setParty(partyRes.data);
        if (allPartiesRes.data) setAllParties(allPartiesRes.data);
        
        setProducts(prodRes.data || []);
        if (prodRes.data?.length > 0) {
          setItems([{
            id: null,
            product_name: prodRes.data[0].name,
            quantity: '',
            unit: 'Bags'
          }]);
        }
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
    setFormError('');
    
    const finalPartyId = isEditMode ? formData.party_id : (partyId || formData.party_id);
    if (!isEditMode && !finalPartyId) {
      setFormError("Please select a Party / Customer.");
      return;
    }
    
    if (items.length === 0) {
      setFormError("At least one product is required.");
      return;
    }

    for (const item of items) {
      if (parseFloat(item.quantity) <= 0 || !item.quantity) {
        setFormError("Quantity must be greater than zero for all products.");
        return;
      }
    }
    
    if (formData.expected_rate && parseFloat(formData.expected_rate) < 0) {
      setFormError("Expected rate cannot be negative.");
      return;
    }
    
    if (!formData.expected_date) {
      setFormError("Required date is mandatory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const firstItem = items[0] || {};
      const payload = {
        // Maintain legacy header fields for backward compatibility
        product_type: firstItem.product_name,
        quantity: parseFloat(firstItem.quantity) || 0,
        unit: firstItem.unit,
        expected_rate: formData.expected_rate ? parseFloat(formData.expected_rate) : null,
        expected_date: formData.expected_date || null,
        priority: formData.priority,
        intent_type: formData.intent_type,
        notes: formData.notes
      };

      let requirementId = id;

      if (isEditMode) {
        const { data, error } = await supabase.from('requirements').update(payload).eq('id', id).select();
        if (error) throw error;
      } else {
        const currentUserId = sessionData?.session?.user?.id || null;
        const insertPayload = {
          ...payload,
          party_id: finalPartyId,
          status: 'New', // Fixed constraint issue
          assigned_to: currentUserId,
          created_by: currentUserId
        };
        const { data, error } = await supabase.from('requirements').insert(insertPayload).select();
        
        // Handle database-level party_id NOT NULL violation gracefully
        if (error) {
           if (error.code === '23502' && error.message.includes('party_id')) {
              throw new Error("Please select a Party / Customer. The party field cannot be empty.");
           }
           throw error;
        }
        if (data && data.length > 0) {
          requirementId = data[0].id;
          // Trigger order created admin notification
          notifyAdminsOnOrderCreated({
            orderId: requirementId,
            partyId: finalPartyId,
            createdBy: currentUserId,
            customerName: party?.display_name,
            orderRef: data[0].demand_ref
          }).catch(notifErr => console.warn('Non-blocking notification error:', notifErr));
        }
      }

      // Upsert requirement_items
      if (requirementId) {
        // Find categories for products
        const itemsToUpsert = items.map(item => {
           const productMatch = products.find(p => p.name === item.product_name);
           return {
             id: item.id || undefined, // undefined will omit it for insert
             requirement_id: requirementId,
             product_name: item.product_name,
             category: item.category || productMatch?.category || 'Product',
             quantity: parseFloat(item.quantity) || 0,
             unit: item.unit
           };
        });

        // Delete items that were removed
        if (isEditMode) {
           const currentItemIds = items.filter(i => i.id).map(i => i.id);
           if (currentItemIds.length > 0) {
             await supabase.from('requirement_items')
               .delete()
               .eq('requirement_id', requirementId)
               .not('id', 'in', `(${currentItemIds.join(',')})`);
           } else {
             // If all existing items were removed and new ones added
             await supabase.from('requirement_items')
               .delete()
               .eq('requirement_id', requirementId);
           }
        }

        const { error: itemsErr } = await supabase.from('requirement_items').upsert(itemsToUpsert);
        if (itemsErr) {
          console.error("Failed to save requirement_items:", itemsErr);
          // Non-blocking error, header is saved
        }
      }

      navigate(`/requirements/${requirementId || ''}`);
    } catch (err) {
      console.error("Failed to save requirement:", err);
      setFormError(err.message || "Failed to save requirement. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, { id: null, product_name: products[0]?.name || '', quantity: '', unit: 'Bags' }]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}}>Loading form...</div>;

  return (
    <div className="animate-fade-in" style={{maxWidth: '600px', margin: '0 auto'}}>
      <div className="page-header">
        <h1 style={{margin: 0}}>{isEditMode ? 'Edit Requirement' : 'New Requirement'}</h1>
        <p className="text-secondary">{party?.display_name ? `for ${party.display_name}` : 'Fill in the requirement details below'}</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
        {formError && (
          <div style={{padding: '1rem', borderRadius: '6px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid var(--danger)'}}>
            {formError}
          </div>
        )}
        
        {(!isEditMode && !partyId) && (
          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Party / Customer <span style={{color: 'var(--danger)'}}>*</span></label>
            <select 
              required
              value={formData.party_id}
              onChange={e => setFormData({...formData, party_id: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            >
              <option value="">-- Select Party --</option>
              {allParties.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
        )}

        <div style={{border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden'}}>
          <div style={{background: 'rgba(0,0,0,0.02)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h3 style={{margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)'}}>Products</h3>
            <button type="button" onClick={addItem} className="btn btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize: '0.8rem'}}>+ Add Product</button>
          </div>
          
          <div style={{display: 'flex', flexDirection: 'column', gap: '0'}}>
            {items.map((item, index) => (
              <div key={index} style={{padding: '1rem', borderBottom: index < items.length - 1 ? '1px solid var(--border)' : 'none', position: 'relative'}}>
                {items.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} style={{position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.85rem'}}>Remove</button>
                )}
                <div style={{marginBottom: '1rem', paddingRight: items.length > 1 ? '4rem' : '0'}}>
                  <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Product / Feed Type <span style={{color: 'var(--danger)'}}>*</span></label>
                  <select 
                    required
                    value={item.product_name}
                    onChange={e => updateItem(index, 'product_name', e.target.value)}
                    style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                  >
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    {!products.some(p => p.name === item.product_name) && item.product_name && (
                      <option value={item.product_name}>{item.product_name} (Archived/Custom)</option>
                    )}
                    <option value="Other">Other (Custom)</option>
                  </select>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Quantity <span style={{color: 'var(--danger)'}}>*</span></label>
                    <input 
                      type="number" required min="0.01" step="any"
                      value={item.quantity} onChange={e => updateItem(index, 'quantity', e.target.value)}
                      style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                    />
                  </div>
                  <div>
                    <label style={{display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem'}}>Unit</label>
                    <select 
                      value={item.unit} onChange={e => updateItem(index, 'unit', e.target.value)}
                      style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                    >
                      <option value="Bags">Bags</option>
                      <option value="Tons">Tons</option>
                      <option value="MT">MT</option>
                      <option value="Kg">Kg</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
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

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
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
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Intent Type</label>
            <select 
              value={formData.intent_type} onChange={e => setFormData({...formData, intent_type: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            >
              <option value="Product Interest">Product Interest</option>
              <option value="Price Discussion">Price Discussion</option>
              <option value="Quotation Requested">Quotation Requested</option>
              <option value="Order Intention">Order Intention</option>
              <option value="Requirement Confirmed">Requirement Confirmed</option>
            </select>
          </div>
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
          <button type="submit" className="btn btn-primary" style={{flex: 1, justifyContent: 'center'}} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Requirement')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
