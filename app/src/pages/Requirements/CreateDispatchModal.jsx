import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { X, Save, AlertCircle } from 'lucide-react';

export default function CreateDispatchModal({ requirement, onClose, onComplete }) {
  const [formData, setFormData] = useState({
    dispatch_date: new Date().toISOString().split('T')[0],
    quantity: requirement.pending_quantity || requirement.quantity,
    unit: requirement.unit || 'Bags',
    truck_number: '',
    driver_name: '',
    driver_mobile: '',
    transporter_name: '',
    lr_bilty_number: '',
    invoice_number: '',
    invoice_date: '',
    warehouse_location: '',
    expected_delivery_date: '',
    freight_amount: '',
    remarks: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'truck_number' ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!formData.dispatch_date) return setError('Dispatch Date is required');
    if (!formData.quantity || parseFloat(formData.quantity) <= 0) return setError('Quantity must be greater than zero');
    
    // Warn/prevent over-dispatch (could add admin override check here, for now strict)
    const pendingQty = requirement.pending_quantity || requirement.quantity;
    if (parseFloat(formData.quantity) > pendingQty) {
      return setError(`Dispatch quantity (${formData.quantity}) cannot exceed pending quantity (${pendingQty})`);
    }

    if (!formData.truck_number) return setError('Truck / Vehicle Number is required');
    if (formData.driver_mobile && !/^[0-9]{10}$/.test(formData.driver_mobile)) {
      return setError('Driver mobile must be a valid 10-digit number');
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const payload = {
        requirement_id: requirement.id,
        dispatch_date: formData.dispatch_date,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        truck_number: formData.truck_number,
        driver_name: formData.driver_name || null,
        driver_mobile: formData.driver_mobile || null,
        transporter_name: formData.transporter_name || null,
        lr_bilty_number: formData.lr_bilty_number || null,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date || null,
        warehouse_location: formData.warehouse_location || null,
        expected_delivery_date: formData.expected_delivery_date || null,
        freight_amount: formData.freight_amount ? parseFloat(formData.freight_amount) : null,
        remarks: formData.remarks || null,
        status: 'Dispatched',
        created_by: sessionData?.session?.user?.id || null
      };

      const { data, error: insertErr } = await supabase.from('requirement_dispatches').insert(payload).select().single();
      if (insertErr) throw insertErr;

      // Ensure requirement status is moved to Won or Dispatched? The prompt says "A requirement should normally be moved to Dispatched only after it is Won... If total dispatched quantity equals or exceeds required quantity, show “Fully Dispatched”." We don't overwrite original requirement quantity or status immediately to "Dispatched" if it was just "Won", but wait, "Dispatched" is a status in the pipeline.
      // If we selected 'Dispatched', we want to update the requirement status to 'Dispatched' as part of this process if it's not already.
      
      if (requirement.status !== 'Dispatched') {
         await supabase.from('requirements').update({ status: 'Dispatched' }).eq('id', requirement.id);
         
         // Log history
         await supabase.from('requirement_status_history').insert({
           requirement_id: requirement.id,
           old_status: requirement.status,
           new_status: 'Dispatched',
           note: `Status updated via dispatch entry for ${payload.quantity} ${payload.unit}.`,
           changed_by: sessionData?.session?.user?.id || null
         });
      }

      onComplete();
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to save dispatch');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem'
    }}>
      <div className="glass-panel animate-fade-in" style={{
        background: 'var(--bg-surface)', 
        maxWidth: '800px', width: '100%', 
        maxHeight: '90vh', overflowY: 'auto',
        borderRadius: '12px',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          padding: '1.5rem', borderBottom: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: 'var(--bg-surface)', zIndex: 10
        }}>
          <h2 style={{margin: 0}}>Create Dispatch</h2>
          <button className="btn-icon" onClick={onClose}><X /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
          
          {error && (
            <div style={{
              padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--danger)', borderRadius: '6px',
              display: 'flex', gap: '0.5rem', alignItems: 'flex-start'
            }}>
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Dispatch Date *</label>
              <input type="date" name="dispatch_date" value={formData.dispatch_date} onChange={handleChange} required
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Expected Delivery Date</label>
              <input type="date" name="expected_delivery_date" value={formData.expected_delivery_date} onChange={handleChange}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Quantity *</label>
              <div style={{display: 'flex', gap: '0.5rem'}}>
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required step="0.01" min="0.01"
                  style={{flex: 1, padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                />
                <input type="text" name="unit" value={formData.unit} readOnly
                  style={{width: '80px', padding: '0.75rem', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)'}}
                />
              </div>
              <small className="text-secondary">Pending Quantity: {requirement.pending_quantity || requirement.quantity} {requirement.unit}</small>
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Truck / Vehicle Number *</label>
              <input type="text" name="truck_number" value={formData.truck_number} onChange={handleChange} required placeholder="e.g. MH 12 AB 1234"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Transporter Name</label>
              <input type="text" name="transporter_name" value={formData.transporter_name} onChange={handleChange} placeholder="Transporter / Agency"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
               <div>
                  <label style={{display: 'block', marginBottom: '0.5rem'}}>Driver Name</label>
                  <input type="text" name="driver_name" value={formData.driver_name} onChange={handleChange} placeholder="Name"
                    style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                  />
               </div>
               <div>
                  <label style={{display: 'block', marginBottom: '0.5rem'}}>Driver Mobile</label>
                  <input type="text" name="driver_mobile" value={formData.driver_mobile} onChange={handleChange} placeholder="10 digits" maxLength={10}
                    style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
                  />
               </div>
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Invoice Number</label>
              <input type="text" name="invoice_number" value={formData.invoice_number} onChange={handleChange} placeholder="INV-001"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Invoice Date</label>
              <input type="date" name="invoice_date" value={formData.invoice_date} onChange={handleChange}
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>LR / Bilty Number</label>
              <input type="text" name="lr_bilty_number" value={formData.lr_bilty_number} onChange={handleChange} placeholder="LR-001"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
          </div>

          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem'}}>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Warehouse / Location</label>
              <input type="text" name="warehouse_location" value={formData.warehouse_location} onChange={handleChange} placeholder="Origin Warehouse"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
            <div>
              <label style={{display: 'block', marginBottom: '0.5rem'}}>Freight Amount (₹)</label>
              <input type="number" name="freight_amount" value={formData.freight_amount} onChange={handleChange} placeholder="0.00" step="0.01" min="0"
                style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
              />
            </div>
          </div>

          <div>
            <label style={{display: 'block', marginBottom: '0.5rem'}}>Dispatch Remarks</label>
            <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={2} placeholder="Any notes on this dispatch..."
              style={{width: '100%', padding: '0.75rem', borderRadius: '6px', background: 'var(--bg-base)', border: '1px solid var(--border)', color: 'var(--text-primary)'}}
            />
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Save size={18} /> {loading ? 'Saving...' : 'Save Dispatch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
