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
    <div className="max-w-3xl mx-auto pb-12 animate-fade-in">
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

      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/raw-material-prices/configuration/brokers')}
          className="btn-icon bg-white border border-base shadow-sm text-secondary hover:text-primary hover:bg-slate-50"
          title="Back to Brokers"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold text-primary m-0 tracking-tight">{isEdit ? 'Edit Broker' : 'Add New Broker'}</h1>
      </div>

      <div className="glass-panel p-6 sm:p-8">
        {formError && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <span>{formError}</span>
          </div>
        )}
        
        <form id="broker-form" onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Broker Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                required 
                className="input w-full shadow-sm" 
                placeholder="e.g. Ramesh Agarwal"
                value={formData.broker_name}
                onChange={e => setFormData({...formData, broker_name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Firm Name</label>
              <input 
                type="text" 
                className="input w-full shadow-sm" 
                placeholder="e.g. Agarwal Trading Co."
                value={formData.firm_name}
                onChange={e => setFormData({...formData, firm_name: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Mobile Number</label>
              <input 
                type="text" 
                className="input w-full shadow-sm"
                placeholder="e.g. 9876543210"
                value={formData.mobile}
                onChange={e => setFormData({...formData, mobile: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">WhatsApp Number</label>
              <input 
                type="text" 
                className="input w-full shadow-sm"
                placeholder="e.g. 9876543210"
                value={formData.whatsapp_number}
                onChange={e => setFormData({...formData, whatsapp_number: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Market Location</label>
              <input 
                type="text" 
                className="input w-full shadow-sm"
                placeholder="e.g. Jaipur"
                value={formData.market_location}
                onChange={e => setFormData({...formData, market_location: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">State</label>
              <input 
                type="text" 
                className="input w-full shadow-sm"
                placeholder="e.g. Rajasthan"
                value={formData.state}
                onChange={e => setFormData({...formData, state: e.target.value})}
              />
            </div>
          </div>

          <div>
              <label className="block text-sm font-semibold text-secondary mb-2">Materials Handled</label>
              <div className="p-4 border border-base/80 bg-slate-50/50 rounded-lg max-h-60 overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {materials.map(m => (
                    <label key={m.id} className="flex items-center gap-3 p-2 hover:bg-white rounded-lg cursor-pointer transition-colors border border-transparent hover:border-base/50 hover:shadow-sm">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 w-4 h-4 text-primary focus:ring-primary"
                        checked={formData.handled_material_ids.includes(m.id)}
                        onChange={() => handleMaterialToggle(m.id)}
                      />
                      <span className="text-sm font-medium text-secondary">{m.name_en} {m.name_hi && <span className="text-muted text-xs font-normal">({m.name_hi})</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
          </div>

          <div>
              <label className="block text-sm font-semibold text-secondary mb-1.5">Notes</label>
              <textarea 
                className="input w-full shadow-sm min-h-[100px]"
                placeholder="Additional information about the broker..."
                value={formData.notes}
                onChange={e => setFormData({...formData, notes: e.target.value})}
              ></textarea>
          </div>

          <div className="pt-2 border-t border-base mt-6">
            <label className="flex items-center justify-between cursor-pointer group py-4 hover:bg-slate-50 rounded-lg -mx-4 px-4 transition-colors">
              <div>
                <span className="font-semibold text-sm text-primary block mb-0.5">Active Status</span>
                <span className="text-sm text-secondary block">Make this broker available for daily price data entry</span>
              </div>
              <div className="relative inline-flex items-center shrink-0 ml-4">
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

          <div className="pt-6 border-t border-base flex flex-col sm:flex-row justify-end gap-3 mt-6">
            <button 
              type="button" 
              className="btn btn-outline bg-white shadow-sm px-6 py-2.5 order-2 sm:order-1 w-full sm:w-auto"
              onClick={() => navigate('/raw-material-prices/configuration/brokers')}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary min-w-[140px] shadow-sm flex items-center justify-center px-6 py-2.5 order-1 sm:order-2 w-full sm:w-auto text-[15px]"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
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
