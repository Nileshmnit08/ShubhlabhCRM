import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function BrokerFormPage({ materials, onRefresh, showMessage }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const isEdit = !!id;

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState({
    broker_name: '',
    firm_name: '',
    mobile: '',
    whatsapp_number: '',
    market_location: '',
    state: '',
    notes: '',
    active: true,
    handled_material_ids: []
  });

  useEffect(() => {
    if (isEdit) {
      if (location.state?.broker) {
        const item = location.state.broker;
        const handled = item.broker_materials?.map(bm => bm.raw_material_id) || [];
        setFormData({
          broker_name: item.broker_name || '',
          firm_name: item.firm_name || '',
          mobile: item.mobile || '',
          whatsapp_number: item.whatsapp_number || '',
          market_location: item.market_location || '',
          state: item.state || '',
          notes: item.notes || '',
          active: item.active,
          handled_material_ids: handled
        });
      } else {
        // Fallback to fetch if refreshed on edit page
        fetchBroker(id);
      }
    } else if (location.state?.duplicateFrom) {
        const item = location.state.duplicateFrom;
        const handled = item.broker_materials?.map(bm => bm.raw_material_id) || [];
        setFormData({
          broker_name: `${item.broker_name} (Copy)`,
          firm_name: item.firm_name || '',
          mobile: item.mobile || '',
          whatsapp_number: item.whatsapp_number || '',
          market_location: item.market_location || '',
          state: item.state || '',
          notes: item.notes || '',
          active: item.active,
          handled_material_ids: handled
        });
    }
  }, [id, location.state]);

  const fetchBroker = async (brokerId) => {
    try {
      const { data, error } = await supabase
        .from('brokers')
        .select('*, broker_materials(raw_material_id)')
        .eq('id', brokerId)
        .single();
      if (error) throw error;
      if (data) {
        const handled = data.broker_materials?.map(bm => bm.raw_material_id) || [];
        setFormData({
          broker_name: data.broker_name || '',
          firm_name: data.firm_name || '',
          mobile: data.mobile || '',
          whatsapp_number: data.whatsapp_number || '',
          market_location: data.market_location || '',
          state: data.state || '',
          notes: data.notes || '',
          active: data.active,
          handled_material_ids: handled
        });
      }
    } catch (err) {
      setFormError('Failed to load broker details.');
    }
  };

  const handleMaterialToggle = (materialId) => {
    setFormData(prev => {
      const current = prev.handled_material_ids;
      if (current.includes(materialId)) {
        return { ...prev, handled_material_ids: current.filter(mid => mid !== materialId) };
      } else {
        return { ...prev, handled_material_ids: [...current, materialId] };
      }
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFormError('');
    setIsSaving(true);
    
    try {
      if (!formData.broker_name.trim()) throw new Error("Broker Name is required.");

      const payload = {
        broker_name: formData.broker_name.trim(),
        firm_name: formData.firm_name.trim(),
        mobile: formData.mobile.trim(),
        whatsapp_number: formData.whatsapp_number.trim(),
        market_location: formData.market_location.trim(),
        state: formData.state.trim(),
        notes: formData.notes.trim(),
        active: formData.active
      };

      let savedBrokerId = id;

      if (isEdit) {
        const { error } = await supabase.from('brokers').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('brokers').insert(payload).select('id').single();
        if (error) throw error;
        savedBrokerId = data.id;
      }

      if (savedBrokerId) {
        await supabase.from('broker_materials').delete().eq('broker_id', savedBrokerId);
        
        if (formData.handled_material_ids.length > 0) {
          const bmPayload = formData.handled_material_ids.map(rm_id => ({
            broker_id: savedBrokerId,
            raw_material_id: rm_id
          }));
          const { error: bmError } = await supabase.from('broker_materials').insert(bmPayload);
          if (bmError) throw bmError;
        }
      }
      
      showMessage('success', `Broker ${isEdit ? 'updated' : 'added'} successfully.`);
      onRefresh();
      navigate('/raw-material-prices/configuration/brokers');
    } catch (err) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center text-xs font-medium text-secondary mb-4 uppercase tracking-wider">
        <Link to="/raw-material-prices" className="hover:text-primary transition-colors">Raw Material Prices</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration" className="hover:text-primary transition-colors">Configuration</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <Link to="/raw-material-prices/configuration/brokers" className="hover:text-primary transition-colors">Brokers</Link>
        <ChevronRight size={14} className="mx-1 opacity-50" />
        <span className="text-primary">{isEdit ? 'Edit Broker' : 'Add Broker'}</span>
      </div>

      <div className="page-header">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <Link to="/raw-material-prices/configuration/brokers" className="btn-icon" title="Back to Brokers">
            <ArrowLeft size={24} />
          </Link>
          <div>
            <h1>{isEdit ? 'Edit Broker' : 'Add Broker'}</h1>
            <p className="text-secondary" style={{marginTop: '0.25rem'}}>
              Configure broker details and assign handled raw materials.
            </p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{maxWidth: '800px', padding: '2rem'}}>
        {formError && (
          <div style={{padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem'}}>
            <AlertTriangle size={18} style={{marginTop: '2px'}} />
            <span>{formError}</span>
          </div>
        )}
        
        <form id="broker-form" onSubmit={handleSave}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem'}}>
            <div>
              <label>Broker Name *</label>
              <input 
                type="text" 
                required 
                placeholder="e.g. Ramesh Agarwal"
                value={formData.broker_name}
                onChange={e => setFormData({...formData, broker_name: e.target.value})}
              />
            </div>
            <div>
              <label>Firm Name</label>
              <input 
                type="text" 
                placeholder="e.g. Agarwal Trading Co."
                value={formData.firm_name}
                onChange={e => setFormData({...formData, firm_name: e.target.value})}
              />
            </div>

            <div>
              <label>Mobile Number</label>
              <input 
                type="text" 
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
              />
            </div>
            <div>
              <label>WhatsApp Number</label>
              <input 
                type="text" 
                placeholder="e.g. 9876543210"
                value={formData.whatsapp_number}
                onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
              />
            </div>

            <div>
              <label>Market Location</label>
              <input 
                type="text" 
                placeholder="e.g. Jaipur"
                value={formData.market_location}
                onChange={e => setFormData({...formData, market_location: e.target.value})}
              />
            </div>
            <div>
              <label>State</label>
              <input 
                type="text" 
                placeholder="e.g. Rajasthan"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
              />
            </div>

            <div style={{gridColumn: '1 / -1'}}>
              <label>Materials Handled</label>
              <div style={{padding: '1rem', border: '1px solid var(--border)', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)', maxHeight: '240px', overflowY: 'auto'}}>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem'}}>
                  {materials.map(m => (
                    <label key={m.id} style={{display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', margin: 0}}>
                      <input 
                        type="checkbox" 
                        checked={formData.handled_material_ids.includes(m.id)}
                        onChange={() => handleMaterialToggle(m.id)}
                        style={{width: 'auto'}}
                      />
                      <span style={{fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)'}}>
                        {m.name_en} {m.name_hi && <span className="text-muted" style={{fontWeight: 400}}>({m.name_hi})</span>}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div style={{gridColumn: '1 / -1'}}>
              <label>Notes</label>
              <textarea 
                rows="3"
                placeholder="Additional information about the broker..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <label style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', padding: '1rem', background: 'var(--bg-surface-hover)', borderRadius: 'var(--radius-md)'}}>
              <div>
                <span style={{fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem'}}>Active Status</span>
                <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block'}}>Make this broker available for daily price data entry.</span>
              </div>
              <div style={{position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '1rem', flexShrink: 0}}>
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.active}
                  onChange={e => setFormData({...formData, active: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary shadow-inner"></div>
              </div>
            </label>
          </div>

          <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem'}}>
            <Link to="/raw-material-prices/configuration/brokers" className="btn btn-secondary">
              Cancel
            </Link>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" style={{marginRight: '0.5rem'}}></span>
                  Saving...
                </>
              ) : 'Save Broker'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
