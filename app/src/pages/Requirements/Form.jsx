import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { notifyAdminsOnOrderCreated } from '../../lib/orderNotification';
import {
  parseProductWeight,
  calculateItemWeightDetails,
  formatCompatibleUnitTotals
} from '../../lib/canonicalRequirements';
import { Plus, Trash2, Package, Scale, ArrowLeft, Info, CheckCircle2 } from 'lucide-react';

export default function RequirementForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id } = useParams();
  const partyId = searchParams.get('party_id');
  const isEditMode = Boolean(id);
  
  const [party, setParty] = useState(null);
  const [allParties, setAllParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [originalItemIds, setOriginalItemIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    party_id: partyId || '',
    expected_rate: '',
    expected_date: '',
    priority: 'Normal',
    intent_type: 'Product Interest',
    notes: ''
  });

  const [items, setItems] = useState([{
    id: null,
    product_name: '',
    category: 'Product',
    quantity: '',
    unit: 'Bags',
    weight: '',
    gift: '',
    other_gift: '',
    production_done: false,
    production_done_at: null,
    production_done_by: null,
    _isCustom: false
  }]);

  useEffect(() => {
    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, id]);

  async function fetchInitialData() {
    setLoading(true);
    try {
      if (isEditMode) {
        const { data: req, error: reqErr } = await supabase
          .from('requirements')
          .select('*, crm_parties(*), requirement_items(*)')
          .eq('id', id)
          .single();
        if (reqErr || !req) throw new Error("Requirement not found");
        
        const { data: prodData } = await supabase.from('products').select('*').eq('active', true);
        
        setParty(req.crm_parties);
        setProducts(prodData || []);
        
        // Map line items from requirement_items if available, fallback to header
        if (req.requirement_items && req.requirement_items.length > 0) {
          const sortedItems = [...req.requirement_items].sort((a, b) => {
            if (a.created_at && b.created_at) return new Date(a.created_at) - new Date(b.created_at);
            return (a.id || '').localeCompare(b.id || '');
          });

          setOriginalItemIds(sortedItems.map(i => i.id));

          setItems(sortedItems.map(item => {
            const { productName, bagWeight } = parseProductWeight(item.product_name, item.weight);
            const resolvedWeight = item.weight != null
              ? String(item.weight)
              : (bagWeight != null ? String(bagWeight) : '');

            return {
              id: item.id,
              requirement_id: item.requirement_id || req.id,
              product_name: productName || item.product_name || '',
              category: item.category || 'Product',
              quantity: item.quantity != null ? String(item.quantity) : '',
              unit: item.unit || 'Bags',
              weight: resolvedWeight,
              gift: item.gift || '',
              other_gift: item.other_gift || '',
              production_done: item.production_done ?? false,
              production_done_at: item.production_done_at || null,
              production_done_by: item.production_done_by || null,
              _isCustom: false
            };
          }));
        } else {
          // Fallback for legacy single-item requirements
          setOriginalItemIds([]);
          const { productName, bagWeight } = parseProductWeight(req.product_type, null);
          const rawQty = req.quantity != null ? req.quantity : (req.required_quantity != null ? req.required_quantity : '');

          setItems([{
            id: null,
            requirement_id: req.id,
            product_name: req.product_type === 'General Requirement' ? '' : (productName || req.product_type || ''),
            category: 'Product',
            quantity: rawQty != null ? String(rawQty) : '',
            unit: req.unit || 'Bags',
            weight: bagWeight != null ? String(bagWeight) : '',
            gift: '',
            other_gift: '',
            production_done: false,
            production_done_at: null,
            production_done_by: null,
            _isCustom: false
          }]);
        }

        setFormData({
          party_id: req.party_id || '',
          expected_rate: req.expected_rate != null ? String(req.expected_rate) : '',
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
        
        const activeProds = prodRes.data || [];
        setProducts(activeProds);
        setOriginalItemIds([]);

        if (activeProds.length > 0) {
          const first = activeProds[0];
          const parsed = parseProductWeight(first.name, null);
          setItems([{
            id: null,
            product_name: first.name,
            category: first.category || 'Product',
            quantity: '',
            unit: first.unit_of_measure || 'Bags',
            weight: parsed.bagWeight != null ? String(parsed.bagWeight) : '',
            gift: '',
            other_gift: '',
            production_done: false,
            production_done_at: null,
            production_done_by: null,
            _isCustom: false
          }]);
        }
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load requirement data.");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }

  const handleProductSelect = (index, value) => {
    const newItems = [...items];
    if (value === '__custom__') {
      newItems[index]._isCustom = true;
      newItems[index].product_name = '';
    } else {
      newItems[index]._isCustom = false;
      newItems[index].product_name = value;
      const matched = products.find(p => p.name === value);
      if (matched) {
        newItems[index].category = matched.category || newItems[index].category;
        if (!newItems[index].weight) {
          const parsed = parseProductWeight(matched.name, null);
          if (parsed.bagWeight != null) {
            newItems[index].weight = String(parsed.bagWeight);
          }
        }
      }
    }
    setItems(newItems);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;

    // When switching unit to Bags and weight is present, preserve consistency
    if (field === 'unit' && value === 'Bags' && !newItems[index].weight) {
      const parsed = parseProductWeight(newItems[index].product_name, null);
      if (parsed.bagWeight != null) {
        newItems[index].weight = String(parsed.bagWeight);
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    const firstProd = products[0];
    const parsed = firstProd ? parseProductWeight(firstProd.name, null) : { bagWeight: null };
    setItems([
      ...items,
      {
        id: null,
        product_name: firstProd?.name || '',
        category: firstProd?.category || 'Product',
        quantity: '',
        unit: firstProd?.unit_of_measure || 'Bags',
        weight: parsed.bagWeight != null ? String(parsed.bagWeight) : '',
        gift: '',
        other_gift: '',
        production_done: false,
        production_done_at: null,
        production_done_by: null,
        _isCustom: false
      }
    ]);
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

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

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_name || !it.product_name.trim()) {
        setFormError(`Product #${i + 1} must have a valid product name.`);
        return;
      }
      const q = parseFloat(it.quantity);
      if (isNaN(q) || q <= 0) {
        setFormError(`Quantity for ${it.product_name || `Product #${i + 1}`} must be greater than zero.`);
        return;
      }
      if (it.weight !== '' && it.weight !== null) {
        const w = parseFloat(it.weight);
        if (isNaN(w) || w <= 0) {
          setFormError(`Weight per bag for ${it.product_name} must be a valid positive number.`);
          return;
        }
      }
    }
    
    if (formData.expected_rate && parseFloat(formData.expected_rate) < 0) {
      setFormError("Expected rate cannot be negative.");
      return;
    }
    
    if (!formData.expected_date) {
      setFormError("Expected date is mandatory.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      // Calculate consolidated header values
      const firstItem = items[0] || {};
      const allSameUnit = items.every(i => (i.unit || 'Bags').toLowerCase() === (firstItem.unit || 'Bags').toLowerCase());
      const headerQuantity = allSameUnit
        ? items.reduce((sum, i) => sum + (parseFloat(i.quantity) || 0), 0)
        : (parseFloat(firstItem.quantity) || 0);

      const headerProductType = items.length === 1
        ? items[0].product_name.trim()
        : items.map(i => i.product_name.trim()).filter(Boolean).join(', ');

      const payload = {
        product_type: headerProductType || 'General Requirement',
        quantity: headerQuantity,
        unit: firstItem.unit || 'Bags',
        expected_rate: formData.expected_rate ? parseFloat(formData.expected_rate) : null,
        expected_date: formData.expected_date || null,
        priority: formData.priority || 'Normal',
        intent_type: formData.intent_type || 'Product Interest',
        notes: formData.notes || ''
      };

      let requirementId = id;

      if (isEditMode) {
        const { error: updateErr } = await supabase
          .from('requirements')
          .update(payload)
          .eq('id', id);
        if (updateErr) throw updateErr;
      } else {
        const currentUserId = sessionData?.session?.user?.id || null;
        const insertPayload = {
          ...payload,
          party_id: finalPartyId,
          status: 'New',
          assigned_to: currentUserId,
          created_by: currentUserId
        };
        const { data, error } = await supabase.from('requirements').insert(insertPayload).select();
        
        if (error) {
          if (error.code === '23502' && error.message.includes('party_id')) {
            throw new Error("Please select a Party / Customer. The party field cannot be empty.");
          }
          throw error;
        }
        if (data && data.length > 0) {
          requirementId = data[0].id;
          notifyAdminsOnOrderCreated({
            orderId: requirementId,
            partyId: finalPartyId,
            createdBy: currentUserId,
            customerName: party?.display_name,
            orderRef: data[0].demand_ref
          }).catch(notifErr => console.warn('Non-blocking notification error:', notifErr));
        }
      }

      // Upsert and synchronize requirement_items
      if (requirementId) {
        // Delete items that the user removed
        if (isEditMode && originalItemIds.length > 0) {
          const keptIds = new Set(items.filter(i => i.id).map(i => i.id));
          const toDelete = originalItemIds.filter(itemId => !keptIds.has(itemId));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase
              .from('requirement_items')
              .delete()
              .in('id', toDelete);
            if (delErr) {
              console.warn("Could not delete removed requirement_items:", delErr);
            }
          }
        }

        // Prepare items to upsert
        const itemsToUpsert = items.map(item => {
          const productMatch = products.find(p => p.name === item.product_name);
          const obj = {
            requirement_id: requirementId,
            product_name: item.product_name.trim(),
            category: item.category || productMatch?.category || 'Product',
            quantity: parseFloat(item.quantity) || 0,
            unit: item.unit || 'Bags',
            weight: item.weight !== '' && item.weight !== null && !isNaN(Number(item.weight))
              ? parseFloat(item.weight)
              : null,
            gift: item.gift ? item.gift.trim() : null,
            other_gift: item.other_gift ? item.other_gift.trim() : null,
            production_done: item.production_done ?? false,
            production_done_at: item.production_done_at || null,
            production_done_by: item.production_done_by || null
          };

          if (item.id) {
            obj.id = item.id;
          }

          return obj;
        });

        const { error: itemsErr } = await supabase
          .from('requirement_items')
          .upsert(itemsToUpsert);

        if (itemsErr) {
          console.error("Failed to save requirement_items:", itemsErr);
          throw new Error(`Failed to save items: ${itemsErr.message}`);
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

  // Calculate order-level summary totals across all items
  const canonicalItemsForSummary = items.map(i => ({
    product_name: i.product_name,
    quantity: parseFloat(i.quantity) || 0,
    unit: i.unit || 'Bags'
  }));
  const totalQtyDisplay = formatCompatibleUnitTotals(canonicalItemsForSummary);

  const totalCalculatedWeightKg = items.reduce((sum, it) => {
    const details = calculateItemWeightDetails(it.quantity, it.unit, it.weight);
    return details.totalWeightKg ? sum + details.totalWeightKg : sum;
  }, 0);

  if (loading) return <div style={{padding: '3rem', textAlign: 'center'}} className="text-muted">Loading requirement...</div>;

  return (
    <div className="animate-fade-in" style={{maxWidth: '740px', margin: '0 auto', paddingBottom: '3rem'}}>
      <div className="page-header" style={{marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'}}>
        <div>
          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '4px'}}>
            <button type="button" onClick={() => navigate(-1)} className="btn-icon" title="Go back">
              <ArrowLeft size={20} />
            </button>
            <h1 style={{margin: 0, fontSize: '1.4rem'}}>{isEditMode ? 'Edit Requirement' : 'New Requirement'}</h1>
          </div>
          <p className="text-secondary" style={{margin: '2px 0 0 28px', fontSize: '0.9rem'}}>
            {party?.display_name ? `Customer: ${party.display_name} ${party.city ? `(${party.city})` : ''}` : 'Fill in order and requirement details'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel" style={{padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #E5E7EB'}}>
        {formError && (
          <div style={{padding: '1rem', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', border: '1px solid #FCA5A5', fontSize: '0.9rem'}}>
            {formError}
          </div>
        )}
        
        {(!isEditMode && !partyId) && (
          <div>
            <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.9rem'}}>
              Party / Customer <span style={{color: 'var(--danger)'}}>*</span>
            </label>
            <select 
              required
              value={formData.party_id}
              onChange={e => setFormData({...formData, party_id: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
            >
              <option value="">-- Select Party --</option>
              {allParties.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
            </select>
          </div>
        )}

        {/* --- Product-wise Editable Section --- */}
        <div style={{border: '1px solid #E2E8F0', borderRadius: '10px', overflow: 'hidden'}}>
          {/* Header Bar */}
          <div style={{background: '#F8FAFC', padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <Package size={18} style={{color: 'var(--primary)'}} />
              <h3 style={{margin: 0, fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em'}}>
                Ordered Products ({items.length})
              </h3>
            </div>
            <button 
              type="button" 
              onClick={addItem} 
              className="btn btn-secondary" 
              style={{padding: '0.35rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600}}
            >
              <Plus size={15} /> Add Product
            </button>
          </div>

          {/* Product Items List */}
          <div style={{display: 'flex', flexDirection: 'column'}}>
            {items.map((item, index) => {
              const details = calculateItemWeightDetails(item.quantity, item.unit, item.weight);

              return (
                <div 
                  key={item.id || index} 
                  style={{
                    padding: '1.25rem', 
                    borderBottom: index < items.length - 1 ? '1px solid #E2E8F0' : 'none',
                    background: index % 2 === 0 ? '#FFFFFF' : '#FAFAFA'
                  }}
                >
                  {/* Top Item Row */}
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem'}}>
                    <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                      <span style={{fontWeight: 700, fontSize: '0.92rem', color: '#0F172A'}}>
                        Product #{index + 1}
                      </span>
                      {item.category && item.category !== 'Product' && (
                        <span style={{fontSize: '0.75rem', background: '#EFF6FF', color: '#1E40AF', padding: '2px 8px', borderRadius: '4px', fontWeight: 600}}>
                          {item.category}
                        </span>
                      )}
                    </div>
                    {items.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => removeItem(index)} 
                        style={{
                          background: 'none', border: 'none', color: '#DC2626', 
                          cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                        title="Remove product"
                      >
                        <Trash2 size={14} /> Remove
                      </button>
                    )}
                  </div>

                  {/* Product Selector */}
                  <div style={{marginBottom: '0.85rem'}}>
                    <label style={{display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155'}}>
                      Product / Feed Type <span style={{color: 'var(--danger)'}}>*</span>
                    </label>
                    <select 
                      required
                      value={item._isCustom ? '__custom__' : item.product_name}
                      onChange={e => handleProductSelect(index, e.target.value)}
                      style={{width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem'}}
                    >
                      <option value="">-- Select Product --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.name}>
                          {p.name} {p.category && p.category !== 'Feed' ? `(${p.category})` : ''}
                        </option>
                      ))}
                      {!products.some(p => p.name === item.product_name) && item.product_name && (
                        <option value={item.product_name}>{item.product_name} (Saved)</option>
                      )}
                      <option value="__custom__">Other (Enter custom product name)</option>
                    </select>

                    {item._isCustom && (
                      <input 
                        type="text"
                        placeholder="Enter custom product name"
                        value={item.product_name}
                        onChange={e => updateItem(index, 'product_name', e.target.value)}
                        style={{marginTop: '0.5rem', width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem'}}
                        required
                      />
                    )}
                  </div>

                  {/* Quantity, Unit & Bag Weight Grid */}
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', alignItems: 'start'}}>
                    {/* Field 1: Quantity / Bags */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155'}}>
                        {item.unit === 'Bags' ? 'Number of Bags' : `Quantity (${item.unit})`} <span style={{color: 'var(--danger)'}}>*</span>
                      </label>
                      <input 
                        type="number" 
                        required 
                        min={item.unit === 'Bags' ? '1' : '0.01'} 
                        step={item.unit === 'Bags' ? '1' : 'any'}
                        placeholder={item.unit === 'Bags' ? 'e.g. 70' : 'e.g. 3'}
                        value={item.quantity} 
                        onChange={e => updateItem(index, 'quantity', e.target.value)}
                        style={{width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600}}
                      />
                    </div>

                    {/* Field 2: Unit Selector */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155'}}>
                        Unit <span style={{color: 'var(--danger)'}}>*</span>
                      </label>
                      <select 
                        value={item.unit} 
                        onChange={e => updateItem(index, 'unit', e.target.value)}
                        style={{width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem'}}
                      >
                        <option value="Bags">Bags</option>
                        <option value="MT">MT (Metric Tonne)</option>
                        <option value="Quintal">Quintal</option>
                        <option value="Kg">Kg</option>
                        <option value="Tons">Tons</option>
                      </select>
                    </div>

                    {/* Field 3: Weight per Bag (KG) */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#334155'}}>
                        Weight / Bag (KG) {item.unit !== 'Bags' ? <span style={{fontSize: '0.75rem', color: '#64748B'}}>(Optional)</span> : null}
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        step="any"
                        placeholder={item.unit === 'Bags' ? 'e.g. 45' : 'e.g. 40'}
                        value={item.weight || ''} 
                        onChange={e => updateItem(index, 'weight', e.target.value)}
                        style={{width: '100%', padding: '0.65rem 0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.9rem'}}
                      />
                    </div>

                    {/* Field 4: Calculated Total Weight / Summary Box */}
                    <div>
                      <label style={{display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#64748B'}}>
                        Total Weight / Summary
                      </label>
                      <div 
                        style={{
                          padding: '0.55rem 0.75rem', 
                          borderRadius: '6px', 
                          background: details.totalWeightKg ? '#F0FDF4' : '#F9FAFB', 
                          border: details.totalWeightKg ? '1px solid #BBF7D0' : '1px solid #E5E7EB',
                          minHeight: '38px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}
                      >
                        {details.totalWeightKg ? (
                          <div>
                            <span style={{fontWeight: 700, color: '#166534', fontSize: '0.92rem'}}>
                              {details.totalWeightKg.toLocaleString()} KG
                            </span>
                            <span style={{fontSize: '0.78rem', color: '#15803D', marginLeft: '6px'}}>
                              ({details.totalWeightMt} MT)
                            </span>
                            {item.unit !== 'Bags' && details.equivalentBags && (
                              <div style={{fontSize: '0.74rem', color: '#4B5563', marginTop: '1px'}}>
                                ≈ {details.equivalentBags} Bags (@ {item.weight} kg)
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic'}}>
                            {item.unit === 'Bags' ? 'Enter bag weight' : `${item.quantity || 0} ${item.unit}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Optional Promotional Gift & Other Gift */}
                  <div style={{marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #E2E8F0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.2rem', fontSize: '0.76rem', color: '#64748B'}}>
                        🎁 Promotional Gift (Optional)
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. Scratch Card, T-Shirt"
                        value={item.gift || ''} 
                        onChange={e => updateItem(index, 'gift', e.target.value)}
                        style={{width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: '0.82rem'}}
                      />
                    </div>
                    <div>
                      <label style={{display: 'block', marginBottom: '0.2rem', fontSize: '0.76rem', color: '#64748B'}}>
                        🎁 Additional Gift / Packaging Note
                      </label>
                      <input 
                        type="text" 
                        placeholder="e.g. 1 Bucket extra"
                        value={item.other_gift || ''} 
                        onChange={e => updateItem(index, 'other_gift', e.target.value)}
                        style={{width: '100%', padding: '0.45rem 0.65rem', borderRadius: '4px', background: 'var(--bg-base)', border: '1px solid var(--border)', fontSize: '0.82rem'}}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Consolidated Order Summary Bar */}
          <div style={{background: '#F0FDF4', borderTop: '1px solid #DCFCE7', padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'}}>
            <div style={{display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: '#166534', fontWeight: 600}}>
              <CheckCircle2 size={16} style={{color: '#16A34A'}} />
              <span>Consolidated Order Total:</span>
              <strong style={{color: '#14532D', fontSize: '0.95rem'}}>{totalQtyDisplay}</strong>
            </div>
            {totalCalculatedWeightKg > 0 && (
              <div style={{fontSize: '0.82rem', color: '#15803D'}}>
                Calculated Weight: <strong>{totalCalculatedWeightKg.toLocaleString()} KG</strong> ({ (totalCalculatedWeightKg / 1000).toFixed(3).replace(/\.?0+$/, '') } MT)
              </div>
            )}
          </div>
        </div>

        {/* Commercial & Timeline Grid */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem'}}>
              Target Rate (₹) <span className="text-muted text-sm" style={{fontWeight: 400}}>(Optional)</span>
            </label>
            <input 
              type="number" step="0.01" min="0"
              placeholder="e.g. 2100"
              value={formData.expected_rate} onChange={e => setFormData({...formData, expected_rate: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
            />
          </div>
          <div>
            <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem'}}>
              Expected Date <span style={{color: 'var(--danger)'}}>*</span>
            </label>
            <input 
              type="date" required
              value={formData.expected_date} onChange={e => setFormData({...formData, expected_date: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
            />
          </div>
        </div>

        {/* Priority & Intent Type Grid */}
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem'}}>
          <div>
            <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem'}}>Priority</label>
            <select 
              value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
            >
              <option value="Low">Low</option>
              <option value="Normal">Normal</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
          
          <div>
            <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem'}}>Intent Type</label>
            <select 
              value={formData.intent_type} onChange={e => setFormData({...formData, intent_type: e.target.value})}
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
            >
              <option value="Product Interest">Product Interest</option>
              <option value="Price Discussion">Price Discussion</option>
              <option value="Quotation Requested">Quotation Requested</option>
              <option value="Order Intention">Order Intention</option>
              <option value="Requirement Confirmed">Requirement Confirmed</option>
            </select>
          </div>
        </div>
        
        {/* Additional Notes */}
        <div>
          <label style={{display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.88rem'}}>Additional Notes / Delivery Address</label>
          <textarea 
            rows="3"
            placeholder="Add delivery notes, address, or special instructions..."
            value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
            style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: '0.95rem'}}
          />
        </div>

        {/* Action Buttons */}
        <div style={{display: 'flex', gap: '1rem', marginTop: '0.5rem'}}>
          <button type="submit" className="btn btn-primary" style={{flex: 1, justifyContent: 'center', padding: '0.85rem'}} disabled={isSubmitting}>
            {isSubmitting ? 'Saving Changes...' : (isEditMode ? 'Save Changes' : 'Create Requirement')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)} disabled={isSubmitting} style={{padding: '0.85rem 1.5rem'}}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
